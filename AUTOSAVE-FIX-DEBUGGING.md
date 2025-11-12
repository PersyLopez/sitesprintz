# Auto-Save Fix - site.json Missing

**Date:** November 6, 2025  
**Status:** 🔍 DEBUGGING

---

## 🐛 Problem Discovered

### User Report:
> "it better but still not failing to autosave"

### Root Cause Found:
The seamless visual editor is failing to save because **`site.json` files don't exist** in published sites.

---

## 🔍 Investigation

### Server Logs Show:
```bash
💾 Save request for the-grand-table-wgwnoczlg by persylopez9@gmail.com
❌ Site not found: /Users/admin/active-directory-website/public/sites/the-grand-table-wgwnoczlg/site.json
```

### File Structure Found:
```
/public/sites/creative-studios/
├── index.html        ✅ Exists
├── data/
│   └── site.json     ✅ Exists (wrong location!)
└── site.json         ❌ MISSING!
```

### Expected Structure:
```
/public/sites/creative-studios/
├── index.html        ✅ Should exist
└── site.json         ✅ Should exist here!
```

---

## 📋 The Issue

### Publish Endpoint (lines 2613-2616):
```javascript
// Save site.json
await fs.writeFile(siteConfigFile, JSON.stringify(siteData, null, 2));
```

### PATCH Endpoint (lines 3896-3905):
```javascript
// Load existing site
const siteDir = path.join(publicDir, 'sites', subdomain);
const sitePath = path.join(siteDir, 'site.json');  // Looking at root

try {
  existingSite = JSON.parse(await fs.readFile(sitePath, 'utf-8'));
} catch (error) {
  console.error(`❌ Site not found: ${sitePath}`);
  return res.status(404).json({ error: 'Site not found' });
}
```

### The Mystery:
- Code SHOULD be writing `site.json` to root (line 2615)
- Code SHOULD be updating it with subdomain (line 3684)
- But files DON'T exist at root
- Some old sites have it in `/data/site.json` instead

---

## 🔧 Fix Applied

### Added Detailed Logging:

#### At Initial Save (line 2614-2616):
```javascript
console.log(`💾 Writing site.json to: ${siteConfigFile}`);
await fs.writeFile(siteConfigFile, JSON.stringify(siteData, null, 2));
console.log(`✅ site.json saved successfully`);
```

#### At Subdomain Update (line 3683-3685):
```javascript
console.log(`💾 Re-saving site.json with subdomain: ${siteConfigFile}`);
await fs.writeFile(siteConfigFile, JSON.stringify(siteData, null, 2));
console.log(`✅ site.json updated with subdomain`);
```

---

## 🧪 Testing Required

### Next Steps:

1. **Publish a new site from the dashboard**
   - Select any template
   - Fill in business info
   - Click Publish

2. **Check server logs**:
   ```bash
   tail -f /tmp/server.log | grep "site.json"
   ```

3. **Look for these messages**:
   ```
   📁 Created site directory: /Users/admin/.../public/sites/[subdomain]
   💾 Writing site.json to: /Users/admin/.../public/sites/[subdomain]/site.json
   ✅ site.json saved successfully
   ✅ index.html saved successfully
   💾 Re-saving site.json with subdomain: ...
   ✅ site.json updated with subdomain
   ```

4. **Verify file exists**:
   ```bash
   ls -la /Users/admin/active-directory-website/public/sites/[new-subdomain]/
   ```
   Should show:
   - `index.html`
   - `site.json` ← **This should exist!**

5. **Test auto-save**:
   - Click "Edit" from dashboard
   - Click on any text
   - Edit it
   - Press Enter
   - Check server logs for:
     ```
     💾 Save request for [subdomain] by [email]
     ✅ Site updated successfully (or specific error)
     ```

---

## 🤔 Possible Causes

### Theory 1: Silent Error
- `fs.writeFile` fails but error isn't caught
- Maybe permissions issue?
- Maybe path issue?

### Theory 2: Code Path Not Reached
- Maybe an early return before line 2615?
- Maybe an exception before that?

### Theory 3: File Gets Deleted
- Maybe another process removes it?
- Maybe cleanup code runs?

### Theory 4: Old Sites vs New Code
- Older sites were published with different code
- New publish endpoint might work fine
- Need to test with brand new publish

---

## 📊 Impact

### What Breaks:
- ❌ Auto-save in seamless editor
- ❌ Manual save attempts
- ❌ Any updates to published sites
- ❌ Edit mode completely non-functional

### Why It Breaks:
```javascript
// PATCH endpoint can't find the file
existingSite = JSON.parse(await fs.readFile(sitePath, 'utf-8'));
// → ENOENT: no such file or directory
// → Returns 404: Site not found
// → Save fails
```

---

## ✅ Expected Behavior After Fix

### On Publish:
1. Draft loaded from `/drafts/[id].json`
2. Site directory created at `/sites/[subdomain]/`
3. **`site.json` saved** at `/sites/[subdomain]/site.json`
4. `index.html` generated at `/sites/[subdomain]/index.html`
5. **`site.json` updated** with subdomain
6. Site inserted into database
7. Draft deleted

### On Edit:
1. User clicks text in visual editor
2. User types changes
3. Editor calls PATCH `/api/sites/[subdomain]`
4. **Server finds `site.json`** at `/sites/[subdomain]/site.json`
5. Server verifies ownership
6. Server applies changes
7. **Server saves updated `site.json`**
8. Returns success
9. Green flash confirms save

---

## 🎯 Next Actions

1. ✅ **Added detailed logging** to publish endpoint
2. ✅ **Restarted server** with new logging
3. ⏳ **WAITING FOR USER** to publish a new site
4. ⏳ **Check logs** to see what happens
5. ⏳ **Diagnose** based on log output
6. ⏳ **Fix** the actual issue

---

## 📝 Notes

### Logging Added:
- Directory creation confirmation
- site.json write attempt
- site.json write success
- site.json update attempt
- site.json update success

### This Will Reveal:
- Does the code reach the write statements?
- Does the write succeed or fail?
- Is the file created then deleted?
- Is there an exception we're missing?

---

**Status:** 🔍 **Debugging in Progress**  
**Waiting For:** User to publish a new site and check logs  

**Last Updated:** November 6, 2025

