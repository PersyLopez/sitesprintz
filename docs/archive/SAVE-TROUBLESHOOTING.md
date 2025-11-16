# Visual Editor Save Troubleshooting Guide

**Date:** November 6, 2025  
**Issue:** Save functionality not working in visual editor

---

## 🔍 Debugging Steps

### 1. Check Browser Console

Open DevTools (F12) → Console tab

**Look for:**
```javascript
// Good signs:
✅ Updated hero.title: "Old" → "New"
💾 Saving changes: [{field: "hero.title", value: "New"}]
✅ Save successful! {success: true}

// Bad signs:
❌ Save error: HTTP 403: Not authorized
❌ Save error: HTTP 404: Site not found
❌ NetworkError when attempting to fetch resource
```

---

### 2. Check Network Tab

DevTools → Network tab → Filter: "Fetch/XHR"

**Look for PATCH request:**
```
Request URL: http://localhost:3000/api/sites/{subdomain}
Request Method: PATCH
Status Code: ???
```

**Possible Status Codes:**

| Code | Meaning | Solution |
|------|---------|----------|
| 200 | Success | ✅ Working! |
| 401 | Unauthorized | Token invalid or missing |
| 403 | Forbidden | Wrong user/site owner mismatch |
| 404 | Not Found | Site doesn't exist |
| 500 | Server Error | Check server logs |

---

### 3. Check Server Logs

```bash
tail -f /tmp/server.log
```

**Look for:**
```
// When you make edits:
💾 Save request for {subdomain} by {email}
📝 Changes: [{field: "...", value: "..."}]
🔐 Site owner: {owner_email}, User: {user_email}
✅ Saved changes to {subdomain}

// Or errors:
❌ Site not found: /path/to/site.json
❌ Unauthorized: user@email.com trying to edit owner@email.com's site
❌ Patch site error: Error message
```

---

## 🔧 Common Issues & Fixes

### Issue 1: "Not authorized to edit this site" (403)

**Cause:** Token doesn't match site owner

**Check:**
```javascript
// In browser console:
localStorage.getItem('token')
// Copy this token

// Check site owner:
fetch('/sites/{subdomain}/site.json')
  .then(r => r.json())
  .then(d => console.log('Owner:', d.published?.email))
```

**Fix:**
1. Make sure you're logged in as the correct user
2. Republish the site with the correct user
3. Or edit with the owner's account

---

### Issue 2: Token Missing or Invalid (401)

**Cause:** No authentication token

**Check:**
```javascript
// Browser console:
localStorage.getItem('token')
// Should return a long JWT string
```

**Fix if null:**
1. Log in again at `http://localhost:5173/login`
2. Token will be saved automatically
3. Refresh the edit page

---

### Issue 3: Site Not Found (404)

**Cause:** Subdomain doesn't exist or path is wrong

**Check:**
```bash
ls -la /Users/admin/active-directory-website/public/sites/{subdomain}/
```

**Fix:**
- Make sure you published the site
- Check subdomain spelling
- Republish if files are missing

---

### Issue 4: Changes Don't Persist After Reload

**Symptoms:**
- Edit shows "Saved ✓"
- But reload shows old content

**Cause:** Changes saved to site.json but HTML regeneration needed

**Check:**
```bash
cat /Users/admin/active-directory-website/public/sites/{subdomain}/site.json
# Should show your new values
```

**Why This Happens:**
- HTML is generated once at publish time
- Visual editor updates site.json
- Site loads from site.json (so changes DO work)
- But if HTML doesn't use site.json, changes won't show

**Fix:** Sites should load from site.json dynamically (already implemented)

---

### Issue 5: "Failed to save changes" (500)

**Cause:** Server error during save

**Check server logs:**
```bash
tail -50 /tmp/server.log | grep "❌"
```

**Common causes:**
- File permission error
- Disk full
- Invalid JSON in changes
- Node.js error

---

## ✅ Verify Save is Working

### Test Steps:

1. **Open site in edit mode:**
   ```
   http://localhost:3000/sites/{subdomain}/?edit=true&token={token}
   ```

2. **Open browser console** (F12)

