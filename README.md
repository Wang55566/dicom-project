# DICOM 檢視器

React + Cornerstone.js 的 DICOM 影像檢視器（512×512 視窗、滾輪切片、快速跳轉）。

## 功能

- **512x512px 顯示**：以固定視窗顯示醫學影像
- **切片瀏覽**：使用滑鼠滾輪上下捲動切換切片
- **切片計數器**：右上角顯示目前切片編號
- **快速跳轉表**：點選表格快速跳至 100、150、200 切片
- **載入提示**：讀取 DICOM 時顯示載入狀態
- **WADO 載入**: 以 `cornerstone-wado-image-loader` 讀取 `/DICOM_test_files/*.dcm`

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
   - 表格中已選切片會有醒目反白

## 技術重點（架構）

- **主要元件**：`src/components/DicomViewer.jsx`（唯一元件）
- **載入流程**：
  1) 將檔名轉為 `wadouri:/DICOM_test_files/xxx.dcm`
  2) `cornerstone.loadAndCacheImage(imageId)` 讀取並快取
  3) `cornerstone.displayImage(element, image)` 顯示
- **dicom-parser 與 loader 分工**：
  - dicom-parser 解析位元流為 DataSet（標籤/offset/length），不負責解壓
  - wado image loader 依 Transfer Syntax 決定是否解碼（JPEG/J2K/JLS/RLE 透過 codec/worker）
- **多幀**: 以 `?frame=N` 逐幀取用（本案以多檔堆疊切換）
- **Web Workers**: 預設開啟，減少主執行緒阻塞

## 相依套件

- `cornerstone-core`：Cornerstone 核心
  （未啟用 `cornerstone-tools`，可後續擴充）
- `cornerstone-wado-image-loader`：DICOM 載入
- `dicom-parser`：DICOM 解析
- `react`：React 框架
- `react-dom`：React DOM 渲染

## 專案結構（精簡）

```
src/
├── App.jsx                 # 入口（渲染 DicomViewer）
├── index.css               # 簡易 reset
├── main.jsx                # 掛載入口
└── components/
    ├── DicomViewer.jsx     # 檢視器（邏輯 + UI）
    └── DicomViewer.css     # 元件樣式

public/
└── DICOM_test_files/    # DICOM 檔案目錄
    ├── 00000001.dcm
    ├── 00000002.dcm
    └── ... (93 total files)
```

## 傳入檔案陣列（可選）

可由外層傳入自訂檔案清單，未提供則預設載入 `00000001.dcm`～`00000093.dcm`：

```jsx
import DicomViewer from './components/DicomViewer'

const files = [
  '/DICOM_test_files/00000001.dcm',
  '/DICOM_test_files/00000002.dcm',
]

export default function App() {
  return <DicomViewer files={files} />
}
```

## 瀏覽器相容性

需要現代瀏覽器並支援：
- ES6+ JavaScript
- Canvas API
- Web Workers（影像處理）
- File API（DICOM 載入）