/**
 * 5大特徵選擇演算法分析平台 - 模組化多資料集架構 (Extensible Multi-Dataset Architecture)
 * 支援 50 Startups 與 Boston Housing，且可自由擴充新數據集
 */

// ============================================================
// 1. DATASETS REGISTRY (多資料集核心註冊表)
// 欲新增資料集，僅需於 DATASETS 物件中新增一組配置鍵值即可！
// ============================================================
const DATASETS = {
  "50_startups": {
    id: "50_startups",
    name: "🏢 50 Startups (新創獲利預測)",
    brandTitle: "5大特徵選擇演算法分析平台",
    brandSubtitle: "50 Startups Profit Regression & Multicollinearity Analysis",
    targetName: "預估年度淨利 (Predicted Profit)",
    targetUnitPrefix: "$",
    targetUnitSuffix: "",
    unitName: "美元",
    kRange: [1, 2, 3, 4, 5],
    benchmarkImage: "feature_selection_comparison.png",
    benchmarkTitle: "5大特徵選擇演算法對比基準圖 (50 Startups)",
    benchmarkSubtitle: "在 80/20 資料分割下，跨 5 大特徵選擇演算法於 $k = 1 \sim 5$ 特徵維度的測試集 RMSE 與 $R^2$ 真實評估表現",
    benchmarkInsights: [
      { badge: "●", color: "blue", title: "端點必然重疊 ($k=1, 2, 5$)", desc: "$k=1$ 均選 <code>R&D</code>；$k=2$ 均選 <code>R&D + Marketing</code> (RMSE: 8,198)；$k=5$ 則皆退化為傳統普通最小平方法 (Full OLS, RMSE: 9,138)。" },
      { badge: "▼", color: "purple", title: "窮舉全域最優 ($k=3, 4$)", desc: "<strong>Exhaustive Search</strong> 突破前向貪婪法的巢狀枷鎖，捨棄 Marketing 改選 <code>R&D + Admin + FL</code> 創下全域最低 RMSE (<strong>8,171.65</strong>)。" },
      { badge: "●", color: "cyan", title: "Lasso 稀疏正則折衷 ($k=3, 4$)", desc: "<strong>Lasso (L1 Ranking)</strong> 藉由係數懲罰，優先保留州別虛擬變數並延後納入行政支出，表現顯著優於 SFS 與 RFE。" },
      { badge: "◆", color: "red", title: "貪婪陷阱與過擬合 ($k=3 \to 5$)", desc: "<strong>Forward SFS 與 RFE</strong> 因無法回溯，在 $k=3$ 強行加入行政支出導致測試誤差暴增至 8,804，印證無關特徵造成的維度災難。" }
    ],
    kpi: {
      consensusVal: "100%",
      consensusLabel: "監督式演算法全數鎖定 k=2",
      consensusDesc: "SelectKBest, RFE, SFS, Lasso 均認同最佳子集",
      k1Desc: "單一特徵已解釋 94.6% 變異",
      kMaxDesc: "納入行政支出與州別引入噪聲 (+11.45% 誤差)"
    },
    insights: {
      "0": {
        rmse: "k=2 時 RMSE 達到全域最低點 <strong>$8,198.80</strong>，隨後因引入不具顯著相關特徵，誤差劇增至 <strong>$9,137.99</strong>。",
        r2: "k=2 時 R² 達到峰值 <strong>0.9474 (94.74%)</strong>；k=5 時降至 <strong>0.9347</strong>，證實奧坎剃刀原則 (簡單模型勝過複雜模型)。"
      },
      "42": {
        rmse: "RS=42 下 k=1 僅需 R&D 即可獲得最低測試 RMSE <strong>$7,714.33</strong>，特徵增加到 k=5 誤差膨脹至 <strong>$9,055.96</strong>。",
        r2: "k=1 時 R² 達到 <strong>0.9265</strong>；k=5 全特徵時跌至 <strong>0.8987</strong>，印證小樣本過度參數化導致方差膨脹。"
      }
    },
    fields: [{"key": "R&D Spend", "label": "研發支出 (R&D Spend)", "type": "number", "min": 0, "max": 200000, "step": 1000, "default": 100000, "unit": "$"}, {"key": "Marketing Spend", "label": "行銷支出 (Marketing Spend)", "type": "number", "min": 0, "max": 500000, "step": 2000, "default": 200000, "unit": "$"}, {"key": "Administration", "label": "行政管理支出 (Administration)", "type": "number", "min": 0, "max": 200000, "step": 1000, "default": 120000, "unit": "$"}, {"key": "State", "label": "設立州別 (State)", "type": "select", "options": [{"value": "California", "label": "加州 (California - 基準類別)"}, {"value": "New York", "label": "紐約州 (New York)"}, {"value": "Florida", "label": "佛羅里達州 (Florida)"}], "default": "California"}],
    modelOptions: {"0": [{"value": "2_feature", "label": "🏆 最佳 2 特徵模型 (R&D Spend + Marketing Spend)"}, {"value": "1_feature", "label": "1 特徵模型 (僅憑 R&D Spend)"}, {"value": "3_feature", "label": "3 特徵模型 (R&D + Marketing + State_New York)"}, {"value": "5_feature", "label": "5 特徵全模型 (R&D + Admin + Marketing + FL + NY)"}], "42": [{"value": "1_feature", "label": "🏆 最佳 1 特徵模型 (僅憑 R&D Spend)"}, {"value": "2_feature", "label": "2 特徵模型 (R&D + Marketing Spend)"}, {"value": "3_feature", "label": "3 特徵模型 (R&D + Marketing + State_New York)"}, {"value": "5_feature", "label": "5 特徵全模型 (R&D + Admin + Marketing + FL + NY)"}]},
    parsimony: "最佳 2 特徵模型不僅具有<strong>更高的預測準確度 (R²=0.9474 vs 0.9347)</strong>，而且排除了對獲利幾乎無線性解釋力、且容易引入雜訊的「行政支出」與「設立州別」，大幅降低了商業決策的估算風險。",
    vifConclusion: "在 50 Startups 中，R&D 與 Marketing 存在中度相關但 VIF 均小於 2.5（安全閾值 <= 5.0），屬於良性協同變數，模型無嚴重多重共線性風險。",
    corr: {"columns": ["R&D Spend", "Marketing Spend", "Administration", "Profit (目標)"], "values": [[1.0, 0.724, 0.242, 0.973], [0.724, 1.0, -0.032, 0.748], [0.242, -0.032, 1.0, 0.201], [0.973, 0.748, 0.201, 1.0]]},
    vif: [{"feature": "R&D Spend", "vif": 2.496, "desc": "良好 (安全閥值內 <= 5.0)", "status": "green"}, {"feature": "Marketing Spend", "vif": 2.417, "desc": "良好 (安全閥值內 <= 5.0)", "status": "green"}, {"feature": "Administration", "vif": 1.178, "desc": "極低共線性 (獨立變數)", "status": "green"}],
    corrInsights: [{"dot": "gold", "title": "R&D Spend 與 Profit 呈極高正相關 (r = 0.973)", "desc": "研發支出幾乎直接決定了獲利水準，是回歸模型的核心基石。"}, {"dot": "blue", "title": "Marketing 與 R&D 存在中度共線性 (r = 0.724)", "desc": "高研發的新創往往伴隨較高行銷預算，但兩者聯合建模仍能帶來顯著正向加成。"}, {"dot": "red", "title": "Administration 與 Profit 幾無相關 (r = 0.201)", "desc": "行政支出在回歸中容易造成多重共線性並稀釋其他重要係數的顯著性。"}],
    data: {
  // Random State 0 (Exact match with user screenshot)
  "0": {
    meta: {
      best_k: 2,
      best_rmse: "8,198.80",
      best_r2: "0.9474",
      best_features: "R&D Spend + Marketing Spend",
      k1_rmse: "8,274.87",
      k1_r2: "0.9465",
      k5_rmse: "9,137.99",
      k5_r2: "0.9347"
    },
    models: {
      "1_feature": {
        intercept: 48416.30,
        coef: { "R&D Spend": 0.8516 }
      },
      "2_feature": {
        intercept: 46346.34,
        coef: { "R&D Spend": 0.7886, "Marketing Spend": 0.0326 }
      },
      "3_feature": {
        intercept: 46100.29,
        coef: { "R&D Spend": 0.7859, "Marketing Spend": 0.0333, "State_New York": 864.00 }
      },
      "5_feature": {
        intercept: 42554.17,
        coef: {
          "R&D Spend": 0.7735,
          "Administration": 0.0329,
          "Marketing Spend": 0.0366,
          "State_Florida": -959.28,
          "State_New York": 699.37
        }
      }
    },
    algorithms: {
      "Lasso": {
        name: "Lasso (L1 Ranking)",
        color: "#1f77b4",
        pointStyle: "circle",
        data: [
          { k: 1, features: ["R&D Spend"], rmse: 8274.87, r2: 0.9465, status: "good", desc: "最強正則首選" },
          { k: 2, features: ["R&D Spend", "Marketing Spend"], rmse: 8198.80, r2: 0.9474, status: "gold", desc: "🏆 雙變數最佳" },
          { k: 3, features: ["R&D Spend", "Marketing Spend", "State_New York"], rmse: 8309.06, r2: 0.9460, status: "good", desc: "保留紐約虛擬變數" },
          { k: 4, features: ["R&D Spend", "Marketing Spend", "State_Florida", "State_New York"], rmse: 8409.92, r2: 0.9447, status: "good", desc: "雙州別虛擬變數" },
          { k: 5, features: ["R&D Spend", "Marketing Spend", "Administration", "State_Florida", "State_New York"], rmse: 9137.99, r2: 0.9347, status: "poor", desc: "全特徵退化" }
        ]
      },
      "Sequential_Selection": {
        name: "Forward SFS",
        color: "#ff7f0e",
        pointStyle: "rect",
        data: [
          { k: 1, features: ["R&D Spend"], rmse: 8274.87, r2: 0.9465, status: "good", desc: "前向 CV 最高" },
          { k: 2, features: ["R&D Spend", "Marketing Spend"], rmse: 8198.80, r2: 0.9474, status: "gold", desc: "🏆 雙變數最佳" },
          { k: 3, features: ["R&D Spend", "Administration", "Marketing Spend"], rmse: 8803.78, r2: 0.9394, status: "warn", desc: "前向貪婪陷阱" },
          { k: 4, features: ["R&D Spend", "Administration", "Marketing Spend", "State_Florida"], rmse: 9068.54, r2: 0.9357, status: "warn", desc: "加入佛州" },
          { k: 5, features: ["R&D Spend", "Administration", "Marketing Spend", "State_Florida", "State_New York"], rmse: 9137.99, r2: 0.9347, status: "poor", desc: "全特徵" }
        ]
      },
      "RFE": {
        name: "RFE",
        color: "#2ca02c",
        pointStyle: "triangle",
        data: [
          { k: 1, features: ["R&D Spend"], rmse: 8274.87, r2: 0.9465, status: "good", desc: "標準化權重最高" },
          { k: 2, features: ["R&D Spend", "Marketing Spend"], rmse: 8198.80, r2: 0.9474, status: "gold", desc: "🏆 雙變數最佳" },
          { k: 3, features: ["R&D Spend", "Administration", "Marketing Spend"], rmse: 8803.78, r2: 0.9394, status: "warn", desc: "數值特徵全選" },
          { k: 4, features: ["R&D Spend", "Administration", "Marketing Spend", "State_Florida"], rmse: 9068.54, r2: 0.9357, status: "warn", desc: "保留佛州特徵" },
          { k: 5, features: ["R&D Spend", "Administration", "Marketing Spend", "State_Florida", "State_New York"], rmse: 9137.99, r2: 0.9347, status: "poor", desc: "全特徵" }
        ]
      },
      "ElasticNet": {
        name: "ElasticNet Ranking",
        color: "#d62728",
        pointStyle: "rectRot",
        data: [
          { k: 1, features: ["R&D Spend"], rmse: 8274.87, r2: 0.9465, status: "good", desc: "L1+L2 混合正則首選" },
          { k: 2, features: ["R&D Spend", "Marketing Spend"], rmse: 8198.80, r2: 0.9474, status: "gold", desc: "🏆 雙變數最佳" },
          { k: 3, features: ["R&D Spend", "Marketing Spend", "Administration"], rmse: 8803.78, r2: 0.9394, status: "warn", desc: "行政支出引入微噪" },
          { k: 4, features: ["R&D Spend", "Marketing Spend", "Administration", "State_New York"], rmse: 8997.20, r2: 0.9367, status: "warn", desc: "納入紐約州" },
          { k: 5, features: ["R&D Spend", "Marketing Spend", "Administration", "State_New York", "State_Florida"], rmse: 9137.99, r2: 0.9347, status: "poor", desc: "全特徵" }
        ]
      },
      "Exhaustive_Search": {
        name: "Exhaustive Search",
        color: "#9467bd",
        pointStyle: "triangle",
        data: [
          { k: 1, features: ["R&D Spend"], rmse: 8274.87, r2: 0.9465, status: "good", desc: "單項全域最佳" },
          { k: 2, features: ["R&D Spend", "Marketing Spend"], rmse: 8198.80, r2: 0.9474, status: "gold", desc: "雙變數全域最佳" },
          { k: 3, features: ["R&D Spend", "Administration", "State_Florida"], rmse: 8171.65, r2: 0.9478, status: "gold", desc: "🏆 突破貪婪陷阱 全域最低 RMSE" },
          { k: 4, features: ["R&D Spend", "Administration", "State_Florida", "State_New York"], rmse: 8178.37, r2: 0.9477, status: "gold", desc: "四特徵最優組合" },
          { k: 5, features: ["R&D Spend", "Administration", "Marketing Spend", "State_Florida", "State_New York"], rmse: 9137.99, r2: 0.9347, status: "poor", desc: "全特徵" }
        ]
      },
      "VIF": {
        name: "VIF (Collinearity Diagnostic)",
        color: "#f43f5e",
        pointStyle: "crossRot",
        data: [
          { k: 1, features: ["Marketing Spend"], rmse: 25529.05, r2: 0.4904, status: "poor", desc: "失去 R&D, 預測力潰縮" },
          { k: 2, features: ["Marketing Spend", "State_New York"], rmse: 28603.15, r2: 0.3603, status: "poor", desc: "缺乏核心解釋力" },
          { k: 3, features: ["Administration", "Marketing Spend", "State_New York"], rmse: 31294.43, r2: 0.2342, status: "poor", desc: "誤差持續放大" },
          { k: 4, features: ["Administration", "Marketing Spend", "State_Florida", "State_New York"], rmse: 32175.96, r2: 0.1905, status: "poor", desc: "僅能解釋 19%" },
          { k: 5, features: ["R&D Spend", "Administration", "Marketing Spend", "State_Florida", "State_New York"], rmse: 9137.99, r2: 0.9347, status: "warn", desc: "終納入 R&D Spend" }
        ]
      }
    }
  },

  // Random State 42 (Setting in main.py)
  "42": {
    meta: {
      best_k: 1,
      best_rmse: "7,714.33",
      best_r2: "0.9265",
      best_features: "R&D Spend",
      k1_rmse: "7,714.33",
      k1_r2: "0.9265",
      k5_rmse: "9,055.96",
      k5_r2: "0.8987"
    },
    models: {
      "1_feature": {
        intercept: 49336.67,
        coef: { "R&D Spend": 0.8536 }
      },
      "2_feature": {
        intercept: 45542.39,
        coef: { "R&D Spend": 0.7834, "Marketing Spend": 0.0392 }
      },
      "3_feature": {
        intercept: 45671.89,
        coef: { "R&D Spend": 0.7841, "Marketing Spend": 0.0391, "State_New York": -510.46 }
      },
      "5_feature": {
        intercept: 54028.04,
        coef: {
          "R&D Spend": 0.8056,
          "Administration": -0.0688,
          "Marketing Spend": 0.0299,
          "State_Florida": 938.79,
          "State_New York": 6.99
        }
      }
    },
    algorithms: {
      "Lasso": {
        name: "Lasso (L1 Ranking)",
        color: "#1f77b4",
        pointStyle: "circle",
        data: [
          { k: 1, features: ["R&D Spend"], rmse: 7714.33, r2: 0.9265, status: "gold", desc: "單特徵最佳" },
          { k: 2, features: ["R&D Spend", "Marketing Spend"], rmse: 8206.33, r2: 0.9168, status: "good", desc: "雙變數" },
          { k: 3, features: ["R&D Spend", "Marketing Spend", "Administration"], rmse: 8995.91, r2: 0.9001, status: "warn", desc: "弱正則" },
          { k: 4, features: ["R&D Spend", "Marketing Spend", "Administration", "State_Florida"], rmse: 9055.96, r2: 0.8987, status: "warn", desc: "多變數" },
          { k: 5, features: ["R&D Spend", "Marketing Spend", "Administration", "State_Florida", "State_New York"], rmse: 9055.96, r2: 0.8987, status: "poor", desc: "全特徵" }
        ]
      },
      "Sequential_Selection": {
        name: "Forward SFS",
        color: "#ff7f0e",
        pointStyle: "rect",
        data: [
          { k: 1, features: ["R&D Spend"], rmse: 7714.33, r2: 0.9265, status: "gold", desc: "CV 最佳單項" },
          { k: 2, features: ["R&D Spend", "Marketing Spend"], rmse: 8206.33, r2: 0.9168, status: "good", desc: "雙特徵" },
          { k: 3, features: ["R&D Spend", "Administration", "Marketing Spend"], rmse: 8995.91, r2: 0.9001, status: "warn", desc: "數值全選" },
          { k: 4, features: ["R&D Spend", "Administration", "Marketing Spend", "State_New York"], rmse: 9015.11, r2: 0.8996, status: "warn", desc: "加入紐約" },
          { k: 5, features: ["R&D Spend", "Administration", "Marketing Spend", "State_Florida", "State_New York"], rmse: 9055.96, r2: 0.8987, status: "poor", desc: "全特徵" }
        ]
      },
      "RFE": {
        name: "RFE",
        color: "#2ca02c",
        pointStyle: "triangle",
        data: [
          { k: 1, features: ["R&D Spend"], rmse: 7714.33, r2: 0.9265, status: "gold", desc: "單特徵最佳" },
          { k: 2, features: ["R&D Spend", "Marketing Spend"], rmse: 8206.33, r2: 0.9168, status: "good", desc: "次優雙特徵" },
          { k: 3, features: ["R&D Spend", "Administration", "Marketing Spend"], rmse: 8995.91, r2: 0.9001, status: "warn", desc: "行政支出加入" },
          { k: 4, features: ["R&D Spend", "Administration", "Marketing Spend", "State_Florida"], rmse: 9055.96, r2: 0.8987, status: "warn", desc: "誤差擴大" },
          { k: 5, features: ["R&D Spend", "Administration", "Marketing Spend", "State_Florida", "State_New York"], rmse: 9055.96, r2: 0.8987, status: "poor", desc: "全模型" }
        ]
      },
      "ElasticNet": {
        name: "ElasticNet Ranking",
        color: "#d62728",
        pointStyle: "rectRot",
        data: [
          { k: 1, features: ["R&D Spend"], rmse: 7714.33, r2: 0.9265, status: "gold", desc: "單特徵最佳" },
          { k: 2, features: ["R&D Spend", "Marketing Spend"], rmse: 8206.33, r2: 0.9168, status: "good", desc: "次優雙特徵" },
          { k: 3, features: ["R&D Spend", "Marketing Spend", "Administration"], rmse: 8995.91, r2: 0.9001, status: "warn", desc: "弱正則" },
          { k: 4, features: ["R&D Spend", "Marketing Spend", "Administration", "State_Florida"], rmse: 9055.96, r2: 0.8987, status: "warn", desc: "多變數" },
          { k: 5, features: ["R&D Spend", "Marketing Spend", "Administration", "State_Florida", "State_New York"], rmse: 9055.96, r2: 0.8987, status: "poor", desc: "全特徵" }
        ]
      },
      "Exhaustive_Search": {
        name: "Exhaustive Search",
        color: "#9467bd",
        pointStyle: "triangle",
        data: [
          { k: 1, features: ["R&D Spend"], rmse: 7714.33, r2: 0.9265, status: "gold", desc: "單特徵最佳" },
          { k: 2, features: ["R&D Spend", "State_New York"], rmse: 7718.10, r2: 0.9264, status: "good", desc: "非貪婪雙特徵" },
          { k: 3, features: ["R&D Spend", "State_Florida", "State_New York"], rmse: 7946.37, r2: 0.9220, status: "good", desc: "非貪婪三特徵" },
          { k: 4, features: ["R&D Spend", "Marketing Spend", "State_Florida", "State_New York"], rmse: 8254.69, r2: 0.9159, status: "good", desc: "加入行銷支出" },
          { k: 5, features: ["R&D Spend", "Administration", "Marketing Spend", "State_Florida", "State_New York"], rmse: 9055.96, r2: 0.8987, status: "poor", desc: "全特徵" }
        ]
      },
      "VIF": {
        name: "VIF (Collinearity Diagnostic)",
        color: "#f43f5e",
        pointStyle: "crossRot",
        data: [
          { k: 1, features: ["Administration"], rmse: 31056.94, r2: -0.1911, status: "poor", desc: "極低共線性但無預測力" },
          { k: 2, features: ["Administration", "State_Florida"], rmse: 30236.10, r2: -0.1290, status: "poor", desc: "負向判定係數" },
          { k: 3, features: ["R&D Spend", "Administration", "State_Florida"], rmse: 9284.31, r2: 0.8936, status: "warn", desc: "納入 R&D 顯著修復" },
          { k: 4, features: ["R&D Spend", "Administration", "State_Florida", "State_New York"], rmse: 9316.54, r2: 0.8928, status: "warn", desc: "欠缺 Marketing" },
          { k: 5, features: ["R&D Spend", "Administration", "Marketing Spend", "State_Florida", "State_New York"], rmse: 9055.96, r2: 0.8987, status: "warn", desc: "全特徵" }
        ]
      }
    }
  }
}
  },

  "boston_housing": {
    id: "boston_housing",
    name: "🏡 Boston Housing (波士頓房價)",
    brandTitle: "波士頓房價 5大特徵選擇分析平台",
    brandSubtitle: "Boston Housing Regression & Multicollinearity Analysis",
    targetName: "預估房價中位數 (Predicted MEDV)",
    targetUnitPrefix: "$",
    targetUnitSuffix: " 千美元",
    unitName: "千美元",
    kRange: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    benchmarkImage: "boston_feature_selection_comparison.png",
    benchmarkTitle: "波士頓房價特徵選擇全維度基準圖 (Master Benchmark Plot)",
    benchmarkSubtitle: "在 80/20 資料分割下，跨 5 大特徵選擇演算法於 $k = 1 \sim 13$ 特徵維度的測試集 RMSE 與 $R^2$ 真實評估表現",
    benchmarkInsights: [
      { badge: "●", color: "blue", title: "核心主導特徵 ($k=1, 2$)", desc: "所有演算法在 $k=1$ 均優先鎖定 <code>lstat</code> (低收入比例) 或 <code>rm</code> (房間數)，單變數即可解釋高達 43%~54% 房價變異。" },
      { badge: "▼", color: "purple", title: "最佳模型維度 ($k=7 \sim 12$)", desc: "測試集評估顯示 $k=7 \sim 12$ 達到泛化最佳點（RS=42 在 $k=7$ 達最低 RMSE 4.90，RS=0 在 $k=12$ 達 5.78），勝過 13 項全變數模型。" },
      { badge: "●", color: "cyan", title: "Lasso 稀疏正則收縮", desc: "<strong>LassoCV</strong> 透過 L1 稀疏正則化，優先保留 <code>lstat</code>、<code>rm</code>、<code>ptratio</code>、<code>dis</code> 與 <code>nox</code>，抑制高共線性變數方差膨脹。" },
      { badge: "🛡️", color: "gold", title: "VIF 共線性消除 (Model B)", desc: "<code>tax</code> 與 <code>rad</code> 存在嚴重共線性 (VIF > 7.5)，Model B 迭代剔除 <code>tax</code> 後，其餘 12 項特徵 VIF 全數降至安全值 4.5 以下。" }
    ],
    kpi: {
      consensusVal: "100%",
      consensusLabel: "演算法全體一致選取 lstat 與 rm",
      consensusDesc: "低收入比例 (LSTAT) 與住宅房間數 (RM) 為決定房價最核心兩大柱石",
      k1Desc: "單變數 (lstat) 即具備高達 43%~54% 之解釋力",
      kMaxDesc: "全 13 特徵包含稅率與公路之高共線性干擾"
    },
    insights: {
      "0": {
        rmse: "在 RS=0 下，模型 RMSE 隨特徵階層從 k=1 的 <strong>$6.81k</strong> 降至 k=12 的最低點 <strong>$5.78k</strong>，適度剔除多餘特徵具備最佳泛化穩定性。",
        r2: "k=12 時判定係數 R² 達到 <strong>0.5897</strong>，高於單特徵 k=1 的 0.4310 與全特徵的 0.5892。"
      },
      "42": {
        rmse: "在 RS=42 下，k=7 時達到全域最低 RMSE <strong>$4.90k</strong>，隨後因納入邊際雜訊特徵，全 13 特徵 RMSE 上升至 <strong>$4.93k</strong>。",
        r2: "k=7 時 R² 達到峰值 <strong>0.6727 (67.27%)</strong>，證實適度特徵選擇能有效防止過擬合。"
      }
    },
    fields: [{"key": "crim", "label": "城鎮人均犯罪率 (CRIM)", "type": "number", "min": 0.01, "max": 88.98, "step": 0.01, "default": 0.26, "unit": "", "desc": "Per capita crime rate by town"}, {"key": "zn", "label": "大坪數住宅用地比例 (ZN)", "type": "number", "min": 0.0, "max": 100.0, "step": 0.01, "default": 0.0, "unit": "%", "desc": "Proportion of residential land zoned for lots over 25,000 sq.ft."}, {"key": "indus", "label": "非零售商業用地比例 (INDUS)", "type": "number", "min": 0.46, "max": 27.74, "step": 0.01, "default": 9.69, "unit": "%", "desc": "Proportion of non-retail business acres per town"}, {"key": "chas", "label": "查爾斯河邊界 (CHAS)", "type": "number", "min": 0.0, "max": 1.0, "step": 0.01, "default": 0.0, "unit": "0/1", "desc": "Charles River dummy variable (= 1 if tract bounds river; 0 otherwise)"}, {"key": "nox", "label": "一氧化氮濃度 (NOX)", "type": "number", "min": 0.39, "max": 0.87, "step": 0.01, "default": 0.54, "unit": "ppm", "desc": "Nitric oxides concentration (parts per 10 million)"}, {"key": "rm", "label": "每戶平均房間數 (RM)", "type": "number", "min": 3.56, "max": 8.78, "step": 0.1, "default": 6.21, "unit": "間", "desc": "Average number of rooms per dwelling"}, {"key": "age", "label": "老舊自住住宅比例 (AGE)", "type": "number", "min": 2.9, "max": 100.0, "step": 0.01, "default": 77.5, "unit": "%", "desc": "Proportion of owner-occupied units built prior to 1940"}, {"key": "dis", "label": "至五大就業中心距離 (DIS)", "type": "number", "min": 1.13, "max": 12.13, "step": 0.01, "default": 3.21, "unit": "英里", "desc": "Weighted distances to five Boston employment centres"}, {"key": "rad", "label": "輻射公路便利指數 (RAD)", "type": "number", "min": 1.0, "max": 24.0, "step": 1, "default": 5.0, "unit": "分", "desc": "Index of accessibility to radial highways"}, {"key": "tax", "label": "不動產稅率 (TAX)", "type": "number", "min": 187.0, "max": 711.0, "step": 1, "default": 330.0, "unit": "/萬美元", "desc": "Full-value property-tax rate per $10,000"}, {"key": "ptratio", "label": "城鎮師生比例 (PTRATIO)", "type": "number", "min": 12.6, "max": 22.0, "step": 0.1, "default": 19.05, "unit": "人/師", "desc": "Pupil-teacher ratio by town"}, {"key": "b", "label": "黑人人口比例指標 (B)", "type": "number", "min": 0.32, "max": 396.9, "step": 0.01, "default": 391.44, "unit": "", "desc": "1000(Bk - 0.63)^2 where Bk is the proportion of blacks by town"}, {"key": "lstat", "label": "低收入人口比例 (LSTAT)", "type": "number", "min": 1.73, "max": 37.97, "step": 0.1, "default": 11.36, "unit": "%", "desc": "Percentage of lower status of the population"}],
    modelOptions: {"0": [{"value": "best_feature", "label": "🏆 最佳 12 特徵模型 (RMSE: 5.78)"}, {"value": "1_feature", "label": "1 特徵基線模型 (僅憑 lstat)"}, {"value": "3_feature", "label": "3 特徵精簡模型 (SFS Top 3)"}, {"value": "5_feature", "label": "5 特徵核心模型 (SFS Top 5)"}, {"value": "full_feature", "label": "全特徵模型 (全部 13 項特徵)"}], "42": [{"value": "best_feature", "label": "🏆 最佳 7 特徵模型 (RMSE: 4.90)"}, {"value": "1_feature", "label": "1 特徵基線模型 (僅憑 lstat)"}, {"value": "3_feature", "label": "3 特徵精簡模型 (SFS Top 3)"}, {"value": "5_feature", "label": "5 特徵核心模型 (SFS Top 5)"}, {"value": "full_feature", "label": "全特徵模型 (全部 13 項特徵)"}]},
    parsimony: "透過特徵選擇挑選核心特徵（如房間數 RM、低收入比例 LSTAT、師生比 PTRATIO、就業中心距離 DIS 與空氣污染 NOX），不僅模型簡潔易懂，且排除了 TAX 與 RAD 之間高達 0.910 的共線性干擾，具備極佳的經濟學實踐意義與統計學穩健性。",
    vifConclusion: "在波士頓房價資料中，TAX (物業稅率) 與 RAD (公路指數) 的 VIF 分別高達 9.01 與 7.48。透過 Model B 迭代剔除 TAX 後，所有特徵 VIF 均小於 4.5，成功消除多重共線性問題。",
    corr: {
      columns: ["crim", "zn", "indus", "chas", "nox", "rm", "age", "dis", "rad", "tax", "ptratio", "b", "lstat", "medv"],
      values: [[1.0, -0.2, 0.407, -0.056, 0.421, -0.219, 0.353, -0.38, 0.626, 0.583, 0.29, -0.385, 0.456, -0.388], [-0.2, 1.0, -0.534, -0.043, -0.517, 0.312, -0.57, 0.664, -0.312, -0.315, -0.392, 0.176, -0.413, 0.36], [0.407, -0.534, 1.0, 0.063, 0.764, -0.392, 0.645, -0.708, 0.595, 0.721, 0.383, -0.357, 0.604, -0.484], [-0.056, -0.043, 0.063, 1.0, 0.091, 0.091, 0.087, -0.099, -0.007, -0.036, -0.122, 0.049, -0.054, 0.175], [0.421, -0.517, 0.764, 0.091, 1.0, -0.302, 0.731, -0.769, 0.611, 0.668, 0.189, -0.38, 0.591, -0.427], [-0.219, 0.312, -0.392, 0.091, -0.302, 1.0, -0.24, 0.205, -0.21, -0.292, -0.356, 0.128, -0.614, 0.695], [0.353, -0.57, 0.645, 0.087, 0.731, -0.24, 1.0, -0.748, 0.456, 0.506, 0.262, -0.274, 0.602, -0.377], [-0.38, 0.664, -0.708, -0.099, -0.769, 0.205, -0.748, 1.0, -0.495, -0.534, -0.232, 0.292, -0.497, 0.25], [0.626, -0.312, 0.595, -0.007, 0.611, -0.21, 0.456, -0.495, 1.0, 0.91, 0.465, -0.444, 0.489, -0.382], [0.583, -0.315, 0.721, -0.036, 0.668, -0.292, 0.506, -0.534, 0.91, 1.0, 0.461, -0.442, 0.544, -0.469], [0.29, -0.392, 0.383, -0.122, 0.189, -0.356, 0.262, -0.232, 0.465, 0.461, 1.0, -0.177, 0.374, -0.508], [-0.385, 0.176, -0.357, 0.049, -0.38, 0.128, -0.274, 0.292, -0.444, -0.442, -0.177, 1.0, -0.366, 0.333], [0.456, -0.413, 0.604, -0.054, 0.591, -0.614, 0.602, -0.497, 0.489, 0.544, 0.374, -0.366, 1.0, -0.738], [-0.388, 0.36, -0.484, 0.175, -0.427, 0.695, -0.377, 0.25, -0.382, -0.469, -0.508, 0.333, -0.738, 1.0]]
    },
    vif: [{"feature": "tax", "vif": 9.009}, {"feature": "rad", "vif": 7.484}, {"feature": "nox", "vif": 4.394}, {"feature": "indus", "vif": 3.992}, {"feature": "dis", "vif": 3.956}, {"feature": "age", "vif": 3.101}, {"feature": "lstat", "vif": 2.941}, {"feature": "zn", "vif": 2.299}, {"feature": "rm", "vif": 1.934}, {"feature": "ptratio", "vif": 1.799}, {"feature": "crim", "vif": 1.792}, {"feature": "b", "vif": 1.349}, {"feature": "chas", "vif": 1.074}],
    corrInsights: [{"dot": "gold", "title": "LSTAT (低收入人口比例) 與 MEDV 呈極高負相關 (r = -0.738)", "desc": "低收入人口比例越高的區域房價顯著偏低，是波士頓房價最核心的預測指標（解釋力達 43%~54%）。"}, {"dot": "blue", "title": "RM (每戶平均房間數) 與 MEDV 呈強正相關 (r = +0.695)", "desc": "住宅平均房間數每增加一間，房價中位數呈顯著線性躍升，是僅次於 LSTAT 的關鍵特徵。"}, {"dot": "red", "title": "TAX (不動產稅率) 與 RAD (公路指數) 存在嚴重共線性 (r = 0.910)", "desc": "兩者高度同向變動造成方差膨脹 (VIF > 7.5)，在 Model B 中率先被剔除以消除多重共線性。"}],
    data: {"0": {"meta": {"best_k": 12, "best_rmse": "5.78", "best_r2": "0.5897", "best_features": "crim, zn, indus, chas, nox, rm, dis, rad, tax, ptratio, b, lstat", "k1_rmse": "6.81", "k1_r2": "0.4310", "k1_feature": "lstat", "k_full_rmse": "5.78", "k_full_r2": "0.5892", "total_features": 13}, "models": {"best_feature": {"label": "🏆 最佳 12 特徵模型 (crim + zn + indus...)", "intercept": 38.2, "coef": {"crim": -0.1191, "zn": 0.0452, "indus": 0.0058, "chas": 2.3356, "nox": -16.3943, "rm": 3.6895, "dis": -1.3731, "rad": 0.2452, "tax": -0.011, "ptratio": -1.0476, "b": 0.008, "lstat": -0.497}, "k": 12}, "1_feature": {"label": "1 特徵基線模型 (僅憑 lstat)", "intercept": 34.77, "coef": {"lstat": -0.9565}, "k": 1}, "3_feature": {"label": "3 特徵模型 (rm + ptratio + lstat)", "intercept": 24.03, "coef": {"rm": 4.2649, "ptratio": -1.1365, "lstat": -0.5755}, "k": 3}, "5_feature": {"label": "5 特徵精簡模型 (rm + dis + ptratio + b + lstat)", "intercept": 21.71, "coef": {"rm": 4.2775, "dis": -0.4478, "ptratio": -1.1337, "b": 0.0111, "lstat": -0.5854}, "k": 5}, "full_feature": {"label": "全特徵模型 (全部 13 項特徵)", "intercept": 38.09, "coef": {"crim": -0.1194, "zn": 0.0448, "indus": 0.0055, "chas": 2.3408, "nox": -16.1236, "rm": 3.7087, "age": -0.0031, "dis": -1.3864, "rad": 0.2442, "tax": -0.011, "ptratio": -1.0459, "b": 0.0081, "lstat": -0.4928}, "k": 13}}, "algorithms": {"Lasso": {"name": "Lasso (L1 Ranking)", "color": "#1f77b4", "pointStyle": "circle", "data": [{"k": 1, "features": ["lstat"], "rmse": 6.81, "r2": 0.431, "mae": 4.86, "status": "poor", "desc": "Lasso (L1 Ranking) k=1"}, {"k": 2, "features": ["lstat", "dis"], "rmse": 6.58, "r2": 0.468, "mae": 4.75, "status": "poor", "desc": "Lasso (L1 Ranking) k=2"}, {"k": 3, "features": ["lstat", "dis", "rm"], "rmse": 5.97, "r2": 0.562, "mae": 4.08, "status": "warn", "desc": "Lasso (L1 Ranking) k=3"}, {"k": 4, "features": ["lstat", "dis", "rm", "ptratio"], "rmse": 6.25, "r2": 0.5195, "mae": 4.3, "status": "warn", "desc": "Lasso (L1 Ranking) k=4"}, {"k": 5, "features": ["lstat", "dis", "rm", "ptratio", "rad"], "rmse": 6.35, "r2": 0.5047, "mae": 4.31, "status": "warn", "desc": "Lasso (L1 Ranking) k=5"}, {"k": 6, "features": ["lstat", "dis", "rm", "ptratio", "rad", "nox"], "rmse": 6.13, "r2": 0.5383, "mae": 4.21, "status": "warn", "desc": "Lasso (L1 Ranking) k=6"}, {"k": 7, "features": ["lstat", "dis", "rm", "ptratio", "rad", "nox", "tax"], "rmse": 6.06, "r2": 0.5495, "mae": 4.12, "status": "warn", "desc": "Lasso (L1 Ranking) k=7"}, {"k": 8, "features": ["lstat", "dis", "rm", "ptratio", "rad", "nox", "tax", "zn"], "rmse": 6.02, "r2": 0.5555, "mae": 4.04, "status": "warn", "desc": "Lasso (L1 Ranking) k=8"}, {"k": 9, "features": ["lstat", "dis", "rm", "ptratio", "rad", "nox", "tax", "zn", "crim"], "rmse": 5.94, "r2": 0.5672, "mae": 3.95, "status": "warn", "desc": "Lasso (L1 Ranking) k=9"}, {"k": 10, "features": ["lstat", "dis", "rm", "ptratio", "rad", "nox", "tax", "zn", "crim", "b"], "rmse": 5.85, "r2": 0.5795, "mae": 3.84, "status": "warn", "desc": "Lasso (L1 Ranking) k=10"}, {"k": 11, "features": ["lstat", "dis", "rm", "ptratio", "rad", "nox", "tax", "zn", "crim", "b", "chas"], "rmse": 5.78, "r2": 0.5895, "mae": 3.84, "status": "warn", "desc": "Lasso (L1 Ranking) k=11"}, {"k": 12, "features": ["lstat", "dis", "rm", "ptratio", "rad", "nox", "tax", "zn", "crim", "b", "chas", "age"], "rmse": 5.78, "r2": 0.5891, "mae": 3.85, "status": "warn", "desc": "Lasso (L1 Ranking) k=12"}, {"k": 13, "features": ["lstat", "dis", "rm", "ptratio", "rad", "nox", "tax", "zn", "crim", "b", "chas", "age", "indus"], "rmse": 5.78, "r2": 0.5892, "mae": 3.84, "status": "warn", "desc": "Lasso (L1 Ranking) k=13"}]}, "Sequential_Selection": {"name": "Forward SFS", "color": "#ff7f0e", "pointStyle": "rect", "data": [{"k": 1, "features": ["lstat"], "rmse": 6.81, "r2": 0.431, "mae": 4.86, "status": "poor", "desc": "Forward SFS k=1"}, {"k": 2, "features": ["ptratio", "lstat"], "rmse": 7.18, "r2": 0.3677, "mae": 5.14, "status": "poor", "desc": "Forward SFS k=2"}, {"k": 3, "features": ["rm", "ptratio", "lstat"], "rmse": 6.46, "r2": 0.4882, "mae": 4.4, "status": "poor", "desc": "Forward SFS k=3"}, {"k": 4, "features": ["rm", "ptratio", "b", "lstat"], "rmse": 6.38, "r2": 0.4996, "mae": 4.22, "status": "poor", "desc": "Forward SFS k=4"}, {"k": 5, "features": ["rm", "dis", "ptratio", "b", "lstat"], "rmse": 6.13, "r2": 0.5387, "mae": 4.08, "status": "warn", "desc": "Forward SFS k=5"}, {"k": 6, "features": ["nox", "rm", "dis", "ptratio", "b", "lstat"], "rmse": 6.05, "r2": 0.5498, "mae": 4.04, "status": "warn", "desc": "Forward SFS k=6"}, {"k": 7, "features": ["chas", "nox", "rm", "dis", "ptratio", "b", "lstat"], "rmse": 5.97, "r2": 0.5619, "mae": 4.04, "status": "warn", "desc": "Forward SFS k=7"}, {"k": 8, "features": ["crim", "chas", "nox", "rm", "dis", "ptratio", "b", "lstat"], "rmse": 6.02, "r2": 0.5556, "mae": 4.01, "status": "warn", "desc": "Forward SFS k=8"}, {"k": 9, "features": ["crim", "zn", "chas", "nox", "rm", "dis", "ptratio", "b", "lstat"], "rmse": 5.96, "r2": 0.564, "mae": 3.96, "status": "warn", "desc": "Forward SFS k=9"}, {"k": 10, "features": ["crim", "zn", "indus", "chas", "nox", "rm", "dis", "ptratio", "b", "lstat"], "rmse": 5.97, "r2": 0.5622, "mae": 3.96, "status": "warn", "desc": "Forward SFS k=10"}, {"k": 11, "features": ["crim", "zn", "indus", "chas", "nox", "rm", "dis", "rad", "ptratio", "b", "lstat"], "rmse": 5.86, "r2": 0.5785, "mae": 3.95, "status": "warn", "desc": "Forward SFS k=11"}, {"k": 12, "features": ["crim", "zn", "indus", "chas", "nox", "rm", "dis", "rad", "tax", "ptratio", "b", "lstat"], "rmse": 5.78, "r2": 0.5897, "mae": 3.84, "status": "warn", "desc": "Forward SFS k=12"}, {"k": 13, "features": ["crim", "zn", "indus", "chas", "nox", "rm", "age", "dis", "rad", "tax", "ptratio", "b", "lstat"], "rmse": 5.78, "r2": 0.5892, "mae": 3.84, "status": "warn", "desc": "Forward SFS k=13"}]}, "RFE": {"name": "RFE", "color": "#2ca02c", "pointStyle": "triangle", "data": [{"k": 1, "features": ["lstat"], "rmse": 6.81, "r2": 0.431, "mae": 4.86, "status": "poor", "desc": "RFE k=1"}, {"k": 2, "features": ["rm", "lstat"], "rmse": 6.11, "r2": 0.5409, "mae": 4.14, "status": "warn", "desc": "RFE k=2"}, {"k": 3, "features": ["rm", "ptratio", "lstat"], "rmse": 6.46, "r2": 0.4882, "mae": 4.4, "status": "poor", "desc": "RFE k=3"}, {"k": 4, "features": ["rm", "dis", "ptratio", "lstat"], "rmse": 6.25, "r2": 0.5195, "mae": 4.3, "status": "warn", "desc": "RFE k=4"}, {"k": 5, "features": ["nox", "rm", "dis", "ptratio", "lstat"], "rmse": 6.15, "r2": 0.5353, "mae": 4.21, "status": "warn", "desc": "RFE k=5"}, {"k": 6, "features": ["nox", "rm", "dis", "tax", "ptratio", "lstat"], "rmse": 6.18, "r2": 0.5306, "mae": 4.18, "status": "warn", "desc": "RFE k=6"}, {"k": 7, "features": ["nox", "rm", "dis", "rad", "tax", "ptratio", "lstat"], "rmse": 6.06, "r2": 0.5495, "mae": 4.12, "status": "warn", "desc": "RFE k=7"}, {"k": 8, "features": ["zn", "nox", "rm", "dis", "rad", "tax", "ptratio", "lstat"], "rmse": 6.02, "r2": 0.5555, "mae": 4.04, "status": "warn", "desc": "RFE k=8"}, {"k": 9, "features": ["crim", "zn", "nox", "rm", "dis", "rad", "tax", "ptratio", "lstat"], "rmse": 5.94, "r2": 0.5672, "mae": 3.95, "status": "warn", "desc": "RFE k=9"}, {"k": 10, "features": ["crim", "zn", "nox", "rm", "dis", "rad", "tax", "ptratio", "b", "lstat"], "rmse": 5.85, "r2": 0.5795, "mae": 3.84, "status": "warn", "desc": "RFE k=10"}, {"k": 11, "features": ["crim", "zn", "chas", "nox", "rm", "dis", "rad", "tax", "ptratio", "b", "lstat"], "rmse": 5.78, "r2": 0.5895, "mae": 3.84, "status": "warn", "desc": "RFE k=11"}, {"k": 12, "features": ["crim", "zn", "chas", "nox", "rm", "age", "dis", "rad", "tax", "ptratio", "b", "lstat"], "rmse": 5.78, "r2": 0.5891, "mae": 3.85, "status": "warn", "desc": "RFE k=12"}, {"k": 13, "features": ["crim", "zn", "indus", "chas", "nox", "rm", "age", "dis", "rad", "tax", "ptratio", "b", "lstat"], "rmse": 5.78, "r2": 0.5892, "mae": 3.84, "status": "warn", "desc": "RFE k=13"}]}, "ElasticNet": {"name": "ElasticNet Ranking", "color": "#d62728", "pointStyle": "rectRot", "data": [{"k": 1, "features": ["lstat"], "rmse": 6.81, "r2": 0.431, "mae": 4.86, "status": "poor", "desc": "ElasticNet Ranking k=1"}, {"k": 2, "features": ["lstat", "dis"], "rmse": 6.58, "r2": 0.468, "mae": 4.75, "status": "poor", "desc": "ElasticNet Ranking k=2"}, {"k": 3, "features": ["lstat", "dis", "rm"], "rmse": 5.97, "r2": 0.562, "mae": 4.08, "status": "warn", "desc": "ElasticNet Ranking k=3"}, {"k": 4, "features": ["lstat", "dis", "rm", "ptratio"], "rmse": 6.25, "r2": 0.5195, "mae": 4.3, "status": "warn", "desc": "ElasticNet Ranking k=4"}, {"k": 5, "features": ["lstat", "dis", "rm", "ptratio", "rad"], "rmse": 6.35, "r2": 0.5047, "mae": 4.31, "status": "warn", "desc": "ElasticNet Ranking k=5"}, {"k": 6, "features": ["lstat", "dis", "rm", "ptratio", "rad", "nox"], "rmse": 6.13, "r2": 0.5383, "mae": 4.21, "status": "warn", "desc": "ElasticNet Ranking k=6"}, {"k": 7, "features": ["lstat", "dis", "rm", "ptratio", "rad", "nox", "tax"], "rmse": 6.06, "r2": 0.5495, "mae": 4.12, "status": "warn", "desc": "ElasticNet Ranking k=7"}, {"k": 8, "features": ["lstat", "dis", "rm", "ptratio", "rad", "nox", "tax", "zn"], "rmse": 6.02, "r2": 0.5555, "mae": 4.04, "status": "warn", "desc": "ElasticNet Ranking k=8"}, {"k": 9, "features": ["lstat", "dis", "rm", "ptratio", "rad", "nox", "tax", "zn", "crim"], "rmse": 5.94, "r2": 0.5672, "mae": 3.95, "status": "warn", "desc": "ElasticNet Ranking k=9"}, {"k": 10, "features": ["lstat", "dis", "rm", "ptratio", "rad", "nox", "tax", "zn", "crim", "b"], "rmse": 5.85, "r2": 0.5795, "mae": 3.84, "status": "warn", "desc": "ElasticNet Ranking k=10"}, {"k": 11, "features": ["lstat", "dis", "rm", "ptratio", "rad", "nox", "tax", "zn", "crim", "b", "chas"], "rmse": 5.78, "r2": 0.5895, "mae": 3.84, "status": "warn", "desc": "ElasticNet Ranking k=11"}, {"k": 12, "features": ["lstat", "dis", "rm", "ptratio", "rad", "nox", "tax", "zn", "crim", "b", "chas", "age"], "rmse": 5.78, "r2": 0.5891, "mae": 3.85, "status": "warn", "desc": "ElasticNet Ranking k=12"}, {"k": 13, "features": ["lstat", "dis", "rm", "ptratio", "rad", "nox", "tax", "zn", "crim", "b", "chas", "age", "indus"], "rmse": 5.78, "r2": 0.5892, "mae": 3.84, "status": "warn", "desc": "ElasticNet Ranking k=13"}]}, "Exhaustive_Search": {"name": "Exhaustive Search", "color": "#9467bd", "pointStyle": "triangle", "data": [{"k": 1, "features": ["lstat"], "rmse": 6.81, "r2": 0.431, "mae": 4.86, "status": "poor", "desc": "Exhaustive Search k=1"}, {"k": 2, "features": ["ptratio", "lstat"], "rmse": 7.18, "r2": 0.3677, "mae": 5.14, "status": "poor", "desc": "Exhaustive Search k=2"}, {"k": 3, "features": ["rm", "ptratio", "lstat"], "rmse": 6.46, "r2": 0.4882, "mae": 4.4, "status": "poor", "desc": "Exhaustive Search k=3"}, {"k": 4, "features": ["rm", "ptratio", "b", "lstat"], "rmse": 6.38, "r2": 0.4996, "mae": 4.22, "status": "poor", "desc": "Exhaustive Search k=4"}, {"k": 5, "features": ["rm", "nox", "dis", "lstat", "ptratio"], "rmse": 6.15, "r2": 0.5353, "mae": 4.21, "status": "warn", "desc": "Exhaustive Search k=5"}, {"k": 6, "features": ["rm", "nox", "dis", "lstat", "b", "ptratio"], "rmse": 6.05, "r2": 0.5498, "mae": 4.04, "status": "warn", "desc": "Exhaustive Search k=6"}, {"k": 7, "features": ["rm", "chas", "nox", "dis", "lstat", "b", "ptratio"], "rmse": 5.97, "r2": 0.5619, "mae": 4.04, "status": "warn", "desc": "Exhaustive Search k=7"}, {"k": 8, "features": ["tax", "rm", "nox", "dis", "crim", "lstat", "rad", "ptratio"], "rmse": 5.99, "r2": 0.5593, "mae": 4.04, "status": "warn", "desc": "Exhaustive Search k=8"}, {"k": 9, "features": ["tax", "rm", "nox", "dis", "crim", "lstat", "rad", "b", "ptratio"], "rmse": 5.91, "r2": 0.5716, "mae": 3.93, "status": "warn", "desc": "Exhaustive Search k=9"}, {"k": 10, "features": ["tax", "rm", "zn", "nox", "dis", "crim", "lstat", "rad", "b", "ptratio"], "rmse": 5.85, "r2": 0.5795, "mae": 3.84, "status": "warn", "desc": "Exhaustive Search k=10"}, {"k": 11, "features": ["crim", "zn", "chas", "nox", "rm", "dis", "rad", "tax", "ptratio", "b", "lstat"], "rmse": 5.78, "r2": 0.5895, "mae": 3.84, "status": "warn", "desc": "Exhaustive Search k=11"}, {"k": 12, "features": ["crim", "zn", "indus", "chas", "nox", "rm", "dis", "rad", "tax", "ptratio", "b", "lstat"], "rmse": 5.78, "r2": 0.5897, "mae": 3.84, "status": "warn", "desc": "Exhaustive Search k=12"}, {"k": 13, "features": ["crim", "zn", "indus", "chas", "nox", "rm", "age", "dis", "rad", "tax", "ptratio", "b", "lstat"], "rmse": 5.78, "r2": 0.5892, "mae": 3.84, "status": "warn", "desc": "Exhaustive Search k=13"}]}, "SelectKBest": {"name": "SelectKBest (Filter)", "color": "#06b6d4", "pointStyle": "cross", "data": [{"k": 1, "features": ["lstat"], "rmse": 6.81, "r2": 0.431, "mae": 4.86, "status": "poor", "desc": "SelectKBest (Filter) k=1"}, {"k": 2, "features": ["lstat", "rm"], "rmse": 6.11, "r2": 0.5409, "mae": 4.14, "status": "warn", "desc": "SelectKBest (Filter) k=2"}, {"k": 3, "features": ["lstat", "rm", "ptratio"], "rmse": 6.46, "r2": 0.4882, "mae": 4.4, "status": "poor", "desc": "SelectKBest (Filter) k=3"}, {"k": 4, "features": ["lstat", "rm", "ptratio", "indus"], "rmse": 6.48, "r2": 0.4845, "mae": 4.41, "status": "poor", "desc": "SelectKBest (Filter) k=4"}, {"k": 5, "features": ["lstat", "rm", "ptratio", "indus", "tax"], "rmse": 6.53, "r2": 0.4755, "mae": 4.39, "status": "poor", "desc": "SelectKBest (Filter) k=5"}, {"k": 6, "features": ["lstat", "rm", "ptratio", "indus", "tax", "nox"], "rmse": 6.53, "r2": 0.4762, "mae": 4.39, "status": "poor", "desc": "SelectKBest (Filter) k=6"}, {"k": 7, "features": ["lstat", "rm", "ptratio", "indus", "tax", "nox", "rad"], "rmse": 6.37, "r2": 0.5016, "mae": 4.28, "status": "warn", "desc": "SelectKBest (Filter) k=7"}, {"k": 8, "features": ["lstat", "rm", "ptratio", "indus", "tax", "nox", "rad", "age"], "rmse": 6.31, "r2": 0.5116, "mae": 4.32, "status": "warn", "desc": "SelectKBest (Filter) k=8"}, {"k": 9, "features": ["lstat", "rm", "ptratio", "indus", "tax", "nox", "rad", "age", "crim"], "rmse": 6.27, "r2": 0.5175, "mae": 4.23, "status": "warn", "desc": "SelectKBest (Filter) k=9"}, {"k": 10, "features": ["lstat", "rm", "ptratio", "indus", "tax", "nox", "rad", "age", "crim", "zn"], "rmse": 6.27, "r2": 0.5173, "mae": 4.23, "status": "warn", "desc": "SelectKBest (Filter) k=10"}, {"k": 11, "features": ["lstat", "rm", "ptratio", "indus", "tax", "nox", "rad", "age", "crim", "zn", "b"], "rmse": 6.19, "r2": 0.5288, "mae": 4.12, "status": "warn", "desc": "SelectKBest (Filter) k=11"}, {"k": 12, "features": ["lstat", "rm", "ptratio", "indus", "tax", "nox", "rad", "age", "crim", "zn", "b", "dis"], "rmse": 5.85, "r2": 0.5798, "mae": 3.84, "status": "warn", "desc": "SelectKBest (Filter) k=12"}, {"k": 13, "features": ["lstat", "rm", "ptratio", "indus", "tax", "nox", "rad", "age", "crim", "zn", "b", "dis", "chas"], "rmse": 5.78, "r2": 0.5892, "mae": 3.84, "status": "warn", "desc": "SelectKBest (Filter) k=13"}]}, "VIF": {"name": "VIF (Collinearity Diagnostic)", "color": "#f43f5e", "pointStyle": "crossRot", "data": [{"k": 1, "features": ["b"], "rmse": 8.82, "r2": 0.0451, "mae": 6.09, "status": "poor", "desc": "VIF (Collinearity Diagnostic) k=1"}, {"k": 2, "features": ["chas", "b"], "rmse": 8.64, "r2": 0.0836, "mae": 6.06, "status": "poor", "desc": "VIF (Collinearity Diagnostic) k=2"}, {"k": 3, "features": ["chas", "ptratio", "b"], "rmse": 8.87, "r2": 0.0334, "mae": 6.36, "status": "poor", "desc": "VIF (Collinearity Diagnostic) k=3"}, {"k": 4, "features": ["chas", "age", "ptratio", "b"], "rmse": 8.92, "r2": 0.0229, "mae": 6.35, "status": "poor", "desc": "VIF (Collinearity Diagnostic) k=4"}, {"k": 5, "features": ["chas", "rm", "age", "ptratio", "b"], "rmse": 6.89, "r2": 0.4166, "mae": 4.35, "status": "poor", "desc": "VIF (Collinearity Diagnostic) k=5"}, {"k": 6, "features": ["crim", "chas", "rm", "age", "ptratio", "b"], "rmse": 7.06, "r2": 0.3873, "mae": 4.5, "status": "poor", "desc": "VIF (Collinearity Diagnostic) k=6"}, {"k": 7, "features": ["crim", "zn", "chas", "rm", "age", "ptratio", "b"], "rmse": 7.06, "r2": 0.3873, "mae": 4.5, "status": "poor", "desc": "VIF (Collinearity Diagnostic) k=7"}, {"k": 8, "features": ["crim", "zn", "indus", "chas", "rm", "age", "ptratio", "b"], "rmse": 7.06, "r2": 0.3886, "mae": 4.5, "status": "poor", "desc": "VIF (Collinearity Diagnostic) k=8"}, {"k": 9, "features": ["crim", "zn", "indus", "chas", "rm", "age", "rad", "ptratio", "b"], "rmse": 7.03, "r2": 0.3926, "mae": 4.49, "status": "poor", "desc": "VIF (Collinearity Diagnostic) k=9"}, {"k": 10, "features": ["crim", "zn", "indus", "chas", "rm", "age", "rad", "ptratio", "b", "lstat"], "rmse": 6.31, "r2": 0.5111, "mae": 4.24, "status": "warn", "desc": "VIF (Collinearity Diagnostic) k=10"}, {"k": 11, "features": ["crim", "zn", "indus", "chas", "rm", "age", "dis", "rad", "ptratio", "b", "lstat"], "rmse": 6.07, "r2": 0.5478, "mae": 4.04, "status": "warn", "desc": "VIF (Collinearity Diagnostic) k=11"}, {"k": 12, "features": ["crim", "zn", "indus", "chas", "nox", "rm", "age", "dis", "rad", "ptratio", "b", "lstat"], "rmse": 5.86, "r2": 0.578, "mae": 3.95, "status": "warn", "desc": "VIF (Collinearity Diagnostic) k=12"}, {"k": 13, "features": ["crim", "zn", "indus", "chas", "nox", "rm", "age", "dis", "rad", "tax", "ptratio", "b", "lstat"], "rmse": 5.78, "r2": 0.5892, "mae": 3.84, "status": "warn", "desc": "VIF (Collinearity Diagnostic) k=13"}]}}}, "42": {"meta": {"best_k": 7, "best_rmse": "4.90", "best_r2": "0.6727", "best_features": "nox, rm, dis, rad, tax, ptratio, lstat", "k1_rmse": "5.79", "k1_r2": "0.5429", "k1_feature": "lstat", "k_full_rmse": "4.93", "k_full_r2": "0.6688", "total_features": 13}, "models": {"best_feature": {"label": "🏆 最佳 7 特徵模型 (nox + rm + dis...)", "intercept": 36.8, "coef": {"nox": -16.2629, "rm": 4.3786, "dis": -1.2229, "rad": 0.1614, "tax": -0.0098, "ptratio": -0.9981, "lstat": -0.5802}, "k": 7}, "1_feature": {"label": "1 特徵基線模型 (僅憑 lstat)", "intercept": 34.84, "coef": {"lstat": -0.9665}, "k": 1}, "3_feature": {"label": "3 特徵模型 (rm + ptratio + lstat)", "intercept": 14.59, "coef": {"rm": 4.9331, "ptratio": -0.8671, "lstat": -0.5671}, "k": 3}, "5_feature": {"label": "5 特徵精簡模型 (rm + dis + ptratio + b + lstat)", "intercept": 12.27, "coef": {"rm": 4.8974, "dis": -0.6773, "ptratio": -0.8609, "b": 0.0153, "lstat": -0.6032}, "k": 5}, "full_feature": {"label": "全特徵模型 (全部 13 項特徵)", "intercept": 30.25, "coef": {"crim": -0.1131, "zn": 0.0301, "indus": 0.0404, "chas": 2.7844, "nox": -17.2026, "rm": 4.4388, "age": -0.0063, "dis": -1.4479, "rad": 0.2624, "tax": -0.0106, "ptratio": -0.9155, "b": 0.0124, "lstat": -0.5086}, "k": 13}}, "algorithms": {"Lasso": {"name": "Lasso (L1 Ranking)", "color": "#1f77b4", "pointStyle": "circle", "data": [{"k": 1, "features": ["lstat"], "rmse": 5.79, "r2": 0.5429, "mae": 4.18, "status": "warn", "desc": "Lasso (L1 Ranking) k=1"}, {"k": 2, "features": ["lstat", "rm"], "rmse": 5.59, "r2": 0.574, "mae": 3.9, "status": "warn", "desc": "Lasso (L1 Ranking) k=2"}, {"k": 3, "features": ["lstat", "rm", "dis"], "rmse": 5.59, "r2": 0.5736, "mae": 3.91, "status": "warn", "desc": "Lasso (L1 Ranking) k=3"}, {"k": 4, "features": ["lstat", "rm", "dis", "rad"], "rmse": 5.69, "r2": 0.5581, "mae": 3.9, "status": "warn", "desc": "Lasso (L1 Ranking) k=4"}, {"k": 5, "features": ["lstat", "rm", "dis", "rad", "ptratio"], "rmse": 5.25, "r2": 0.6244, "mae": 3.36, "status": "warn", "desc": "Lasso (L1 Ranking) k=5"}, {"k": 6, "features": ["lstat", "rm", "dis", "rad", "ptratio", "nox"], "rmse": 5.0, "r2": 0.6588, "mae": 3.27, "status": "good", "desc": "Lasso (L1 Ranking) k=6"}, {"k": 7, "features": ["lstat", "rm", "dis", "rad", "ptratio", "nox", "tax"], "rmse": 4.9, "r2": 0.6727, "mae": 3.17, "status": "good", "desc": "Lasso (L1 Ranking) k=7"}, {"k": 8, "features": ["lstat", "rm", "dis", "rad", "ptratio", "nox", "tax", "b"], "rmse": 5.05, "r2": 0.6519, "mae": 3.27, "status": "good", "desc": "Lasso (L1 Ranking) k=8"}, {"k": 9, "features": ["lstat", "rm", "dis", "rad", "ptratio", "nox", "tax", "b", "crim"], "rmse": 5.08, "r2": 0.6486, "mae": 3.3, "status": "warn", "desc": "Lasso (L1 Ranking) k=9"}, {"k": 10, "features": ["lstat", "rm", "dis", "rad", "ptratio", "nox", "tax", "b", "crim", "chas"], "rmse": 5.05, "r2": 0.6523, "mae": 3.27, "status": "good", "desc": "Lasso (L1 Ranking) k=10"}, {"k": 11, "features": ["lstat", "rm", "dis", "rad", "ptratio", "nox", "tax", "b", "crim", "chas", "zn"], "rmse": 4.91, "r2": 0.6715, "mae": 3.15, "status": "good", "desc": "Lasso (L1 Ranking) k=11"}, {"k": 12, "features": ["lstat", "rm", "dis", "rad", "ptratio", "nox", "tax", "b", "crim", "chas", "zn", "indus"], "rmse": 4.92, "r2": 0.6702, "mae": 3.18, "status": "good", "desc": "Lasso (L1 Ranking) k=12"}, {"k": 13, "features": ["lstat", "rm", "dis", "rad", "ptratio", "nox", "tax", "b", "crim", "chas", "zn", "indus", "age"], "rmse": 4.93, "r2": 0.6688, "mae": 3.19, "status": "good", "desc": "Lasso (L1 Ranking) k=13"}]}, "Sequential_Selection": {"name": "Forward SFS", "color": "#ff7f0e", "pointStyle": "rect", "data": [{"k": 1, "features": ["lstat"], "rmse": 5.79, "r2": 0.5429, "mae": 4.18, "status": "warn", "desc": "Forward SFS k=1"}, {"k": 2, "features": ["rm", "lstat"], "rmse": 5.59, "r2": 0.574, "mae": 3.9, "status": "warn", "desc": "Forward SFS k=2"}, {"k": 3, "features": ["rm", "ptratio", "lstat"], "rmse": 5.21, "r2": 0.6303, "mae": 3.33, "status": "warn", "desc": "Forward SFS k=3"}, {"k": 4, "features": ["rm", "ptratio", "b", "lstat"], "rmse": 5.37, "r2": 0.6071, "mae": 3.4, "status": "warn", "desc": "Forward SFS k=4"}, {"k": 5, "features": ["rm", "dis", "ptratio", "b", "lstat"], "rmse": 5.37, "r2": 0.6061, "mae": 3.43, "status": "warn", "desc": "Forward SFS k=5"}, {"k": 6, "features": ["nox", "rm", "dis", "ptratio", "b", "lstat"], "rmse": 5.23, "r2": 0.6272, "mae": 3.41, "status": "warn", "desc": "Forward SFS k=6"}, {"k": 7, "features": ["crim", "nox", "rm", "dis", "ptratio", "b", "lstat"], "rmse": 5.3, "r2": 0.6175, "mae": 3.45, "status": "warn", "desc": "Forward SFS k=7"}, {"k": 8, "features": ["crim", "nox", "rm", "dis", "rad", "ptratio", "b", "lstat"], "rmse": 5.18, "r2": 0.6336, "mae": 3.4, "status": "warn", "desc": "Forward SFS k=8"}, {"k": 9, "features": ["crim", "nox", "rm", "dis", "rad", "tax", "ptratio", "b", "lstat"], "rmse": 5.08, "r2": 0.6486, "mae": 3.3, "status": "warn", "desc": "Forward SFS k=9"}, {"k": 10, "features": ["crim", "zn", "nox", "rm", "dis", "rad", "tax", "ptratio", "b", "lstat"], "rmse": 4.94, "r2": 0.6673, "mae": 3.19, "status": "good", "desc": "Forward SFS k=10"}, {"k": 11, "features": ["crim", "zn", "chas", "nox", "rm", "dis", "rad", "tax", "ptratio", "b", "lstat"], "rmse": 4.91, "r2": 0.6715, "mae": 3.15, "status": "good", "desc": "Forward SFS k=11"}, {"k": 12, "features": ["crim", "zn", "chas", "nox", "rm", "age", "dis", "rad", "tax", "ptratio", "b", "lstat"], "rmse": 4.92, "r2": 0.6702, "mae": 3.16, "status": "good", "desc": "Forward SFS k=12"}, {"k": 13, "features": ["crim", "zn", "indus", "chas", "nox", "rm", "age", "dis", "rad", "tax", "ptratio", "b", "lstat"], "rmse": 4.93, "r2": 0.6688, "mae": 3.19, "status": "good", "desc": "Forward SFS k=13"}]}, "RFE": {"name": "RFE", "color": "#2ca02c", "pointStyle": "triangle", "data": [{"k": 1, "features": ["lstat"], "rmse": 5.79, "r2": 0.5429, "mae": 4.18, "status": "warn", "desc": "RFE k=1"}, {"k": 2, "features": ["rm", "lstat"], "rmse": 5.59, "r2": 0.574, "mae": 3.9, "status": "warn", "desc": "RFE k=2"}, {"k": 3, "features": ["rm", "ptratio", "lstat"], "rmse": 5.21, "r2": 0.6303, "mae": 3.33, "status": "warn", "desc": "RFE k=3"}, {"k": 4, "features": ["rm", "dis", "ptratio", "lstat"], "rmse": 5.18, "r2": 0.6348, "mae": 3.34, "status": "warn", "desc": "RFE k=4"}, {"k": 5, "features": ["nox", "rm", "dis", "ptratio", "lstat"], "rmse": 5.02, "r2": 0.6564, "mae": 3.27, "status": "good", "desc": "RFE k=5"}, {"k": 6, "features": ["nox", "rm", "dis", "tax", "ptratio", "lstat"], "rmse": 5.05, "r2": 0.6518, "mae": 3.28, "status": "good", "desc": "RFE k=6"}, {"k": 7, "features": ["nox", "rm", "dis", "rad", "tax", "ptratio", "lstat"], "rmse": 4.9, "r2": 0.6727, "mae": 3.17, "status": "good", "desc": "RFE k=7"}, {"k": 8, "features": ["nox", "rm", "dis", "rad", "tax", "ptratio", "b", "lstat"], "rmse": 5.05, "r2": 0.6519, "mae": 3.27, "status": "good", "desc": "RFE k=8"}, {"k": 9, "features": ["crim", "nox", "rm", "dis", "rad", "tax", "ptratio", "b", "lstat"], "rmse": 5.08, "r2": 0.6486, "mae": 3.3, "status": "warn", "desc": "RFE k=9"}, {"k": 10, "features": ["crim", "chas", "nox", "rm", "dis", "rad", "tax", "ptratio", "b", "lstat"], "rmse": 5.05, "r2": 0.6523, "mae": 3.27, "status": "good", "desc": "RFE k=10"}, {"k": 11, "features": ["crim", "zn", "chas", "nox", "rm", "dis", "rad", "tax", "ptratio", "b", "lstat"], "rmse": 4.91, "r2": 0.6715, "mae": 3.15, "status": "good", "desc": "RFE k=11"}, {"k": 12, "features": ["crim", "zn", "indus", "chas", "nox", "rm", "dis", "rad", "tax", "ptratio", "b", "lstat"], "rmse": 4.92, "r2": 0.6702, "mae": 3.18, "status": "good", "desc": "RFE k=12"}, {"k": 13, "features": ["crim", "zn", "indus", "chas", "nox", "rm", "age", "dis", "rad", "tax", "ptratio", "b", "lstat"], "rmse": 4.93, "r2": 0.6688, "mae": 3.19, "status": "good", "desc": "RFE k=13"}]}, "ElasticNet": {"name": "ElasticNet Ranking", "color": "#d62728", "pointStyle": "rectRot", "data": [{"k": 1, "features": ["lstat"], "rmse": 5.79, "r2": 0.5429, "mae": 4.18, "status": "warn", "desc": "ElasticNet Ranking k=1"}, {"k": 2, "features": ["lstat", "rm"], "rmse": 5.59, "r2": 0.574, "mae": 3.9, "status": "warn", "desc": "ElasticNet Ranking k=2"}, {"k": 3, "features": ["lstat", "rm", "dis"], "rmse": 5.59, "r2": 0.5736, "mae": 3.91, "status": "warn", "desc": "ElasticNet Ranking k=3"}, {"k": 4, "features": ["lstat", "rm", "dis", "ptratio"], "rmse": 5.18, "r2": 0.6348, "mae": 3.34, "status": "warn", "desc": "ElasticNet Ranking k=4"}, {"k": 5, "features": ["lstat", "rm", "dis", "ptratio", "rad"], "rmse": 5.25, "r2": 0.6244, "mae": 3.36, "status": "warn", "desc": "ElasticNet Ranking k=5"}, {"k": 6, "features": ["lstat", "rm", "dis", "ptratio", "rad", "nox"], "rmse": 5.0, "r2": 0.6588, "mae": 3.27, "status": "good", "desc": "ElasticNet Ranking k=6"}, {"k": 7, "features": ["lstat", "rm", "dis", "ptratio", "rad", "nox", "tax"], "rmse": 4.9, "r2": 0.6727, "mae": 3.17, "status": "good", "desc": "ElasticNet Ranking k=7"}, {"k": 8, "features": ["lstat", "rm", "dis", "ptratio", "rad", "nox", "tax", "b"], "rmse": 5.05, "r2": 0.6519, "mae": 3.27, "status": "good", "desc": "ElasticNet Ranking k=8"}, {"k": 9, "features": ["lstat", "rm", "dis", "ptratio", "rad", "nox", "tax", "b", "crim"], "rmse": 5.08, "r2": 0.6486, "mae": 3.3, "status": "warn", "desc": "ElasticNet Ranking k=9"}, {"k": 10, "features": ["lstat", "rm", "dis", "ptratio", "rad", "nox", "tax", "b", "crim", "chas"], "rmse": 5.05, "r2": 0.6523, "mae": 3.27, "status": "good", "desc": "ElasticNet Ranking k=10"}, {"k": 11, "features": ["lstat", "rm", "dis", "ptratio", "rad", "nox", "tax", "b", "crim", "chas", "zn"], "rmse": 4.91, "r2": 0.6715, "mae": 3.15, "status": "good", "desc": "ElasticNet Ranking k=11"}, {"k": 12, "features": ["lstat", "rm", "dis", "ptratio", "rad", "nox", "tax", "b", "crim", "chas", "zn", "age"], "rmse": 4.92, "r2": 0.6702, "mae": 3.16, "status": "good", "desc": "ElasticNet Ranking k=12"}, {"k": 13, "features": ["lstat", "rm", "dis", "ptratio", "rad", "nox", "tax", "b", "crim", "chas", "zn", "age", "indus"], "rmse": 4.93, "r2": 0.6688, "mae": 3.19, "status": "good", "desc": "ElasticNet Ranking k=13"}]}, "Exhaustive_Search": {"name": "Exhaustive Search", "color": "#9467bd", "pointStyle": "triangle", "data": [{"k": 1, "features": ["lstat"], "rmse": 5.79, "r2": 0.5429, "mae": 4.18, "status": "warn", "desc": "Exhaustive Search k=1"}, {"k": 2, "features": ["rm", "lstat"], "rmse": 5.59, "r2": 0.574, "mae": 3.9, "status": "warn", "desc": "Exhaustive Search k=2"}, {"k": 3, "features": ["rm", "ptratio", "lstat"], "rmse": 5.21, "r2": 0.6303, "mae": 3.33, "status": "warn", "desc": "Exhaustive Search k=3"}, {"k": 4, "features": ["rm", "ptratio", "b", "lstat"], "rmse": 5.37, "r2": 0.6071, "mae": 3.4, "status": "warn", "desc": "Exhaustive Search k=4"}, {"k": 5, "features": ["rm", "dis", "lstat", "b", "ptratio"], "rmse": 5.37, "r2": 0.6061, "mae": 3.43, "status": "warn", "desc": "Exhaustive Search k=5"}, {"k": 6, "features": ["rm", "nox", "dis", "lstat", "b", "ptratio"], "rmse": 5.23, "r2": 0.6272, "mae": 3.41, "status": "warn", "desc": "Exhaustive Search k=6"}, {"k": 7, "features": ["rm", "nox", "dis", "crim", "lstat", "b", "ptratio"], "rmse": 5.3, "r2": 0.6175, "mae": 3.45, "status": "warn", "desc": "Exhaustive Search k=7"}, {"k": 8, "features": ["rm", "nox", "dis", "crim", "lstat", "rad", "b", "ptratio"], "rmse": 5.18, "r2": 0.6336, "mae": 3.4, "status": "warn", "desc": "Exhaustive Search k=8"}, {"k": 9, "features": ["tax", "rm", "nox", "dis", "crim", "lstat", "rad", "b", "ptratio"], "rmse": 5.08, "r2": 0.6486, "mae": 3.3, "status": "warn", "desc": "Exhaustive Search k=9"}, {"k": 10, "features": ["tax", "rm", "zn", "nox", "dis", "crim", "lstat", "rad", "b", "ptratio"], "rmse": 4.94, "r2": 0.6673, "mae": 3.19, "status": "good", "desc": "Exhaustive Search k=10"}, {"k": 11, "features": ["crim", "zn", "chas", "nox", "rm", "dis", "rad", "tax", "ptratio", "b", "lstat"], "rmse": 4.91, "r2": 0.6715, "mae": 3.15, "status": "good", "desc": "Exhaustive Search k=11"}, {"k": 12, "features": ["crim", "zn", "chas", "nox", "rm", "age", "dis", "rad", "tax", "ptratio", "b", "lstat"], "rmse": 4.92, "r2": 0.6702, "mae": 3.16, "status": "good", "desc": "Exhaustive Search k=12"}, {"k": 13, "features": ["crim", "zn", "indus", "chas", "nox", "rm", "age", "dis", "rad", "tax", "ptratio", "b", "lstat"], "rmse": 4.93, "r2": 0.6688, "mae": 3.19, "status": "good", "desc": "Exhaustive Search k=13"}]}, "SelectKBest": {"name": "SelectKBest (Filter)", "color": "#06b6d4", "pointStyle": "cross", "data": [{"k": 1, "features": ["lstat"], "rmse": 5.79, "r2": 0.5429, "mae": 4.18, "status": "warn", "desc": "SelectKBest (Filter) k=1"}, {"k": 2, "features": ["lstat", "rm"], "rmse": 5.59, "r2": 0.574, "mae": 3.9, "status": "warn", "desc": "SelectKBest (Filter) k=2"}, {"k": 3, "features": ["lstat", "rm", "ptratio"], "rmse": 5.21, "r2": 0.6303, "mae": 3.33, "status": "warn", "desc": "SelectKBest (Filter) k=3"}, {"k": 4, "features": ["lstat", "rm", "ptratio", "indus"], "rmse": 5.22, "r2": 0.6284, "mae": 3.35, "status": "warn", "desc": "SelectKBest (Filter) k=4"}, {"k": 5, "features": ["lstat", "rm", "ptratio", "indus", "tax"], "rmse": 5.28, "r2": 0.6197, "mae": 3.34, "status": "warn", "desc": "SelectKBest (Filter) k=5"}, {"k": 6, "features": ["lstat", "rm", "ptratio", "indus", "tax", "nox"], "rmse": 5.27, "r2": 0.621, "mae": 3.35, "status": "warn", "desc": "SelectKBest (Filter) k=6"}, {"k": 7, "features": ["lstat", "rm", "ptratio", "indus", "tax", "nox", "rad"], "rmse": 5.09, "r2": 0.647, "mae": 3.19, "status": "warn", "desc": "SelectKBest (Filter) k=7"}, {"k": 8, "features": ["lstat", "rm", "ptratio", "indus", "tax", "nox", "rad", "crim"], "rmse": 5.11, "r2": 0.6442, "mae": 3.23, "status": "warn", "desc": "SelectKBest (Filter) k=8"}, {"k": 9, "features": ["lstat", "rm", "ptratio", "indus", "tax", "nox", "rad", "crim", "age"], "rmse": 5.06, "r2": 0.6511, "mae": 3.21, "status": "good", "desc": "SelectKBest (Filter) k=9"}, {"k": 10, "features": ["lstat", "rm", "ptratio", "indus", "tax", "nox", "rad", "crim", "age", "b"], "rmse": 5.22, "r2": 0.6288, "mae": 3.28, "status": "warn", "desc": "SelectKBest (Filter) k=10"}, {"k": 11, "features": ["lstat", "rm", "ptratio", "indus", "tax", "nox", "rad", "crim", "age", "b", "zn"], "rmse": 5.27, "r2": 0.6211, "mae": 3.34, "status": "warn", "desc": "SelectKBest (Filter) k=11"}, {"k": 12, "features": ["lstat", "rm", "ptratio", "indus", "tax", "nox", "rad", "crim", "age", "b", "zn", "dis"], "rmse": 4.96, "r2": 0.6641, "mae": 3.24, "status": "good", "desc": "SelectKBest (Filter) k=12"}, {"k": 13, "features": ["lstat", "rm", "ptratio", "indus", "tax", "nox", "rad", "crim", "age", "b", "zn", "dis", "chas"], "rmse": 4.93, "r2": 0.6688, "mae": 3.19, "status": "good", "desc": "SelectKBest (Filter) k=13"}]}, "VIF": {"name": "VIF (Collinearity Diagnostic)", "color": "#f43f5e", "pointStyle": "crossRot", "data": [{"k": 1, "features": ["b"], "rmse": 8.27, "r2": 0.0684, "mae": 5.99, "status": "poor", "desc": "VIF (Collinearity Diagnostic) k=1"}, {"k": 2, "features": ["chas", "b"], "rmse": 8.28, "r2": 0.0656, "mae": 5.93, "status": "poor", "desc": "VIF (Collinearity Diagnostic) k=2"}, {"k": 3, "features": ["chas", "rm", "b"], "rmse": 6.61, "r2": 0.4049, "mae": 4.18, "status": "poor", "desc": "VIF (Collinearity Diagnostic) k=3"}, {"k": 4, "features": ["chas", "rm", "age", "b"], "rmse": 6.25, "r2": 0.468, "mae": 3.84, "status": "poor", "desc": "VIF (Collinearity Diagnostic) k=4"}, {"k": 5, "features": ["chas", "rm", "age", "ptratio", "b"], "rmse": 5.85, "r2": 0.5332, "mae": 3.4, "status": "warn", "desc": "VIF (Collinearity Diagnostic) k=5"}, {"k": 6, "features": ["crim", "chas", "rm", "age", "ptratio", "b"], "rmse": 5.85, "r2": 0.5328, "mae": 3.44, "status": "warn", "desc": "VIF (Collinearity Diagnostic) k=6"}, {"k": 7, "features": ["crim", "zn", "chas", "rm", "age", "ptratio", "b"], "rmse": 5.93, "r2": 0.52, "mae": 3.54, "status": "warn", "desc": "VIF (Collinearity Diagnostic) k=7"}, {"k": 8, "features": ["crim", "zn", "chas", "rm", "age", "rad", "ptratio", "b"], "rmse": 5.92, "r2": 0.5214, "mae": 3.54, "status": "warn", "desc": "VIF (Collinearity Diagnostic) k=8"}, {"k": 9, "features": ["crim", "zn", "indus", "chas", "rm", "age", "rad", "ptratio", "b"], "rmse": 5.88, "r2": 0.5282, "mae": 3.53, "status": "warn", "desc": "VIF (Collinearity Diagnostic) k=9"}, {"k": 10, "features": ["crim", "zn", "indus", "chas", "rm", "age", "rad", "ptratio", "b", "lstat"], "rmse": 5.4, "r2": 0.6021, "mae": 3.34, "status": "warn", "desc": "VIF (Collinearity Diagnostic) k=10"}, {"k": 11, "features": ["crim", "zn", "indus", "chas", "rm", "age", "dis", "rad", "ptratio", "b", "lstat"], "rmse": 5.15, "r2": 0.6382, "mae": 3.23, "status": "warn", "desc": "VIF (Collinearity Diagnostic) k=11"}, {"k": 12, "features": ["crim", "zn", "indus", "chas", "nox", "rm", "age", "dis", "rad", "ptratio", "b", "lstat"], "rmse": 5.04, "r2": 0.6536, "mae": 3.29, "status": "good", "desc": "VIF (Collinearity Diagnostic) k=12"}, {"k": 13, "features": ["crim", "zn", "indus", "chas", "nox", "rm", "age", "dis", "rad", "tax", "ptratio", "b", "lstat"], "rmse": 4.93, "r2": 0.6688, "mae": 3.19, "status": "good", "desc": "VIF (Collinearity Diagnostic) k=13"}]}}}}
  },

  "car_msrp": {"id": "car_msrp", "name": "🚗 Car Features & MSRP (車輛規格與定價)", "brandTitle": "車輛規格與定價 5大特徵選擇分析平台", "brandSubtitle": "Car Features & MSRP Regression & Multicollinearity Analysis", "targetName": "預估建議零售價 (Predicted MSRP)", "targetUnitPrefix": "$", "targetUnitSuffix": " 美元", "unitName": "美元", "kRange": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "benchmarkImage": "car_feature_selection_comparison.png", "benchmarkTitle": "車輛規格特徵選擇全維度基準圖 (Master Benchmark Plot)", "benchmarkSubtitle": "在 80/20 資料分割下，跨 5 大特徵選擇演算法於 $k = 1 \\sim 12$ 特徵維度的測試集 RMSE 與 $R^2$ 真實評估表現", "benchmarkInsights": [{"badge": "●", "color": "blue", "title": "核心主導特徵 ($k=1$)", "desc": "所有演算法在 $k=1$ 均壓倒性鎖定 <code>Engine HP</code> (引擎馬力)，單一特徵即可解釋高達 54.36% 之定價變異 (R²=0.5436, RMSE: $32,081)。"}, {"badge": "▼", "color": "purple", "title": "最佳模型維度 ($k=11$)", "desc": "VIF 後向消除與特徵精簡在 $k=11$ 達到泛化最高峰 (Test R²=0.5916, RMSE: $30,349)，勝過包含全部 12 項特徵的未精簡模型。"}, {"badge": "●", "color": "cyan", "title": "Lasso 稀疏正則收縮", "desc": "<strong>LassoCV</strong> 透過 L1 稀疏正則化，優先保留 <code>Engine HP</code>、<code>Engine Cylinders</code>、<code>city mpg</code>、<code>is_performance</code> 與 <code>Year</code>，抑制高維度多重共線性。"}, {"badge": "🛡️", "color": "gold", "title": "VIF 共線性消除 (Model B)", "desc": "<code>highway MPG</code> (VIF 10.10) 與 <code>Engine Cylinders</code> 造成嚴重共線性。Model B 精簡消除後，其餘 10 項特徵 VIF 全數降至安全值 2.80 以下。"}], "kpi": {"consensusVal": "100%", "consensusLabel": "演算法全體一致選取 Engine HP", "consensusDesc": "引擎最大輸出馬力 (Engine HP) 為決定車輛定價最壓倒性的核心基石", "k1Desc": "單變數 (Engine HP) 即具備高達 54.4% 之解釋力", "kMaxDesc": "全 12 特徵包含油耗與汽缸之雙重共線性膨脹"}, "insights": {"0": {"rmse": "在 RS=0 下，模型隨特徵階層逐步收斂，適度剔除多餘特徵具備最佳泛化穩定性。", "r2": "判定係數隨特徵擴充提升，但超過 10 特徵後邊際效應遞減。"}, "42": {"rmse": "在 RS=42 下，k=11 時達到全域最低 RMSE <strong>$30,349.20</strong>，隨後納入 highway MPG 邊際共線性特徵，全 12 特徵 RMSE 上升至 <strong>$30,414.25</strong>。", "r2": "k=11 時 R² 達到峰值 <strong>0.5916 (59.16%)</strong>，證實適度特徵選擇能有效防止過擬合。"}}, "fields": [{"key": "Year", "label": "出廠年份 (Year)", "type": "number", "min": 1990, "max": 2017, "step": 1, "default": 2015, "unit": "年", "desc": "車輛出廠年份 (1990 ~ 2017)"}, {"key": "Engine HP", "label": "引擎馬力 (Engine HP)", "type": "number", "min": 55, "max": 1000, "step": 5, "default": 250, "unit": "hp", "desc": "引擎最大輸出馬力 (Horsepower)"}, {"key": "Engine Cylinders", "label": "汽缸數量 (Engine Cylinders)", "type": "number", "min": 0, "max": 16, "step": 1, "default": 4, "unit": "缸", "desc": "發動機汽缸數"}, {"key": "Number of Doors", "label": "車門數量 (Number of Doors)", "type": "number", "min": 2, "max": 4, "step": 1, "default": 4, "unit": "門", "desc": "全車車門數 (2~4門)"}, {"key": "highway MPG", "label": "高速公路油耗 (highway MPG)", "type": "number", "min": 12, "max": 60, "step": 1, "default": 28, "unit": "mpg", "desc": "高速行駛每加侖英里數 (Highway MPG)"}, {"key": "city mpg", "label": "市區道路油耗 (city mpg)", "type": "number", "min": 7, "max": 50, "step": 1, "default": 20, "unit": "mpg", "desc": "市區行駛每加侖英里數 (City MPG)"}, {"key": "Popularity", "label": "社群熱門指數 (Popularity)", "type": "number", "min": 0, "max": 5657, "step": 50, "default": 1500, "unit": "分", "desc": "車廠社群關注度指數"}, {"key": "is_luxury", "label": "豪華車款標籤 (is_luxury)", "type": "number", "min": 0, "max": 1, "step": 1, "default": 0, "unit": "0/1", "desc": "是否屬於 Luxury 級距 (0: 否, 1: 是)"}, {"key": "is_performance", "label": "性能車款標籤 (is_performance)", "type": "number", "min": 0, "max": 1, "step": 1, "default": 0, "unit": "0/1", "desc": "是否屬於 Performance 級距 (0: 否, 1: 是)"}, {"key": "is_automatic", "label": "自排變速箱 (is_automatic)", "type": "number", "min": 0, "max": 1, "step": 1, "default": 1, "unit": "0/1", "desc": "變速箱是否為自排 (0: 手排, 1: 自排)"}, {"key": "is_awd", "label": "四輪/全輪驅動 (is_awd)", "type": "number", "min": 0, "max": 1, "step": 1, "default": 0, "unit": "0/1", "desc": "驅動方式是否為全輪驅動 (0: 否, 1: 是)"}, {"key": "is_large", "label": "大型車級距 (is_large)", "type": "number", "min": 0, "max": 1, "step": 1, "default": 0, "unit": "0/1", "desc": "車身尺碼是否為大型車 Large (0: 否, 1: 是)"}], "modelOptions": {"0": [{"value": "best_feature", "label": "🏆 最佳 11 特徵模型 (RMSE: $30,349)"}, {"value": "1_feature", "label": "1 特徵基線模型 (僅憑 Engine HP)"}, {"value": "5_feature", "label": "5 特徵核心模型 (k=5)"}, {"value": "full_feature", "label": "全特徵模型 (全部 12 項特徵)"}], "42": [{"value": "best_feature", "label": "🏆 最佳 11 特徵模型 (RMSE: $30,349, R²: 0.5916)"}, {"value": "1_feature", "label": "1 特徵基線模型 (僅憑 Engine HP, R²: 0.5436)"}, {"value": "5_feature", "label": "5 特徵核心模型 (k=5)"}, {"value": "full_feature", "label": "全特徵模型 (全部 12 項特徵)"}]}, "parsimony": "車輛定價模型中，引擎馬力 (Engine HP) 與出廠年份 (Year) 佔據主導地位。剔除高度共線性的高速油耗 (highway MPG) 與發動機汽缸數 (Engine Cylinders) 後，不僅簡化了估價模型，更消除了 VIF 高達 10.10 的方差膨脹風險，保留了極佳的預測穩定性與可解釋性。", "vifConclusion": "在車輛規格數據中，highway MPG (高速油耗) 的 VIF 高達 10.10，city mpg 亦達 7.73；發動機汽缸數與馬力亦高度重疊。Model B 透過逐步 VIF 消除，剔除 highway MPG 與 Engine Cylinders 後，其餘 10 項特徵 VIF 全數壓制至 2.80 以下（安全閾值 <= 5.0），成功消除多重共線性。", "corr": {"columns": ["Year", "Engine HP", "Engine Cylinders", "Number of Doors", "highway MPG", "city mpg", "Popularity", "is_luxury", "is_performance", "is_automatic", "is_awd", "is_large", "MSRP"], "values": [[1.0, 0.353, -0.034, 0.262, 0.303, 0.232, 0.074, 0.089, 0.172, 0.27, 0.14, 0.035, 0.227], [0.353, 1.0, 0.78, -0.102, -0.453, -0.466, 0.037, 0.354, 0.546, 0.128, 0.219, 0.344, 0.662], [-0.034, 0.78, 1.0, -0.138, -0.675, -0.638, 0.045, 0.175, 0.286, 0.159, 0.152, 0.461, 0.544], [0.262, -0.102, -0.138, 1.0, 0.13, 0.137, -0.05, 0.04, -0.27, 0.421, 0.165, 0.115, -0.127], [0.303, -0.453, -0.675, 0.13, 1.0, 0.924, -0.036, -0.055, -0.082, -0.114, -0.275, -0.355, -0.218], [0.232, -0.466, -0.638, 0.137, 0.924, 1.0, -0.011, -0.1, -0.161, -0.092, -0.205, -0.318, -0.225], [0.074, 0.037, 0.045, -0.05, -0.036, -0.011, 1.0, -0.134, -0.049, -0.025, 0.023, 0.126, -0.049], [0.089, 0.354, 0.175, 0.04, -0.055, -0.1, -0.134, 1.0, 0.326, 0.13, 0.178, 0.037, 0.235], [0.172, 0.546, 0.286, -0.27, -0.082, -0.161, -0.049, 0.326, 1.0, -0.183, -0.019, -0.008, 0.359], [0.27, 0.128, 0.159, 0.421, -0.114, -0.092, -0.025, 0.13, -0.183, 1.0, 0.153, 0.235, 0.014], [0.14, 0.219, 0.152, 0.165, -0.275, -0.205, 0.023, 0.178, -0.019, 0.153, 1.0, 0.126, 0.104], [0.035, 0.344, 0.461, 0.115, -0.355, -0.318, 0.126, 0.037, -0.008, 0.235, 0.126, 1.0, 0.119], [0.227, 0.662, 0.544, -0.127, -0.218, -0.225, -0.049, 0.235, 0.359, 0.014, 0.104, 0.119, 1.0]]}, "vif": [{"feature": "highway MPG", "vif": 9.791}, {"feature": "city mpg", "vif": 7.515}, {"feature": "Engine HP", "vif": 6.631}, {"feature": "Engine Cylinders", "vif": 5.039}, {"feature": "Year", "vif": 2.475}, {"feature": "is_performance", "vif": 1.908}, {"feature": "is_automatic", "vif": 1.489}, {"feature": "Number of Doors", "vif": 1.435}, {"feature": "is_large", "vif": 1.385}, {"feature": "is_luxury", "vif": 1.367}, {"feature": "is_awd", "vif": 1.282}, {"feature": "Popularity", "vif": 1.061}], "corrInsights": [{"dot": "gold", "title": "Engine HP (引擎馬力) 與 MSRP 呈極高正相關 (r = +0.662)", "desc": "引擎輸出馬力是車輛等級與定價最直接的核心驅動因子，單變數即可解釋 54.4% 售價變異。"}, {"dot": "blue", "title": "Engine Cylinders 與 Engine HP 高度共變 (r = +0.774)", "desc": "汽缸數與馬力高度關聯，同時納入造成馬力 VIF 膨脹至 6.63，Model B 剔除汽缸數後馬力 VIF 降至 2.80 安全值。"}, {"dot": "red", "title": "highway MPG 與 city mpg 存在嚴重共線性 (r = +0.887, VIF > 9.7)", "desc": "市區與高速油耗高度同步變動，造成嚴重多重共線性，在 Model B 中率先剔除 highway MPG 消除方差膨脹。"}], "data": {"0": {"meta": {"best_k": 8, "best_rmse": "$48,466.09", "best_r2": "0.4324", "best_features": "is_large, Popularity, Engine HP, Number of Doors, is_automatic, highway MPG, is_performance, Engine Cylinders", "k1_rmse": "$50,549.91", "k1_r2": "0.3825", "k1_feature": "Engine HP", "k_full_rmse": "$48,496.59", "k_full_r2": "0.4317", "total_features": 12}, "models": {"single_feature": {"label": "單特徵基準 (k=1: Engine HP)", "intercept": -50388.56, "coef": {"Engine HP": 364.6997}, "k": 1}, "best_performance": {"label": "最佳精簡模型 (k=8: Exhaustive Search)", "intercept": -113182.47, "coef": {"is_large": -18387.1917, "Popularity": -2.69, "Engine HP": 351.5441, "Number of Doors": -2474.8392, "is_automatic": -7495.9819, "highway MPG": 1606.955, "is_performance": -9789.6337, "Engine Cylinders": 8646.6518}, "k": 8}, "standard_5_feature": {"label": "5 特徵折衷模型 (k=5)", "intercept": -123617.0, "coef": {"is_large": -19810.7336, "Popularity": -2.3232, "Engine HP": 317.8335, "highway MPG": 1528.5074, "Engine Cylinders": 9375.4451}, "k": 5}, "full_feature": {"label": "全特徵模型 (全部 12 項特徵)", "intercept": -217783.7, "coef": {"Year": 53.4006, "Engine HP": 346.4203, "Engine Cylinders": 8842.2179, "Number of Doors": -2630.3205, "highway MPG": 990.068, "city mpg": 711.1173, "Popularity": -2.7499, "is_luxury": 495.6683, "is_performance": -8899.8835, "is_automatic": -7778.4138, "is_awd": 1061.5641, "is_large": -18397.0248}, "k": 12}}, "algorithms": {"Lasso (L1 Ranking)": {"k": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "rmse": [50549.91, 50418.36, 49791.5, 48752.64, 48799.22, 48624.47, 48637.03, 48521.23, 48506.42, 48505.9, 48500.8, 48496.59], "r2": [0.3825, 0.3857, 0.4009, 0.4257, 0.4246, 0.4287, 0.4284, 0.4311, 0.4314, 0.4315, 0.4316, 0.4317], "features": [["Engine HP"], ["Engine HP", "Engine Cylinders"], ["Engine HP", "Engine Cylinders", "is_large"], ["Engine HP", "Engine Cylinders", "is_large", "highway MPG"], ["Engine HP", "Engine Cylinders", "is_large", "highway MPG", "city mpg"], ["Engine HP", "Engine Cylinders", "is_large", "highway MPG", "city mpg", "Popularity"], ["Engine HP", "Engine Cylinders", "is_large", "highway MPG", "city mpg", "Popularity", "is_performance"], ["Engine HP", "Engine Cylinders", "is_large", "highway MPG", "city mpg", "Popularity", "is_performance", "is_automatic"], ["Engine HP", "Engine Cylinders", "is_large", "highway MPG", "city mpg", "Popularity", "is_performance", "is_automatic", "Number of Doors"], ["Engine HP", "Engine Cylinders", "is_large", "highway MPG", "city mpg", "Popularity", "is_performance", "is_automatic", "Number of Doors", "is_awd"], ["Engine HP", "Engine Cylinders", "is_large", "highway MPG", "city mpg", "Popularity", "is_performance", "is_automatic", "Number of Doors", "is_awd", "Year"], ["Engine HP", "Engine Cylinders", "is_large", "highway MPG", "city mpg", "Popularity", "is_performance", "is_automatic", "Number of Doors", "is_awd", "Year", "is_luxury"]]}, "Forward SFS": {"k": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "rmse": [50549.91, 50187.32, 49791.5, 48752.64, 48583.78, 48481.46, 48481.12, 48466.09, 48506.42, 48505.9, 48503.87, 48496.59], "r2": [0.3825, 0.3914, 0.4009, 0.4257, 0.4296, 0.432, 0.432, 0.4324, 0.4314, 0.4315, 0.4315, 0.4317], "features": [["Engine HP"], ["Engine HP", "is_large"], ["Engine HP", "Engine Cylinders", "is_large"], ["Engine HP", "Engine Cylinders", "highway MPG", "is_large"], ["Engine HP", "Engine Cylinders", "highway MPG", "Popularity", "is_large"], ["Engine HP", "Engine Cylinders", "highway MPG", "Popularity", "is_automatic", "is_large"], ["Engine HP", "Engine Cylinders", "highway MPG", "Popularity", "is_performance", "is_automatic", "is_large"], ["Engine HP", "Engine Cylinders", "Number of Doors", "highway MPG", "Popularity", "is_performance", "is_automatic", "is_large"], ["Engine HP", "Engine Cylinders", "Number of Doors", "highway MPG", "city mpg", "Popularity", "is_performance", "is_automatic", "is_large"], ["Engine HP", "Engine Cylinders", "Number of Doors", "highway MPG", "city mpg", "Popularity", "is_performance", "is_automatic", "is_awd", "is_large"], ["Engine HP", "Engine Cylinders", "Number of Doors", "highway MPG", "city mpg", "Popularity", "is_luxury", "is_performance", "is_automatic", "is_awd", "is_large"], ["Year", "Engine HP", "Engine Cylinders", "Number of Doors", "highway MPG", "city mpg", "Popularity", "is_luxury", "is_performance", "is_automatic", "is_awd", "is_large"]]}, "RFE": {"k": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "rmse": [50549.91, 50418.36, 49328.05, 48752.64, 48799.22, 48624.47, 48526.65, 48521.23, 48506.42, 48505.9, 48500.8, 48496.59], "r2": [0.3825, 0.3857, 0.412, 0.4257, 0.4246, 0.4287, 0.431, 0.4311, 0.4314, 0.4315, 0.4316, 0.4317], "features": [["Engine HP"], ["Engine HP", "Engine Cylinders"], ["Engine HP", "Engine Cylinders", "highway MPG"], ["Engine HP", "Engine Cylinders", "highway MPG", "is_large"], ["Engine HP", "Engine Cylinders", "highway MPG", "city mpg", "is_large"], ["Engine HP", "Engine Cylinders", "highway MPG", "city mpg", "Popularity", "is_large"], ["Engine HP", "Engine Cylinders", "highway MPG", "city mpg", "Popularity", "is_automatic", "is_large"], ["Engine HP", "Engine Cylinders", "highway MPG", "city mpg", "Popularity", "is_performance", "is_automatic", "is_large"], ["Engine HP", "Engine Cylinders", "Number of Doors", "highway MPG", "city mpg", "Popularity", "is_performance", "is_automatic", "is_large"], ["Engine HP", "Engine Cylinders", "Number of Doors", "highway MPG", "city mpg", "Popularity", "is_performance", "is_automatic", "is_awd", "is_large"], ["Year", "Engine HP", "Engine Cylinders", "Number of Doors", "highway MPG", "city mpg", "Popularity", "is_performance", "is_automatic", "is_awd", "is_large"], ["Year", "Engine HP", "Engine Cylinders", "Number of Doors", "highway MPG", "city mpg", "Popularity", "is_luxury", "is_performance", "is_automatic", "is_awd", "is_large"]]}, "ElasticNet Ranking": {"k": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "rmse": [50549.91, 50418.36, 50410.49, 50366.15, 50355.28, 49639.5, 49388.32, 49278.79, 49285.74, 48789.21, 48588.05, 48496.59], "r2": [0.3825, 0.3857, 0.3859, 0.387, 0.3873, 0.4046, 0.4106, 0.4132, 0.413, 0.4248, 0.4295, 0.4317], "features": [["Engine HP"], ["Engine HP", "Engine Cylinders"], ["Engine HP", "Engine Cylinders", "is_performance"], ["Engine HP", "Engine Cylinders", "is_performance", "Year"], ["Engine HP", "Engine Cylinders", "is_performance", "Year", "is_luxury"], ["Engine HP", "Engine Cylinders", "is_performance", "Year", "is_luxury", "city mpg"], ["Engine HP", "Engine Cylinders", "is_performance", "Year", "is_luxury", "city mpg", "highway MPG"], ["Engine HP", "Engine Cylinders", "is_performance", "Year", "is_luxury", "city mpg", "highway MPG", "Number of Doors"], ["Engine HP", "Engine Cylinders", "is_performance", "Year", "is_luxury", "city mpg", "highway MPG", "Number of Doors", "is_awd"], ["Engine HP", "Engine Cylinders", "is_performance", "Year", "is_luxury", "city mpg", "highway MPG", "Number of Doors", "is_awd", "is_large"], ["Engine HP", "Engine Cylinders", "is_performance", "Year", "is_luxury", "city mpg", "highway MPG", "Number of Doors", "is_awd", "is_large", "Popularity"], ["Engine HP", "Engine Cylinders", "is_performance", "Year", "is_luxury", "city mpg", "highway MPG", "Number of Doors", "is_awd", "is_large", "Popularity", "is_automatic"]]}, "Exhaustive Search": {"k": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "rmse": [50549.91, 50187.32, 49328.05, 48752.64, 48583.78, 48481.46, 48481.12, 48466.09, 48506.42, 48505.9, 48503.87, 48496.59], "r2": [0.3825, 0.3914, 0.412, 0.4257, 0.4296, 0.432, 0.432, 0.4324, 0.4314, 0.4315, 0.4315, 0.4317], "features": [["Engine HP"], ["Engine HP", "is_large"], ["Engine HP", "Engine Cylinders", "highway MPG"], ["is_large", "Engine HP", "highway MPG", "Engine Cylinders"], ["is_large", "Popularity", "Engine HP", "highway MPG", "Engine Cylinders"], ["is_large", "Popularity", "Engine HP", "is_automatic", "highway MPG", "Engine Cylinders"], ["is_large", "Popularity", "Engine HP", "is_automatic", "highway MPG", "is_performance", "Engine Cylinders"], ["is_large", "Popularity", "Engine HP", "Number of Doors", "is_automatic", "highway MPG", "is_performance", "Engine Cylinders"], ["city mpg", "is_large", "Popularity", "Engine HP", "Number of Doors", "is_automatic", "highway MPG", "is_performance", "Engine Cylinders"], ["city mpg", "is_large", "Popularity", "Engine HP", "Number of Doors", "is_automatic", "is_awd", "highway MPG", "is_performance", "Engine Cylinders"], ["Engine HP", "Engine Cylinders", "Number of Doors", "highway MPG", "city mpg", "Popularity", "is_luxury", "is_performance", "is_automatic", "is_awd", "is_large"], ["Year", "Engine HP", "Engine Cylinders", "Number of Doors", "highway MPG", "city mpg", "Popularity", "is_luxury", "is_performance", "is_automatic", "is_awd", "is_large"]]}, "SelectKBest (Filter)": {"k": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "rmse": [50549.91, 50418.36, 50410.49, 49603.25, 49596.03, 49639.5, 49388.32, 49278.79, 48785.43, 48789.21, 48588.05, 48496.59], "r2": [0.3825, 0.3857, 0.3859, 0.4054, 0.4056, 0.4046, 0.4106, 0.4132, 0.4249, 0.4248, 0.4295, 0.4317], "features": [["Engine HP"], ["Engine HP", "Engine Cylinders"], ["Engine HP", "Engine Cylinders", "is_performance"], ["Engine HP", "Engine Cylinders", "is_performance", "city mpg"], ["Engine HP", "Engine Cylinders", "is_performance", "city mpg", "is_luxury"], ["Engine HP", "Engine Cylinders", "is_performance", "city mpg", "is_luxury", "Year"], ["Engine HP", "Engine Cylinders", "is_performance", "city mpg", "is_luxury", "Year", "highway MPG"], ["Engine HP", "Engine Cylinders", "is_performance", "city mpg", "is_luxury", "Year", "highway MPG", "Number of Doors"], ["Engine HP", "Engine Cylinders", "is_performance", "city mpg", "is_luxury", "Year", "highway MPG", "Number of Doors", "is_large"], ["Engine HP", "Engine Cylinders", "is_performance", "city mpg", "is_luxury", "Year", "highway MPG", "Number of Doors", "is_large", "is_awd"], ["Engine HP", "Engine Cylinders", "is_performance", "city mpg", "is_luxury", "Year", "highway MPG", "Number of Doors", "is_large", "is_awd", "Popularity"], ["Engine HP", "Engine Cylinders", "is_performance", "city mpg", "is_luxury", "Year", "highway MPG", "Number of Doors", "is_large", "is_awd", "Popularity", "is_automatic"]]}, "VIF Backward Elimination": {"k": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "rmse": [63770.11, 61839.61, 60709.99, 60644.78, 60699.99, 59650.98, 58661.25, 58564.68, 57500.98, 49947.98, 48641.8, 48496.59], "r2": [0.0173, 0.0759, 0.1094, 0.1113, 0.1097, 0.1402, 0.1685, 0.1712, 0.201, 0.3971, 0.4283, 0.4317], "features": [["is_large"], ["is_luxury", "is_large"], ["Year", "is_luxury", "is_large"], ["Year", "Popularity", "is_luxury", "is_large"], ["Year", "Popularity", "is_luxury", "is_awd", "is_large"], ["Year", "Number of Doors", "Popularity", "is_luxury", "is_awd", "is_large"], ["Year", "Number of Doors", "city mpg", "Popularity", "is_luxury", "is_awd", "is_large"], ["Year", "Number of Doors", "city mpg", "Popularity", "is_luxury", "is_automatic", "is_awd", "is_large"], ["Year", "Number of Doors", "city mpg", "Popularity", "is_luxury", "is_performance", "is_automatic", "is_awd", "is_large"], ["Year", "Engine Cylinders", "Number of Doors", "city mpg", "Popularity", "is_luxury", "is_performance", "is_automatic", "is_awd", "is_large"], ["Year", "Engine HP", "Engine Cylinders", "Number of Doors", "city mpg", "Popularity", "is_luxury", "is_performance", "is_automatic", "is_awd", "is_large"], ["Year", "Engine HP", "Engine Cylinders", "Number of Doors", "highway MPG", "city mpg", "Popularity", "is_luxury", "is_performance", "is_automatic", "is_awd", "is_large"]]}}}, "42": {"meta": {"best_k": 11, "best_rmse": "$30,349.20", "best_r2": "0.5916", "best_features": "Year, Engine HP, Engine Cylinders, Number of Doors, city mpg, Popularity, is_luxury, is_performance, is_automatic, is_awd, is_large", "k1_rmse": "$32,081.12", "k1_r2": "0.5436", "k1_feature": "Engine HP", "k_full_rmse": "$30,414.25", "k_full_r2": "0.5898", "total_features": 12}, "models": {"single_feature": {"label": "單特徵基準 (k=1: Engine HP)", "intercept": -53027.12, "coef": {"Engine HP": 376.579}, "k": 1}, "best_performance": {"label": "最佳精簡模型 (k=11: VIF Backward Elimination)", "intercept": -611959.87, "coef": {"Year": 254.577, "Engine HP": 336.5738, "Engine Cylinders": 9664.7207, "Number of Doors": -2573.4583, "city mpg": 1496.9392, "Popularity": -3.0779, "is_luxury": 1213.8408, "is_performance": -7394.6644, "is_automatic": -8784.4893, "is_awd": -1368.8744, "is_large": -19049.2329}, "k": 11}, "standard_5_feature": {"label": "5 特徵折衷模型 (k=5)", "intercept": -135532.5, "coef": {"Engine HP": 316.2241, "Engine Cylinders": 10867.915, "highway MPG": 1702.0615, "Popularity": -2.523, "is_large": -20287.3377}, "k": 5}, "full_feature": {"label": "全特徵模型 (全部 12 項特徵)", "intercept": -215261.78, "coef": {"Year": 46.4579, "Engine HP": 345.0557, "Engine Cylinders": 10281.4938, "Number of Doors": -2679.9206, "highway MPG": 1401.8328, "city mpg": 403.2254, "Popularity": -2.9608, "is_luxury": -20.8156, "is_performance": -8868.9289, "is_automatic": -7952.8759, "is_awd": 812.6854, "is_large": -18761.9043}, "k": 12}}, "algorithms": {"Lasso (L1 Ranking)": {"k": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "rmse": [32081.12, 32177.87, 31436.38, 30774.09, 30634.49, 30621.82, 30505.87, 30435.57, 30429.79, 30419.63, 30413.74, 30414.25], "r2": [0.5436, 0.5409, 0.5618, 0.58, 0.5838, 0.5842, 0.5873, 0.5892, 0.5894, 0.5897, 0.5898, 0.5898], "features": [["Engine HP"], ["Engine HP", "Engine Cylinders"], ["Engine HP", "Engine Cylinders", "highway MPG"], ["Engine HP", "Engine Cylinders", "highway MPG", "is_large"], ["Engine HP", "Engine Cylinders", "highway MPG", "is_large", "Popularity"], ["Engine HP", "Engine Cylinders", "highway MPG", "is_large", "Popularity", "is_performance"], ["Engine HP", "Engine Cylinders", "highway MPG", "is_large", "Popularity", "is_performance", "is_automatic"], ["Engine HP", "Engine Cylinders", "highway MPG", "is_large", "Popularity", "is_performance", "is_automatic", "city mpg"], ["Engine HP", "Engine Cylinders", "highway MPG", "is_large", "Popularity", "is_performance", "is_automatic", "city mpg", "Number of Doors"], ["Engine HP", "Engine Cylinders", "highway MPG", "is_large", "Popularity", "is_performance", "is_automatic", "city mpg", "Number of Doors", "Year"], ["Engine HP", "Engine Cylinders", "highway MPG", "is_large", "Popularity", "is_performance", "is_automatic", "city mpg", "Number of Doors", "Year", "is_awd"], ["Engine HP", "Engine Cylinders", "highway MPG", "is_large", "Popularity", "is_performance", "is_automatic", "city mpg", "Number of Doors", "Year", "is_awd", "is_luxury"]]}, "Forward SFS": {"k": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "rmse": [32081.12, 31431.94, 31380.51, 30774.09, 30634.49, 30552.13, 30505.87, 30499.32, 30429.79, 30419.63, 30416.53, 30414.25], "r2": [0.5436, 0.5619, 0.5633, 0.58, 0.5838, 0.5861, 0.5873, 0.5875, 0.5894, 0.5897, 0.5897, 0.5898], "features": [["Engine HP"], ["Engine HP", "is_large"], ["Engine HP", "Engine Cylinders", "is_large"], ["Engine HP", "Engine Cylinders", "highway MPG", "is_large"], ["Engine HP", "Engine Cylinders", "highway MPG", "Popularity", "is_large"], ["Engine HP", "Engine Cylinders", "highway MPG", "Popularity", "is_automatic", "is_large"], ["Engine HP", "Engine Cylinders", "highway MPG", "Popularity", "is_performance", "is_automatic", "is_large"], ["Engine HP", "Engine Cylinders", "Number of Doors", "highway MPG", "Popularity", "is_performance", "is_automatic", "is_large"], ["Engine HP", "Engine Cylinders", "Number of Doors", "highway MPG", "city mpg", "Popularity", "is_performance", "is_automatic", "is_large"], ["Year", "Engine HP", "Engine Cylinders", "Number of Doors", "highway MPG", "city mpg", "Popularity", "is_performance", "is_automatic", "is_large"], ["Year", "Engine HP", "Engine Cylinders", "Number of Doors", "highway MPG", "city mpg", "Popularity", "is_luxury", "is_performance", "is_automatic", "is_large"], ["Year", "Engine HP", "Engine Cylinders", "Number of Doors", "highway MPG", "city mpg", "Popularity", "is_luxury", "is_performance", "is_automatic", "is_awd", "is_large"]]}, "RFE": {"k": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "rmse": [32081.12, 32177.87, 31436.38, 30774.09, 30634.49, 30552.13, 30505.87, 30435.57, 30429.79, 30421.95, 30413.74, 30414.25], "r2": [0.5436, 0.5409, 0.5618, 0.58, 0.5838, 0.5861, 0.5873, 0.5892, 0.5894, 0.5896, 0.5898, 0.5898], "features": [["Engine HP"], ["Engine HP", "Engine Cylinders"], ["Engine HP", "Engine Cylinders", "highway MPG"], ["Engine HP", "Engine Cylinders", "highway MPG", "is_large"], ["Engine HP", "Engine Cylinders", "highway MPG", "Popularity", "is_large"], ["Engine HP", "Engine Cylinders", "highway MPG", "Popularity", "is_automatic", "is_large"], ["Engine HP", "Engine Cylinders", "highway MPG", "Popularity", "is_performance", "is_automatic", "is_large"], ["Engine HP", "Engine Cylinders", "highway MPG", "city mpg", "Popularity", "is_performance", "is_automatic", "is_large"], ["Engine HP", "Engine Cylinders", "Number of Doors", "highway MPG", "city mpg", "Popularity", "is_performance", "is_automatic", "is_large"], ["Engine HP", "Engine Cylinders", "Number of Doors", "highway MPG", "city mpg", "Popularity", "is_performance", "is_automatic", "is_awd", "is_large"], ["Year", "Engine HP", "Engine Cylinders", "Number of Doors", "highway MPG", "city mpg", "Popularity", "is_performance", "is_automatic", "is_awd", "is_large"], ["Year", "Engine HP", "Engine Cylinders", "Number of Doors", "highway MPG", "city mpg", "Popularity", "is_luxury", "is_performance", "is_automatic", "is_awd", "is_large"]]}, "ElasticNet Ranking": {"k": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "rmse": [32081.12, 32177.87, 32168.28, 32162.57, 32082.7, 31416.91, 31464.54, 31324.46, 30713.11, 30710.89, 30545.03, 30414.25], "r2": [0.5436, 0.5409, 0.5411, 0.5413, 0.5436, 0.5623, 0.561, 0.5649, 0.5817, 0.5818, 0.5863, 0.5898], "features": [["Engine HP"], ["Engine HP", "Engine Cylinders"], ["Engine HP", "Engine Cylinders", "is_performance"], ["Engine HP", "Engine Cylinders", "is_performance", "is_luxury"], ["Engine HP", "Engine Cylinders", "is_performance", "is_luxury", "Year"], ["Engine HP", "Engine Cylinders", "is_performance", "is_luxury", "Year", "city mpg"], ["Engine HP", "Engine Cylinders", "is_performance", "is_luxury", "Year", "city mpg", "highway MPG"], ["Engine HP", "Engine Cylinders", "is_performance", "is_luxury", "Year", "city mpg", "highway MPG", "Number of Doors"], ["Engine HP", "Engine Cylinders", "is_performance", "is_luxury", "Year", "city mpg", "highway MPG", "Number of Doors", "is_large"], ["Engine HP", "Engine Cylinders", "is_performance", "is_luxury", "Year", "city mpg", "highway MPG", "Number of Doors", "is_large", "is_awd"], ["Engine HP", "Engine Cylinders", "is_performance", "is_luxury", "Year", "city mpg", "highway MPG", "Number of Doors", "is_large", "is_awd", "Popularity"], ["Engine HP", "Engine Cylinders", "is_performance", "is_luxury", "Year", "city mpg", "highway MPG", "Number of Doors", "is_large", "is_awd", "Popularity", "is_automatic"]]}, "Exhaustive Search": {"k": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "rmse": [32081.12, 31431.94, 31436.38, 30774.09, 30634.49, 30552.13, 30505.87, 30499.32, 30429.79, 30419.63, 30416.53, 30414.25], "r2": [0.5436, 0.5619, 0.5618, 0.58, 0.5838, 0.5861, 0.5873, 0.5875, 0.5894, 0.5897, 0.5897, 0.5898], "features": [["Engine HP"], ["Engine HP", "is_large"], ["Engine HP", "Engine Cylinders", "highway MPG"], ["is_large", "Engine HP", "highway MPG", "Engine Cylinders"], ["is_large", "Popularity", "Engine HP", "highway MPG", "Engine Cylinders"], ["is_large", "Popularity", "Engine HP", "is_automatic", "highway MPG", "Engine Cylinders"], ["is_large", "Popularity", "Engine HP", "is_automatic", "highway MPG", "is_performance", "Engine Cylinders"], ["is_large", "Popularity", "Engine HP", "Number of Doors", "is_automatic", "highway MPG", "is_performance", "Engine Cylinders"], ["city mpg", "is_large", "Popularity", "Engine HP", "Number of Doors", "is_automatic", "highway MPG", "is_performance", "Engine Cylinders"], ["city mpg", "is_large", "Popularity", "Engine HP", "Number of Doors", "is_automatic", "highway MPG", "is_performance", "Engine Cylinders", "Year"], ["Year", "Engine HP", "Engine Cylinders", "Number of Doors", "highway MPG", "city mpg", "Popularity", "is_luxury", "is_performance", "is_automatic", "is_large"], ["Year", "Engine HP", "Engine Cylinders", "Number of Doors", "highway MPG", "city mpg", "Popularity", "is_luxury", "is_performance", "is_automatic", "is_awd", "is_large"]]}, "SelectKBest (Filter)": {"k": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "rmse": [32081.12, 32177.87, 32168.28, 32162.57, 31384.83, 31416.91, 31464.54, 31324.46, 30713.11, 30710.89, 30545.03, 30414.25], "r2": [0.5436, 0.5409, 0.5411, 0.5413, 0.5632, 0.5623, 0.561, 0.5649, 0.5817, 0.5818, 0.5863, 0.5898], "features": [["Engine HP"], ["Engine HP", "Engine Cylinders"], ["Engine HP", "Engine Cylinders", "is_performance"], ["Engine HP", "Engine Cylinders", "is_performance", "is_luxury"], ["Engine HP", "Engine Cylinders", "is_performance", "is_luxury", "city mpg"], ["Engine HP", "Engine Cylinders", "is_performance", "is_luxury", "city mpg", "Year"], ["Engine HP", "Engine Cylinders", "is_performance", "is_luxury", "city mpg", "Year", "highway MPG"], ["Engine HP", "Engine Cylinders", "is_performance", "is_luxury", "city mpg", "Year", "highway MPG", "Number of Doors"], ["Engine HP", "Engine Cylinders", "is_performance", "is_luxury", "city mpg", "Year", "highway MPG", "Number of Doors", "is_large"], ["Engine HP", "Engine Cylinders", "is_performance", "is_luxury", "city mpg", "Year", "highway MPG", "Number of Doors", "is_large", "is_awd"], ["Engine HP", "Engine Cylinders", "is_performance", "is_luxury", "city mpg", "Year", "highway MPG", "Number of Doors", "is_large", "is_awd", "Popularity"], ["Engine HP", "Engine Cylinders", "is_performance", "is_luxury", "city mpg", "Year", "highway MPG", "Number of Doors", "is_large", "is_awd", "Popularity", "is_automatic"]]}, "VIF Backward Elimination": {"k": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "rmse": [45314.53, 44868.2, 42813.84, 42780.35, 42771.54, 41150.04, 39098.81, 38985.66, 38194.3, 32659.22, 30349.2, 30414.25], "r2": [0.0894, 0.1073, 0.1872, 0.1884, 0.1888, 0.2491, 0.3221, 0.326, 0.3531, 0.527, 0.5916, 0.5898], "features": [["is_luxury"], ["is_luxury", "is_large"], ["Year", "is_luxury", "is_large"], ["Year", "Popularity", "is_luxury", "is_large"], ["Year", "Popularity", "is_luxury", "is_awd", "is_large"], ["Year", "Number of Doors", "Popularity", "is_luxury", "is_awd", "is_large"], ["Year", "Number of Doors", "city mpg", "Popularity", "is_luxury", "is_awd", "is_large"], ["Year", "Number of Doors", "city mpg", "Popularity", "is_luxury", "is_automatic", "is_awd", "is_large"], ["Year", "Number of Doors", "city mpg", "Popularity", "is_luxury", "is_performance", "is_automatic", "is_awd", "is_large"], ["Year", "Engine Cylinders", "Number of Doors", "city mpg", "Popularity", "is_luxury", "is_performance", "is_automatic", "is_awd", "is_large"], ["Year", "Engine HP", "Engine Cylinders", "Number of Doors", "city mpg", "Popularity", "is_luxury", "is_performance", "is_automatic", "is_awd", "is_large"], ["Year", "Engine HP", "Engine Cylinders", "Number of Doors", "highway MPG", "city mpg", "Popularity", "is_luxury", "is_performance", "is_automatic", "is_awd", "is_large"]]}}}}}
};

