# DICOM 前端

## 功能

- **512x512px 顯示**：以固定視窗顯示醫學影像
- **切片瀏覽**：使用滑鼠滾輪上下捲動切換切片
- **切片計數器**：右上角顯示目前切片編號
- **快速跳轉表**：點選表格快速跳至 100、150、200 切片
- **載入提示**：讀取 DICOM 時顯示載入狀態
- **WADO 載入**：以 `cornerstone-wado-image-loader` 讀取由 Vite 收集的 `.dcm` 資源 URL

## 使用方式

1. 啟動開發伺服器：
   ```bash
   yarn dev
   ```

2. 開啟瀏覽器：`http://localhost:5173`

3. 瀏覽切片：
   - 使用滑鼠滾輪上下切換切片
   - 點選表格快速跳轉至指定切片（100、150、200）

4. 檢視資訊：
   - 右上角顯示目前切片編號

## 架構

- **主要元件**：`src/components/DicomViewer.jsx`（唯一元件）
- **載入流程**：
  1) 以 `import.meta.glob('/src/assets/**/*.dcm', { query: '?url', import: 'default', eager: true })` 收集 URL
  2) 將每個 URL 轉為 `wadouri:URL` 的 imageId
  3) `cornerstone.loadAndCacheImage(imageId)` 讀取並快取 → `cornerstone.displayImage()` 顯示
- **dicom-parser 與 loader 分工**：
  - dicom-parser 解析位元流為 DataSet（標籤/offset/length），不負責解壓
  - wado image loader 依 Transfer Syntax 決定是否解碼

## 相依套件

- `cornerstone-core`：Cornerstone 核心
  （未啟用 `cornerstone-tools`）
- `cornerstone-wado-image-loader`：DICOM 載入
- `dicom-parser`：DICOM 解析
- `react`：React 框架
- `react-dom`：React DOM 渲染

## 專案結構（精簡）

```
src/
├── App.jsx                       # 入口（渲染 DicomViewer）
├── index.css                     
├── main.jsx                      # 掛載入口
├── assets/
│   └── DICOM_test_files/         # 主要 DICOM 檔案目錄（Vite 會自動收集）
│       ├── 00000001.dcm
│       ├── 00000002.dcm
│       └── ...
└── components/
    ├── DicomViewer.jsx           # 檢視器（邏輯 + UI）
    └── DicomViewer.css           # 元件樣式
```