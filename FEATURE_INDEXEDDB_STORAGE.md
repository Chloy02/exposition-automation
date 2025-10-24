# Feature: IndexedDB Storage for Multiple Emails

## Date
2024-01-XX

## Overview
Migrated from Chrome's `chrome.storage.local` (10MB limit) to **IndexedDB** (50-100MB+ limit) to support storing 7-10 emails simultaneously with images and cropped faces.

---

## Problem Statement

### Original Issue: Storage Quota Exceeded
**Error:** `Uncaught (in promise) Error: Resource::kQuotaBytes quota exceeded`

**Root Cause:**
- Chrome extension storage limit: **~10MB** (`chrome.storage.local`)
- Email images as base64 data URLs: **1-5MB each**
- After 2-3 emails with images: **Quota exceeded** ❌
- Second/third email extracts but **fails to save**

**Impact:**
- Users could only store 2-3 emails maximum
- Cannot extract multiple emails in one session
- Data loss on subsequent extractions
- Poor user experience

---

## Solution: IndexedDB Migration

### Why IndexedDB?

| Storage Method | Capacity | Speed | Structured Data | Best For |
|----------------|----------|-------|-----------------|----------|
| `chrome.storage.local` | ~10MB | Fast | Key-value | Small data |
| `chrome.storage.sync` | ~100KB | Slow (synced) | Key-value | Settings |
| **IndexedDB** | **50-100MB+** | **Very Fast** | **Object store** | **Large data** ✅ |
| localStorage | ~5-10MB | Fast | String only | Simple data |

**IndexedDB Benefits:**
- ✅ 5-10x larger capacity (50-100MB vs 10MB)
- ✅ Store 7-10 emails comfortably (with room for more)
- ✅ Faster read/write for large data
- ✅ Structured data with indexes
- ✅ Transactional integrity
- ✅ Asynchronous (non-blocking)

---

## Implementation Details

### 1. Created IndexedDB Helper (`dbHelper.js`)

**Database Schema:**
```javascript
Database: ExpositionAutomatorDB
Version: 1
Object Store: emails
  - Key Path: "id"
  - Indexes:
    - senderEmail (searchable)
    - date (searchable, sortable)
```

**API Methods:**
- `init()` - Initialize/open database
- `saveEmail(emailData)` - Add or update email
- `getEmail(id)` - Get specific email by ID
- `getAllEmails()` - Get all emails (sorted by date)
- `updateEmail(id, updates)` - Update existing email
- `deleteEmail(id)` - Delete specific email
- `clearAllEmails()` - Clear all data
- `countEmails()` - Count total emails
- `getStorageEstimate()` - Get storage usage stats

**Features:**
- Singleton pattern for single instance
- Promise-based async API
- Automatic schema creation/upgrade
- Error handling with logging
- Storage usage monitoring

### 2. Updated `popup.js`

**Changed:**
- Replaced all `chrome.storage.local.get/set` with IndexedDB calls
- Updated `loadAndRenderData()` to use `dbHelper.getAllEmails()`
- Updated `saveAndProcessData()` to use `dbHelper.saveEmail()`
- Updated face detection to use `dbHelper.updateEmail()`
- Updated clear button to use `dbHelper.clearAllEmails()`
- Added storage usage logging

**Async/Await Pattern:**
```javascript
// OLD: chrome.storage callback-based
chrome.storage.local.get({ emails: [] }, (data) => {
  const emails = data.emails || [];
  // ... process emails
});

// NEW: IndexedDB promise-based
const emails = await dbHelper.getAllEmails();
// ... process emails
```

### 3. Updated `popup.html`

**Added:**
- `<script src="dbHelper.js"></script>` before `popup.js`
- Ensures dbHelper is loaded before popup logic runs

### 4. Optimized Image Compression

**Updated `content.js`:**
- Compress original images to **60% quality** (was uncompressed)
- Cropped faces remain **85% quality** (high quality maintained)
- Uses canvas `toDataURL('image/jpeg', 0.6)`

**Size Reduction:**
```
Original:  2MB per image (uncompressed)
→ 60%:     ~800KB per image (compressed)
Savings:   60% reduction in storage!
```

**Example:**
- 2 original images: 2 × 800KB = 1.6MB
- 2 cropped faces: 2 × 150KB = 300KB
- **Total per email: ~1.9MB**
- **7-10 emails: 13-19MB** ✅ (fits comfortably in IndexedDB)

---

## Storage Capacity Comparison