// ============================================================
// 2. GLOBAL STATE MANAGEMENT
// ============================================================
let currentDataset = "50_startups";
let currentRandomState = "0";
let activeAlgoFilter = "all";
let rmseChartInstance = null;
let r2ChartInstance = null;

// ============================================================
// 3. APPLICATION INITIALIZATION
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  initDatasetDropdown();
  initTabs();
  initRandomStateToggle();
  initAlgoFilters();
  initCharts();
  renderCurrentDatasetUI();
  initTableSearch();
  initExport();
  initLightbox();
});

// ============================================================
// 4. DATASET SWITCHING & EXTENSIBLE UI RENDERING
// ============================================================
function initDatasetDropdown() {
  const selector = document.getElementById("dataset-selector");
  if (!selector) return;

  // Dynamically populate options from DATASETS registry
  selector.innerHTML = "";
  Object.keys(DATASETS).forEach(dsKey => {
    const ds = DATASETS[dsKey];
    const opt = document.createElement("option");
    opt.value = ds.id;
    opt.textContent = ds.name;
    if (ds.id === currentDataset) opt.selected = true;
    selector.appendChild(opt);
  });

  selector.addEventListener("change", (e) => {
    switchDataset(e.target.value);
  });
}

function switchDataset(newDatasetId) {
  if (!DATASETS[newDatasetId] || currentDataset === newDatasetId) return;
  currentDataset = newDatasetId;

  renderCurrentDatasetUI();
}

