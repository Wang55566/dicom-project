# DICOM Viewer 實作文件

## 📋 專案概述

本專案使用 Cornerstone.js 和 React 實現一個功能完整的 DICOM 醫學影像檢視器，支援多 slice 顯示、滑鼠滾輪導航、快速跳轉等功能。

## 🎯 核心功能

1. **512x512px 固定尺寸影像顯示**
2. **滑鼠滾輪切換不同 slice**
3. **右上角顯示當前 slice 編號**
4. **快速導航表格，點擊跳轉到指定 slice**
5. **智能按鈕禁用（不存在的 slice）**
6. **完整的錯誤處理機制**

## 📁 專案結構

```
my_dicom_project/
├── public/
│   └── DICOM_test_files/        # 93 個 DICOM 檔案
│       ├── 00000001.dcm
│       ├── 00000002.dcm
│       └── ...
├── src/
│   ├── App.jsx                   # 主要組件
│   ├── App.css                   # 樣式檔案
│   ├── main.jsx                  # 入口檔案
│   └── index.css                 # 全局樣式
├── package.json                  # 依賴配置
└── README.md                     # 項目說明
```

## 🔧 技術棧

### 依賴套件

```json
{
  "dependencies": {
    "cornerstone-core": "^2.6.1",
    "cornerstone-tools": "^6.0.10",
    "cornerstone-wado-image-loader": "^4.13.2",
    "dicom-parser": "^1.8.21",
    "react": "^19.1.1",
    "react-dom": "^19.1.1"
  }
}
```

### 核心函式庫說明

- **cornerstone-core**: Cornerstone.js 核心功能，提供影像顯示基礎
- **cornerstone-tools**: 影像處理工具集
- **cornerstone-wado-image-loader**: DICOM 檔案載入器
- **dicom-parser**: DICOM 檔案解析器

## 🚀 實作流程

### 第一階段：環境設置

```bash
# 1. 安裝依賴
yarn add cornerstone-core cornerstone-tools cornerstone-wado-image-loader dicom-parser

# 2. 啟動開發伺服器
yarn dev
```

### 第二階段：配置外部函式庫

在組件外部配置 Cornerstone 的外部依賴：

```javascript
// src/App.jsx
import * as cornerstone from 'cornerstone-core'
import * as cornerstoneTools from 'cornerstone-tools'
import * as cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader'
import dicomParser from 'dicom-parser'

// 配置外部函式庫
cornerstoneWADOImageLoader.external.cornerstone = cornerstone
cornerstoneWADOImageLoader.external.dicomParser = dicomParser
cornerstoneTools.external.cornerstone = cornerstone
```

**重要性**：這些配置必須在組件外部完成，確保 Cornerstone.js 能正確解析 DICOM 檔案。

### 第三階段：組件狀態設計

```javascript
function App() {
  const elementRef = useRef(null)                    // Cornerstone viewport 的 DOM 引用
  const [currentSlice, setCurrentSlice] = useState(0) // 當前 slice 索引
  const [imageIds, setImageIds] = useState([])        // 所有圖片 ID 陣列
  const [isLoading, setIsLoading] = useState(true)    // 載入狀態
  const [isCornerstoneEnabled, setIsCornerstoneEnabled] = useState(false) // Cornerstone 初始化狀態
  const [hasError, setHasError] = useState(false)     // 錯誤狀態
  const [errorMessage, setErrorMessage] = useState('') // 錯誤訊息
  // ...
}
```

### 第四階段：Cornerstone 初始化

#### 關鍵原則：DOM 生命週期管理

```javascript
useEffect(() => {
  const element = elementRef.current
  if (!element) return

  const initializeCornerstone = async () => {
    try {
      // 1. 啟用 Cornerstone（只能呼叫一次）
      cornerstone.enable(element)
      setIsCornerstoneEnabled(true)

      // 2. 配置 WADO 圖片載入器
      cornerstoneWADOImageLoader.configure({
        useWebWorkers: true,
        decodeConfig: {
          convertFloatPixelDataToInt: false,
        },
      })

      // 3. 生成 DICOM 檔案路徑
      const dicomFiles = Array.from({ length: 93 }, (_, i) => 
        `/DICOM_test_files/${String(i + 1).padStart(8, '0')}.dcm`
      )

      // 4. 轉換為 Cornerstone 圖片 ID
      const ids = dicomFiles.map(file => `wadouri:${file}`)
      setImageIds(ids)

      // 5. 載入第一張圖片
      setIsLoading(true)
      const firstImage = await cornerstone.loadAndCacheImage(ids[0])
      cornerstone.displayImage(element, firstImage)
      setCurrentSlice(0)
      
    } catch (error) {
      console.error('Error initializing Cornerstone:', error)
      setHasError(true)
      setErrorMessage('Failed to load DICOM images')
    } finally {
      setIsLoading(false)
    }
  }

  initializeCornerstone()

  // 清理函數
  return () => {
    if (element) {
      cornerstone.disable(element)
      setIsCornerstoneEnabled(false)
    }
  }
}, []) // 空依賴陣列，只執行一次
```

