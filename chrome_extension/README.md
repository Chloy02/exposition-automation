# Exposition Email Automation Chrome Extension

## Overview
This Chrome extension automates the handling of email submissions for an exposition. It extracts sender information and images from Gmail emails, automatically crops faces from those images, and auto-fills that data into a form on a separate website.

## Recent Fixes Applied

### 1. Face Detection Issue Fix
**Problem**: Face detection was failing with "Failed to fetch" errors when loading models in the offscreen document.

**Solution**: 
- Updated `manifest.json` to include `'wasm-unsafe-eval'` in CSP for WebAssembly support
- Added `chrome-extension://*` to web accessible resources for offscreen document access
- Enhanced error handling and logging in `offscreen.js`
- Added cross-origin handling for image loading

### 2. Auto-Fill Issue Fix
**Problem**: Form fields were not being filled when navigating to the target website.

**Solution**:
- Added `waitForElement()` function to wait for DOM elements to be available
- Implemented proper timing to wait for React components to render
- Enhanced error handling for each form field individually
- Added detailed logging for debugging

### 3. Background Script Improvements
**Problem**: Message passing between popup and offscreen document was unreliable.

**Solution**:
- Added comprehensive logging throughout the message flow
- Improved error handling and timeout management
- Added delay to ensure offscreen document is ready before sending messages

## Testing the Extension

### 1. Load the Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `chrome_extension` folder
4. The extension should appear in your extensions list

### 2. Test Face Detection
1. Open the extension popup
2. Click on the extension icon in your toolbar
3. Open `chrome-extension://[YOUR_EXTENSION_ID]/debug.html` in a new tab
4. Click "Test Model Loading" to verify models can be loaded
5. Click "Test Face Detection" to verify face detection works

### 3. Test Email Extraction with Image Attachments
1. Open Gmail and navigate to an email with image attachments
2. Make sure the email is fully opened (click on the email to open it)
3. Open the extension popup and click "Extract Emails from Current Page"
4. The extension should now detect and download image attachments properly

### 4. Debug Attachment Detection
If the extension isn't finding image attachments:
1. Open the email with attachments in Gmail
2. Click the "Debug Attachments" button in the extension popup
3. Open the browser console (F12) to see detailed debug information
4. The debug output will show:
   - All links found in the email
   - Potential attachment containers
   - Which links are identified as image attachments

## Recent Updates (Image Attachment Fix)

### Problem Fixed
The extension was not properly detecting image attachments in Gmail emails. It was only looking for inline images (`<img>` tags) but not actual file attachments.

### Solution Implemented
1. **Enhanced Attachment Detection**: Updated `content.js` to look for attachment download links in `<a>` tags with `href` attributes
2. **Multiple Detection Strategies**: The extension now uses several methods to find attachments:
   - Links with `view=att`, `disp=attd`, or `download_url` parameters
   - Links containing thread and attachment IDs (`&th=` and `&attid=`)
   - Text analysis of link content and parent elements to identify image types
3. **Improved Image Type Support**: Added support for various image formats:
   - Standard formats: JPG, JPEG, PNG, GIF, WebP
   - Modern formats: HEIF, HEIC, BMP, TIFF, SVG
4. **Better Error Handling**: Enhanced fetch requests with proper credentials and headers
5. **Debug Tools**: Added debug button and script to help troubleshoot attachment detection

### File Changes
- `content.js`: Complete rewrite of image detection logic
- `popup.html`: Added debug button
- `popup.js`: Added debug functionality and better status messages
- `debug_attachments.js`: New debug script for troubleshooting

### Testing the Fix
1. **Load the updated extension** in Chrome
2. **Open a Gmail email** with image attachments
3. **Use the debug button** first to verify attachment detection
4. **Extract the email** - you should now see the attached images
5. **Check the console** for detailed logs about the extraction process
2. Click the extension icon and then "Extract Emails from Current Page"
3. Check the console for any errors
4. Verify that images are extracted and faces are detected

### 4. Test Auto-Fill
1. Extract an email with images using the extension
2. Click "Auto-fill" for the extracted entry
3. The target website should open and form fields should be populated
4. Check the console for any autofill errors

## Debugging

### Console Logs
- **Popup**: Check the popup console for extraction and processing status
- **Background**: Check the service worker console for offscreen document communication
- **Content Scripts**: Check the page console for extraction and autofill operations

### Common Issues
1. **Models not loading**: Check if face-api.js and model files are accessible
2. **Face detection failing**: Verify images are valid and contain faces
3. **Auto-fill not working**: Check if form selectors match the target website structure

## File Structure
```
chrome_extension/
├── manifest.json          # Extension configuration
├── popup.html/js/css      # Extension popup interface
├── background.js          # Service worker for offscreen document
├── offscreen.html/js      # Offscreen document for face detection
├── content.js             # Gmail page content script
├── autofill.js            # Target website content script
├── lib/face-api.min.js    # Face detection library
├── models/                # Face detection model files
└── debug.html             # Debug page for testing
```

## Troubleshooting

### If Face Detection Still Fails:
1. Check the browser console for CSP errors
2. Verify all model files are present in the `models/` directory
3. Try the debug page to isolate the issue
4. Check if the offscreen document is being created successfully

### If Auto-Fill Still Fails:
1. Inspect the target website's form structure
2. Update selectors in `autofill.js` if needed
3. Check if the website uses a different framework
4. Verify the autofill data is being stored correctly

## Version History
- **v2.3**: Fixed face detection and auto-fill issues
- **v2.2**: Initial implementation with basic functionality
- **v2.1**: Added offscreen document for face processing
- **v2.0**: Basic email extraction and storage 