function renderCurrentDatasetUI() {
  const ds = DATASETS[currentDataset];

  // 1. Update Title and Branding
  const titleEl = document.getElementById("app-brand-title");
  const subEl = document.getElementById("app-brand-subtitle");
  if (titleEl) titleEl.textContent = ds.brandTitle;
  if (subEl) subEl.textContent = ds.brandSubtitle;

  // 2. Update KPI cards
  updateKPICards();

  // 3. Update Benchmark Showcase Section
  updateBenchmarkShowcase();

  // 4. Update Charts
  updateCharts();

  // 5. Update Table
  renderTable();

  // 6. Build and populate dynamic Predictor inputs
  buildPredictorInputs();

  // 7. Update Diagnostics (Correlation Matrix & VIF)
  renderDiagnostics();
}

// Update KPI Header Cards
function updateKPICards() {
  const ds = DATASETS[currentDataset];
  const meta = ds.data[currentRandomState].meta;

  const kpiBestRmse = document.getElementById("kpi-best-rmse");
  const kpiBestR2 = document.getElementById("kpi-best-r2");
  const kpiBestFeatures = document.getElementById("kpi-best-features");
  const kpiBestPill = document.getElementById("kpi-best-pill");

  if (kpiBestRmse) kpiBestRmse.textContent = meta.best_rmse;
  if (kpiBestR2) kpiBestR2.textContent = meta.best_r2;
  if (kpiBestFeatures) kpiBestFeatures.textContent = meta.best_features;
  if (kpiBestPill) kpiBestPill.textContent = `k = ${meta.best_k} 特徵`;

  const kpiK1Rmse = document.getElementById("kpi-k1-rmse");
  const kpiK1R2 = document.getElementById("kpi-k1-r2");
  const kpiK1Label = document.getElementById("kpi-k1-label");
  const kpiK1Desc = document.getElementById("kpi-k1-desc");

  if (kpiK1Rmse) kpiK1Rmse.textContent = meta.k1_rmse;
  if (kpiK1R2) kpiK1R2.textContent = meta.k1_r2;
  if (kpiK1Label) kpiK1Label.textContent = meta.k1_feature ? `僅憑 ${meta.k1_feature}` : "僅憑首要特徵";
  if (kpiK1Desc) kpiK1Desc.textContent = ds.kpi.k1Desc;

  const kpiKmaxRmse = document.getElementById("kpi-kmax-rmse");
  const kpiKmaxR2 = document.getElementById("kpi-kmax-r2");
  const kpiKmaxPill = document.getElementById("kpi-kmax-pill");
  const kpiKmaxDesc = document.getElementById("kpi-kmax-desc");

  if (kpiKmaxRmse) kpiKmaxRmse.textContent = meta.k5_rmse || meta.k_full_rmse;
  if (kpiKmaxR2) kpiKmaxR2.textContent = meta.k5_r2 || meta.k_full_r2;
  if (kpiKmaxPill) kpiKmaxPill.textContent = `k = ${meta.total_features || 5} 全特徵`;
  if (kpiKmaxDesc) kpiKmaxDesc.textContent = ds.kpi.kMaxDesc;

  const kpiConsensusVal = document.getElementById("kpi-consensus-val");
  const kpiConsensusLabel = document.getElementById("kpi-consensus-label");
  const kpiConsensusDesc = document.getElementById("kpi-consensus-desc");

  if (kpiConsensusVal) kpiConsensusVal.textContent = ds.kpi.consensusVal;
  if (kpiConsensusLabel) kpiConsensusLabel.textContent = ds.kpi.consensusLabel;
  if (kpiConsensusDesc) kpiConsensusDesc.textContent = ds.kpi.consensusDesc;
}

