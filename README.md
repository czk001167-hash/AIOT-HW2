# AIOT-1014-DIC: 50 Startups 多元線性迴歸與特徵選擇比較分析

## 🔗 相關連結與展示

* **GitHub 連結**：https://github.com/czk001167-hash/AIOT-1014-DIC
* **網頁連結**：https://czk001167-hash.github.io/AIOT-1014-DIC/

### 📊 平台畫面截圖

![5大特徵選擇演算法分析平台](screenshot.png)

---

本專案遵循 **CRISP-DM（Cross-Industry Standard Process for Data Mining）** 流程，針對新創公司數據集（`50_Startups.csv`）進行深度探索、特徵工程、多重共線性診斷，並系統性評估 **5 大特徵選擇演算法（Feature Selection Algorithms）** 在特徵維度 $k = 1 \sim 5$ 下對多元線性迴歸模型預測利潤（`Profit`）的影響與泛化能力。

專案同時包含以原生 Web 技術建構之**現代化互動式決策與預測儀表板**（Glassmorphism UI），提供即時利潤預估、特徵重要性分析與跨演算法比較。

---

## 📊 核心成果：特徵選擇演算法全維度對比

下圖為在測試集（Test Set, 80/20 分割, `random_state=0`）上評估 5 種特徵選擇演算法於 $k=1 \sim 5$ 時的表現：

![5 Feature Selection Methods Comparison](feature_selection_comparison.png)

### 關鍵統計學洞察：為什麼特徵不是越多越好？

1. **過擬合（Overfitting）與雜訊變數（Noise Variables）**：
   * 在 $k=1$ 時，單靠 `R&D Spend`（研發支出）即能解釋高達 **94.65%** 的利潤變異（Test RMSE = 8,275）。
   * 在 $k=2$ 時，加入 `Marketing Spend`（行銷支出）達到實務最佳泛化性能（Test RMSE 降至 **8,198.80**，Test $R^2$ 提升至 **0.9474**）。
   * 當特徵數繼續增加到 $k=3 \sim 5$（納入 `Administration` 行政支出與州別虛擬變數），**模型性能反而大幅劣化**（全變數時 RMSE 飆升至 **9,137.99**，降幅顯著）。這是因為後續特徵本質上接近雜訊，小樣本（50 筆）下多估計參數只會膨脹估計方差。

2. **演算法在端點的必然收斂**：
   * **$k=1$ 與 $k=2$ 完全重疊**：所有演算法的第一優先特徵均為 `R&D Spend`，前二特徵均為 `[R&D, Marketing]`。
   * **$k=5$ 完全合流**：候選特徵僅有 5 個，選滿時皆退化為傳統普通最小平方法（Full OLS）。

3. **貪婪搜尋陷阱（Greedy Trap）vs. 窮舉全域最優（Exhaustive Search）**：
   * **Forward SFS** 與 **RFE** 在 $k=3$ 時因前兩步鎖定 `[R&D, Marketing]`，只能被動加入 `Administration`，導致 RMSE 暴增至 8,804。
   * **Exhaustive Search（窮舉法）** 跳脫了前兩步的巢狀限制，在 $k=3$ 時跳過 Marketing，直接選取 `['R&D Spend', 'Administration', 'State_Florida']`，創下測試集最佳紀錄（RMSE = **8,171.65**，$R^2$ = **0.9478**）。

4. **Lasso L1 正則化的穩健折衷**：
   * **Lasso (L1 Ranking)** 透過稀疏係數收縮，在 $k=3$ 與 $k=4$ 優先將州別虛擬變數排在行政支出之前，表現明顯優於一般貪婪法。

---

## 🔍 5 大特徵選擇方法詳細規格