**注意事項**：
- `cornerstone.enable()` 只能呼叫一次，否則會報錯
- 必須在 DOM 元素 mount 後才能初始化
- 組件卸載時要呼叫 `cornerstone.disable()`

### 第五階段：按需載入策略

使用 `useCallback` 實現統一的圖片顯示函數：

```javascript
const displayImageAtSlice = useCallback(async (sliceIndex) => {
  if (!elementRef.current || !isCornerstoneEnabled || imageIds.length === 0) return
  
  try {
    const imageId = imageIds[sliceIndex]
    const image = await cornerstone.loadAndCacheImage(imageId)  // 快取載入
    cornerstone.displayImage(elementRef.current, image)
    setCurrentSlice(sliceIndex)
  } catch (error) {
    console.error(`Error displaying image at slice ${sliceIndex}:`, error)
    setHasError(true)
    setErrorMessage(`Failed to load slice ${sliceIndex + 1}`)
  }
}, [imageIds, isCornerstoneEnabled])
```

**優勢**：
- 不一次性載入所有圖片，節省記憶體
- 使用 Cornerstone 快取機制提升效能
- 錯誤處理確保應用穩定性

### 第六階段：滑鼠滾輪事件處理

```javascript
useEffect(() => {
  const element = elementRef.current
  if (!element || !isCornerstoneEnabled || imageIds.length === 0) return

  const handleWheel = async (event) => {
    event.preventDefault()  // 防止頁面滾動
    
    const delta = Math.sign(event.deltaY)  // 滾動方向
    const newSlice = Math.max(0, Math.min(
      currentSlice - delta,  // 反向以符合直覺（向上滾動 = 下一個 slice）
      imageIds.length - 1
    ))
    
    if (newSlice !== currentSlice) {
      await displayImageAtSlice(newSlice)
    }
  }

  // 綁定事件（非被動模式，允許 preventDefault）
  element.addEventListener('wheel', handleWheel, { passive: false })

  return () => {
    element.removeEventListener('wheel', handleWheel)  // 清理事件
  }
}, [currentSlice, imageIds.length, isCornerstoneEnabled, displayImageAtSlice])
```

**關鍵點**：
- 使用 `{ passive: false }` 允許 `preventDefault()`
- `Math.max/Math.min` 確保索引在有效範圍內
- 在 cleanup 中移除事件監聽器

### 第七階段：表格快速導航

#### Slice 存在性檢查

```javascript
const sliceExists = (sliceNumber) => {
  return sliceNumber >= 1 && sliceNumber <= imageIds.length
}
```

#### 跳轉函數

```javascript
const jumpToSlice = useCallback(async (targetSlice) => {
  if (!isCornerstoneEnabled || imageIds.length === 0) return
  
  const sliceIndex = targetSlice - 1 // 轉換為 0-based 索引
  if (sliceIndex >= 0 && sliceIndex < imageIds.length) {
    try {
      await displayImageAtSlice(sliceIndex)
    } catch (error) {
      console.error(`Error jumping to slice ${targetSlice}:`, error)
      setHasError(true)
      setErrorMessage(`Failed to load slice ${targetSlice}`)
    }
  }
}, [isCornerstoneEnabled, imageIds.length, displayImageAtSlice])
```

#### 表格結構（右側布局）

