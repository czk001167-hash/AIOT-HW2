import os
import json
import warnings
import joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from itertools import combinations

from sklearn.model_selection import train_test_split, KFold, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LinearRegression, LassoCV, ElasticNetCV
from sklearn.feature_selection import RFE, SelectKBest, f_regression, SequentialFeatureSelector
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
from statsmodels.stats.outliers_influence import variance_inflation_factor
import statsmodels.api as sm

warnings.filterwarnings('ignore')

# Set aesthetic styling
sns.set_theme(style='whitegrid')
plt.rcParams.update({'font.sans-serif': 'Arial', 'font.size': 11})

# Feature definitions and Chinese descriptions for Boston Housing
FEATURE_INFO = {
    'crim': {'name': '城鎮人均犯罪率', 'desc': 'Per capita crime rate by town', 'unit': ''},
    'zn': {'name': '大坪數住宅用地比例', 'desc': 'Proportion of residential land zoned for lots over 25,000 sq.ft.', 'unit': '%'},
    'indus': {'name': '非零售商業用地比例', 'desc': 'Proportion of non-retail business acres per town', 'unit': '%'},
    'chas': {'name': '查爾斯河邊界', 'desc': 'Charles River dummy variable (= 1 if tract bounds river; 0 otherwise)', 'unit': '0/1'},
    'nox': {'name': '一氧化氮濃度', 'desc': 'Nitric oxides concentration (parts per 10 million)', 'unit': 'ppm'},
    'rm': {'name': '每戶平均房間數', 'desc': 'Average number of rooms per dwelling', 'unit': '間'},
    'age': {'name': '老舊自住住宅比例', 'desc': 'Proportion of owner-occupied units built prior to 1940', 'unit': '%'},
    'dis': {'name': '至五大就業中心距離', 'desc': 'Weighted distances to five Boston employment centres', 'unit': '英里'},
    'rad': {'name': '輻射公路便利指數', 'desc': 'Index of accessibility to radial highways', 'unit': '分'},
    'tax': {'name': '不動產稅率', 'desc': 'Full-value property-tax rate per $10,000', 'unit': '/萬美元'},
    'ptratio': {'name': '城鎮師生比例', 'desc': 'Pupil-teacher ratio by town', 'unit': '人/師'},
    'b': {'name': '黑人人口比例指標', 'desc': '1000(Bk - 0.63)^2 where Bk is the proportion of blacks by town', 'unit': ''},
    'lstat': {'name': '低收入人口比例', 'desc': 'Percentage of lower status of the population', 'unit': '%'}
}

# 1. Load and clean dataset
df = pd.read_csv('BostonHousing.csv')
if 'chas' in df.columns:
    df['chas'] = df['chas'].astype(str).str.replace('"', '').astype(float)

target_col = 'medv'
feature_cols = [c for c in df.columns if c != target_col]
X_all = df[feature_cols].astype(float)
y_all = df[target_col].astype(float)

print(f"Loaded Boston Housing: {df.shape[0]} samples, {len(feature_cols)} features.")

# Compute correlation matrix
corr_matrix = df.corr()
corr_dict = {
    'columns': list(df.columns),
    'data': corr_matrix.round(4).to_dict()
}

# Compute VIF on full feature set
def compute_vif_df(X_df):
    X_const = sm.add_constant(X_df, has_constant='add')
    vif_data = []
    for i, col in enumerate(X_const.columns):
        if col == 'const':
            continue
        try:
            v = variance_inflation_factor(X_const.values, i)
        except Exception:
            v = np.nan
        vif_data.append({'feature': col, 'vif': round(float(v), 3)})
    return sorted(vif_data, key=lambda x: x['vif'], reverse=True)

vif_initial = compute_vif_df(X_all)

# Experiment Runner for Random States (0 and 42)
all_export_data = {}
all_comparisons = []

