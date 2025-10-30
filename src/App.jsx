import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'
import * as cornerstone from 'cornerstone-core'
import * as cornerstoneTools from 'cornerstone-tools'
import * as cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader'
import dicomParser from 'dicom-parser'

// Configure external libraries
cornerstoneWADOImageLoader.external.cornerstone = cornerstone
cornerstoneWADOImageLoader.external.dicomParser = dicomParser
cornerstoneTools.external.cornerstone = cornerstone

function App() {
  const elementRef = useRef(null)
  const [currentSlice, setCurrentSlice] = useState(0)
  const [imageIds, setImageIds] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCornerstoneEnabled, setIsCornerstoneEnabled] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')


  // Function to display image at specific slice
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

  // Initialize Cornerstone and load images
  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    // Generate DICOM file paths inside useEffect
    const dicomFiles = Array.from({ length: 93 }, (_, i) => 
      `/DICOM_test_files/${String(i + 1).padStart(8, '0')}.dcm`
    )

    const initializeCornerstone = async () => {
      try {
        // Enable cornerstone on the element (only once)
        cornerstone.enable(element)
        setIsCornerstoneEnabled(true)

        // Configure WADO image loader
        cornerstoneWADOImageLoader.configure({
          useWebWorkers: true,
          decodeConfig: {
            convertFloatPixelDataToInt: false,
          },
        })

        // Generate image IDs
        const ids = dicomFiles.map(file => `wadouri:${file}`)
        setImageIds(ids)

        // Load first image to test
        setIsLoading(true)
        setHasError(false)
        try {
          const firstImage = await cornerstone.loadAndCacheImage(ids[0])
          cornerstone.displayImage(element, firstImage)
          setCurrentSlice(0)
          console.log('Successfully loaded first image')
        } catch (error) {
          console.error('Error loading first image:', error)
          setHasError(true)
          setErrorMessage('Failed to load DICOM images. Please check if files exist and are accessible.')
        } finally {
          setIsLoading(false)
        }

      } catch (error) {
        console.error('Error initializing Cornerstone:', error)
        setIsLoading(false)
      }
    }

    initializeCornerstone()

    return () => {
      if (element) {
        cornerstone.disable(element)
        setIsCornerstoneEnabled(false)
      }
    }
  }, []) // Empty dependency array - only run once

  // Handle wheel events for slice navigation
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

    return () => {
      element.removeEventListener('wheel', handleWheel)
    }
  }, [currentSlice, imageIds.length, isCornerstoneEnabled, displayImageAtSlice])

  // Jump to specific slice
  const jumpToSlice = useCallback(async (targetSlice) => {
    if (!isCornerstoneEnabled || imageIds.length === 0) return
    
    const sliceIndex = targetSlice - 1 // Convert slice number to 0-based index
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

  // Check if specific slices exist
  const sliceExists = (sliceNumber) => {
    return sliceNumber >= 1 && sliceNumber <= imageIds.length
  }

  return (
    <div className="app">
      <h1>DICOM Viewer</h1>
      
      <div className="main-container">
        <div className="viewer-container">
          <div 
            ref={elementRef} 
            className="dicom-viewport"
            style={{ width: '512px', height: '512px' }}
          />
          
          {!isLoading && isCornerstoneEnabled && !hasError && (
            <div className="slice-counter">
              Slice: {currentSlice + 1}/{imageIds.length}
            </div>
          )}
          
          {isLoading && (
            <div className="loading">
              Loading DICOM images...
            </div>
          )}

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
        </div>

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
    </div>
  )
}

export default App