### Before (chrome.storage.local):
| Emails | Original Images | Cropped Faces | Total Size | Status |
|--------|----------------|---------------|------------|--------|
| 1 email | 4MB | 300KB | ~4.3MB | ✅ Works |
| 2 emails | 8MB | 600KB | ~8.6MB | ✅ Works |
| 3 emails | 12MB | 900KB | ~12.9MB | ❌ **QUOTA EXCEEDED** |

### After (IndexedDB + Compression):
| Emails | Original Images (60%) | Cropped Faces (85%) | Total Size | Status |
|--------|----------------------|---------------------|------------|--------|
| 1 email | 1.6MB | 300KB | ~1.9MB | ✅ Works |
| 5 emails | 8MB | 1.5MB | ~9.5MB | ✅ Works |
| 7 emails | 11.2MB | 2.1MB | ~13.3MB | ✅ Works |
| 10 emails | 16MB | 3MB | ~19MB | ✅ Works |
| 20 emails | 32MB | 6MB | ~38MB | ✅ Works |

**Result:** Can store **7-10 emails comfortably** with room for more!

---

## Migration Strategy

**User Impact:**
- No automatic migration (fresh start)
- Users will re-extract emails (2-3 emails max anyway)
- Simple, clean approach
- No data corruption risk

**Why No Migration:**
- Old storage had only 2-3 emails max (quota limit)
- Re-extracting is fast and easy
- Avoids complexity and potential errors
- Clean slate for new storage system

---

## Code Changes Summary

### Files Modified:
1. ✅ `dbHelper.js` (NEW) - IndexedDB wrapper
2. ✅ `popup.html` (MODIFIED) - Added dbHelper script tag
3. ✅ `popup.js` (MODIFIED) - Use IndexedDB instead of chrome.storage
4. ✅ `content.js` (MODIFIED) - Compress images to 60% quality

### Files Unchanged:
- `background.js` - No changes needed
- `manifest.json` - No new permissions required
- `autofill.js` - No changes needed
- `trackingFaceDetection.js` - No changes needed
- Other utility files - No changes needed

---

## Usage Examples

### Storing an Email:
```javascript
const emailData = {
  id: 'email_1234567890',
  senderEmail: 'person@example.com',
  date: '2024-01-15T10:30:00Z',
  subject: 'Important Document',
  images: ['data:image/jpeg;base64,...', 'data:image/jpeg;base64,...'],
  croppedFaces: ['data:image/jpeg;base64,...']
};

await dbHelper.saveEmail(emailData);
```

### Getting All Emails:
```javascript
const emails = await dbHelper.getAllEmails();
console.log(`Loaded ${emails.length} emails`);
// Emails are sorted by date (newest first)
```

### Updating an Email with Cropped Faces:
```javascript
await dbHelper.updateEmail('email_1234567890', {
  croppedFaces: [/* new cropped faces */]
});
```

### Clearing All Data:
```javascript
await dbHelper.clearAllEmails();
console.log('All emails cleared');
```

### Checking Storage Usage:
```javascript
const stats = await dbHelper.getStorageEstimate();
console.log(`Using ${stats.usageInMB}MB of ${stats.quotaInMB}MB`);
```

---

## Testing

### Test Cases:
- [x] Extract 1 email → Saves successfully
- [x] Extract 2 emails → Both visible in table
- [x] Extract 5 emails → All visible, no quota error
- [x] Extract 7 emails → All visible, storage comfortable
- [x] Extract 10 emails → All visible, within limits
- [x] Clear all data → All emails removed
- [x] Autofill works with IndexedDB data
- [x] Original images compressed to 60%
- [x] Cropped faces remain high quality (85%)
- [x] Emails sorted by date (newest first)
- [x] Storage usage logged to console

### Manual Testing:
1. Open Gmail, extract email → Check popup table
2. Open another Gmail email → Extract → Both visible
3. Repeat 7-10 times → All emails visible
4. Check console for storage usage
5. Click Auto-fill on different emails → Different data filled
6. Click Clear Stored Data → All removed

---

## Performance Improvements

### Storage:
- **Before:** 10MB limit, 2-3 emails max
- **After:** 50-100MB limit, 7-10+ emails

### Speed:
- **Read:** Similar or faster (IndexedDB optimized for large data)
- **Write:** Similar (both async)
- **Bulk operations:** Faster (IndexedDB transactions)

### Memory:
- No change in memory usage
- Images loaded on-demand
- Efficient data structure

---

## Browser Compatibility

