# ============================================================
# 50 STARTUPS - MODEL B
# Multiple Linear Regression with Multicollinearity Analysis
# CRISP-DM Workflow
# ============================================================

# Install if necessary:
# pip install pandas numpy matplotlib seaborn scikit-learn statsmodels joblib

# ============================================================
# 1. BUSINESS UNDERSTANDING
# ============================================================
# Objective:
# Predict startup Profit while reducing multicollinearity
# among independent variables.

# ============================================================
# 2. DATA UNDERSTANDING
# ============================================================
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import joblib

from sklearn.model_selection import train_test_split, KFold, cross_val_score
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LinearRegression
from sklearn.metrics import (
    r2_score,
    mean_absolute_error,
    mean_squared_error
)

from statsmodels.stats.outliers_influence import variance_inflation_factor
import statsmodels.api as sm

# Load data
df = pd.read_csv("50_Startups.csv")

print("\nFirst 5 rows:")
print(df.head())

print("\nDataset shape:", df.shape)
print("\nData types:")
print(df.dtypes)

print("\nMissing values:")
print(df.isnull().sum())

print("\nDuplicate rows:", df.duplicated().sum())

print("\nDescriptive statistics:")
print(df.describe())

# Basic data validation
required_columns = [
    "R&D Spend",
    "Administration",
    "Marketing Spend",
    "State",
    "Profit"
]

missing_columns = set(required_columns) - set(df.columns)

if missing_columns:
    raise ValueError(f"Missing required columns: {missing_columns}")

if df[required_columns].isnull().any().any():
    raise ValueError(
        "Missing values detected. Clean or impute them before modeling."
    )

# Correlation heatmap for numeric predictors
numeric_features = [
    "R&D Spend",
    "Administration",
    "Marketing Spend"
]

plt.figure(figsize=(8, 5))
sns.heatmap(
    df[numeric_features].corr(),
    annot=True,
    cmap="coolwarm",
    vmin=-1,
    vmax=1,
    fmt=".2f"
)
plt.title("Correlation Between Numeric Predictors")
plt.tight_layout()
plt.show()


# ============================================================
# 3. DATA PREPARATION
# ============================================================
X = df.drop(columns=["Profit"])
y = df["Profit"]

# Split before fitting feature selection or preprocessing.
# This prevents test-set information from influencing selection.
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42
)

numeric_features = [
    "R&D Spend",
    "Administration",
    "Marketing Spend"
]
categorical_features = ["State"]

# Fit one-hot encoding on training data only
encoder = OneHotEncoder(
    drop="first",
    handle_unknown="ignore",
    sparse_output=False
)

X_train_state = encoder.fit_transform(X_train[categorical_features])
X_test_state = encoder.transform(X_test[categorical_features])

state_names = encoder.get_feature_names_out(categorical_features)

X_train_encoded = pd.concat(
    [
        X_train[numeric_features].reset_index(drop=True),
        pd.DataFrame(X_train_state, columns=state_names)
    ],
    axis=1
)

X_test_encoded = pd.concat(
    [
        X_test[numeric_features].reset_index(drop=True),
        pd.DataFrame(X_test_state, columns=state_names)
    ],
    axis=1
)

# ============================================================
# VIF FUNCTION
# ============================================================
def calculate_vif(X_data):
    """Calculate VIF for predictors, excluding the intercept."""
    X_const = sm.add_constant(X_data, has_constant="add")

    results = []

    for i, column in enumerate(X_const.columns):
        if column == "const":
            continue

        results.append({
            "Feature": column,
            "VIF": variance_inflation_factor(
                X_const.to_numpy(), i
            )
        })

    return pd.DataFrame(results).sort_values(
        "VIF", ascending=False
    ).reset_index(drop=True)


# ============================================================
# MODEL B: ITERATIVE VIF-BASED FEATURE SELECTION
# ============================================================
# Rule:
# Remove the predictor with the highest VIF above 5,
# then recalculate VIF until all remaining VIF values are <= 5.
#
# This is a practical heuristic, not a guarantee of optimal
# predictive performance. State dummy variables are included.

selected_features = list(X_train_encoded.columns)
vif_threshold = 5.0

print("\nInitial VIF:")
print(calculate_vif(X_train_encoded).round(3))

while len(selected_features) > 1:
    vif_table = calculate_vif(
        X_train_encoded[selected_features]
    )

    highest_vif = vif_table.iloc[0]["VIF"]
    highest_feature = vif_table.iloc[0]["Feature"]

    if not np.isfinite(highest_vif) or highest_vif > vif_threshold:
        # If VIF is infinite, remove the implicated predictor.
        # Recheck each iteration before proceeding.
        print(
            f"\nRemoving {highest_feature}: "
            f"VIF = {highest_vif:.3f}"
            if np.isfinite(highest_vif)
            else f"\nRemoving {highest_feature}: VIF is infinite"
        )
        selected_features.remove(highest_feature)
    else:
        break

