## 概覽

- **dicom-parser**: 瀏覽器端的輕量 DICOM 二進位解析器，負責把 ArrayBuffer/Uint8Array 轉成具結構的 DataSet（Tag、VR、Length、Value），不負責像素解壓。
- **cornerstoneWADOImageLoader**: 將 DICOM byte 流轉為 Cornerstone 可渲染的影像，處理 frame 抽取、Transfer Syntax 判斷、像素解碼（透過 codec/worker）、並提供必要的 metadata。

## dicom-parser 重點

- **角色**: 零依賴、按需解析 DICOM；提供標籤與值的讀取介面。
- **核心概念**:
  - 以小端序為主，支援顯式/隱式 VR、不定長度（0xFFFFFFFF）、序列（SQ）、Encapsulated Pixel Data（多 fragment）。
  - 線性掃描 ByteStream，使用位移指標避免不必要拷貝與大物件分配。
  - 僅記錄 Pixel Data 的 offset/length，解壓交由上層（例如 Cornerstone 的 codec）。
- **常用 API/結構**:
  - `parseDicom(byteArray, options)` → 回傳 DataSet。
  - `dataSet.elements[tag]`、`dataSet.string(tag)`、`dataSet.uint16(tag)` 等 getter。
  - `dataSet.byteArray`、`dataSet.byteArrayParser`、`dataSet.position`。
- **關鍵處理**:
  - SQ/Item 以遞迴解析，遇 delimitation item 或不定長度結束。
  - `(7FE0,0010)` Pixel Data 支援 encapsulated：多 frame、多 fragment；僅標記範圍不解壓。
- **常見陷阱**:
  - 隱式 VR 或缺私有字典可能造成長度/型別判斷困難。
  - 大型/多幀影像避免一次性攤平成 JS 物件；應依 offset 懶取。
  - Transfer Syntax 判斷錯誤會造成後續像素解碼失敗（需與 loader 同步正確 TS）。

## cornerstoneWADOImageLoader 重點

- **角色**: 以 `dicom-parser` 為基礎，完成影像載入、解碼、與 Cornerstone 影像組裝。
- **模組化架構**:
  - `wadouri`: 透過 WADO-URI/HTTP/本地抓取 DICOM，交由 `dicom-parser` 解析。
  - `wadors`: 支援 DICOMweb（WADO-RS）介面，按需抓取 frame。
  - `codec`: 處理 JPEG/JPEG-LS/JPEG2000/RLE 等壓縮解碼（常於 Web Worker + WASM）。
  - `metaDataProvider`: 提供 Cornerstone 讀取必需 metadata（rows、cols、spacing、VOI、Transfer Syntax 等）。
  - `imageLoader`: 實作 `cornerstone.loadImage(imageId)` 所需 provider（回傳包含像素與屬性的 Cornerstone image）。
  - `webWorkerManager`: 管理 worker 池與任務，使用 Transferable ArrayBuffer 減少複製。
- **資料流（簡化）**:
  1) 解析 `imageId`（如 `wadouri:http://...` 或本地檔）。
  2) 抓取位元流 → `dicom-parser` 解析 DataSet。
  3) 依 `TransferSyntaxUID` 判斷是否壓縮；若壓縮則交給對應 codec/worker。
  4) 抽出指定 frame，產生 TypedArray（Uint8/Int16/Float32）。
  5) 組裝 Cornerstone image（width/height/spacing/VOI/rescale slope/intercept 等）。
- **常用掛點**:
  - 註冊 loader 與 metadata：`cornerstone.registerImageLoader('wadouri', ...)`、`cornerstone.metaData.addProvider(...)`。
  - 設定 Web Worker/Codecs：`webWorkerManager.initialize({ maxWebWorkers, taskConfiguration, codecsPath })`。
- **效能**:
  - Worker 併發解碼、Transferable 降低拷貝成本。
  - 多幀逐幀載入與快取；避免一次載入所有 frame。
  - 可使用 codec 設定（如 JPEG2000 reduce/quality）權衡品質與速度。
- **常見問題**:
  - 缺 codec（JPEG-LS/JPEG2000）→ 需正確引入 wasm/worker 並處理 CORS/路徑。
  - 不支援的 Transfer Syntax → 需轉碼或引入新 codec。
  - 損壞 DICOM/片段長度不一致 → 解碼錯誤。
  - 本地檔案需使用 `fileManager`/`fileImageLoader` 或 `dicomfile://` imageId。

## 兩者如何協作

- **dicom-parser**: 提供結構化標籤與像素資料定位（不解壓）。
- **cornerstoneWADOImageLoader**: 讀取 DataSet → 判斷 Transfer Syntax/Frame → 呼叫對應 codec 解壓 → 回傳 Cornerstone image 與 metadata。
- 應用端只需：配置 loader/metadata/worker/codec 路徑，呼叫 `cornerstone.loadImage(imageId)`。

## 實務建議

- **確認 Transfer Syntax**: `(0002,0010)`，針對 JPEG/J2K/JLS/RLE 等壓縮務必引入對應 codec。
- **大量多幀**:
  - 開啟 Web Workers，限制合理 worker 數。
  - 逐幀載入與快取，避免一次載入全部。
  - 使用預載/優先權策略，優化互動體驗。
- **錯誤處理與 fallback**: 不支援語法或解碼失敗時提示轉碼或替代流程。
- **技術選型**: 新專案可評估 Cornerstone v3（Cornerstone3D 與 `@cornerstonejs/*`），但需注意與 v2 API 差異。

## 何時直接讀源碼

- 需要自訂 frame 抽取策略、支援特殊 Transfer Syntax、或最佳化多幀載入行為。
- 需掛接自有快取/網路層（斷點續傳、簽名 URL、離線快取）。
- 擴充 `metaDataProvider`（私有 tag、臨床欄位）。


