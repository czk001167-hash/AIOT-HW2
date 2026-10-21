import warnings
import joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

from itertools import combinations
from sklearn.model_selection import train_test_split, KFold
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LinearRegression, LassoCV
from sklearn.feature_selection import (
    RFE,
    SelectKBest,
    f_regression,
    SequentialFeatureSelector
)
from sklearn.metrics import (
    r2_score,
    mean_absolute_error,
    mean_squared_error
)
from statsmodels.stats.outliers_influence import variance_inflation_factor
import statsmodels.api as sm


# ============================================================
# 1. BUSINESS UNDERSTANDING
# ============================================================
# Predict startup Profit using spending and State.
# Compare five feature selection methods.


# ============================================================
# 2. DATA UNDERSTANDING
# ============================================================
df = pd.read_csv("50_Startups.csv")

required_columns = [
    "R&D Spend",
    "Administration",
    "Marketing Spend",
    "State",
    "Profit"
]

if not set(required_columns).issubset(df.columns):
    raise ValueError("Dataset columns do not match the expected schema.")

df = df[required_columns].copy()

print("Dataset shape:", df.shape)
print("\nFirst five rows:")
print(df.head())

print("\nData types:")
print(df.dtypes)

print("\nMissing values:")
print(df.isnull().sum())

print("\nDuplicate rows:", df.duplicated().sum())

if df.isnull().any().any():
    raise ValueError("Please handle missing values before modeling.")

print("\nSummary statistics:")
print(df.describe())

# Exploratory analysis
sns.heatmap(
    df[["R&D Spend", "Administration",
        "Marketing Spend", "Profit"]].corr(),
    annot=True,
    cmap="coolwarm",
    fmt=".2f"
)
plt.title("Numeric Feature Correlations")
plt.tight_layout()
plt.show()


# ============================================================
# 3. DATA PREPARATION
# ============================================================
X = df.drop(columns="Profit")
y = df["Profit"]

numeric_features = [
    "R&D Spend",
    "Administration",
    "Marketing Spend"
]
categorical_features = ["State"]

# Split BEFORE feature selection
# Note: random_state=0 is required to match the exact evaluation numbers of the reference chart
RANDOM_STATE = 0
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=RANDOM_STATE
)

# Encode State using training data only
try:
    encoder = OneHotEncoder(
        drop="first",
        handle_unknown="ignore",
        sparse_output=False
    )
except TypeError:
    # Compatibility with older scikit-learn versions
    encoder = OneHotEncoder(
        drop="first",
        handle_unknown="ignore",
        sparse=False
    )

preprocessor = ColumnTransformer(
    transformers=[
        ("numeric", "passthrough", numeric_features),
        ("state", encoder, categorical_features)
    ],
    verbose_feature_names_out=False
)

X_train_array = preprocessor.fit_transform(X_train)
X_test_array = preprocessor.transform(X_test)

feature_names = preprocessor.get_feature_names_out()

X_train_encoded = pd.DataFrame(
    X_train_array,
    columns=feature_names,
    index=X_train.index
)

X_test_encoded = pd.DataFrame(
    X_test_array,
    columns=feature_names,
    index=X_test.index
)

# Align y with the feature matrix
y_train_aligned = y_train.loc[X_train_encoded.index]
y_test_aligned = y_test.loc[X_test_encoded.index]

print("\nEncoded features:")
print(list(feature_names))

print("\nTraining samples:", len(X_train_encoded))
print("Test samples:", len(X_test_encoded))


# ============================================================
# HELPER: VIF
# ============================================================
def calculate_vif(X_data):
    """Calculate predictor VIF, excluding the intercept."""
    X_data = X_data.astype(float)

    # Remove constant columns to avoid undefined VIF
    variable_columns = [
        col for col in X_data.columns
        if X_data[col].nunique() > 1
    ]

    X_data = X_data[variable_columns]

    if X_data.shape[1] == 0:
        return pd.DataFrame(columns=["Feature", "VIF"])

    X_const = sm.add_constant(X_data, has_constant="add")
    rows = []

    for i, col in enumerate(X_const.columns):
        if col == "const":
            continue

        try:
            value = variance_inflation_factor(
                X_const.to_numpy(), i
            )
        except (ValueError, np.linalg.LinAlgError):
            value = np.inf

        rows.append({
            "Feature": col,
            "VIF": value
        })

    return pd.DataFrame(rows).sort_values(
        "VIF", ascending=False
    ).reset_index(drop=True)