print("\nSelected features for Model B:")
print(selected_features)

print("\nFinal VIF:")
print(
    calculate_vif(
        X_train_encoded[selected_features]
    ).round(3)
)

# ============================================================
# 4. MODELING
# ============================================================
# Rebuild a pipeline so preprocessing is refitted inside each
# cross-validation fold and at final model fitting.
#
# The selected feature list is learned from training data only.
# The original State encoder's categories are reused.

def transform_selected_features(X_raw):
    state_array = encoder.transform(X_raw[["State"]])

    transformed = pd.concat(
        [
            X_raw[numeric_features].reset_index(drop=True),
            pd.DataFrame(state_array, columns=state_names)
        ],
        axis=1
    )

    return transformed[selected_features]


X_train_final = transform_selected_features(X_train)
X_test_final = transform_selected_features(X_test)

model_b = LinearRegression()
model_b.fit(X_train_final, y_train.reset_index(drop=True))

y_pred = model_b.predict(X_test_final)

# Regression equation coefficients
coefficients = pd.DataFrame({
    "Feature": selected_features,
    "Coefficient": model_b.coef_
})

print("\nModel B intercept:")
print(round(model_b.intercept_, 4))

print("\nModel B coefficients:")
print(coefficients.to_string(index=False))


# ============================================================
# 5. EVALUATION
# ============================================================
r2 = r2_score(y_test, y_pred)
mae = mean_absolute_error(y_test, y_pred)
rmse = np.sqrt(mean_squared_error(y_test, y_pred))

print("\nModel B test performance:")
print(f"R-squared (R²): {r2:.4f}")
print(f"MAE:            {mae:,.2f}")
print(f"RMSE:           {rmse:,.2f}")

results = pd.DataFrame({
    "Actual Profit": y_test.to_numpy(),
    "Predicted Profit": y_pred,
    "Residual": y_test.to_numpy() - y_pred
})

print("\nActual vs Predicted:")
print(results.round(2).to_string(index=False))

# Residual plot
residuals = y_test.to_numpy() - y_pred

fig, axes = plt.subplots(1, 2, figsize=(12, 4))

axes[0].scatter(y_pred, residuals)
axes[0].axhline(0, color="red", linestyle="--")
axes[0].set_xlabel("Predicted Profit")
axes[0].set_ylabel("Residual")
axes[0].set_title("Model B: Residual Plot")

axes[1].scatter(y_test, y_pred)
low = min(y_test.min(), y_pred.min())
high = max(y_test.max(), y_pred.max())
axes[1].plot([low, high], [low, high], "r--")
axes[1].set_xlabel("Actual Profit")
axes[1].set_ylabel("Predicted Profit")
axes[1].set_title("Model B: Actual vs Predicted")

plt.tight_layout()
plt.show()

# Cross-validation on the training data using the selected
# features. Note that feature selection above occurs once on
# the training set, so CV is an approximate assessment of the
# selected model, not a fully nested feature-selection estimate.
cv = KFold(n_splits=5, shuffle=True, random_state=42)

cv_scores = cross_val_score(
    LinearRegression(),
    X_train_final,
    y_train.reset_index(drop=True),
    cv=cv,
    scoring="r2"
)

print("\n5-fold CV R² scores:", np.round(cv_scores, 4))
print(f"Mean CV R²: {cv_scores.mean():.4f}")
print(f"Std CV R²:  {cv_scores.std():.4f}")


# ============================================================
# 6. DEPLOYMENT
# ============================================================
# Save model, encoder, and selected feature names together.
joblib.dump(
    {
        "model": model_b,
        "encoder": encoder,
        "numeric_features": numeric_features,
        "state_names": list(state_names),
        "selected_features": selected_features
    },
    "startup_model_b.joblib"
)

print("\nModel B saved to startup_model_b.joblib")


# Example prediction for a new startup
saved = joblib.load("startup_model_b.joblib")

new_startup = pd.DataFrame([{
    "R&D Spend": 100000,
    "Administration": 120000,
    "Marketing Spend": 200000,
    "State": "California"
}])

new_state = saved["encoder"].transform(new_startup[["State"]])

new_encoded = pd.concat(
    [
        new_startup[saved["numeric_features"]].reset_index(drop=True),
        pd.DataFrame(
            new_state,
            columns=saved["state_names"]
        )
    ],
    axis=1
)

new_encoded = new_encoded[saved["selected_features"]]

predicted_profit = saved["model"].predict(new_encoded)[0]

print(f"Predicted profit: ${predicted_profit:,.2f}")