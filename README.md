# DICOM Viewer

A React-based DICOM viewer using Cornerstone.js that displays medical images in a 512x512 viewport with slice navigation capabilities.

## Features

- **512x512px DICOM Image Display**: Shows medical images in a standardized viewport size
- **Slice Navigation**: Use mouse wheel to scroll through different slices
- **Slice Counter**: Displays current slice number in the top-right corner
- **Quick Jump Table**: Click on table entries to jump to specific slices (100, 150, 200)
- **Progress Indicator**: Shows loading progress when loading DICOM files
- **Error Handling**: Gracefully handles loading errors and continues with available images

## Usage

1. **Start the development server**:
   ```bash
   yarn dev
   ```

2. **Open your browser** and navigate to `http://localhost:5173`

3. **Navigate through slices**:
   - Use mouse wheel to scroll up/down through slices
   - Click on table entries to jump to specific slices (100, 150, 200)

4. **View slice information**:
   - Current slice number is displayed in the top-right corner
   - Selected slice in the table is highlighted in green

## Technical Details

- **Framework**: React with functional components
- **DICOM Library**: Cornerstone.js ecosystem
- **Image Loading**: cornerstone-wado-image-loader for DICOM file support
- **File Format**: Supports standard DICOM (.dcm) files
- **File Location**: DICOM files are stored in `/public/DICOM_test_files/`

## Dependencies

- `cornerstone-core`: Core Cornerstone.js functionality
- `cornerstone-tools`: Additional tools and utilities
- `cornerstone-wado-image-loader`: DICOM image loading
- `dicom-parser`: DICOM file parsing
- `react`: React framework
- `react-dom`: React DOM rendering

## File Structure

```
src/
├── App.jsx          # Main DICOM viewer component
├── App.css          # Styling for the viewer
└── main.jsx         # React application entry point

public/
└── DICOM_test_files/    # Directory containing DICOM files
    ├── 00000001.dcm
    ├── 00000002.dcm
    └── ... (93 total files)
```

## Browser Compatibility

This application requires a modern browser with support for:
- ES6+ JavaScript features
- Canvas API
- Web Workers (for image processing)
- File API (for DICOM file loading)