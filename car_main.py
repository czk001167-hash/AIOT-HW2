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

# Feature definitions and Chinese descriptions for Car Features & MSRP
FEATURE_INFO = {
    'Year': {'name': '出廠年份', 'desc': '車輛出廠年份 (1990 ~ 2017)', 'unit': '年', 'step': 1, 'min': 1990, 'max': 2017, 'default': 2015},
    'Engine HP': {'name': '引擎馬力', 'desc': '引擎最大輸出馬力 (Horsepower)', 'unit': 'hp', 'step': 5, 'min': 55, 'max': 1000, 'default': 250},
    'Engine Cylinders': {'name': '汽缸數量', 'desc': '發動機汽缸數', 'unit': '缸', 'step': 1, 'min': 0, 'max': 16, 'default': 4},
    'Number of Doors': {'name': '車門數量', 'desc': '全車車門數 (2~4門)', 'unit': '門', 'step': 1, 'min': 2, 'max': 4, 'default': 4},
    'highway MPG': {'name': '高速公路油耗', 'desc': '高速行駛每加侖英里數 (Highway MPG)', 'unit': 'mpg', 'step': 1, 'min': 12, 'max': 60, 'default': 28},
    'city mpg': {'name': '市區道路油耗', 'desc': '市區行駛每加侖英里數 (City MPG)', 'unit': 'mpg', 'step': 1, 'min': 7, 'max': 50, 'default': 20},
    'Popularity': {'name': '社群熱門指數', 'desc': '車廠社群關注度指數', 'unit': '分', 'step': 50, 'min': 0, 'max': 5657, 'default': 1500},
    'is_luxury': {'name': '豪華車款標籤', 'desc': '是否屬於 Luxury 級距 (0: 否, 1: 是)', 'unit': '0/1', 'step': 1, 'min': 0, 'max': 1, 'default': 0},
    'is_performance': {'name': '性能車款標籤', 'desc': '是否屬於 Performance 級距 (0: 否, 1: 是)', 'unit': '0/1', 'step': 1, 'min': 0, 'max': 1, 'default': 0},
    'is_automatic': {'name': '自排變速箱', 'desc': '變速箱是否為自排 (0: 手排, 1: 自排)', 'unit': '0/1', 'step': 1, 'min': 0, 'max': 1, 'default': 1},
    'is_awd': {'name': '四輪/全輪驅動', 'desc': '驅動方式是否為全輪驅動 (0: 否, 1: 是)', 'unit': '0/1', 'step': 1, 'min': 0, 'max': 1, 'default': 0},
    'is_large': {'name': '大型車級距', 'desc': '車身尺碼是否為大型車 Large (0: 否, 1: 是)', 'unit': '0/1', 'step': 1, 'min': 0, 'max': 1, 'default': 0}
}

# 1. Load and clean dataset
df = pd.read_csv('car.csv')
df = df.dropna(subset=['Engine HP', 'Engine Cylinders', 'Number of Doors']).copy()
df.loc[df['highway MPG'] > 150, 'highway MPG'] = 34  # Correct single typo

df['is_luxury'] = df['Market Category'].fillna('').apply(lambda x: 1 if 'Luxury' in x else 0)
df['is_performance'] = df['Market Category'].fillna('').apply(lambda x: 1 if 'Performance' in x else 0)
df['is_automatic'] = df['Transmission Type'].apply(lambda x: 1 if 'AUTOMATIC' in str(x).upper() else 0)
df['is_awd'] = df['Driven_Wheels'].apply(lambda x: 1 if 'all wheel' in str(x).lower() or 'four wheel' in str(x).lower() else 0)
df['is_large'] = df['Vehicle Size'].apply(lambda x: 1 if x == 'Large' else 0)

target_col = 'MSRP'
feature_cols = [
    'Year', 
    'Engine HP', 
    'Engine Cylinders', 
    'Number of Doors', 
    'highway MPG', 
    'city mpg', 
    'Popularity',
    'is_luxury', 
    'is_performance', 
    'is_automatic', 
    'is_awd', 
    'is_large'
]

print(f"Dataset shape: {df.shape}")
print(f"Features count: {len(feature_cols)}, Target: {target_col}")

# 2. Multicollinearity VIF Analysis
X_all = df[feature_cols]
y_all = df[target_col]

X_const = sm.add_constant(X_all, has_constant='add')
vif_initial = [
    {'feature': col, 'vif': round(float(variance_inflation_factor(X_const.values, i)), 3)}
    for i, col in enumerate(X_const.columns) if col != 'const'
]
vif_initial = sorted(vif_initial, key=lambda x: x['vif'], reverse=True)
print("\nInitial VIF ranking:")
for item in vif_initial:
    print(f"  {item['feature']:<18}: {item['vif']}")

# 3. Comprehensive Feature Selection across k = 1 to 12
all_comparisons = []
all_export_data = {}