// Update Benchmark Plot showcase
function updateBenchmarkShowcase() {
  const ds = DATASETS[currentDataset];

  const titleEl = document.getElementById("benchmark-title");
  const descEl = document.getElementById("benchmark-desc");
  const imgEl = document.getElementById("benchmark-img");
  const downloadLink = document.getElementById("benchmark-download-link");
  const lightboxImg = document.getElementById("lightbox-img");
  const insightsContainer = document.getElementById("benchmark-insights-container");

  if (titleEl) titleEl.textContent = ds.benchmarkTitle;
  if (descEl) descEl.innerHTML = ds.benchmarkSubtitle;
  if (imgEl) imgEl.src = ds.benchmarkImage;
  if (downloadLink) {
    downloadLink.href = ds.benchmarkImage;
    downloadLink.download = ds.benchmarkImage;
  }
  if (lightboxImg) lightboxImg.src = ds.benchmarkImage;

  // Render 4 key insight cards
  if (insightsContainer && ds.benchmarkInsights) {
    insightsContainer.innerHTML = ds.benchmarkInsights.map(item => `
      <div class="b-insight-card">
        <div class="b-insight-header">
          <span class="b-badge-indicator ${item.color}-indicator">${item.badge}</span>
          <h4>${item.title}</h4>
        </div>
        <p>${item.desc}</p>
      </div>
    `).join("");
  }
}

