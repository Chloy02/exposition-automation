# Exposition Email Automator

> **Automate email data extraction from Gmail and form filling with face detection**

A Chrome extension that extracts email data and images from Gmail, automatically detects and crops faces, and autofills forms on target websites. Built for exposition email automation workflows.

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?logo=google-chrome)](https://chrome.google.com/webstore)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)](https://developer.chrome.com/docs/extensions/mv3/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## ✨ Features

### 📧 Email Extraction
- Extract sender email, subject, date, and time from Gmail
- Automatically detect and download image attachments
- Smart image prioritization (full-resolution over previews)
- Support for multiple image formats (JPG, PNG, HEIF, etc.)

### 🎭 Face Detection & Cropping
- **Haar Cascade face detection** (tracking.js)
- Automatic face detection in images
- Multiple face detection per image
- Smart cropping with 40% padding
- High-quality output (85% JPEG quality)

### 💾 Multi-Email Storage
- **Store 7-10 emails simultaneously** with IndexedDB
- 50-100MB storage capacity (vs 10MB before)
- Automatic image compression (60% quality for originals)
- Efficient data management with CRUD operations

### 🚀 One-Click Autofill
- **Complete form autofill**: email, date, time, files
- Automatic file upload for all cropped faces
- HTML5 input format detection (date/time)
- React form compatibility

### 🎨 Drag-and-Drop
- Drag images directly from extension to web forms
- Visual feedback with hover effects
- Works with both original and cropped images

---

## 🚀 Quick Start

### 1. Installation

#### Option A: Load Unpacked (Development)
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the `exposition-automation` folder
6. Extension is now installed! 🎉

#### Option B: Chrome Web Store (Coming Soon)
- Extension will be available on Chrome Web Store after review

### 2. First Use

1. **Open Gmail** and navigate to an email with image attachments
2. **Click the extension icon** in your toolbar
3. **Click "Extract Emails from Current Page"**
4. Wait for face detection to complete
5. View extracted data in the extension popup

### 3. Autofill a Form

1. **Navigate to the target website** (face-recognise.vercel.app/add-image)
2. **Open the extension popup**
3. **Click "Auto-fill"** on any extracted email row
4. Form fields automatically populate with data
5. Cropped faces automatically upload
6. Submit the form! ✅

---

## 📖 Usage Guide

### Extracting Emails

1. **Open a Gmail email** with image attachments
2. Make sure the email is **fully opened** (not in preview)
3. Click the **extension icon**
4. Click **"Extract Emails from Current Page"**
5. Status updates will show:
   - "Extracting data from Gmail..."
   - "Detecting faces using Haar Cascade..."
   - "✅ Processing complete. Found X face(s)."

### Viewing Extracted Data

The extension popup shows a table with:
- **Sender**: Email address
- **Date**: Extraction timestamp
- **Subject**: Email subject line
- **Images**: Original image thumbnails (draggable)
- **Cropped Faces**: Detected faces (draggable)
- **Actions**: Auto-fill button for each email

### Using Autofill

1. **Navigate to target website first** (face-recognise.vercel.app/add-image)
2. Open extension popup
3. Click **"Auto-fill"** button on desired email row
4. Watch the form populate automatically:
   - ✅ Email field
   - ✅ Date field (YYYY-MM-DD format)
   - ✅ Time field (HH:MM 24-hour format)
   - ✅ Image upload (all cropped faces)

### Managing Data

- **Clear All Data**: Click "Clear Stored Data" to remove all emails
- **Storage Capacity**: Store up to 7-10 emails simultaneously
- **Re-extract**: Extract the same email again to update data

### Debug Tools

- **Debug Attachments**: Analyze image detection in current email
- **Test Face Models**: Verify face detection models are loaded
- Check browser console (F12) for detailed logs

---

## 🖥️ Browser Compatibility

| Browser | Status | Notes |
|---------|--------|-------|
| **Chrome** | ✅ Fully Supported | Primary target, all features work |
| **Brave** | ✅ Fully Supported | Chromium-based, identical functionality |
| **Edge** | ✅ Fully Supported | Chromium-based, all features work |
| **Opera** | ✅ Fully Supported | Chromium-based, compatible |
| Firefox | ❌ Not Supported | Uses different extension API |
| Safari | ❌ Not Supported | Uses different extension API |

**Minimum Chrome Version**: 88+ (Manifest V3 support)

---

## 📂 Project Structure

```
exposition-automation/
├── manifest.json              # Extension configuration (Manifest V3)
├── background.js              # Service worker for offscreen document
├── content.js                 # Gmail page content script
├── popup.html                 # Extension popup UI
├── popup.js                   # Popup logic and event handlers
├── style.css                  # Popup styling
├── offscreen.html             # Offscreen document for face detection
├── offscreen.js               # Face detection processing
├── autofill.js                # Target website autofill script
├── dbHelper.js                # IndexedDB wrapper for storage
├── trackingFaceDetection.js   # Face detection implementation
├── debug.html                 # Debug page for testing
├── debug_attachments.js       # Image detection debugging
├── lib/                       # External libraries
│   ├── tracking.js            # Haar Cascade tracking library
│   └── face.js                # Face detection classifier
├── icons/                     # Extension icons (16, 48, 128px)
├── README.md                  # This file
├── CHANGELOG.md               # Version history and updates
└── .gitignore                 # Git ignore rules
```

---

## 🔧 How It Works

### Architecture

```
┌─────────────┐
│   Gmail     │  Extract email data & images
│   Page      │ ────────────────────────────┐
└─────────────┘                             │
                                            ▼
                                    ┌──────────────┐
                                    │  Content.js  │
                                    │  (Injection) │
                                    └──────────────┘
                                            │
                                            ▼
┌─────────────┐                     ┌──────────────┐
│   Popup     │ ◄─────────────────► │ Background   │
│    UI       │   Message Passing   │   Service    │
└─────────────┘                     │   Worker     │
      │                             └──────────────┘
      │                                     │
      ▼                                     ▼
┌─────────────┐                     ┌──────────────┐
│  IndexedDB  │                     │  Offscreen   │
│   Storage   │                     │  Document    │
│  (7-10 MB)  │                     │ (Face Detect)│
└─────────────┘                     └──────────────┘
      │                                     │
      │                                     ▼
      │                             ┌──────────────┐
      │                             │ tracking.js  │
      │                             │ Haar Cascade │
      │                             └──────────────┘
      │
      ▼
┌─────────────┐
│   Target    │  Autofill form
│   Website   │ ◄─────────────────────────
└─────────────┘
```

### Data Flow

1. **Extraction**: Content script extracts email data from Gmail DOM
2. **Processing**: Images compressed to 60% quality and sent to background
3. **Face Detection**: Offscreen document processes images with Haar Cascade
4. **Storage**: Email data and cropped faces saved to IndexedDB
5. **Display**: Popup UI shows all extracted emails with thumbnails
6. **Autofill**: When requested, data injected into target website form

### Face Detection Process

1. Image downscaled to ~800px for faster detection
2. Haar Cascade algorithm scans for face patterns
3. Multiple faces detected with confidence scores
4. Faces cropped from original resolution with 40% padding
5. Output saved as high-quality JPEG (85%)

---

## ⚙️ Configuration

### Storage Limits

- **IndexedDB capacity**: 50-100MB (browser-dependent)
- **Recommended email count**: 7-10 emails
- **Maximum tested**: 20 emails (~38MB)
- **Per email size**: ~1.9MB (with compression)

### Image Quality Settings

- **Original images**: 60% JPEG quality (storage optimization)
- **Cropped faces**: 85% JPEG quality (high quality for recognition)
- **Detection resolution**: ~800px max dimension

### Autofill Target

- **Default website**: face-recognise.vercel.app/add-image
- **Form fields**: Email, Date, Time, Image Upload
- **Compatible with**: React forms, HTML5 inputs

---

## 🎓 Tips & Best Practices

### For Best Results

1. **Open emails fully** in Gmail (not preview pane)
2. **Wait for face detection** to complete before closing popup
3. **Check console logs** (F12) if something doesn't work
4. **Use Debug Attachments** button to verify image detection
5. **Clear old data** periodically to free up storage

### Performance Tips

- Extract emails one at a time for stability
- Close unused tabs to free up memory
- Reload extension if face detection seems slow
- Use full-resolution images (not previews) for best results

### Common Workflows

**Workflow 1: Single Email**
1. Open Gmail email → Extract → Navigate to website → Autofill → Submit

**Workflow 2: Batch Processing**
1. Open Gmail email 1 → Extract
2. Open Gmail email 2 → Extract
3. Open Gmail email 3 → Extract
4. Navigate to website
5. Autofill email 1 → Submit
6. Autofill email 2 → Submit
7. Autofill email 3 → Submit

---

## 🆘 FAQ

**Q: How many emails can I store?**  
A: 7-10 emails comfortably, up to 20 emails tested successfully.

**Q: Does it work on Brave browser?**  
A: Yes! Brave is Chromium-based, so all features work identically.

**Q: Can I export my data?**  
A: Not currently, but planned for a future update.

**Q: What if no faces are detected?**  
A: You'll see an orange warning. You can still manually upload images.

**Q: Can I use this with other websites?**  
A: The autofill is configured for face-recognise.vercel.app, but can be modified.

**Q: Is my data sent to any servers?**  
A: No! All processing happens locally in your browser. Data never leaves your machine.

**Q: What happens to my data if I uninstall?**  
A: All data is automatically deleted when you uninstall the extension.

---

## 📝 Version

**Current Version**: 2.5.0  
**Last Updated**: 2024-01-XX  
**Manifest**: V3  
**Status**: Stable

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

---

## 🤝 Contributing

This is a private project for exposition automation. If you'd like to contribute or report issues, please contact the maintainer.

---

## 📄 License

MIT License - feel free to use and modify for personal use.

---

## 🙏 Acknowledgments

- **tracking.js** - Haar Cascade implementation for face detection
- **IndexedDB API** - Client-side storage
- **Chrome Extensions API** - Extension framework

---

## 📧 Support

For issues, questions, or feedback:
- Check the browser console for error messages
- Use "Debug Attachments" button for image detection issues
- Verify you're on the latest version

---

**Made with ❤️ for automated exposition email processing**