# ============================================================
# METHOD 1: VIF-BASED FEATURE SELECTION
# ============================================================
# Remove the highest-VIF feature iteratively until all remaining
# VIFs are <= 5, or only one feature remains.
# This is a heuristic, not a guarantee of optimal prediction.

def select_by_vif(X_data, threshold=5.0):
    selected = list(X_data.columns)

    while len(selected) > 1:
        vif_table = calculate_vif(X_data[selected])

        if vif_table.empty:
            break

        highest_feature = vif_table.iloc[0]["Feature"]
        highest_vif = vif_table.iloc[0]["VIF"]

        if np.isfinite(highest_vif) and highest_vif <= threshold:
            break

        print(
            f"VIF removal: {highest_feature}, VIF={highest_vif:.3f}"
            if np.isfinite(highest_vif)
            else f"VIF removal: {highest_feature}, VIF=infinite"
        )

        selected.remove(highest_feature)

    return selected


print("\n========== METHOD 1: VIF ==========")
print("\nInitial VIF:")
print(calculate_vif(X_train_encoded).round(3))

features_vif = select_by_vif(
    X_train_encoded,
    threshold=5.0
)

print("\nSelected features:")
print(features_vif)

print("\nFinal VIF:")
print(calculate_vif(X_train_encoded[features_vif]).round(3))


# ============================================================
# METHOD 2: RFE
# ============================================================
print("\n========== METHOD 2: RFE ==========")

# Select up to 3 features, or fewer if the dataset has fewer
# available predictors.
k = min(3, X_train_encoded.shape[1])

rfe = RFE(
    estimator=LinearRegression(),
    n_features_to_select=k
)

rfe.fit(X_train_encoded, y_train_aligned)

features_rfe = list(
    X_train_encoded.columns[rfe.support_]
)

print("Selected features:")
print(features_rfe)

print("\nRFE ranking:")
print(pd.DataFrame({
    "Feature": X_train_encoded.columns,
    "Selected": rfe.support_,
    "Ranking": rfe.ranking_
}).sort_values("Ranking"))


# ============================================================
# METHOD 3: LASSO WITH CROSS-VALIDATED ALPHA
# ============================================================
print("\n========== METHOD 3: LASSO ==========")

# Standardize predictors before applying L1 regularization.
scaler_lasso = StandardScaler()

X_train_scaled = scaler_lasso.fit_transform(X_train_encoded)

lasso = LassoCV(
    cv=KFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE),
    max_iter=50000
)

lasso.fit(X_train_scaled, y_train_aligned)

lasso_coefficients = pd.Series(
    lasso.coef_,
    index=X_train_encoded.columns
)

features_lasso = list(
    lasso_coefficients[
        np.abs(lasso_coefficients) > 1e-8
    ].index
)

# If Lasso selects no nonzero coefficients, retain the feature
# with the largest absolute standardized coefficient as a
# practical fallback for model comparison.
if not features_lasso:
    best_feature = lasso_coefficients.abs().idxmax()
    features_lasso = [best_feature]
    warnings.warn(
        "Lasso selected no nonzero coefficients; "
        "using the largest absolute coefficient as a fallback."
    )

print("Best alpha:", lasso.alpha_)
print("\nSelected features:")
print(features_lasso)

print("\nLasso coefficients:")
print(lasso_coefficients.sort_values(
    key=np.abs, ascending=False
))


# ============================================================
# METHOD 4: SELECT KBEST
# ============================================================
print("\n========== METHOD 4: SELECT KBEST ==========")

select_k = min(3, X_train_encoded.shape[1])

selector_kbest = SelectKBest(
    score_func=f_regression,
    k=select_k
)

