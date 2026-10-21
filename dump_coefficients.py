import pandas as pd
import numpy as np
import json
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression

df = pd.read_csv('50_Startups.csv')
df_enc = pd.get_dummies(df, columns=['State'], drop_first=True)
all_cols = [c for c in df_enc.columns if c != 'Profit']

model_data = {}
for rs in [0, 42]:
    X_tr, X_te, y_tr, y_te = train_test_split(df_enc[all_cols], df_enc['Profit'], test_size=0.2, random_state=rs)
    model_data[rs] = {}
    
    # 1-feature
    m1 = LinearRegression().fit(X_tr[['R&D Spend']], y_tr)
    model_data[rs]['1_feature'] = {'intercept': m1.intercept_, 'coef': dict(zip(['R&D Spend'], m1.coef_))}
    
    # 2-feature
    m2 = LinearRegression().fit(X_tr[['R&D Spend', 'Marketing Spend']], y_tr)
    model_data[rs]['2_feature'] = {'intercept': m2.intercept_, 'coef': dict(zip(['R&D Spend', 'Marketing Spend'], m2.coef_))}
    
    # 3-feature SelectKBest
    cols3 = ['R&D Spend', 'Marketing Spend', 'State_New York']
    m3 = LinearRegression().fit(X_tr[cols3], y_tr)
    model_data[rs]['3_feature'] = {'intercept': m3.intercept_, 'coef': dict(zip(cols3, m3.coef_))}
    
    # 5-feature full
    m5 = LinearRegression().fit(X_tr[all_cols], y_tr)
    model_data[rs]['5_feature'] = {'intercept': m5.intercept_, 'coef': dict(zip(all_cols, m5.coef_))}

print(json.dumps(model_data, indent=2))