for rs in [0, 42]:
    print(f"\n--- Running Boston Housing Feature Selection for random_state={rs} ---")
    X_train, X_test, y_train, y_test = train_test_split(X_all, y_all, test_size=0.20, random_state=rs)
    cv = KFold(n_splits=5, shuffle=True, random_state=rs)
    scaler = StandardScaler()
    X_tr_sc = pd.DataFrame(scaler.fit_transform(X_train), columns=feature_cols)

    # 1. SelectKBest (F-score Filter)
    skb = SelectKBest(f_regression, k='all').fit(X_train, y_train)
    skb_order = list(pd.Series(skb.scores_, index=feature_cols).sort_values(ascending=False).index)
    skb_subsets = {k: skb_order[:k] for k in range(1, len(feature_cols) + 1)}

    # 2. RFE (Standardized OLS Wrapper)
    rfe_subsets = {}
    for k in range(1, len(feature_cols) + 1):
        rfe = RFE(LinearRegression(), n_features_to_select=k).fit(X_tr_sc, y_train)
        rfe_subsets[k] = list(X_train.columns[rfe.support_])

    # 3. Forward SFS (5-Fold CV Wrapper)
    sfs_subsets = {}
    for k in range(1, len(feature_cols)):
        sfs = SequentialFeatureSelector(LinearRegression(), n_features_to_select=k, direction='forward', scoring='r2', cv=cv)
        sfs.fit(X_train, y_train)
        sfs_subsets[k] = list(X_train.columns[sfs.get_support()])
    sfs_subsets[len(feature_cols)] = feature_cols

    # 4. Lasso (L1 Regularization Ranking)
    lasso = LassoCV(cv=cv, max_iter=50000, random_state=rs).fit(X_tr_sc, y_train)
    lasso_order = list(pd.Series(np.abs(lasso.coef_), index=feature_cols).sort_values(ascending=False).index)
    lasso_subsets = {k: lasso_order[:k] for k in range(1, len(feature_cols) + 1)}

    # 5. ElasticNet Ranking
    enet = ElasticNetCV(cv=cv, max_iter=50000, random_state=rs).fit(X_tr_sc, y_train)
    enet_order = list(pd.Series(np.abs(enet.coef_), index=feature_cols).sort_values(ascending=False).index)
    enet_subsets = {k: enet_order[:k] for k in range(1, len(feature_cols) + 1)}

    # 6. VIF Backward Elimination
    rem = list(feature_cols)
    vif_subsets = {len(feature_cols): list(feature_cols)}
    while len(rem) > 1:
        Xc = sm.add_constant(X_train[rem], has_constant='add')
        vifs = pd.Series([variance_inflation_factor(Xc.values, i) for i in range(1, Xc.shape[1])], index=rem)
        worst = vifs.idxmax()
        rem.remove(worst)
        vif_subsets[len(rem)] = list(rem)

    # 7. Exhaustive Best Subset (CV-based search using fast OLS)
    ex_subsets = {}
    for k in range(1, len(feature_cols) + 1):
        if k == 1 or k >= 11:
            candidates = list(combinations(feature_cols, k))
        elif k <= 4:
            candidates = list(combinations(feature_cols, k))
        else:
            # Pool top candidates from SFS, RFE, Lasso, SelectKBest for intermediate k
            pool = list(set(sfs_subsets[k] + rfe_subsets[k] + lasso_subsets[k] + skb_subsets[k]))
            if len(pool) < k:
                pool = feature_cols
            candidates = list(combinations(pool, k))
            if len(candidates) > 500:
                candidates = candidates[:500]

        best_score = -1e9
        best_feats = None
        for comb in candidates:
            score = cross_val_score(LinearRegression(), X_train[list(comb)], y_train, cv=cv, scoring='r2').mean()
            if score > best_score:
                best_score = score
                best_feats = list(comb)
        ex_subsets[k] = best_feats if best_feats is not None else sfs_subsets[k]

    algo_dict = {
        'Lasso': {'name': 'Lasso (L1 Ranking)', 'color': '#1f77b4', 'pointStyle': 'circle', 'subsets': lasso_subsets},
        'Sequential_Selection': {'name': 'Forward SFS', 'color': '#ff7f0e', 'pointStyle': 'rect', 'subsets': sfs_subsets},
        'RFE': {'name': 'RFE', 'color': '#2ca02c', 'pointStyle': 'triangle', 'subsets': rfe_subsets},
        'ElasticNet': {'name': 'ElasticNet Ranking', 'color': '#d62728', 'pointStyle': 'rectRot', 'subsets': enet_subsets},
        'Exhaustive_Search': {'name': 'Exhaustive Search', 'color': '#9467bd', 'pointStyle': 'triangle', 'subsets': ex_subsets},
        'SelectKBest': {'name': 'SelectKBest (Filter)', 'color': '#06b6d4', 'pointStyle': 'cross', 'subsets': skb_subsets},
        'VIF': {'name': 'VIF (Collinearity Diagnostic)', 'color': '#f43f5e', 'pointStyle': 'crossRot', 'subsets': vif_subsets}
    }

    eval_records = []
    algo_export_data = {}

    for a_key, a_meta in algo_dict.items():
        data_points = []
        for k in range(1, len(feature_cols) + 1):
            feats = a_meta['subsets'][k]
            lr = LinearRegression().fit(X_train[feats], y_train)
            pred = lr.predict(X_test[feats])
            rmse = float(np.sqrt(mean_squared_error(y_test, pred)))
            r2 = float(r2_score(y_test, pred))
            mae = float(mean_absolute_error(y_test, pred))

            eval_records.append({
                'RandomState': rs,
                'Algorithm': a_meta['name'],
                'k': k,
                'Selected Features': ', '.join(feats),
                'RMSE': rmse,
                'R2': r2,
                'MAE': mae
            })

            data_points.append({
                'k': k,
                'features': feats,
                'rmse': round(rmse, 2),
                'r2': round(r2, 4),
                'mae': round(mae, 2),
                'status': 'gold' if r2 > 0.72 else ('good' if r2 > 0.65 else ('warn' if r2 > 0.5 else 'poor')),
                'desc': f"{a_meta['name']} k={k}"
            })

        algo_export_data[a_key] = {
            'name': a_meta['name'],
            'color': a_meta['color'],
            'pointStyle': a_meta['pointStyle'],
            'data': data_points
        }

    df_eval = pd.DataFrame(eval_records)
    all_comparisons.append(df_eval)

    # Find best overall model
    best_row = df_eval.loc[df_eval['RMSE'] == df_eval['RMSE'].min()].iloc[0]
    k1_row = df_eval.loc[df_eval['k'] == 1].sort_values('RMSE').iloc[0]
    k_full_row = df_eval.loc[df_eval['k'] == len(feature_cols)].iloc[0]

    # Pre-train key models for live predictor
    best_feats = best_row['Selected Features'].split(', ')
    m_best = LinearRegression().fit(X_train[best_feats], y_train)

    m1_feats = k1_row['Selected Features'].split(', ')
    m1 = LinearRegression().fit(X_train[m1_feats], y_train)

    # 3-feature model (top 3)
    m3_feats = sfs_subsets[3]
    m3 = LinearRegression().fit(X_train[m3_feats], y_train)

    # 5-feature model (top 5)
    m5_feats = sfs_subsets[5]
    m5 = LinearRegression().fit(X_train[m5_feats], y_train)

    # Full model
    m_full = LinearRegression().fit(X_train[feature_cols], y_train)

    models_export = {
        'best_feature': {
            'label': f"🏆 最佳 {len(best_feats)} 特徵模型 ({' + '.join(best_feats[:3])}...)",
            'intercept': round(float(m_best.intercept_), 2),
            'coef': {feat: round(float(coef), 4) for feat, coef in zip(best_feats, m_best.coef_)},
            'k': len(best_feats)
        },
        '1_feature': {
            'label': f"1 特徵基線模型 (僅憑 {m1_feats[0]})",
            'intercept': round(float(m1.intercept_), 2),
            'coef': {feat: round(float(coef), 4) for feat, coef in zip(m1_feats, m1.coef_)},
            'k': 1
        },
        '3_feature': {
            'label': f"3 特徵模型 ({' + '.join(m3_feats)})",
            'intercept': round(float(m3.intercept_), 2),
            'coef': {feat: round(float(coef), 4) for feat, coef in zip(m3_feats, m3.coef_)},
            'k': 3
        },
        '5_feature': {
            'label': f"5 特徵精簡模型 ({' + '.join(m5_feats)})",
            'intercept': round(float(m5.intercept_), 2),
            'coef': {feat: round(float(coef), 4) for feat, coef in zip(m5_feats, m5.coef_)},
            'k': 5
        },
        'full_feature': {
            'label': f"全特徵模型 (全部 13 項特徵)",
            'intercept': round(float(m_full.intercept_), 2),
            'coef': {feat: round(float(coef), 4) for feat, coef in zip(feature_cols, m_full.coef_)},
            'k': len(feature_cols)
        }
    }

    all_export_data[str(rs)] = {
        'meta': {
            'best_k': int(best_row['k']),
            'best_rmse': f"{best_row['RMSE']:.2f}",
            'best_r2': f"{best_row['R2']:.4f}",
            'best_features': best_row['Selected Features'],
            'k1_rmse': f"{k1_row['RMSE']:.2f}",
            'k1_r2': f"{k1_row['R2']:.4f}",
            'k1_feature': m1_feats[0],
            'k_full_rmse': f"{k_full_row['RMSE']:.2f}",
            'k_full_r2': f"{k_full_row['R2']:.4f}",
            'total_features': len(feature_cols)
        },
        'models': models_export,
        'algorithms': algo_export_data
    }