| 演算法 | 類型 | 核心機制 | 優點 | 局限性 |
| :--- | :--- | :--- | :--- | :--- |
| **Lasso (L1 Ranking)** | 嵌入法 (Embedded) | $L_1$ 正則化懲罰稀疏收縮 | 自動特徵剔除，抗共線性能力強 | 高度相關變數容易隨機保留其一 |
| **Forward SFS** | 封裝法 (Wrapper) | 基於 5-Fold CV $R^2$ 前向貪婪逐步加入 | 考慮特徵與模型的非線性交互作用 | 計算成本高，容易陷入局部最佳解 |
| **RFE** | 封裝法 (Wrapper) | 標準化 OLS 係數遞迴消除最小貢獻項 | 針對特定模型做全域剪枝 | 同樣受貪婪消除限制 |
| **ElasticNet Ranking** | 嵌入法 (Embedded) | $L_1 + L_2$ 混合正則化 | 群組效應（Group Effect），兼顧相關特徵 | 超參數需雙重調優（$\alpha, \text{l1\_ratio}$） |
| **Exhaustive Search** | 最佳子集 (Best Subset) | 評估 $\binom{5}{k}$ 所有組合在驗證上的表現 | 保證找到該維度下的全域最佳組合 | 當特徵數龐大時組合爆炸（維度災難） |

---

## 📈 評估指標對照表（$k=1 \sim 5$）

以 `random_state=0` 進行 80/20 切分後於測試集（$N=10$）之實測結果：

| 演算法 | $k$ | 所選特徵集合 | Test RMSE | Test $R^2$ | Test MAE |
| :--- | :---: | :--- | :---: | :---: | :---: |
| **Exhaustive Search** | **3** | `['R&D Spend', 'Administration', 'State_Florida']` | **8,171.65** | **0.9478** | **6,730.79** |
| **Exhaustive Search** | 4 | `['R&D', 'Administration', 'State_Florida', 'State_New York']` | 8,178.37 | 0.9477 | 6,751.89 |
| **實務首選 (All Methods)** | **2** | `['R&D Spend', 'Marketing Spend']` | **8,198.80** | **0.9474** | **6,886.59** |
| 基線單變數 (All Methods) | 1 | `['R&D Spend']` | 8,274.87 | 0.9465 | 6,772.45 |
| **Lasso (L1 Ranking)** | 3 | `['R&D Spend', 'Marketing Spend', 'State_New York']` | 8,309.06 | 0.9460 | 7,028.44 |
| **Lasso (L1 Ranking)** | 4 | `['R&D', 'Marketing', 'State_New York', 'State_Florida']` | 8,409.92 | 0.9447 | 7,109.16 |
| **Forward SFS / RFE / ENet** | 3 | `['R&D Spend', 'Administration', 'Marketing Spend']` | 8,803.78 | 0.9394 | 7,320.44 |
| **ElasticNet Ranking** | 4 | `['R&D', 'Marketing', 'Admin', 'State_New York']` | 8,997.20 | 0.9367 | 7,474.74 |
| **Forward SFS / RFE** | 4 | `['R&D', 'Admin', 'Marketing', 'State_Florida']` | 9,068.54 | 0.9357 | 7,431.47 |
| **全特徵基準 (Full OLS)** | 5 | 全部 5 項特徵 | 9,137.99 | 0.9347 | 7,514.29 |

---

## 🗂️ 專案檔案結構說明