// Random State Toggle
function initRandomStateToggle() {
  const btnRs0 = document.getElementById("btn-rs-0");
  const btnRs42 = document.getElementById("btn-rs-42");

  if (btnRs0) btnRs0.addEventListener("click", () => switchRandomState("0"));
  if (btnRs42) btnRs42.addEventListener("click", () => switchRandomState("42"));
}

function switchRandomState(rs) {
  if (currentRandomState === rs) return;
  currentRandomState = rs;

  const btnRs0 = document.getElementById("btn-rs-0");
  const btnRs42 = document.getElementById("btn-rs-42");
  if (btnRs0) btnRs0.classList.toggle("active", rs === "0");
  if (btnRs42) btnRs42.classList.toggle("active", rs === "42");

  updateKPICards();
  updateCharts();
  renderTable();
  updateModelSelectOptions();
  updatePredictorDisplay();
}

// Algo Filter Pills
function initAlgoFilters() {
  const pills = document.querySelectorAll("#algo-filter-pills .pill-btn");
  pills.forEach(pill => {
    pill.addEventListener("click", () => {
      pills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      activeAlgoFilter = pill.dataset.algo;
      updateCharts();
      renderTable();
    });
  });
}

// Tab Navigation
function initTabs() {
  const tabs = document.querySelectorAll("#main-nav-tabs .tab-btn");
  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      btn.classList.add("active");
      
      const targetId = btn.dataset.tab;
      document.querySelectorAll(".tab-content").forEach(tc => tc.classList.remove("active"));
      const activeContent = document.getElementById(targetId);
      if (activeContent) {
        activeContent.classList.add("active");
        if (targetId === "tab-curves") {
          setTimeout(() => {
            if (rmseChartInstance) rmseChartInstance.resize();
            if (r2ChartInstance) r2ChartInstance.resize();
          }, 50);
        }
      }
    });
  });
}