```javascript
<div className="main-container">
  {/* 左側：圖片檢視器 */}
  <div className="viewer-container">
    <div ref={elementRef} className="dicom-viewport" />
    {/* ... */}
  </div>

  {/* 右側：導航表格 */}
  <div className="navigation-table">
    <h3>Quick Navigation</h3>
    <table>
      <thead>
        <tr>
          <th>Index</th>
          <th>Slice</th>
        </tr>
      </thead>
      <tbody>
        <tr className={currentSlice + 1 === 1 ? 'selected' : ''}>
          <td 
            className={!sliceExists(1) ? 'disabled' : ''}
            onClick={() => sliceExists(1) && jumpToSlice(1)}
          >
            1
          </td>
          <td 
            className={!sliceExists(1) ? 'disabled' : ''}
            onClick={() => sliceExists(1) && jumpToSlice(1)}
          >
            1
          </td>
        </tr>
        <tr className={currentSlice + 1 === 50 ? 'selected' : ''}>
          <td 
            className={!sliceExists(50) ? 'disabled' : ''}
            onClick={() => sliceExists(50) && jumpToSlice(50)}
          >
            2
          </td>
          <td 
            className={!sliceExists(50) ? 'disabled' : ''}
            onClick={() => sliceExists(50) && jumpToSlice(50)}
          >
            50
          </td>
        </tr>
        <tr className={currentSlice + 1 === 100 ? 'selected' : ''}>
          <td 
            className={!sliceExists(100) ? 'disabled' : ''}
            onClick={() => sliceExists(100) && jumpToSlice(100)}
          >
            3
          </td>
          <td 
            className={!sliceExists(100) ? 'disabled' : ''}
            onClick={() => sliceExists(100) && jumpToSlice(100)}
          >
            100
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

**導航配置**：
- Index 1 → Slice 1
- Index 2 → Slice 50
- Index 3 → Slice 100

### 第八階段：錯誤處理機制

#### 錯誤狀態管理

```javascript
const [hasError, setHasError] = useState(false)
const [errorMessage, setErrorMessage] = useState('')
```

#### 錯誤處理場景

1. **初始化失敗**：無法載入第一張圖片
2. **跳轉失敗**：無法載入指定 slice
3. **網路錯誤**：DICOM 檔案無法存取

#### 錯誤顯示界面

```javascript
{hasError && (
  <div className="error-message">
    <div className="error-icon">⚠️</div>
    <div className="error-text">{errorMessage}</div>
    <button 
      className="retry-button" 
      onClick={() => window.location.reload()}
    >
      Retry
    </button>
  </div>
)}
```

### 第九階段：樣式設計

#### 主容器布局（表格在右側）

```css
.main-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 30px;
  max-width: 1200px;
  margin: 0 auto;
}
```

#### 禁用狀態樣式

```css
.navigation-table td.disabled {
  background-color: #f5f5f5;
  color: #999;
  cursor: not-allowed;
  opacity: 0.6;
}

.navigation-table td:hover:not(.disabled) {
  background-color: #e0e0e0;
}
```

#### 選中狀態樣式

```css
.navigation-table tr.selected td:not(.disabled) {
  background-color: #4CAF50;
  color: white;
}

.navigation-table tr.selected td:not(.disabled):hover {
  background-color: #45a049;
}
```

#### 錯誤訊息樣式

```css
.error-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(255, 0, 0, 0.9);
  color: white;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  z-index: 20;
  min-width: 300px;
}
```

## ⚠️ 關鍵技術要點

### 1. DOM 生命週期管理

**問題**：React 的虛擬 DOM 與 Cornerstone 的直接 DOM 操作衝突

**解決方案**：
- 使用 `useRef` 確保 DOM 元素穩定
- 在 `useEffect` 中初始化（確保 DOM 已 mount）
- 在 cleanup 中正確禁用

### 2. 非同步圖片載入

**問題**：圖片載入是非同步的，可能出現競態條件

**解決方案**：
- 使用 `async/await` 處理
- 錯誤處理確保穩定性
- 按需載入而非一次性載入所有圖片

### 3. 事件處理的最佳實踐

**問題**：滾輪事件需要正確綁定和清理

**解決方案**：
- 使用 `{ passive: false }` 允許 `preventDefault()`
- 在 cleanup 中移除事件監聽器
- 使用 `useCallback` 避免不必要的重新綁定

### 4. 狀態同步

**問題**：React state 與 Cornerstone 狀態可能不同步

**解決方案**：
- 使用 `useCallback` 減少重新渲染
- 確保狀態更新是原子的
- 避免在事件處理中直接更新 state

### 5. 錯誤處理

**問題**：錯誤可能導致整個應用崩潰

**解決方案**：
- 完整的 try-catch 錯誤處理
- 用戶友好的錯誤訊息
- 提供重試機制

## 📊 功能流程圖

### 初始化流程

```
組件掛載
  ↓
elementRef.current 準備就緒
  ↓
cornerstone.enable(element)
  ↓
設定 WADO 配置
  ↓
生成 93 個 DICOM 檔案路徑
  ↓
轉換為 imageIds 陣列
  ↓
載入第一張圖片
  ↓
顯示在 viewport
  ↓
綁定滾輪事件
```

### 用戶互動流程

```
滑鼠滾輪事件
  ↓
計算新 slice 索引
  ↓
檢查範圍有效性
  ↓
載入對應圖片 (快取)
  ↓
顯示圖片
  ↓
