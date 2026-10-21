import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split, KFold
from sklearn.linear_model import LinearRegression, LassoCV
from sklearn.preprocessing import StandardScaler
from sklearn.feature_selection import RFE, SelectKBest, f_regression, SequentialFeatureSelector
from sklearn.metrics import mean_squared_error, r2_score
import statsmodels.api as sm
from statsmodels.stats.outliers_influence import variance_inflation_factor

# Load dataset
df = pd.read_csv('50_Startups.csv')
df_encoded = pd.get_dummies(df, columns=['State'], drop_first=True)
feature_cols = [c for c in df_encoded.columns if c != 'Profit']

X = df_encoded[feature_cols]
y = df_encoded['Profit']

# We can run for rs=0 (matching user screenshot) and rs=42 (original main.py)
for rs in [0, 42]:
    prefix = f'rs{rs}'
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.20, random_state=rs)
    cv = KFold(n_splits=5, shuffle=True, random_state=rs)
    scaler = StandardScaler()
    X_tr_sc = pd.DataFrame(scaler.fit_transform(X_train), columns=feature_cols)
    
    # 1. SelectKBest
    skb = SelectKBest(f_regression, k='all').fit(X_train, y_train)
    skb_order = list(pd.Series(skb.scores_, index=feature_cols).sort_values(ascending=False).index)
    
    # 2. RFE (standardized)
    rfe_subsets = {}
    for k in range(1, 6):
        rfe = RFE(LinearRegression(), n_features_to_select=k).fit(X_tr_sc, y_train)
        rfe_subsets[k] = list(X_train.columns[rfe.support_])
        
    # 3. SFS
    sfs_subsets = {}
    for k in range(1, 5):
        sfs = SequentialFeatureSelector(LinearRegression(), n_features_to_select=k, direction='forward', scoring='r2', cv=cv)
        sfs.fit(X_train, y_train)
        sfs_subsets[k] = list(X_train.columns[sfs.get_support()])
    sfs_subsets[5] = feature_cols
    
    # 4. Lasso
    lasso = LassoCV(cv=cv, max_iter=50000, random_state=rs).fit(X_tr_sc, y_train)
    lasso_order = list(pd.Series(np.abs(lasso.coef_), index=feature_cols).sort_values(ascending=False).index)
    
    # 5. VIF backward
    rem = list(feature_cols)
    vif_subsets = {5: list(feature_cols)}
    while len(rem) > 1:
        Xc = sm.add_constant(X_train[rem], has_constant='add')
        vifs = pd.Series([variance_inflation_factor(Xc.values, i) for i in range(1, Xc.shape[1])], index=rem)
        worst = vifs.idxmax()
        rem.remove(worst)
        vif_subsets[len(rem)] = list(rem)
        
    algo_dict = {
        'SelectKBest': {k: skb_order[:k] for k in range(1, 6)},
        'RFE': rfe_subsets,
        'Sequential_Selection': sfs_subsets,
        'Lasso': {k: lasso_order[:k] for k in range(1, 6)},
        'VIF': vif_subsets
    }
    
    all_algo_metrics = {}
    
    for algo_name, subsets in algo_dict.items():
        records = []
        for k in range(1, 6):
            feats = subsets[k]
            model = LinearRegression().fit(X_train[feats], y_train)
            pred = model.predict(X_test[feats])
            rmse = np.sqrt(mean_squared_error(y_test, pred))
            r2 = r2_score(y_test, pred)
            records.append({
                'Number of Features': k,
                'Selected Features': feats,
                'RMSE': rmse,
                'R-squared': r2
            })
        algo_df = pd.DataFrame(records)
        all_algo_metrics[algo_name] = algo_df
        
        # Save CSV for this algorithm
        algo_df.to_csv(f'{prefix}_{algo_name}_table.csv', index=False)
        
        # Generate plot matching exact style of user's image
        fig, axes = plt.subplots(1, 2, figsize=(10, 4.5))
        
        # RMSE plot
        axes[0].plot(algo_df['Number of Features'], algo_df['RMSE'], marker='o', color='#1f77b4')
        axes[0].set_title('RMSE by Number of Features', fontsize=12)
        axes[0].set_xlabel('Number of Features')
        axes[0].set_ylabel('RMSE')
        axes[0].set_xlim(0.8, 5.2)
        
        # R-squared plot
        axes[1].plot(algo_df['Number of Features'], algo_df['R-squared'], marker='o', color='#1f77b4')
        axes[1].set_title('R-squared by Number of Features', fontsize=12)
        axes[1].set_xlabel('Number of Features')
        axes[1].set_ylabel('R-squared')
        axes[1].set_xlim(0.8, 5.2)
        
        plt.tight_layout()
        plt.savefig(f'{prefix}_{algo_name}_plot.png', dpi=200)
        plt.close()

print('All plots and tables generated successfully.')
