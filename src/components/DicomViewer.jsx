import { useState, useEffect, useRef, useCallback } from 'react'
import './DicomViewer.css'
import * as cornerstone from 'cornerstone-core'
// import * as cornerstoneTools from 'cornerstone-tools'
import * as cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader'
import dicomParser from 'dicom-parser'

cornerstoneWADOImageLoader.external.cornerstone = cornerstone
cornerstoneWADOImageLoader.external.dicomParser = dicomParser

// 以 Vite 在編譯期自動收集 src/assets 下的 .dcm 檔案 URL（開發期最簡）
const DICOM_GLOB_URLS = Object.values(
  import.meta.glob('/src/assets/DICOM_test_files/*.dcm', { query: '?url', import: 'default', eager: true })
)

// 單一檢視器元件：負責初始化 Cornerstone、載入影像、處理滾輪與快速跳轉
function DicomViewer() {
  const elementRef = useRef(null)
  const [currentSlice, setCurrentSlice] = useState(0)
  const [imageIds, setImageIds] = useState([])
  const [isCornerstoneEnabled, setIsCornerstoneEnabled] = useState(false)

  // 顯示指定 slice（0-based）
  const displayImageAtSlice = useCallback(async (sliceIndex) => {
    if (!elementRef.current || !isCornerstoneEnabled || imageIds.length === 0) return
    try {
      const imageId = imageIds[sliceIndex]
      const image = await cornerstone.loadAndCacheImage(imageId)
      // const totalFrames = image.data.string('x00280008')
      cornerstone.displayImage(elementRef.current, image)
      setCurrentSlice(sliceIndex)
    } catch (error) {
      console.error(`Error displaying image at slice ${sliceIndex}:`, error)
    } 
  }, [imageIds, isCornerstoneEnabled])


  // 初始化：取得檔案列表 → 生成 imageIds → 載入第一張 → 綁定清理
  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    // 取得要載入的 DICOM 檔案清單（優先：Vite glob；否則略過）
    const loadFiles = async () => {
      if (Array.isArray(DICOM_GLOB_URLS) && DICOM_GLOB_URLS.length > 0) return DICOM_GLOB_URLS
    }

    const initViewer = async () => {
      try {
        // 啟用 Cornerstone（若已啟用會略過）
        try { 
          cornerstone.enable(element) 
        } catch (err) { 
            console.warn('enable skipped:', err?.message || err) 
        }

        // 設定 WADO 載入器（使用 Web Workers）
        cornerstoneWADOImageLoader.configure({
          useWebWorkers: true,
          decodeConfig: { convertFloatPixelDataToInt: false },
        })

        // 檔案 → imageId（wadouri:URL）
        const dicomFiles = await loadFiles()
        const ids = dicomFiles.map(f => `wadouri:${f}`)
        if (!ids.length) {
          console.error('No DICOM files found')
          return
        }

        setImageIds(ids)
        // 載入並顯示第一張
        const first = await cornerstone.loadAndCacheImage(ids[0])
        cornerstone.displayImage(element, first)
        setCurrentSlice(0)
        setIsCornerstoneEnabled(true)
      } catch (err) {
        console.error('Error initializing Cornerstone:', err?.message || err)
      }
    }

    initViewer()

    return () => {
      cornerstone.disable(element)
      setIsCornerstoneEnabled(false)
    }
  }, [])

  // 滾輪事件：向上/下滾動切換 slice（含邊界保護）
  useEffect(() => {
    const element = elementRef.current
    if (!element || !isCornerstoneEnabled || imageIds.length === 0) return

    const handleWheel = async (event) => {
      event.preventDefault()
      const delta = Math.sign(event.deltaY)
      const newSlice = Math.max(0, Math.min(currentSlice - delta, imageIds.length - 1))
      if (newSlice !== currentSlice) {
        await displayImageAtSlice(newSlice)
      }
    }

    element.addEventListener('wheel', handleWheel, { passive: false })
    return () => element.removeEventListener('wheel', handleWheel)
  }, [currentSlice, imageIds.length, isCornerstoneEnabled, displayImageAtSlice])

  // 點擊表格快速跳轉
  const jumpToSlice = useCallback(async (targetSlice) => {
    if (!isCornerstoneEnabled || imageIds.length === 0) return
    const sliceIndex = targetSlice - 1
    if (sliceIndex >= 0 && sliceIndex < imageIds.length) {
      try {
        await displayImageAtSlice(sliceIndex)
      } catch (error) {
        console.error(`Error jumping to slice ${targetSlice}:`, error)
      }
    }
  }, [isCornerstoneEnabled, imageIds.length, displayImageAtSlice])

  const sliceExists = (sliceNumber) => sliceNumber >= 1 && sliceNumber <= imageIds.length

  return (
    <div className="dv-root">
      <div className="dv-viewport-wrap">
        <div ref={elementRef} className="dv-viewport" />
        {isCornerstoneEnabled && (
          <div className="dv-counter">Slice: {currentSlice + 1}/{imageIds.length}</div>
        )}
      </div>
      <div className="dv-nav">
        <table>
          <thead>
            <tr>
              <th>Index</th>
              {[ 1,2,3 ].map((idx) => (
                <th key={idx}>{idx}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Slice</td>
              {[
                { idx: 1, slice: 100 },
                { idx: 2, slice: 150 },
                { idx: 3, slice: 200 },
              ].map(({ idx, slice }) => (
                <td
                  key={idx}
                  className={`${!sliceExists(slice) ? 'dv-disabled' : ''} ${currentSlice + 1 === slice ? 'dv-selected' : ''}`.trim()}
                  onClick={() => sliceExists(slice) && jumpToSlice(slice)}
                >
                  {slice}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DicomViewer