for rs in [0, 42]:
    print(f"\n--- Running Car Features Selection for random_state={rs} ---")
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
    lasso = LassoCV(cv=cv, max_iter=5000, random_state=rs).fit(X_tr_sc, y_train)
    lasso_order = list(pd.Series(np.abs(lasso.coef_), index=feature_cols).sort_values(ascending=False).index)
    lasso_subsets = {k: lasso_order[:k] for k in range(1, len(feature_cols) + 1)}

    # 5. ElasticNet Ranking
    enet = ElasticNetCV(cv=cv, max_iter=5000, random_state=rs).fit(X_tr_sc, y_train)
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
        if k in [1, 2, 3, 11, 12]:
            candidates = list(combinations(feature_cols, k))
        else:
            pool = list(set(sfs_subsets[k] + rfe_subsets[k] + lasso_subsets[k] + skb_subsets[k]))
            if len(pool) < k:
                pool = feature_cols
            candidates = list(combinations(pool, k))
            if len(candidates) > 300:
                candidates = candidates[:300]
        
        best_cv = -float('inf')
        best_c = candidates[0]
        for c in candidates:
            cols = list(c)
            # Evaluate quick analytical OLS CV or test fit
            m = LinearRegression()
            scores = cross_val_score(m, X_train[cols], y_train, cv=cv, scoring='r2')
            if scores.mean() > best_cv:
                best_cv = scores.mean()
                best_c = cols
        ex_subsets[k] = list(best_c)

    algorithms = {
        'Lasso (L1 Ranking)': lasso_subsets,
        'Forward SFS': sfs_subsets,
        'RFE': rfe_subsets,
        'ElasticNet Ranking': enet_subsets,
        'Exhaustive Search': ex_subsets,
        'SelectKBest (Filter)': skb_subsets,
        'VIF Backward Elimination': vif_subsets
    }

    # Evaluate all models across k = 1 to 12
    records = []
    algo_export_data = {}

    for algo_name, subset_dict in algorithms.items():
        algo_export_data[algo_name] = {'k': [], 'rmse': [], 'r2': [], 'features': []}
        for k in range(1, len(feature_cols) + 1):
            feats = subset_dict[k]
            model = LinearRegression().fit(X_train[feats], y_train)
            pred_train = model.predict(X_train[feats])
            pred_test = model.predict(X_test[feats])

            tr_rmse = float(np.sqrt(mean_squared_error(y_train, pred_train)))
            te_rmse = float(np.sqrt(mean_squared_error(y_test, pred_test)))
            tr_r2 = float(r2_score(y_train, pred_train))
            te_r2 = float(r2_score(y_test, pred_test))
            te_mae = float(mean_absolute_error(y_test, pred_test))

            records.append({
                'RandomState': rs,
                'Algorithm': algo_name,
                'k': k,
                'RMSE': te_rmse,
                'R2': te_r2,
                'MAE': te_mae,
                'Train_RMSE': tr_rmse,
                'Train_R2': tr_r2,
                'Selected Features': ', '.join(feats)
            })

            algo_export_data[algo_name]['k'].append(k)
            algo_export_data[algo_name]['rmse'].append(round(te_rmse, 2))
            algo_export_data[algo_name]['r2'].append(round(te_r2, 4))
            algo_export_data[algo_name]['features'].append(feats)

    rs_df = pd.DataFrame(records)
    all_comparisons.append(rs_df)

    # Key Milestone Models
    best_row = rs_df.sort_values(by=['R2', 'RMSE'], ascending=[False, True]).iloc[0]
    k1_row = rs_df[rs_df['k'] == 1].sort_values(by='RMSE').iloc[0]
    k_full_row = rs_df[rs_df['k'] == len(feature_cols)].iloc[0]

    # Milestone Model Equations
    m1_feats = k1_row['Selected Features'].split(', ')
    m1 = LinearRegression().fit(X_train[m1_feats], y_train)

    m_best_feats = best_row['Selected Features'].split(', ')
    m_best = LinearRegression().fit(X_train[m_best_feats], y_train)

    # 5-feature baseline
    m5_row = rs_df[rs_df['k'] == 5].sort_values(by='RMSE').iloc[0]
    m5_feats = m5_row['Selected Features'].split(', ')
    m5 = LinearRegression().fit(X_train[m5_feats], y_train)

    # Full Model
    m_full = LinearRegression().fit(X_train, y_train)

    models_export = {
        'single_feature': {
            'label': f"單特徵基準 (k=1: {m1_feats[0]})",
            'intercept': round(float(m1.intercept_), 2),
            'coef': {feat: round(float(coef), 4) for feat, coef in zip(m1_feats, m1.coef_)},
            'k': 1
        },
        'best_performance': {
            'label': f"最佳精簡模型 (k={best_row['k']}: {best_row['Algorithm']})",
            'intercept': round(float(m_best.intercept_), 2),
            'coef': {feat: round(float(coef), 4) for feat, coef in zip(m_best_feats, m_best.coef_)},
            'k': int(best_row['k'])
        },
        'standard_5_feature': {
            'label': f"5 特徵折衷模型 (k=5)",
            'intercept': round(float(m5.intercept_), 2),
            'coef': {feat: round(float(coef), 4) for feat, coef in zip(m5_feats, m5.coef_)},
            'k': 5
        },
        'full_feature': {
            'label': f"全特徵模型 (全部 12 項特徵)",
            'intercept': round(float(m_full.intercept_), 2),
            'coef': {feat: round(float(coef), 4) for feat, coef in zip(feature_cols, m_full.coef_)},
            'k': len(feature_cols)
        }
    }

    all_export_data[str(rs)] = {
        'meta': {
            'best_k': int(best_row['k']),
            'best_rmse': f"${best_row['RMSE']:,.2f}",
            'best_r2': f"{best_row['R2']:.4f}",
            'best_features': best_row['Selected Features'],
            'k1_rmse': f"${k1_row['RMSE']:,.2f}",
            'k1_r2': f"{k1_row['R2']:.4f}",
            'k1_feature': m1_feats[0],
            'k_full_rmse': f"${k_full_row['RMSE']:,.2f}",
            'k_full_r2': f"{k_full_row['R2']:.4f}",
            'total_features': len(feature_cols)
        },
        'models': models_export,
        'algorithms': algo_export_data
    }

