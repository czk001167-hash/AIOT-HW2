# ============================================================
# BOSTON HOUSING - MODEL B
# Multiple Linear Regression with Multicollinearity Analysis
# CRISP-DM Workflow
# ============================================================

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import joblib

from sklearn.model_selection import train_test_split, KFold, cross_val_score
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
from statsmodels.stats.outliers_influence import variance_inflation_factor
import statsmodels.api as sm

# 1. Load Data
df = pd.read_csv("BostonHousing.csv")
if 'chas' in df.columns:
    df['chas'] = df['chas'].astype(str).str.replace('"', '').astype(float)

target_col = "medv"
feature_cols = [c for c in df.columns if c != target_col]

print(f"Dataset shape: {df.shape}")
print("Checking missing values:", df.isnull().sum().sum())

# 2. Data Preparation
X = df[feature_cols]
y = df[target_col]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.20, random_state=42
)

# 3. VIF Function
def calculate_vif(X_data):
    X_const = sm.add_constant(X_data, has_constant="add")
    results = []
    for i, column in enumerate(X_const.columns):
        if column == "const":
            continue
        results.append({
            "Feature": column,
            "VIF": variance_inflation_factor(X_const.to_numpy(), i)
        })
    return pd.DataFrame(results).sort_values("VIF", ascending=False).reset_index(drop=True)

# 4. Iterative VIF Elimination (Threshold = 5.0)
selected_features = list(X_train.columns)
vif_threshold = 5.0

print("\n--- Initial VIF Table ---")
init_vif = calculate_vif(X_train)
print(init_vif.round(3))

while len(selected_features) > 1:
    vif_table = calculate_vif(X_train[selected_features])
    highest_vif = vif_table.iloc[0]["VIF"]
    highest_feature = vif_table.iloc[0]["Feature"]

    if not np.isfinite(highest_vif) or highest_vif > vif_threshold:
        print(f"Removing {highest_feature} (VIF = {highest_vif:.3f})")
        selected_features.remove(highest_feature)
    else:
        break

print("\nSelected features for Boston Housing Model B (All VIF <= 5.0):")
print(selected_features)
print("\nFinal VIF Table:")
print(calculate_vif(X_train[selected_features]).round(3))

# 5. Modeling & Evaluation
model_b = LinearRegression()
model_b.fit(X_train[selected_features], y_train)

y_pred_train = model_b.predict(X_train[selected_features])
y_pred_test = model_b.predict(X_test[selected_features])

r2_train = r2_score(y_train, y_pred_train)
r2_test = r2_score(y_test, y_pred_test)
rmse_test = np.sqrt(mean_squared_error(y_test, y_pred_test))
mae_test = mean_absolute_error(y_test, y_pred_test)

print(f"\nModel B Performance:")
print(f"Train R^2: {r2_train:.4f}")
print(f"Test R^2:  {r2_test:.4f}")
print(f"Test RMSE: {rmse_test:.4f} ($1,000s)")
print(f"Test MAE:  {mae_test:.4f} ($1,000s)")

# 5-fold Cross Validation
cv_scores = cross_val_score(LinearRegression(), X_train[selected_features], y_train, cv=5, scoring="r2")
print(f"5-Fold CV Mean R^2: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")

# 6. Deployment
joblib.dump({
    "model": model_b,
    "selected_features": selected_features,
    "r2_test": r2_test,
    "rmse_test": rmse_test
}, "boston_model_b.joblib")

print("Boston Model B saved to boston_model_b.joblib")
