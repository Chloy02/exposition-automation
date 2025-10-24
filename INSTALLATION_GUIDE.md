# Installation Guide - Exposition Email Automator Chrome Extension

## Overview
This guide will help you install and test the Exposition Email Automator Chrome extension with the newly fixed local tracking.js library.

---

## Prerequisites
- Google Chrome browser (version 88 or higher)
- Basic understanding of Chrome extensions
- Gmail account for testing

---

## Installation Steps

### Step 1: Download/Clone the Extension
Ensure you have the complete `exposition-automation` folder with all files.

### Step 2: Verify File Structure
Make sure your directory structure looks like this:
```
exposition-automation/
├── lib/
│   ├── tracking.js (100KB)
│   └── face.js (184KB)
├── manifest.json
├── popup.html
├── popup.js
├── content.js
├── autofill.js
├── background.js
├── offscreen.html
├── offscreen.js
├── trackingFaceDetection.js
├── simpleFaceDetection.js
└── ... (other files)
```

### Step 3: Load the Extension in Chrome

1. **Open Chrome Extensions Page**
   - Navigate to `chrome://extensions/`
   - Or: Click menu (⋮) → More Tools → Extensions

2. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top-right corner

3. **Load Unpacked Extension**
   - Click "Load unpacked" button
   - Navigate to and select the `exposition-automation` folder
   - Click "Select Folder"

4. **Verify Installation**
   - The extension should appear in your extensions list
   - You should see "Exposition Email Automator" with no errors
   - If you see any errors, check the troubleshooting section below

---

## Testing the Extension

### Test 1: Basic Load Test
**Goal:** Verify the extension loads without errors

1. Go to `chrome://extensions/`
2. Find "Exposition Email Automator"
3. Verify:
   - ✅ No error messages displayed
   - ✅ Extension is enabled
   - ✅ Click "Details" and check for any warnings

### Test 2: Popup Test
**Goal:** Verify the extension popup works

1. Click the extension icon in Chrome toolbar
2. The popup should open showing:
   - Email data fields (Sender, Date, Subject)
   - Images section
   - Cropped Faces section
   - Test Models button
   - Extract Data button

### Test 3: Face Detection Library Test
**Goal:** Verify tracking.js library is loaded correctly

1. Open the extension popup
2. Click "Test Models" button
3. Check the console (Right-click popup → Inspect → Console)
4. You should see:
   - ✅ "✅ Tracking.js face detector initialized successfully!"
   - ❌ NOT: "❌ Failed to initialize tracking.js face detector"

### Test 4: Gmail Integration Test
**Goal:** Verify data extraction from Gmail

1. Open Gmail in Chrome
2. Open any email with:
   - A clear subject line
   - An image attachment (preferably with a face)
3. Click the extension icon
4. Click "Extract Data" button
5. Verify:
   - ✅ Sender email is extracted
   - ✅ Date is extracted
   - ✅ Subject is extracted
   - ✅ Images are displayed in the "Images" section

### Test 5: Face Detection Test
**Goal:** Verify face cropping works

1. Open Gmail
2. Find an email with an image containing a clear face
3. Click the extension icon
4. Click "Extract Data"
5. Wait for processing (may take 10-30 seconds for large images)
6. Check the "Cropped Faces" section:
   - ✅ Should show cropped face images
   - ⚠️ If "NO FACES DETECTED" appears (orange warning):
     - Image may not contain detectable faces
     - Try with a clearer frontal face photo
     - Check console for detailed logs

### Test 6: Autofill Test
**Goal:** Verify autofill on target website

1. Complete Test 5 successfully
2. Open `https://face-recognise.vercel.app/` in a new tab
3. The form should auto-fill with:
   - Email address
   - Date
   - Subject
   - Face images uploaded

---

## Troubleshooting

### Error: "Failed to load extension"
**Solution:** Check that all files are present and the manifest.json is valid.

### Error: CSP violation
**Solution:** This was the original issue. If you still see this:
1. Verify `lib/tracking.js` and `lib/face.js` exist
2. Check that `offscreen.html` references local files (not CDN)
3. Verify manifest.json CSP is: `"script-src 'self'; object-src 'self'"`

### Warning: "tracking.js library not loaded"
**Possible causes:**
1. **Files missing:** Check that `lib/tracking.js` and `lib/face.js` exist
2. **Incorrect paths:** Verify offscreen.html has correct `./lib/` paths
3. **File corruption:** Re-download the files:
   ```bash
   cd exposition-automation
   curl -o lib/tracking.js https://raw.githubusercontent.com/eduardolundgren/tracking.js/master/build/tracking.js
   curl -o lib/face.js https://raw.githubusercontent.com/eduardolundgren/tracking.js/master/build/data/face.js
   ```

### Warning: "NO FACES DETECTED"
**This is normal if:**
- Image has no faces
- Face is too small or unclear
- Image is heavily filtered or stylized
- Face is at an extreme angle

**Try:**
- Use clearer, frontal face photos
- Ensure good lighting in the photo
- Use larger images
- Test with multiple different photos

### Slow Performance
**Normal behavior:**
- Face detection can take 10-30 seconds for high-resolution images
- Multiple images will take longer
- This is expected with Haar Cascade detection

**To improve:**
- Use smaller images (under 2MB)
- Process fewer images at once
- Close other Chrome tabs to free up memory

---

## Advanced Configuration

### Adjusting Face Detection Sensitivity
Edit `trackingFaceDetection.js` and modify:
```javascript
// Line ~17-21
this.initialScale = 1.0;      // Lower = more faces found (slower)
this.scaleFactor = 1.25;       // Lower = more thorough (slower)
this.stepSize = 1.5;           // Lower = more accurate (slower)
this.edgesDensity = 0.2;       // Higher = faster (less accurate)
```

### Debug Mode
To enable detailed logging:
1. Open popup
2. Right-click → Inspect
3. Go to Console tab
4. Watch for detailed face detection logs

---

## Known Limitations

1. **Face Detection Accuracy**
   - Haar Cascade works best with frontal faces
   - Side profiles may not be detected
   - Glasses, masks, or obstructions reduce accuracy

2. **Performance**
   - Large images (>3000px) take longer to process
   - Multiple faces increase processing time
   - Offscreen processing may timeout after 60 seconds

3. **Browser Support**
   - Chrome/Chromium only (Manifest V3)
   - Requires modern JavaScript support
   - Some features may not work in incognito mode

---

## Support & Documentation

- **CSP Fix Details:** See `CSP_FIX_NOTES.md`
- **Implementation Summary:** See `IMPLEMENTATION_SUMMARY.md`
- **Testing Guide:** See `TESTING_GUIDE.md`

---

## Success Checklist

Before considering the installation complete, verify:

- [ ] Extension loads without errors in `chrome://extensions/`
- [ ] Popup opens and displays correctly
- [ ] "Test Models" button shows success message
- [ ] Data extracts from Gmail emails
- [ ] Images are displayed in the popup
- [ ] Face detection runs (even if no faces found)
- [ ] Autofill works on target website

---

## Version Information

- **Extension Version:** 2.4
- **tracking.js Version:** 1.1.3 (non-minified)
- **Manifest Version:** 3
- **Last Updated:** October 2024

---

## Contact

If you continue to experience issues after following this guide, please:
1. Check all troubleshooting steps above
2. Review the console logs for specific error messages
3. Verify all files are present and correctly named
4. Consider re-downloading the library files

Good luck! 🎉