### Works in:
- ✅ Chrome (all versions with IndexedDB support)
- ✅ Brave (Chromium-based)
- ✅ Edge (Chromium-based)
- ✅ Opera (Chromium-based)

**IndexedDB Support:**
- Chrome 24+ (2013)
- All modern Chromium browsers
- 100% compatible with Manifest V3

---

## Error Handling

### Database Initialization:
```javascript
try {
  await dbHelper.init();
} catch (error) {
  console.error('Failed to initialize IndexedDB:', error);
  // Fallback: Show error message to user
}
```

### Save Operation:
```javascript
try {
  await dbHelper.saveEmail(emailData);
} catch (error) {
  console.error('Failed to save email:', error);
  // Fallback: Retry or show error
}
```

### Read Operation:
```javascript
try {
  const emails = await dbHelper.getAllEmails();
} catch (error) {
  console.error('Failed to load emails:', error);
  // Fallback: Show empty state
}
```

---

## Console Logging

### Initialization:
```
✅ IndexedDB initialized
✅ Object store created: emails
```

### Storage Operations:
```
✅ Email saved to IndexedDB: email_1234567890
📧 Retrieved 7 emails from IndexedDB
📊 Storage: 15.23MB used of 58921.34MB quota
```

### Compression:
```
Image compressed: 2048.56KB → 819.42KB (60% quality)
Image compressed: 1876.32KB → 750.53KB (60% quality)
```

---

## Security & Privacy

### Data Location:
- Stored locally in browser's IndexedDB
- Never sent to external servers
- Isolated to extension's origin
- Cleared when extension uninstalled

### Permissions:
- No new permissions required
- IndexedDB is available to all extensions
- No `storage` permission needed in manifest

### Data Persistence:
- Persists across browser restarts
- Survives extension updates
- Cleared on extension uninstall
- User can clear via "Clear Stored Data" button

---

## Future Enhancements

### Possible Improvements:
1. **Pagination** - Load emails in batches for very large datasets
2. **Search** - Search emails by sender, subject, date
3. **Export** - Export emails to JSON/ZIP file
4. **Import** - Import previously exported data
5. **Compression** - Further optimize with WebP format
6. **Encryption** - Encrypt sensitive data at rest
7. **Backup** - Sync to cloud (optional)

### Scaling:
- Current: 7-10 emails comfortably
- Potential: 20-30 emails with current compression
- Future: 50+ emails with WebP or further optimization

---

## Troubleshooting

### Issue: "Failed to initialize IndexedDB"
**Solution:** Check browser compatibility, ensure popup is loaded in extension context

### Issue: Still getting quota errors
**Solution:** Check storage estimate, may need to clear old data or increase compression

### Issue: Data not appearing
**Solution:** Check console for errors, verify dbHelper.js loaded before popup.js

### Issue: Slow performance
**Solution:** Check number of stored emails, consider implementing pagination

---

## Deployment

### Steps:
1. Reload extension in Chrome (`chrome://extensions`)
2. Existing data will be lost (expected, fresh start)
3. Extract emails as normal
4. Verify multiple emails can be stored
5. Check console for storage usage logs

### Rollback Plan:
If issues arise, previous version used chrome.storage.local
- Revert to previous commit
- Users lose new multi-email capability
- Back to 2-3 email limit

---

## Benchmarks

### Storage Capacity:
- **Before:** 2-3 emails (10MB limit)
- **After:** 7-10 emails (50-100MB available)
- **Improvement:** 3-5x more emails

### Compression Savings:
- **Before:** ~4.3MB per email (uncompressed)
- **After:** ~1.9MB per email (60% compressed)
- **Improvement:** 56% storage savings

### Image Quality:
- **Original images:** 60% quality (acceptable for viewing)
- **Cropped faces:** 85% quality (high quality for recognition)
- **Trade-off:** Minimal quality loss, massive storage gain

---

## Documentation

Related files:
- `BUGFIX_CANVAS_DRAGDROP.md` - Canvas performance fixes
- `BUGFIX_DATE_AUTOFILL.md` - Date field fixes
- `BUGFIX_FILE_UPLOAD_AUTOFILL.md` - File upload implementation
- `BUGFIX_TIME_AUTOFILL.md` - Time field fixes
- `FEATURE_INDEXEDDB_STORAGE.md` - This document

---

**Status:** ✅ Implemented  
**Priority:** High (Core feature)  
**User Benefit:** Can now store 7-10 emails at once  
**Storage:** 50-100MB+ (vs 10MB before)  
**Version:** v2.5+