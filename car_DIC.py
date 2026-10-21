# ============================================================
# CAR FEATURES & MSRP - MODEL B
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
df = pd.read_csv("car.csv")
print(f"Dataset shape before cleaning: {df.shape}")

# Data Cleaning
df = df.dropna(subset=['Engine HP', 'Engine Cylinders', 'Number of Doors']).copy()
df.loc[df['highway MPG'] > 150, 'highway MPG'] = 34  # Fix single typo

# Feature Engineering
df['is_luxury'] = df['Market Category'].fillna('').apply(lambda x: 1 if 'Luxury' in x else 0)
df['is_performance'] = df['Market Category'].fillna('').apply(lambda x: 1 if 'Performance' in x else 0)
df['is_automatic'] = df['Transmission Type'].apply(lambda x: 1 if 'AUTOMATIC' in str(x).upper() else 0)
df['is_awd'] = df['Driven_Wheels'].apply(lambda x: 1 if 'all wheel' in str(x).lower() or 'four wheel' in str(x).lower() else 0)
df['is_large'] = df['Vehicle Size'].apply(lambda x: 1 if x == 'Large' else 0)

target_col = "MSRP"
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

print(f"Cleaned dataset shape: {df.shape}")
print("Checking missing values:", df[feature_cols + [target_col]].isnull().sum().sum())

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

# 4. Multicollinearity Diagnosis & Iterative VIF Elimination
print("\n--- Initial VIF Table (Model A: Full 12 Features) ---")
init_vif = calculate_vif(X_train)
print(init_vif.round(3))

# Systematic elimination:
# 1. highway MPG has severe collinearity with city mpg (r = 0.887, VIF = 9.791 > 5.0) -> remove highway MPG
# 2. Engine Cylinders has severe collinearity with Engine HP (r = 0.774, VIF = 4.92, pushing HP to VIF 6.54) -> remove Engine Cylinders
# After removing highway MPG and Engine Cylinders, all 10 remaining features have VIF <= 2.89 (all <= 5.0).
selected_features = list(feature_cols)

# Drop highway MPG
selected_features.remove('highway MPG')
print(f"\nStep 1: Removed 'highway MPG' (VIF was {init_vif.loc[init_vif['Feature']=='highway MPG', 'VIF'].values[0]:.2f})")

# Drop Engine Cylinders
vif_step1 = calculate_vif(X_train[selected_features])
print("Step 1 VIF Table:")
print(vif_step1.round(3))

selected_features.remove('Engine Cylinders')
print(f"\nStep 2: Removed 'Engine Cylinders' (co-linear with Engine HP, resolves Engine HP VIF from 6.54 to 2.89)")

final_vif = calculate_vif(X_train[selected_features])
print("\nSelected features for Car Features Model B (All VIF <= 5.0):")
print(selected_features)
print("\nFinal VIF Table:")
print(final_vif.round(3))

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
print(f"Test RMSE: ${rmse_test:,.2f}")
print(f"Test MAE:  ${mae_test:,.2f}")

# 5-fold Cross Validation
cv_scores = cross_val_score(LinearRegression(), X_train[selected_features], y_train, cv=5, scoring="r2")
print(f"5-Fold CV Mean R^2: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")

# 6. Deployment
joblib.dump({
    "model": model_b,
    "selected_features": selected_features,
    "r2_test": r2_test,
    "rmse_test": rmse_test
}, "car_model_b.joblib")

print("Car Model B saved to car_model_b.joblib")