```plaintext
AIOT-1014-DIC/
├── 50_Startups.csv                        # 50 筆新創公司原始資料集
├── BostonHousing.csv                      # 506 筆波士頓房價原始資料集（13 特徵 + MEDV）
├── main.py                                # 50 Startups 完整 CRISP-DM 流程主程式
├── DIC.py                                 # 50 Startups 模型 B：多重共線性診斷與 VIF 分析
├── boston_main.py                         # Boston Housing 完整特徵選擇主程式 (k=1~13)
├── boston_DIC.py                          # Boston Housing 模型 B：迭代 VIF 共線性消除分析
├── run_feature_selection_comparison.py    # 批次基準測試與比較矩陣生成腳本
├── generate_all_plots.py                  # 各演算法獨立 2-Panel 圖表生成器
├── dump_coefficients.py                   # 提取迴歸係數輔助腳本
├── feature_selection_comparison.png       # 50 Startups 特徵選擇全維度性能對比圖
├── boston_feature_selection_comparison.png# Boston Housing 特徵選擇全維度性能對比圖
├── startup_feature_selection_models.joblib # 50 Startups 序列化模型
├── startup_model_b.joblib                 # 50 Startups 模型 B 成果
├── startup_model_comparison.csv           # 50 Startups 比較結果數據表
├── boston_feature_selection_models.joblib # Boston Housing 序列化模型
├── boston_model_b.joblib                  # Boston Housing 模型 B 成果
├── boston_model_comparison.csv            # Boston Housing 比較結果數據表
├── boston_metadata.json                   # Boston Housing Web 完整中繼資料
├── index.html                             # 多資料集互動式 Web 決策與預測儀表板
├── app.js                                 # 可擴充架構之儀表板邏輯 (支援多資料集即時切換)
├── style.css                              # Glassmorphism 風格深色/質感 CSS 設計
├── screenshot.png                         # 5大特徵選擇演算法分析平台畫面截圖
├── requirements.txt                       # Python 相依套件清單
└── README.md                              # 專案詳細文檔
```

---

## 🌐 互動式 Web 預測儀表板 (支援多資料集切換與擴充)

本專案提供現代化 Web 決策儀表板（無需後端伺服器，直接以瀏覽器開啟 `index.html` 即可使用）：

* **資料集切換選單 (Dataset Dropdown)**：
  * 可隨時於 **「50 Startups (新創獲利預測)」** 與 **「Boston Housing (波士頓房價)」** 之間即時切換。
  * 前端採用模組化註冊表設計（`DATASETS`），未來新增任何資料集（如加州房價、糖尿病資料等）僅需增加一筆配置，儀表板將自動生成對應的滑桿輸入、圖表、評估表與診斷指標。
* **即時數值試算機**：針對選定之資料集動態生成各項特徵輸入滑桿與數值方塊，即時計算預測值、公式與特徵貢獻分解。
* **多維度特徵曲線圖**：動態展示 5 大演算法隨特徵數量增加之 RMSE 誤差收斂與 $R^2$ 解釋力變化（50 Startups: $k=1 \sim 5$；Boston Housing: $k=1 \sim 13$）。
* **共線性矩陣與 VIF 診斷**：動態呈現皮爾森相關矩陣熱圖、診斷指標與 VIF 方差膨脹因子長條圖。

---

## 🚀 快速上手指南

### 1. 複製儲存庫
```bash
git clone https://github.com/czk001167-hash/AIOT-1014-DIC.git
cd AIOT-1014-DIC
```

### 2. 安裝 Python 相依套件
建議使用虛擬環境：
```bash
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

### 3. 執行主分析腳本
```bash
python main.py
```
> 執行後將依序完成 EDA、特徵預處理、VIF 檢驗、5 大特徵選擇演算法訓練與評估，並彈出與儲存 `feature_selection_comparison.png` 高清成果圖。

### 4. 開啟 Web 儀表板
直接點擊雙擊 `index.html`，或使用 VS Code Live Server / Python 簡易伺服器：
```bash
python -m http.server 8080
```
在瀏覽器開啟 `http://localhost:8080` 即可體驗完整的互動式儀表板。

---

## 📌 結論與實務建議

1. **奧卡姆剃刀原則（Occam's Razor）**：
   在商業利潤預測中，**2 個特徵（`R&D Spend` + `Marketing Spend`）** 是性價比與泛化穩定性最高的選擇，既具備 94.74% 的強大解釋力，又避免了行政支出與地理虛擬變數帶來的雜訊過擬合。
2. **演算法選擇建議**：
   * 當候選特徵維度較小（如 $< 15$）時，優先採用 **Exhaustive Search（最佳子集法）**，能有效避免貪婪法的局部最優陷阱。
   * 當特徵維度龐大時，**Lasso (L1 Regularization)** 是兼顧計算效率與稀疏穩定性的首選。

---


