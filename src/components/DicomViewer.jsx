import { useState, useEffect, useRef, useCallback } from 'react'
import './DicomViewer.css'
import * as cornerstone from 'cornerstone-core'
// import * as cornerstoneTools from 'cornerstone-tools'
import * as cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader'
import dicomParser from 'dicom-parser'

cornerstoneWADOImageLoader.external.cornerstone = cornerstone
cornerstoneWADOImageLoader.external.dicomParser = dicomParser

function DicomViewer() {
  const elementRef = useRef(null)
  const [currentSlice, setCurrentSlice] = useState(0)
  const [imageIds, setImageIds] = useState([])
  const [isCornerstoneEnabled, setIsCornerstoneEnabled] = useState(false)

  const displayImageAtSlice = useCallback(async (sliceIndex) => {
    if (!elementRef.current || !isCornerstoneEnabled || imageIds.length === 0) return
    try {
      const imageId = imageIds[sliceIndex]
      const image = await cornerstone.loadAndCacheImage(imageId)
      cornerstone.displayImage(elementRef.current, image)
      setCurrentSlice(sliceIndex)
    } catch (error) {
      console.error(`Error displaying image at slice ${sliceIndex}:`, error)
    } 
  }, [imageIds, isCornerstoneEnabled])


  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const dicomFiles = Array.from({ length: 93 }, (_, i) =>
      `/DICOM_test_files/${String(i + 1).padStart(8, '0')}.dcm`
    )

    const initViewer = async () => {
      try {
        try { 
          cornerstone.enable(element) 
        } catch (err) { 
            console.warn('enable skipped:', err?.message || err) 
        }

        cornerstoneWADOImageLoader.configure({
          useWebWorkers: true,
          decodeConfig: { convertFloatPixelDataToInt: false },
        })

        const ids = dicomFiles.map(f => `wadouri:${f}`)
        if (!ids.length) {
          console.error('No DICOM files found in /DICOM_test_files')
          return
        }

        setImageIds(ids)
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
              <th>Slice</th>
            </tr>
          </thead>
          <tbody>
            {[
              { idx: 1, slice: 100 },
              { idx: 2, slice: 150 },
              { idx: 3, slice: 200 },
            ].map(({ idx, slice }) => (
              <tr key={idx} className={currentSlice + 1 === slice ? 'dv-selected' : ''}>
                <td
                  className={!sliceExists(slice) ? 'dv-disabled' : ''}
                  onClick={() => sliceExists(slice) && jumpToSlice(slice)}
                >
                  {idx}
                </td>
                <td>
                  {slice}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DicomViewer

