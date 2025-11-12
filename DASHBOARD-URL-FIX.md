# Dashboard Site URLs Fix

**Date:** November 5, 2025  
**Status:** ✅ COMPLETE

---

## Problem

Dashboard buttons (View, Edit) were trying to open sites on port 5173 (Vite dev server) instead of port 3000 (Express server where sites are actually served).

**Example Error:**
```
❌ http://localhost:5173/sites/quicklube-express-auto-mhmko9u7
   (Vite dev server - sites not here!)

✅ http://localhost:3000/sites/quicklube-express-auto-mhmko9u7
   (Express server - sites served here!)
```

---

## Root Cause

**File:** `src/components/dashboard/SiteCard.jsx`

### Issue 1: View Button URL (Line 6-8)

**Old Code:**
```javascript
const siteUrl = site.subdomain 
  ? `${window.location.protocol}//${window.location.host}/sites/${site.subdomain}`
  : null;
```

**Problem:**
- `window.location.host` returns `localhost:5173` (Vite dev server)
- Published sites are served by Express on port 3000
- This caused View button to point to wrong port

### Issue 2: Edit Button URL (Line 86)

**Old Code:**
```javascript
<a href={`/sites/${site.subdomain}/?edit=true&token=...`}>
```

**Problem:**
- Relative URL resolves to current host (localhost:5173)
- Should use absolute URL to backend (localhost:3000)

---

## Solution

### Fix 1: Add Backend URL Constant

```javascript
// In development, sites are served from Express (port 3000), not Vite (port 5173)
const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const siteUrl = site.subdomain 
  ? `${backendUrl}/sites/${site.subdomain}/`
  : null;
```

**Benefits:**
- ✅ Uses correct backend URL (port 3000)
- ✅ Respects environment variable for production
- ✅ Fallback to localhost:3000 for development
- ✅ Adds trailing slash for cleaner URLs

### Fix 2: Update Edit Button URL

```javascript
<a href={`${backendUrl}/sites/${site.subdomain}/?edit=true&token=${token}`}>
  Edit
</a>
```

**Benefits:**
- ✅ Uses absolute URL to backend
- ✅ Points to correct port (3000)
- ✅ Visual editor loads correctly

---

## Complete Fixed Code

```javascript
function SiteCard({ site, onDelete, onDuplicate }) {
  // In development, sites are served from Express (port 3000), not Vite (port 5173)
  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const siteUrl = site.subdomain 
    ? `${backendUrl}/sites/${site.subdomain}/`
    : null;

  // ... rest of component

  return (
    <div className="site-card">
      {/* ... */}
      
      {/* View Button */}
      <a 
        href={siteUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        🌐 View
      </a>
      
      {/* Edit Button */}
      <a 
        href={`${backendUrl}/sites/${site.subdomain}/?edit=true&token=${token}`}
      >
        ✏️ Edit
      </a>
    </div>
  );
}
```

---

## Impact on Dashboard Buttons

### View Button

**Before:**
```
❌ http://localhost:5173/sites/quicklube-express-auto-mhmko9u7
   → 404 Not Found (Vite doesn't serve sites)
```

**After:**
```
✅ http://localhost:3000/sites/quicklube-express-auto-mhmko9u7/
   → Site loads correctly ✓
```

### Edit Button

**Before:**
```
❌ /sites/quicklube-express-auto-mhmko9u7/?edit=true&token=...
   → Resolves to localhost:5173
   → 404 Not Found
```

**After:**
```
✅ http://localhost:3000/sites/quicklube-express-auto-mhmko9u7/?edit=true&token=...
   → Visual editor loads correctly ✓
```

---

## Why This Happened

In a typical React development setup:

1. **Vite Dev Server (port 5173)**
   - Serves React app
   - Hot module replacement
   - Development only

2. **Express Backend (port 3000)**
   - Serves API endpoints
   - Serves static files (published sites)
   - Production-ready

In development, these are separate servers. The React app must explicitly point to the backend URL when accessing backend resources like published sites.

---

## Environment Variables

### Development (.env.local)
```bash
VITE_API_URL=http://localhost:3000
```

### Production
```bash
VITE_API_URL=https://sitesprintz.com
```

The code uses `import.meta.env.VITE_API_URL` which Vite replaces at build time.

---

## Testing Checklist

- [x] View button opens site on correct port (3000)
- [x] Site loads without 404 error
- [x] Edit button opens site on correct port (3000)
- [x] Visual editor loads correctly
- [x] Edit mode activates properly
- [x] Token passed correctly
- [x] No console errors
- [x] Linter passes

---

## Files Modified

1. ✅ `src/components/dashboard/SiteCard.jsx`
   - Added `backendUrl` constant
   - Updated View button URL
   - Updated Edit button URL

---

## Status: ✅ COMPLETE

**View Button:** ✅ Fixed - Opens sites on port 3000  
**Edit Button:** ✅ Fixed - Opens visual editor on port 3000  
**All Dashboard Options:** ✅ Working correctly  

---

**Last Updated:** November 5, 2025  
**Tested:** ✅ All buttons working  
**Ready for:** Production 🚀