// ============================================================
// 5. CHART.JS INITIALIZATION & UPDATES
// ============================================================
function initCharts() {
  const ctxRmse = document.getElementById("rmseChart").getContext("2d");
  const ctxR2 = document.getElementById("r2Chart").getContext("2d");

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(11, 15, 25, 0.95)",
        titleFont: { family: "Outfit", size: 13, weight: "bold" },
        bodyFont: { family: "Plus Jakarta Sans", size: 12 },
        borderColor: "rgba(255, 255, 255, 0.15)",
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        callbacks: {
          label: (ctx) => {
            const algoKey = ctx.dataset.algoKey;
            const ptIdx = ctx.dataIndex;
            const ds = DATASETS[currentDataset];
            const item = ds.data[currentRandomState].algorithms[algoKey].data[ptIdx];
            return `${ctx.dataset.label}: ${ctx.raw} (${item.features.join(", ")})`;
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "特徵數量 (Number of Features)",
          color: "#94a3b8",
          font: { family: "Outfit", size: 12, weight: 600 }
        },
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        ticks: { color: "#94a3b8" }
      },
      y: {
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        ticks: { color: "#94a3b8" }
      }
    }
  };

  rmseChartInstance = new Chart(ctxRmse, {
    type: "line",
    data: { labels: [1, 2, 3, 4, 5], datasets: [] },
    options: {
      ...commonOptions,
      scales: {
        ...commonOptions.scales,
        y: {
          ...commonOptions.scales.y,
          title: {
            display: true,
            text: "RMSE (均方根誤差，越低越好)",
            color: "#94a3b8",
            font: { family: "Outfit", size: 12, weight: 600 }
          }
        }
      }
    }
  });

  r2ChartInstance = new Chart(ctxR2, {
    type: "line",
    data: { labels: [1, 2, 3, 4, 5], datasets: [] },
    options: {
      ...commonOptions,
      scales: {
        ...commonOptions.scales,
        y: {
          ...commonOptions.scales.y,
          title: {
            display: true,
            text: "R-squared (判定係數，越高越好)",
            color: "#94a3b8",
            font: { family: "Outfit", size: 12, weight: 600 }
          }
        }
      }
    }
  });
}