3. **Click any text and edit it**

4. **Watch console for:**
   ```javascript
   ✅ Updated hero.title: "Old Title" → "New Title"
   💾 Saving changes: [{field: "hero.title", value: "New Title"}]
   ```

5. **Wait 3 seconds** (auto-save delay)

6. **Check for:**
   ```javascript
   ✅ Save successful! {success: true, checkpointId: 1730851234567}
   ```

7. **Check server logs:**
   ```bash
   tail -10 /tmp/server.log
   ```
   Should show:
   ```
   💾 Save request for {subdomain} by {email}
   ✅ Saved changes to {subdomain}
   ```

8. **Reload page** (F5)

9. **Your changes should still be there** ✅

---

## 🐛 Debug Mode

### Enable Verbose Logging

**Already enabled!** Server now logs:
- Every save request with subdomain and user
- All changes being saved
- Ownership verification
- Success/failure

**Watch in real-time:**
```bash
tail -f /tmp/server.log | grep -E "💾|✅|❌|🔐"
```

---

## 🔐 Authentication Debug

### Check if Token is Valid

```javascript
// Browser console:
const token = localStorage.getItem('token');
fetch('/api/auth/verify', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(d => console.log('Auth check:', d))
.catch(e => console.error('Auth failed:', e));
```

**Expected response:**
```json
{
  "valid": true,
  "user": {
    "email": "user@example.com",
    "id": 1
  }
}
```

---

## 📝 Manual Test API Call

### Test Save Endpoint Directly

```javascript
// Browser console (while on site edit page):
const token = localStorage.getItem('token');
const subdomain = 'your-site-subdomain';

fetch(`http://localhost:3000/api/sites/${subdomain}`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    changes: [
      { field: 'hero.title', value: 'Test Title' }
    ]
  })
})
.then(r => r.json())
.then(d => console.log('Save result:', d))
.catch(e => console.error('Save failed:', e));
```

**Expected response:**
```json
{
  "success": true,
  "message": "Changes saved",
  "checkpointId": 1730851234567
}
```

---

## 🎯 Quick Diagnosis

| Symptom | Most Likely Cause | Quick Fix |
|---------|------------------|-----------|
| Console: "401 Unauthorized" | No token | Log in again |
| Console: "403 Forbidden" | Wrong user | Use owner account |
| Console: "404 Not Found" | Wrong subdomain | Check site exists |
| Console shows save, but reload resets | Cache issue | Hard refresh (Ctrl+Shift+R) |
| No console messages | Editor not loading | Check ?edit=true in URL |
| "Saving..." forever | Network issue | Check server running |

---

## 🚀 Expected Behavior

### Normal Save Flow:

```
1. User clicks text
   → Blue border appears
   → Console: "Editing hero.title"

2. User types changes
   → Text updates in real-time
   → Blue border stays

3. User presses Enter or clicks away
   → Green flash on element
   → Console: "✅ Updated hero.title: 'Old' → 'New'"
   → Console: "💾 Saving changes..."

4. After 3 seconds
   → Console: "✅ Save successful!"
   → Toolbar: "✓ All changes saved"
   → Green flash on save indicator

5. Server logs show:
   💾 Save request for {subdomain} by {email}
   📝 Changes: [...]
   🔐 Site owner: {email}, User: {email}
   ✅ Saved changes to {subdomain}

6. User reloads page (F5)
   → Changes still there ✅
```

---

## 📞 Still Not Working?

### Collect This Information:

1. **Browser console output** (copy all error messages)
2. **Network tab** (screenshot of failed PATCH request)
3. **Server logs** (last 50 lines from /tmp/server.log)
4. **What you're trying to edit** (text, image, service, etc.)
5. **When it fails** (immediately, after 3 seconds, on reload?)

### Check These:

- ✅ Server running on port 3000?
- ✅ URL has `?edit=true&token=...`?
- ✅ Logged in to the correct account?
- ✅ Site was published with this account?
- ✅ Token in localStorage?
- ✅ Browser console shows visual editor loaded?

---

**With enhanced logging, you should now see exactly what's failing!** Check the server logs after trying to save. 🔍


