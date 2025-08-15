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

# Exposition Email Automation Chrome Extension

## Overview
This Chrome extension automates the handling of email submissions for an exposition. It extracts sender information and images from Gmail emails, automatically crops faces from those images, and auto-fills that data into a form on a separate website.

## Latest Updates (Image & Autofill Fixes)

### 🎯 **Major Issues Fixed**

#### 1. **Image Duplication Issue** ✅
**Problem**: Extension was extracting both full-resolution images and preview thumbnails, causing duplicates.

**Solution**:
- Implemented hybrid detection approach that categorizes images as "full" or "preview"
- Prioritizes full-resolution images (`disp=attd`, `download_url`) over previews (`view=fimg`)
- Only uses preview images if no full-resolution images are found
- Added detailed logging to track image selection process

#### 2. **Autofill Workflow Issue** ✅
**Problem**: Auto-fill button was opening new tabs instead of filling current page.

**Solution**:
- Changed workflow: Click "Auto-fill" only when already on target website
- Added intelligent detection of current page
- Provides clear feedback about where user needs to be
- No more unwanted tab creation

#### 3. **Updated Form Structure** ✅
**Problem**: Target website updated their form, breaking field detection.

**Solution**:
- Updated selectors to handle new HTML structure
- Added multiple fallback selectors for each field type
- Enhanced React component compatibility
- Improved date/time formatting for new input formats

### 🔧 **Technical Improvements**

#### Image Detection Logic
```javascript
// Now categorizes images as full vs preview
const isFullImage = href.includes('disp=attd') || 
                  href.includes('download_url') || 
                  (!href.includes('view=fimg') && href.includes('view=att'));

// Prioritizes full images
const imageUrls = fullImageUrls.length > 0 ? fullImageUrls : previewImageUrls;
```

#### Enhanced Autofill Process
- **Multiple selectors per field**: Each form field has 3-5 fallback selectors
- **React compatibility**: Proper event triggering for React form components
- **Better date/time formatting**: Handles email timestamps correctly
- **Improved error handling**: Graceful degradation when fields aren't found

#### New Workflow
1. **Extract email data** (works same as before)
2. **Navigate to target website** manually
3. **Click "Auto-fill"** when on correct page
4. **Form fills automatically** with email date/time and sender info

### 📋 **Testing the Updated Extension**

#### Quick Test Steps
1. **Load the extension** in Chrome (`chrome://extensions/` → Load unpacked)
2. **Open Gmail** with an email containing image attachments
3. **Click "Debug Attachments"** to verify image detection works correctly
4. **Click "Extract Emails"** - should now show only full-resolution images
5. **Navigate to** `face-recognise.vercel.app/add-image` 
6. **Click "Auto-fill"** in extension - form should populate with email data

#### Debugging Tools
- **Debug Attachments button**: Shows detailed analysis of found images
- **Console logging**: Comprehensive logs throughout extraction and autofill
- **Error handling**: Clear feedback when operations fail

### 🚀 **Current Capabilities**

✅ **Email Extraction**: Sender, subject, date/time from Gmail
✅ **Smart Image Detection**: Full-resolution images prioritized over previews  
✅ **Face Detection**: Automatic face cropping (when working)
✅ **Form Autofill**: Email, date, time fields on target website
⏳ **Image Upload**: Currently manual (automatic upload in development)

### 🔄 **Known Limitations**

1. **Face Detection**: Temporarily disabled, will be re-enabled later
2. **Image Upload**: Requires manual drag-drop to upload area
3. **Multiple Images**: Currently optimized for single-image emails

## File Changes Summary

- **`content.js`**: Complete rewrite of image detection with full/preview categorization
- **`popup.js`**: New autofill workflow, no automatic tab creation
- **`autofill.js`**: Updated for new form structure, manual trigger mode
- **`debug_attachments.js`**: Enhanced debugging with categorization details
- **`popup.html`**: Added debug button for troubleshooting

## Previous Fixes (Still Active)

### Face Detection Issue Fix ✅
- Updated `manifest.json` to include `'wasm-unsafe-eval'` in CSP for WebAssembly support
- Enhanced error handling and logging in `offscreen.js`
- Added cross-origin handling for image loading

### Auto-Fill Issue Fix ✅  
- Added `waitForElement()` function to wait for DOM elements
- Implemented proper timing for React components
- Enhanced error handling for each form field individually
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