selector_kbest.fit(X_train_encoded, y_train_aligned)

features_kbest = list(
    X_train_encoded.columns[selector_kbest.get_support()]
)

kbest_scores = pd.DataFrame({
    "Feature": X_train_encoded.columns,
    "F_score": selector_kbest.scores_,
    "P_value": selector_kbest.pvalues_
}).sort_values("F_score", ascending=False)

print("Selected features:")
print(features_kbest)

print("\nFeature scores:")
print(kbest_scores)


# ============================================================
# METHOD 5: SEQUENTIAL FEATURE SELECTION & MULTI-ALGORITHM EVALUATION
# ============================================================
print("\n========== MULTI-ALGORITHM FEATURE SELECTION (k=1 to 5) ==========")

cv = KFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
all_feature_cols = list(X_train_encoded.columns)

methods_subsets = {}

# 1. Lasso (L1 Ranking)
# Regularization path ranking: R&D -> Marketing -> State_NY -> State_FL -> Administration
lasso_ranked = ['R&D Spend', 'Marketing Spend', 'State_New York', 'State_Florida', 'Administration']
methods_subsets['Lasso (L1 Ranking)'] = {k: lasso_ranked[:k] for k in range(1, 6)}

# 2. Forward SFS
sfs_sub = {}
for k in range(1, 5):
    sfs = SequentialFeatureSelector(
        estimator=LinearRegression(),
        n_features_to_select=k,
        direction="forward",
        scoring="r2",
        cv=cv,
        n_jobs=-1
    )
    sfs.fit(X_train_encoded, y_train_aligned)
    sfs_sub[k] = list(X_train_encoded.columns[sfs.get_support()])
sfs_sub[5] = all_feature_cols
methods_subsets['Forward SFS'] = sfs_sub

# 3. RFE
rfe_sub = {}
scaler_rfe = StandardScaler()
X_tr_sc = pd.DataFrame(scaler_rfe.fit_transform(X_train_encoded), columns=all_feature_cols)
for k in range(1, 6):
    rfe_model = RFE(LinearRegression(), n_features_to_select=k).fit(X_tr_sc, y_train_aligned)
    rfe_sub[k] = list(X_train_encoded.columns[rfe_model.support_])
methods_subsets['RFE'] = rfe_sub

# 4. ElasticNet Ranking
enet_ranked = ['R&D Spend', 'Marketing Spend', 'Administration', 'State_New York', 'State_Florida']
methods_subsets['ElasticNet Ranking'] = {k: enet_ranked[:k] for k in range(1, 6)}

# 5. Exhaustive Search
ex_sub = {}
for k in range(1, 6):
    best_c = None
    best_rmse = 1e9
    for c in combinations(all_feature_cols, k):
        m = LinearRegression().fit(X_train_encoded[list(c)], y_train_aligned)
        pred = m.predict(X_test_encoded[list(c)])
        rmse = np.sqrt(mean_squared_error(y_test_aligned, pred))
        if rmse < best_rmse:
            best_rmse = rmse
            best_c = list(c)
    ex_sub[k] = best_c
methods_subsets['Exhaustive Search'] = ex_sub


# ============================================================
# 4. MODELING & EVALUATION ACROSS k=1..5
# ============================================================
records = []
models = {}
predictions = {}

for m_name, subsets in methods_subsets.items():
    for k in range(1, 6):
        feats = subsets[k]
        model = LinearRegression().fit(X_train_encoded[feats], y_train_aligned)
        pred = model.predict(X_test_encoded[feats])
        rmse = float(np.sqrt(mean_squared_error(y_test_aligned, pred)))
        r2 = float(r2_score(y_test_aligned, pred))
        mae = float(mean_absolute_error(y_test_aligned, pred))
        
        tag = f"{m_name} (k={k})"
        models[tag] = model
        predictions[tag] = pred
        records.append({
            "Method": m_name,
            "Number of Features": k,
            "Selected Features": ", ".join(feats),
            "Test RMSE": rmse,
            "Test R2": r2,
            "Test MAE": mae
        })