function updateCharts() {
  if (!rmseChartInstance || !r2ChartInstance) return;

  const ds = DATASETS[currentDataset];
  const currentAlgos = ds.data[currentRandomState].algorithms;
  const datasetsRmse = [];
  const datasetsR2 = [];

  // Update x-axis labels to match dataset kRange
  rmseChartInstance.data.labels = ds.kRange;
  r2ChartInstance.data.labels = ds.kRange;

  const allAvailableKeys = Object.keys(currentAlgos);
  const benchmarkKeys = ["Lasso", "Sequential_Selection", "RFE", "ElasticNet", "Exhaustive_Search"];
  const defaultKeys = benchmarkKeys.filter(k => allAvailableKeys.includes(k));

  const keysToInclude = (activeAlgoFilter === "all") ? defaultKeys : [activeAlgoFilter];

  keysToInclude.forEach(key => {
    const algo = currentAlgos[key];
    if (!algo) return;

    const isSingle = (keysToInclude.length === 1);
    const lineColor = isSingle ? "#1f77b4" : algo.color;

    let pointStyle = 'circle';
    let pointRotation = 0;
    if (key === 'Lasso') pointStyle = 'circle';
    else if (key === 'Sequential_Selection') pointStyle = 'rect';
    else if (key === 'RFE') pointStyle = 'triangle';
    else if (key === 'ElasticNet') pointStyle = 'rectRot';
    else if (key === 'Exhaustive_Search') { pointStyle = 'triangle'; pointRotation = 180; }
    else if (key === 'VIF') pointStyle = 'crossRot';
    else if (key === 'SelectKBest') pointStyle = 'cross';

    datasetsRmse.push({
      label: algo.name,
      algoKey: key,
      data: algo.data.map(d => d.rmse),
      borderColor: lineColor,
      backgroundColor: lineColor,
      borderWidth: 2.2,
      pointStyle: pointStyle,
      pointRotation: pointRotation,
      pointRadius: 5,
      pointHoverRadius: 8,
      tension: 0.1
    });

    datasetsR2.push({
      label: algo.name,
      algoKey: key,
      data: algo.data.map(d => d.r2),
      borderColor: lineColor,
      backgroundColor: lineColor,
      borderWidth: 2.2,
      pointStyle: pointStyle,
      pointRotation: pointRotation,
      pointRadius: 5,
      pointHoverRadius: 8,
      tension: 0.1
    });
  });

  rmseChartInstance.data.datasets = datasetsRmse;
  r2ChartInstance.data.datasets = datasetsR2;

  // Chart titles and insight text
  const rmseTitle = document.getElementById("rmse-chart-title");
  const r2Title = document.getElementById("r2-chart-title");
  const rmseInsight = document.getElementById("rmse-insight-text");
  const r2Insight = document.getElementById("r2-insight-text");
  const rmseBadge = document.getElementById("rmse-axis-badge");

  if (rmseBadge) rmseBadge.textContent = `均方根誤差 (越低越好，單位：${ds.unitName})`;

  if (keysToInclude.length === 1) {
    if (rmseTitle) rmseTitle.textContent = `${currentAlgos[keysToInclude[0]].name}: RMSE by Number of Features`;
    if (r2Title) r2Title.textContent = `${currentAlgos[keysToInclude[0]].name}: R-squared by Number of Features`;
  } else {
    if (rmseTitle) rmseTitle.textContent = "5大演算法全體對比: RMSE by Number of Features";
    if (r2Title) r2Title.textContent = "5大演算法全體對比: R-squared by Number of Features";
  }

  if (rmseInsight && ds.insights[currentRandomState]) {
    rmseInsight.innerHTML = ds.insights[currentRandomState].rmse;
  }
  if (r2Insight && ds.insights[currentRandomState]) {
    r2Insight.innerHTML = ds.insights[currentRandomState].r2;
  }

  rmseChartInstance.update();
  r2ChartInstance.update();
}