更新 currentSlice state
  ↓
更新 UI (slice 計數器、表格高亮)
```

### 表格跳轉流程

```
點擊表格單元格
  ↓
檢查 slice 是否存在
  ↓
（不存在）→ 不執行操作
  ↓
（存在）→ 呼叫 jumpToSlice()
  ↓
轉換 slice 編號為索引
  ↓
載入並顯示圖片
  ↓
更新狀態
```

## 🐛 常見問題與解決方案

### Q1: cornerstone.enable() 報錯 "element already enabled"

**原因**：多次呼叫 enable 或沒有正確清理

**解決方案**：
```javascript
useEffect(() => {
  const element = elementRef.current
  cornerstone.enable(element)
  
  return () => {
    cornerstone.disable(element)  // 必須 cleanup
  }
}, []) // 空依賴，只執行一次
```

### Q2: 滾輪無效果

**原因**：事件沒有正確綁定或 passive 設定錯誤

**解決方案**：
```javascript
element.addEventListener('wheel', handleWheel, { passive: false })
// 必須設定 passive: false 才能 preventDefault()
```

### Q3: 圖片顯示空白

**原因**：圖片路徑錯誤或還沒載入完成就嘗試顯示

**解決方案**：
```javascript
const image = await cornerstone.loadAndCacheImage(imageId)
// 等待載入完成後再顯示
cornerstone.displayImage(element, image)
```

### Q4: React 重新渲染時丟失狀態

**原因**：在 useEffect 外部生成檔案路徑陣列

**解決方案**：
```javascript
useEffect(() => {
  // 在 useEffect 內部生成，避免依賴問題
  const dicomFiles = Array.from({ length: 93 }, ...)
  // ...
}, [])
```

## 🎨 UI/UX 設計考量

### 視覺反饋

1. **載入狀態**：顯示 "Loading..." 訊息
2. **錯誤狀態**：紅色錯誤框 + 重試按鈕
3. **禁用狀態**：灰色背景 + 降低透明度
4. **選中狀態**：綠色背景高亮
5. **hover 狀態**：淺灰色背景

### 布局設計

- **主容器**：flexbox 橫向布局
- **圖片區域**：512x512 固定尺寸
- **表格區域**：200px 最小寬度
- **間距**：30px gap
- **對齊**：flex-start 頂部對齊

### 交互設計

- **點擊反饋**：transition 過渡效果
- **按鈕禁用**：視覺上和邏輯上都要禁用
- **當前 slice 高亮**：選中的表格行綠色背景
- **右上角計數**：半透明黑色背景，白色文字

## 📝 最佳實踐總結

### React + Cornerstone.js 整合

1. ✅ **使用 useRef 引用 DOM 元素**
2. ✅ **在 useEffect 中初始化 Cornerstone**
3. ✅ **使用 useCallback 避免不必要的重新渲染**
4. ✅ **正確清理事件監聽器和 Cornerstone**
5. ✅ **非同步操作使用 async/await**
6. ✅ **完整的錯誤處理機制**

### 性能優化

1. ✅ **按需載入而非一次性載入所有圖片**
2. ✅ **使用 Cornerstone 快取機制**
3. ✅ **避免不必要的重新渲染**
4. ✅ **使用 useCallback 記憶化函數**
5. ✅ **正確的 dependency array**

### 用戶體驗

1. ✅ **清晰的視覺反饋**
2. ✅ **智能的按鈕禁用**
3. ✅ **友好的錯誤處理**
4. ✅ **直觀的布局設計**
5. ✅ **響應式界面**

## 🔄 後續擴展建議

### 功能擴展

1. **窗寬窗位調整**（Window/Level）
2. **縮放和平移**（Zoom & Pan）
3. **測量工具**（Measurement tools）
4. **播放動畫**（Cine playback）
5. **多平面重建**（MPR）

### 技術優化

1. **使用 Web Workers** 進行圖片處理
2. **圖片預載入** 改善滾動體驗
3. **虛擬滾動** 支援大量 slice
4. **鍵盤快捷鍵** 支援
5. **記憶體管理** 優化

## 📚 參考資源

- [Cornerstone.js 官方文檔](https://github.com/cornerstonejs/cornerstone)
- [React Hooks 文檔](https://react.dev/reference/react)
- [DICOM 標準](https://www.dicomstandard.org/)
- [WADO 協議](https://www.ihe.net/uploadedFiles/Documents/Radiology/IHE_RAD_Suppl_WADO.pdf)

## 📄 授權

本專案僅供學習和研究使用。

---

**最後更新**：2025-01-29
**作者**：AI Assistant
**版本**：1.0.0

