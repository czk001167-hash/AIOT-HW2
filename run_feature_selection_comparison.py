import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split, KFold
from sklearn.linear_model import LinearRegression, LassoCV
from sklearn.preprocessing import StandardScaler
from sklearn.feature_selection import RFE, SelectKBest, f_regression, SequentialFeatureSelector
from sklearn.metrics import mean_squared_error, r2_score
import statsmodels.api as sm
from statsmodels.stats.outliers_influence import variance_inflation_factor

# Aesthetics
sns.set_theme(style='whitegrid')
plt.rcParams.update({'font.sans-serif': 'Arial', 'font.size': 11})

# 1. Load Data
df = pd.read_csv('50_Startups.csv')
df_encoded = pd.get_dummies(df, columns=['State'], drop_first=True)
feature_cols = [c for c in df_encoded.columns if c != 'Profit']

X = df_encoded[feature_cols]
y = df_encoded['Profit']

def run_experiment(rs, out_prefix):
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.20, random_state=rs)
    
    cv = KFold(n_splits=5, shuffle=True, random_state=rs)
    scaler = StandardScaler()
    X_tr_sc = pd.DataFrame(scaler.fit_transform(X_train), columns=feature_cols)
    
    methods = {}
    
    # 1. SelectKBest (F-score)
    skb = SelectKBest(f_regression, k='all').fit(X_train, y_train)
    skb_ranked = list(pd.Series(skb.scores_, index=feature_cols).sort_values(ascending=False).index)
    methods['SelectKBest (Filter)'] = {k: skb_ranked[:k] for k in range(1, 6)}
    
    # 2. RFE (Standardized OLS Wrapper)
    rfe_sub = {}
    for k in range(1, 6):
        rfe = RFE(LinearRegression(), n_features_to_select=k).fit(X_tr_sc, y_train)
        rfe_sub[k] = list(X_train.columns[rfe.support_])
    methods['RFE (Wrapper)'] = rfe_sub
    
    # 3. Sequential Forward Selection (SFS Wrapper)
    sfs_sub = {}
    for k in range(1, 5):
        sfs = SequentialFeatureSelector(LinearRegression(), n_features_to_select=k, direction='forward', scoring='r2', cv=cv)
        sfs.fit(X_train, y_train)
        sfs_sub[k] = list(X_train.columns[sfs.get_support()])
    sfs_sub[5] = feature_cols
    methods['Sequential Selection (SFS)'] = sfs_sub
    
    # 4. Lasso (Embedded L1 Regularization)
    lasso = LassoCV(cv=cv, max_iter=50000, random_state=rs).fit(X_tr_sc, y_train)
    lasso_ranked = list(pd.Series(np.abs(lasso.coef_), index=feature_cols).sort_values(ascending=False).index)
    methods['Lasso (Embedded)'] = {k: lasso_ranked[:k] for k in range(1, 6)}
    
    # 5. VIF-based Selection (Multicollinearity Elimination)
    rem = list(feature_cols)
    vif_sub = {5: list(feature_cols)}
    while len(rem) > 1:
        Xc = sm.add_constant(X_train[rem], has_constant='add')
        vifs = pd.Series([variance_inflation_factor(Xc.values, i) for i in range(1, Xc.shape[1])], index=rem)
        worst = vifs.idxmax()
        rem.remove(worst)
        vif_sub[len(rem)] = list(rem)
    methods['VIF Multicollinearity'] = vif_sub
    
    # Evaluation
    rows = []
    for m_name, subsets in methods.items():
        for k in range(1, 6):
            feats = subsets[k]
            model = LinearRegression().fit(X_train[feats], y_train)
            pred = model.predict(X_test[feats])
            rmse = np.sqrt(mean_squared_error(y_test, pred))
            r2 = r2_score(y_test, pred)
            rows.append({
                'Algorithm': m_name,
                'Number of Features': k,
                'Selected Features': feats,
                'RMSE': rmse,
                'R-squared': r2
            })
            
    res_df = pd.DataFrame(rows)
    res_df.to_csv(f'{out_prefix}_results.csv', index=False)
    
    # 1. Individual 2-panel plot per algorithm (matching user's format)
    fig, axes = plt.subplots(len(methods), 2, figsize=(14, 4 * len(methods)))
    for idx, (m_name, sub_df) in enumerate(res_df.groupby('Algorithm', sort=False)):
        ax1 = axes[idx, 0]
        ax2 = axes[idx, 1]
        
        # RMSE plot
        ax1.plot(sub_df['Number of Features'], sub_df['RMSE'], marker='o', color='#1f77b4', linewidth=2.2, markersize=8)
        ax1.set_title(f'{m_name}: RMSE by Number of Features', fontsize=12, fontweight='bold')
        ax1.set_xlabel('Number of Features')
        ax1.set_ylabel('RMSE')
        ax1.set_xticks(range(1, 6))
        
        min_rmse = sub_df['RMSE'].min()
        min_k = sub_df.loc[sub_df['RMSE'] == min_rmse, 'Number of Features'].values[0]
        ax1.plot(min_k, min_rmse, marker='*', markersize=14, color='red')
        ax1.annotate(f'Optimal k={min_k}\nRMSE: {min_rmse:.1f}', 
                     (min_k, min_rmse),
                     textcoords='offset points', xytext=(0, 15), ha='center',
                     fontweight='bold', color='#b22222',
                     bbox=dict(boxstyle='round,pad=0.2', facecolor='yellow', alpha=0.3))
        
        # R2 plot
        ax2.plot(sub_df['Number of Features'], sub_df['R-squared'], marker='o', color='#2ca02c', linewidth=2.2, markersize=8)
        ax2.set_title(f'{m_name}: R-squared by Number of Features', fontsize=12, fontweight='bold')
        ax2.set_xlabel('Number of Features')
        ax2.set_ylabel('R-squared')
        ax2.set_xticks(range(1, 6))
        
        max_r2 = sub_df['R-squared'].max()
        max_k = sub_df.loc[sub_df['R-squared'] == max_r2, 'Number of Features'].values[0]
        ax2.plot(max_k, max_r2, marker='*', markersize=14, color='green')
        ax2.annotate(f'Max k={max_k}\nR²: {max_r2:.4f}', 
                     (max_k, max_r2),
                     textcoords='offset points', xytext=(0, -25), ha='center',
                     fontweight='bold', color='#006400',
                     bbox=dict(boxstyle='round,pad=0.2', facecolor='lightgreen', alpha=0.3))
        
    plt.tight_layout()
    plt.savefig(f'{out_prefix}_all_algorithms_panel.png', dpi=300)
    plt.close()
    
    # 2. Master Comparison Plot
    fig, axes = plt.subplots(1, 2, figsize=(15, 6))
    palette = sns.color_palette('tab10', len(methods))
    markers = ['o', 's', '^', 'D', 'v']
    
    for i, (m_name, sub_df) in enumerate(res_df.groupby('Algorithm', sort=False)):
        axes[0].plot(sub_df['Number of Features'], sub_df['RMSE'], marker=markers[i], label=m_name, color=palette[i], linewidth=2.2, markersize=7)
        axes[1].plot(sub_df['Number of Features'], sub_df['R-squared'], marker=markers[i], label=m_name, color=palette[i], linewidth=2.2, markersize=7)
    
    axes[0].set_title('Cross-Algorithm Comparison: RMSE by Number of Features', fontsize=13, fontweight='bold')
    axes[0].set_xlabel('Number of Features', fontweight='bold')
    axes[0].set_ylabel('RMSE (Lower is Better)', fontweight='bold')
    axes[0].set_xticks(range(1, 6))
    axes[0].legend(fontsize=9, loc='upper left')
    
    axes[1].set_title('Cross-Algorithm Comparison: R-squared by Number of Features', fontsize=13, fontweight='bold')
    axes[1].set_xlabel('Number of Features', fontweight='bold')
    axes[1].set_ylabel('R-squared (Higher is Better)', fontweight='bold')
    axes[1].set_xticks(range(1, 6))
    axes[1].legend(fontsize=9, loc='lower left')
    
    plt.tight_layout()
    plt.savefig(f'{out_prefix}_master_comparison.png', dpi=300)
    plt.close()
    
    print(f'Successfully completed run for {out_prefix}')

if __name__ == '__main__':
    run_experiment(rs=0, out_prefix='feature_selection_rs0')
    run_experiment(rs=42, out_prefix='feature_selection_rs42')