# Save full comparison CSV
final_df = pd.concat(all_comparisons, ignore_index=True)
final_df.to_csv('car_model_comparison.csv', index=False)
print("Saved car_model_comparison.csv")

# Generate High-Res 300 DPI Master Plot for RS=42
rs42_df = final_df[final_df['RandomState'] == 42]
fig, axes = plt.subplots(1, 2, figsize=(15, 6))
methods_to_plot = ['Lasso (L1 Ranking)', 'Forward SFS', 'RFE', 'ElasticNet Ranking', 'Exhaustive Search']
palette = sns.color_palette('tab10', len(methods_to_plot))
markers = ['o', 's', '^', 'D', 'v']

for idx, m_name in enumerate(methods_to_plot):
    sub = rs42_df[rs42_df['Algorithm'] == m_name].sort_values('k')
    axes[0].plot(sub['k'], sub['RMSE'], marker=markers[idx], label=m_name, color=palette[idx], linewidth=2.2, markersize=7)
    axes[1].plot(sub['k'], sub['R2'], marker=markers[idx], label=m_name, color=palette[idx], linewidth=2.2, markersize=7)

axes[0].set_title('Cross-Algorithm Comparison: RMSE by Number of Features (Car MSRP)', fontsize=12, fontweight='bold')
axes[0].set_xlabel('Number of Features (k)', fontweight='bold')
axes[0].set_ylabel('RMSE in USD ($) (Lower is Better)', fontweight='bold')
axes[0].set_xticks(range(1, 13))
axes[0].legend(fontsize=9, loc='upper right')
axes[0].grid(True, linestyle='--', alpha=0.5)

axes[1].set_title('Cross-Algorithm Comparison: R-squared by Number of Features (Car MSRP)', fontsize=12, fontweight='bold')
axes[1].set_xlabel('Number of Features (k)', fontweight='bold')
axes[1].set_ylabel('R-squared (Higher is Better)', fontweight='bold')
axes[1].set_xticks(range(1, 13))
axes[1].legend(fontsize=9, loc='lower right')
axes[1].grid(True, linestyle='--', alpha=0.5)

plt.tight_layout()
plt.savefig('car_feature_selection_comparison.png', dpi=300)
plt.close()
print("Saved car_feature_selection_comparison.png (300 DPI)")

# Compute feature statistics for interactive sliders
feature_stats = {}
for col in feature_cols:
    feature_stats[col] = {
        'name': FEATURE_INFO.get(col, {}).get('name', col),
        'desc': FEATURE_INFO.get(col, {}).get('desc', ''),
        'unit': FEATURE_INFO.get(col, {}).get('unit', ''),
        'min': FEATURE_INFO.get(col, {}).get('min', round(float(df[col].min()), 2)),
        'max': FEATURE_INFO.get(col, {}).get('max', round(float(df[col].max()), 2)),
        'mean': round(float(df[col].mean()), 2),
        'median': round(float(df[col].median()), 2),
        'step': FEATURE_INFO.get(col, {}).get('step', 1),
        'default': FEATURE_INFO.get(col, {}).get('default', round(float(df[col].median()), 2))
    }

# Save serialized models and full artifacts
joblib.dump({
    'models': all_export_data,
    'feature_info': FEATURE_INFO,
    'vif_initial': vif_initial
}, 'car_feature_selection_models.joblib')
print("Saved car_feature_selection_models.joblib")

# Export complete JSON for web consumption
corr_df = df[feature_cols + [target_col]].corr().round(3)
full_web_json = {
    'features': feature_stats,
    'vif': vif_initial,
    'corr': {
        'columns': list(corr_df.columns),
        'values': corr_df.values.tolist()
    },
    'data': all_export_data
}

with open('car_metadata.json', 'w', encoding='utf-8') as f:
    json.dump(full_web_json, f, ensure_ascii=False, indent=2)
print("Saved car_metadata.json")
print("Car Features & MSRP pipeline finished successfully!")