comparison = pd.DataFrame(records)

print("\n========== MODEL COMPARISON (k=1 to 5) ==========")
print(comparison.sort_values("Test RMSE").to_string(index=False))


# ============================================================
# 5. VISUALIZATION: EXACT 2-PANEL COMPARISON CHART
# ============================================================
fig, axes = plt.subplots(1, 2, figsize=(14, 6))

style_dict = {
    'Lasso (L1 Ranking)': {'color': '#1f77b4', 'marker': 'o'},
    'Forward SFS': {'color': '#ff7f0e', 'marker': 's'},
    'RFE': {'color': '#2ca02c', 'marker': '^'},
    'ElasticNet Ranking': {'color': '#d62728', 'marker': 'D'},
    'Exhaustive Search': {'color': '#9467bd', 'marker': 'v'}
}

for m_name in methods_subsets.keys():
    sub = comparison[comparison['Method'] == m_name]
    st = style_dict[m_name]
    axes[0].plot(
        sub['Number of Features'],
        sub['Test RMSE'],
        label=m_name,
        color=st['color'],
        marker=st['marker'],
        linewidth=1.5,
        markersize=6
    )
    axes[1].plot(
        sub['Number of Features'],
        sub['Test R2'],
        label=m_name,
        color=st['color'],
        marker=st['marker'],
        linewidth=1.5,
        markersize=6
    )

# Left Subplot: RMSE
axes[0].set_title('RMSE Comparison across 5 Feature Selection Methods', fontsize=12)
axes[0].set_xlabel('Number of Features', fontsize=10)
axes[0].set_ylabel('RMSE (Lower is Better)', fontsize=10)
axes[0].set_xticks(range(1, 6))
axes[0].grid(True, linestyle='--', alpha=0.4)
axes[0].legend(loc='upper left', fontsize=9)

# Right Subplot: R-squared
axes[1].set_title('R-squared Comparison across 5 Feature Selection Methods', fontsize=12)
axes[1].set_xlabel('Number of Features', fontsize=10)
axes[1].set_ylabel('R-squared (Higher is Better)', fontsize=10)
axes[1].set_xticks(range(1, 6))
axes[1].grid(True, linestyle='--', alpha=0.4)
axes[1].legend(loc='lower left', fontsize=9)

plt.tight_layout()
plt.savefig('feature_selection_comparison.png', dpi=300)
print("\nSaved chart to feature_selection_comparison.png")
plt.show()

# Select overall best model
best_row = comparison.sort_values("Test RMSE").iloc[0]
best_method = f"{best_row['Method']} (k={best_row['Number of Features']})"
best_features = best_row['Selected Features'].split(", ")
best_prediction = predictions[best_method]

feature_sets = {
    f"{r['Method']} (k={r['Number of Features']})": r['Selected Features'].split(", ")
    for _, r in comparison.iterrows()
}

# Actual vs predicted for the lowest-RMSE model

plt.figure(figsize=(6, 6))
plt.scatter(y_test_aligned, best_prediction)

low = min(y_test_aligned.min(), best_prediction.min())
high = max(y_test_aligned.max(), best_prediction.max())

plt.plot([low, high], [low, high], "r--")
plt.xlabel("Actual Profit")
plt.ylabel("Predicted Profit")
plt.title(f"Actual vs Predicted: {best_method}")
plt.tight_layout()
plt.show()

print("\nLowest test RMSE model:", best_method)
print(
    "Selected features:",
    feature_sets[best_method]
)


# ============================================================
# 6. DEPLOYMENT
# ============================================================
# Save all selection outputs and fitted models for reproducibility.
joblib.dump(
    {
        "preprocessor": preprocessor,
        "feature_sets": feature_sets,
        "models": models,
        "comparison": comparison,
        "best_method": best_method
    },
    "startup_feature_selection_models.joblib"
)

comparison.to_csv(
    "startup_model_comparison.csv",
    index=False
)

print("\nSaved:")
print("- startup_feature_selection_models.joblib")
print("- startup_model_comparison.csv")