# Save full comparison CSV
final_df = pd.concat(all_comparisons, ignore_index=True)
final_df.to_csv('boston_model_comparison.csv', index=False)
print("Saved boston_model_comparison.csv")

# Generate High-Res 300 DPI Master Plot for RS=0
rs0_df = final_df[final_df['RandomState'] == 0]
fig, axes = plt.subplots(1, 2, figsize=(15, 6))
methods_to_plot = ['Lasso (L1 Ranking)', 'Forward SFS', 'RFE', 'ElasticNet Ranking', 'Exhaustive Search']
palette = sns.color_palette('tab10', len(methods_to_plot))
markers = ['o', 's', '^', 'D', 'v']

for idx, m_name in enumerate(methods_to_plot):
    sub = rs0_df[rs0_df['Algorithm'] == m_name].sort_values('k')
    axes[0].plot(sub['k'], sub['RMSE'], marker=markers[idx], label=m_name, color=palette[idx], linewidth=2.2, markersize=7)
    axes[1].plot(sub['k'], sub['R2'], marker=markers[idx], label=m_name, color=palette[idx], linewidth=2.2, markersize=7)

axes[0].set_title('Cross-Algorithm Comparison: RMSE by Number of Features (Boston Housing)', fontsize=12, fontweight='bold')
axes[0].set_xlabel('Number of Features (k)', fontweight='bold')
axes[0].set_ylabel('RMSE in $1,000s (Lower is Better)', fontweight='bold')
axes[0].set_xticks(range(1, 14))
axes[0].legend(fontsize=9, loc='upper right')
axes[0].grid(True, linestyle='--', alpha=0.5)