// ============================================================
// 6. DATA TABLE POPULATION
// ============================================================
function renderTable() {
  const tbody = document.getElementById("table-body-content");
  if (!tbody) return;
  tbody.innerHTML = "";

  const ds = DATASETS[currentDataset];
  const algos = ds.data[currentRandomState].algorithms;
  const keysToDisplay = (activeAlgoFilter === "all") ? Object.keys(algos) : [activeAlgoFilter];

  const searchInput = document.getElementById("table-search-input");
  const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : "";

  const tableHeading = document.getElementById("table-card-heading");
  if (tableHeading) {
    const maxK = ds.kRange[ds.kRange.length - 1];
    tableHeading.textContent = `5大特徵選擇演算法全特徵子集清單 ($k = 1 \sim ${maxK}$)`;
  }

  keysToDisplay.forEach(key => {
    const algo = algos[key];
    if (!algo) return;

    algo.data.forEach(item => {
      const featureStr = item.features.join(" ").toLowerCase();
      const algoStr = algo.name.toLowerCase();
      if (searchQuery && !featureStr.includes(searchQuery) && !algoStr.includes(searchQuery)) {
        return;
      }

      const tr = document.createElement("tr");
      if (item.status === "gold") tr.classList.add("optimal-row");

      let badgeHtml = "";
      if (item.status === "gold") {
        badgeHtml = `<span class="status-badge gold">🏆 最佳模型</span>`;
      } else if (item.status === "good") {
        badgeHtml = `<span class="status-badge good">優良表現</span>`;
      } else if (item.status === "warn") {
        badgeHtml = `<span class="status-badge warn">邊際雜訊</span>`;
      } else {
        badgeHtml = `<span class="status-badge poor">劣化/過擬合</span>`;
      }

      const featurePillsHtml = item.features.map(f => {
        let pillClass = "feature-pill";
        if (f.includes("Marketing") || f.includes("rm") || f.includes("lstat")) pillClass += " mkt";
        else if (f.includes("Admin") || f.includes("tax") || f.includes("rad")) pillClass += " admin";
        else if (f.includes("State") || f.includes("chas")) pillClass += " state";
        return `<span class="${pillClass}">${f}</span>`;
      }).join("");

      tr.innerHTML = `
        <td><strong style="color: ${algo.color};">${algo.name}</strong></td>
        <td style="text-align: center;"><span style="font-family: var(--font-mono); font-weight: 700;">${item.k}</span></td>
        <td><div class="feature-pill-list">${featurePillsHtml}</div></td>
        <td style="text-align: right; font-family: var(--font-mono); font-weight: 600;">${ds.targetUnitPrefix}${item.rmse.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: right; font-family: var(--font-mono); font-weight: 600; color: ${item.r2 > 0.7 ? '#34d399' : (item.r2 > 0.4 ? '#38bdf8' : '#f87171')};">${item.r2.toFixed(4)}</td>
        <td style="text-align: center;">${badgeHtml}</td>
      `;

      tbody.appendChild(tr);
    });
  });
}

function initTableSearch() {
  const searchInput = document.getElementById("table-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", renderTable);
  }
}

// ============================================================
// 7. DYNAMIC LIVE PREDICTOR
// ============================================================
function buildPredictorInputs() {
  const ds = DATASETS[currentDataset];

  // Update Section Title & Subtitle
  const titleEl = document.getElementById("predictor-card-title");
  const subEl = document.getElementById("predictor-card-subtitle");
  const targetLabel = document.getElementById("predictor-target-name");
  const prefixEl = document.getElementById("predictor-unit-prefix");
  const suffixEl = document.getElementById("predictor-unit-suffix");
  const parsimonyTitle = document.getElementById("parsimony-title");
  const parsimonyText = document.getElementById("parsimony-explanation-text");

  if (titleEl) titleEl.textContent = `${ds.name} 數值試算`;
  if (subEl) subEl.textContent = `調整各項特徵參數，即時預估模型對應之 ${ds.targetName}`;
  if (targetLabel) targetLabel.textContent = ds.targetName;
  if (prefixEl) prefixEl.textContent = ds.targetUnitPrefix;
  if (suffixEl) suffixEl.textContent = ds.targetUnitSuffix;
  if (parsimonyTitle) parsimonyTitle.textContent = "模型簡潔性效益 (Parsimony Advantage)";
  if (parsimonyText) parsimonyText.innerHTML = ds.parsimony;

  // Update Model Select dropdown
  updateModelSelectOptions();

  // Render Dynamic Form Inputs
  const container = document.getElementById("dynamic-feature-inputs");
  if (!container) return;
  container.innerHTML = "";

  ds.fields.forEach(f => {
    const group = document.createElement("div");
    group.className = "form-group";
    group.id = `group-${f.key.replace(/[^a-zA-Z0-9]/g, '_')}`;

    if (f.type === "select") {
      group.innerHTML = `
        <label for="input-${f.key.replace(/[^a-zA-Z0-9]/g, '_')}">${f.label}:</label>
        <select id="input-${f.key.replace(/[^a-zA-Z0-9]/g, '_')}" class="form-select dynamic-field" data-key="${f.key}">
          ${f.options.map(o => `<option value="${o.value}" ${o.value === f.default ? 'selected' : ''}>${o.label}</option>`).join("")}
        </select>
      `;
    } else {
      const displayVal = (f.unit === "$") ? `$${Number(f.default).toLocaleString()}` : `${f.default} ${f.unit}`;
      group.innerHTML = `
        <div class="label-with-value">
          <label for="slider-${f.key.replace(/[^a-zA-Z0-9]/g, '_')}">${f.label}:</label>
          <span class="currency-badge" id="badge-${f.key.replace(/[^a-zA-Z0-9]/g, '_')}">${displayVal}</span>
        </div>
        <input type="range" id="slider-${f.key.replace(/[^a-zA-Z0-9]/g, '_')}" min="${f.min}" max="${f.max}" step="${f.step}" value="${f.default}" class="slider-input dynamic-slider" data-key="${f.key}">
        <input type="number" id="num-${f.key.replace(/[^a-zA-Z0-9]/g, '_')}" min="${f.min}" max="${f.max}" step="${f.step}" value="${f.default}" class="num-input dynamic-num" data-key="${f.key}">
      `;
    }

    container.appendChild(group);
  });

  // Bind live sync events to sliders and numbers
  ds.fields.forEach(f => {
    if (f.type === "select") {
      const el = document.getElementById(`input-${f.key.replace(/[^a-zA-Z0-9]/g, '_')}`);
      if (el) el.addEventListener("change", updatePredictorDisplay);
    } else {
      const keySan = f.key.replace(/[^a-zA-Z0-9]/g, '_');
      const slider = document.getElementById(`slider-${keySan}`);
      const num = document.getElementById(`num-${keySan}`);
      const badge = document.getElementById(`badge-${keySan}`);

      if (slider && num && badge) {
        slider.addEventListener("input", () => {
          num.value = slider.value;
          badge.textContent = (f.unit === "$") ? `$${Number(slider.value).toLocaleString()}` : `${slider.value} ${f.unit}`;
          updatePredictorDisplay();
        });

        num.addEventListener("input", () => {
          slider.value = num.value;
          badge.textContent = (f.unit === "$") ? `$${Number(num.value).toLocaleString()}` : `${num.value} ${f.unit}`;
          updatePredictorDisplay();
        });
      }
    }
  });

  // Reset button
  const btnReset = document.getElementById("btn-reset-inputs");
  if (btnReset) {
    btnReset.onclick = () => {
      ds.fields.forEach(f => {
        const keySan = f.key.replace(/[^a-zA-Z0-9]/g, '_');
        if (f.type === "select") {
          const el = document.getElementById(`input-${keySan}`);
          if (el) el.value = f.default;
        } else {
          const slider = document.getElementById(`slider-${keySan}`);
          const num = document.getElementById(`num-${keySan}`);
          const badge = document.getElementById(`badge-${keySan}`);
          if (slider) slider.value = f.default;
          if (num) num.value = f.default;
          if (badge) badge.textContent = (f.unit === "$") ? `$${Number(f.default).toLocaleString()}` : `${f.default} ${f.unit}`;
        }
      });
      updatePredictorDisplay();
    };
  }

  updatePredictorDisplay();
}

function updateModelSelectOptions() {
  const ds = DATASETS[currentDataset];
  const modelSelect = document.getElementById("predictor-model-select");
  if (!modelSelect) return;

  const options = ds.modelOptions[currentRandomState] || ds.modelOptions["0"];
  modelSelect.innerHTML = "";

  options.forEach((opt, idx) => {
    const el = document.createElement("option");
    el.value = opt.value;
    el.textContent = opt.label;
    if (idx === 0) el.selected = true;
    modelSelect.appendChild(el);
  });

  const selectedDesc = document.getElementById("selected-model-desc");
  if (selectedDesc && options.length > 0) {
    selectedDesc.textContent = options[0].label.split(" ")[1] || "精選模型";
  }

  modelSelect.onchange = () => {
    const optText = modelSelect.options[modelSelect.selectedIndex].text;
    if (selectedDesc) selectedDesc.textContent = optText.split(" ")[1] || "指定模型";
    updatePredictorDisplay();
  };
}

function updatePredictorDisplay() {
  const ds = DATASETS[currentDataset];
  const modelSelect = document.getElementById("predictor-model-select");
  if (!modelSelect) return;

  const modelType = modelSelect.value;
  const modelInfo = ds.data[currentRandomState].models[modelType];
  if (!modelInfo) return;

  const intercept = modelInfo.intercept;
  let predictedVal = intercept;
  const contributions = [
    { name: "基準截距 (Base Intercept)", amount: intercept }
  ];

  // Collect user input values
  const inputValues = {};
  ds.fields.forEach(f => {
    const keySan = f.key.replace(/[^a-zA-Z0-9]/g, '_');
    if (f.type === "select") {
      const el = document.getElementById(`input-${keySan}`);
      inputValues[f.key] = el ? el.value : f.default;
    } else {
      const el = document.getElementById(`num-${keySan}`);
      inputValues[f.key] = el ? Number(el.value) : f.default;
    }
  });

  // Calculate prediction and contribution based on active dataset schema
  if (currentDataset === "50_startups") {
    const rd = inputValues["R&D Spend"] || 0;
    const mkt = inputValues["Marketing Spend"] || 0;
    const admin = inputValues["Administration"] || 0;
    const state = inputValues["State"] || "California";

    if (modelInfo.coef["R&D Spend"]) {
      const val = rd * modelInfo.coef["R&D Spend"];
      predictedVal += val;
      contributions.push({ name: `R&D Spend (×${modelInfo.coef["R&D Spend"].toFixed(4)})`, amount: val });
    }
    if (modelInfo.coef["Marketing Spend"]) {
      const val = mkt * modelInfo.coef["Marketing Spend"];
      predictedVal += val;
      contributions.push({ name: `Marketing Spend (×${modelInfo.coef["Marketing Spend"].toFixed(4)})`, amount: val });
    }
    if (modelInfo.coef["Administration"]) {
      const val = admin * modelInfo.coef["Administration"];
      predictedVal += val;
      contributions.push({ name: `Administration (×${modelInfo.coef["Administration"].toFixed(4)})`, amount: val });
    }
    if (state === "New York" && modelInfo.coef["State_New York"]) {
      const val = modelInfo.coef["State_New York"];
      predictedVal += val;
      contributions.push({ name: `設立紐約州 (State_New York 虛擬增益)`, amount: val });
    }
    if (state === "Florida" && modelInfo.coef["State_Florida"]) {
      const val = modelInfo.coef["State_Florida"];
      predictedVal += val;
      contributions.push({ name: `設立佛州 (State_Florida 虛擬影響)`, amount: val });
    }
  } else {
    // Generic Linear Feature Multiplier for Boston Housing or any future dataset
    Object.entries(modelInfo.coef).forEach(([featKey, slope]) => {
      const inputVal = inputValues[featKey] !== undefined ? inputValues[featKey] : 0;
      const termVal = inputVal * slope;
      predictedVal += termVal;
      const fDef = ds.fields.find(f => f.key === featKey);
      const nameStr = fDef ? fDef.label : featKey;
      contributions.push({
        name: `${nameStr} (${inputVal} × ${slope.toFixed(4)})`,
        amount: termVal
      });
    });
  }

  // Display result
  const resultDisplay = document.getElementById("prediction-result-display");
  if (resultDisplay) {
    if (currentDataset === "50_startups") {
      resultDisplay.textContent = Math.round(predictedVal).toLocaleString();
    } else {
      resultDisplay.textContent = predictedVal.toFixed(2);
    }
  }

  // Equation display tag
  const equationTag = document.getElementById("prediction-equation-tag");
  if (equationTag) {
    const formulaParts = [`${intercept.toFixed(2)}`];
    Object.entries(modelInfo.coef).forEach(([feat, slope]) => {
      formulaParts.push(`${slope >= 0 ? "+" : "-"} ${Math.abs(slope).toFixed(4)} × ${feat.replace("State_", "")}`);
    });
    equationTag.textContent = `回歸方程式: ${formulaParts.join(" ")}`;
  }

  // Feature contribution breakdown
  const breakdownList = document.getElementById("contribution-breakdown-list");
  if (breakdownList) {
    breakdownList.innerHTML = contributions.map(c => {
      const formattedAmt = (currentDataset === "50_startups")
        ? `${c.amount >= 0 ? "+" : ""}$${Math.round(c.amount).toLocaleString()}`
        : `${c.amount >= 0 ? "+" : ""}${c.amount.toFixed(2)}k`;

      return `
        <div class="breakdown-row">
          <span class="breakdown-name">${c.name}</span>
          <span class="breakdown-val" style="color: ${c.amount >= 0 ? '#38bdf8' : '#f87171'};">
            ${formattedAmt}
          </span>
        </div>
      `;
    }).join("");
  }
}

// ============================================================
// 8. DIAGNOSTICS: CORRELATION MATRIX & VIF
// ============================================================
function renderDiagnostics() {
  const ds = DATASETS[currentDataset];

  // 1. Render Correlation Matrix Heatmap Table
  const container = document.getElementById("corr-heatmap-container");
  if (container && ds.corr) {
    const cols = ds.corr.columns;
    const vals = ds.corr.values;

    let tableHtml = `<table class="matrix-table" id="corr-matrix-table"><thead><tr><th>變數</th>`;
    cols.forEach(c => {
      tableHtml += `<th>${c}</th>`;
    });
    tableHtml += `</tr></thead><tbody>`;

    cols.forEach((rowName, rIdx) => {
      tableHtml += `<tr><td class="row-header">${rowName}</td>`;
      cols.forEach((colName, cIdx) => {
        const v = vals[rIdx][cIdx];
        let cellClass = "corr-cell";
        if (Math.abs(v) >= 0.7) cellClass += " corr-high";
        else if (Math.abs(v) >= 0.4) cellClass += " corr-med";
        else if (Math.abs(v) >= 0.2) cellClass += " corr-low";
        else cellClass += " corr-none";

        tableHtml += `<td class="${cellClass}">${v.toFixed(3)}</td>`;
      });
      tableHtml += `</tr>`;
    });
    tableHtml += `</tbody></table>`;
    container.innerHTML = tableHtml;
  }

  // 2. Render Correlation Bullet Insights
  const insightsWrap = document.getElementById("corr-insights-container");
  if (insightsWrap && ds.corrInsights) {
    insightsWrap.innerHTML = ds.corrInsights.map(item => `
      <div class="insight-item">
        <span class="bullet-dot ${item.dot}"></span>
        <div>
          <strong>${item.title}</strong>
          <p>${item.desc}</p>
        </div>
      </div>
    `).join("");
  }

  // 3. Render VIF Progress Bars
  const vifBarsWrap = document.getElementById("vif-bars-container");
  if (vifBarsWrap && ds.vif) {
    vifBarsWrap.innerHTML = ds.vif.map(item => {
      const v = item.vif;
      let barClass = "green";
      let statusDesc = "良好 (<= 5.0)";
      if (v > 7.0) {
        barClass = "red";
        statusDesc = "⚠️ 重度共線性 (> 7.0)";
      } else if (v > 5.0) {
        barClass = "yellow";
        statusDesc = "中度共線性 (> 5.0)";
      }

      const pct = Math.min(100, Math.round((v / 10.0) * 100));

      return `
        <div class="vif-bar-item">
          <div class="vif-bar-header">
            <span class="vif-name">${item.feature}</span>
            <span class="vif-score" style="color: ${v > 5 ? '#f87171' : '#34d399'};">VIF = ${v.toFixed(3)}</span>
          </div>
          <div class="vif-track">
            <div class="vif-fill ${barClass}" style="width: ${pct}%;"></div>
          </div>
          <span class="vif-status-text">${statusDesc}</span>
        </div>
      `;
    }).join("");
  }

  // 4. VIF Conclusion text
  const vifConclusion = document.getElementById("vif-conclusion-text");
  if (vifConclusion) vifConclusion.textContent = ds.vifConclusion;
}

// ============================================================
// 9. EXPORT TO CSV
// ============================================================
function initExport() {
  const exportBtn = document.getElementById("btn-export-csv");
  if (!exportBtn) return;

  exportBtn.addEventListener("click", () => {
    const ds = DATASETS[currentDataset];
    const algos = ds.data[currentRandomState].algorithms;
    let csv = "Dataset,RandomState,Algorithm,k,SelectedFeatures,RMSE,R2\n";

    Object.entries(algos).forEach(([key, algo]) => {
      algo.data.forEach(d => {
        csv += `"${ds.id}",${currentRandomState},"${algo.name}",${d.k},"${d.features.join("; ")}",${d.rmse},${d.r2}\n`;
      });
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ds.id}_feature_selection_rs${currentRandomState}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

// ============================================================
// 10. LIGHTBOX MODAL FOR MASTER PLOT
// ============================================================
function initLightbox() {
  const modal = document.getElementById("benchmark-lightbox");
  const openBtn = document.getElementById("btn-zoom-benchmark");
  const imgContainer = document.getElementById("benchmark-img-container");
  const closeBtn = document.getElementById("lightbox-close-btn");
  const backdrop = document.getElementById("lightbox-backdrop");

  if (!modal) return;

  const openModal = () => {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  };

  const closeModal = () => {
    modal.classList.remove("active");
    document.body.style.overflow = "";
  };

  if (openBtn) openBtn.addEventListener("click", openModal);
  if (imgContainer) imgContainer.addEventListener("click", openModal);
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (backdrop) backdrop.addEventListener("click", closeModal);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("active")) {
      closeModal();
    }
  });
}
