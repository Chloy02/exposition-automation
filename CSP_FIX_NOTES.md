# CSP Fix: Moving tracking.js to Local Files

## Problem
The Chrome extension was failing to load with the following error:
```
Failed to load extension
File: ~/Documents/College_code/projects/exposition-automation
Error: 'content_security_policy.extension_pages': Insecure CSP value "https://cdnjs.cloudflare.com" in directive 'script-src'.
Could not load manifest.
```

## Root Cause
Chrome Manifest V3 extensions have strict Content Security Policy (CSP) requirements that **prohibit loading external scripts from CDNs**, even if explicitly allowed in the CSP directive. This is a security feature to prevent:
- Man-in-the-middle attacks
- CDN compromises
- Network-based script injection

## Solution
Downloaded the tracking.js library files locally and updated all references:

### Files Created
1. **lib/tracking.js** - Core tracking.js library (v1.1.3, non-minified)
2. **lib/face.js** - Face detection classifier data (non-minified)

### Files Modified

#### 1. offscreen.html
**Before:**
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/tracking.js/1.1.3/tracking-min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/tracking.js/1.1.3/data/face-min.js"></script>
```

**After:**
```html
<script src="./lib/tracking.js"></script>
<script src="./lib/face.js"></script>
```

#### 2. manifest.json
**Changes:**
- Removed `https://cdnjs.cloudflare.com/*` from `host_permissions`
- Changed CSP from `"script-src 'self' https://cdnjs.cloudflare.com; object-src 'self'"` to `"script-src 'self'; object-src 'self'"`
- Added library files to `web_accessible_resources`:
  - `lib/tracking.js`
  - `lib/face.js`

## Directory Structure
```
exposition-automation/
├── lib/
│   ├── tracking.js        (NEW - 99KB non-minified)
│   └── face.js            (NEW - 183KB non-minified)
├── offscreen.html         (MODIFIED)
├── manifest.json          (MODIFIED)
└── ... (other files)
```

## Benefits
1. ✅ **No CSP violations** - All scripts are loaded from the extension itself
2. ✅ **Offline functionality** - No internet required for face detection
3. ✅ **Faster loading** - No external HTTP requests
4. ✅ **More secure** - No external dependencies that could be compromised
5. ✅ **Manifest V3 compliant** - Follows Chrome's security best practices

## Testing
After these changes, the extension should load without CSP errors. To test:
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `exposition-automation` directory
5. Verify the extension loads without errors

## Notes
- Using non-minified versions for better compatibility and debugging (minified versions had syntax issues)
- Version used: tracking.js v1.1.3 (same as CDN version)
- Files are larger (282KB total vs ~50KB minified) but more reliable and readable
- The face detection functionality should work exactly the same as before

## References
- Chrome Extension Manifest V3 CSP: https://developer.chrome.com/docs/extensions/mv3/manifest/content_security_policy/
- tracking.js documentation: http://trackingjs.com/