axes[1].set_title('Cross-Algorithm Comparison: R-squared by Number of Features (Boston Housing)', fontsize=12, fontweight='bold')
axes[1].set_xlabel('Number of Features (k)', fontweight='bold')
axes[1].set_ylabel('R-squared (Higher is Better)', fontweight='bold')
axes[1].set_xticks(range(1, 14))
axes[1].legend(fontsize=9, loc='lower right')
axes[1].grid(True, linestyle='--', alpha=0.5)

plt.tight_layout()
plt.savefig('boston_feature_selection_comparison.png', dpi=300)
plt.close()
print("Saved boston_feature_selection_comparison.png (300 DPI)")

# Compute feature statistics for interactive sliders (min, max, mean, median)
feature_stats = {}
for col in feature_cols:
    feature_stats[col] = {
        'name': FEATURE_INFO.get(col, {}).get('name', col),
        'desc': FEATURE_INFO.get(col, {}).get('desc', ''),
        'unit': FEATURE_INFO.get(col, {}).get('unit', ''),
        'min': round(float(df[col].min()), 2),
        'max': round(float(df[col].max()), 2),
        'mean': round(float(df[col].mean()), 2),
        'median': round(float(df[col].median()), 2),
        'step': 1 if col in ['rad', 'tax'] else (0.1 if col in ['rm', 'ptratio', 'lstat'] else 0.01)
    }

# Save serialized models and full artifacts
joblib.dump({
    'models': all_export_data,
    'feature_info': FEATURE_INFO,
    'vif_initial': vif_initial
}, 'boston_feature_selection_models.joblib')
print("Saved boston_feature_selection_models.joblib")

# Export complete JSON for web consumption
full_web_json = {
    'features': feature_stats,
    'vif': vif_initial,
    'corr': {
        'columns': list(df.columns),
        'values': df.corr().round(3).values.tolist()
    },
    'data': all_export_data
}

with open('boston_metadata.json', 'w', encoding='utf-8') as f:
    json.dump(full_web_json, f, ensure_ascii=False, indent=2)
print("Saved boston_metadata.json")
print("Boston Housing pipeline finished successfully!")
