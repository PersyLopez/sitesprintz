# 🐛 Bug Fixes - Edit & Data Persistence

## Issues Reported

### Issue 1: Edit Button Not Working
**Problem:** Clicking "✏️ Edit" on a site from the dashboard didn't navigate to the site.

**Root Cause:** The API endpoint `/api/users/:userId/sites` was not returning the `subdomain` field, which the dashboard's `editSite()` function needs to construct the edit URL.

**Fix:**
- Updated `server.js` line 949-958 to include `subdomain` in the API response
- Dashboard now correctly receives: `{ id, subdomain, name, url, status, ... }`
- Edit button now navigates to: `/sites/{subdomain}/?edit=true&token={token}`

---

### Issue 2: Published Sites Not Showing User Data
**Problem:** After publishing a site, it displayed generic content instead of the user's customized information.

**Root Cause:** The `publishNow()` function in `setup.html` was collecting data in the wrong format. It was saving:
```javascript
{
  businessName: "...",
  heroTitle: "...",
  contactEmail: "..."
}
```

But `site-template.html` expected:
```javascript
{
  brand: { name: "..." },
  hero: { title: "...", subtitle: "..." },
  contact: { email: "...", phone: "..." },
  services: { items: [...] }
}
```

**Fix:**
Updated `publishNow()` function (lines 3357-3421) to:

1. **Collect data in correct structure:**
```javascript
const formData = {
  brand: {
    name: document.getElementById('businessName')?.value || 'My Business'
  },
  hero: {
    title: document.getElementById('heroTitle')?.value || 'Welcome',
    subtitle: document.getElementById('heroSubtitle')?.value || '...',
    cta: 'Get Started'
  },
  contact: {
    email: document.getElementById('contactEmail')?.value || '',
    phone: document.getElementById('contactPhone')?.value || '',
    address: document.getElementById('contactAddress')?.value || ''
  },
  services: {
    title: 'Our Services',
    items: []
  }
};
```

2. **Collect all services/products:**
- Loops through all service fields
- Builds proper items array with `title`, `description`, `price`, `image`

3. **Fall back to template defaults:**
- If user hasn't customized services, uses template's demo data
- Ensures site always has content

4. **Store template data globally:**
- Added `window.currentTemplateData = templateData` in `setupCustomize()`
- Makes template data available for `publishNow()` fallback

---

## Testing Steps

### Test Issue 1 Fix (Edit Button):
1. Go to dashboard: `https://your-ngrok-url/dashboard.html`
2. Find a published site
3. Click "✏️ Edit"
4. ✅ Should navigate to `/sites/{subdomain}/?edit=true&token=...`
5. ✅ Site should load with floating editor toolbar
6. ✅ Should see "Click to edit" hints on hover

### Test Issue 2 Fix (Data Persistence):
1. Go to: `https://your-ngrok-url/setup.html`
2. Select a template
3. Customize:
   - Business name
   - Hero title & subtitle
   - Contact info
   - Services/products (optional)
4. Click "🚀 Publish Site"
5. Complete email/Google OAuth
6. ✅ Visit published site
7. ✅ Should show YOUR customized data
8. ✅ Should NOT show generic "My Business" etc.

### Test Data Fallback:
1. Select a template
2. Don't customize anything (leave demo data)
3. Click publish
4. ✅ Published site should show template's demo data
5. ✅ Should look like the template preview

---

## Files Changed

### `server.js`
- **Line 951:** Added `subdomain: site.subdomain,` to API response

### `public/setup.html`
- **Lines 2275:** Added `window.currentTemplateData = templateData;`
- **Lines 3357-3421:** Completely rewrote `publishNow()` function
  - New data structure matching site-template.html
  - Service collection logic
  - Fallback to template defaults

---

## Data Flow

### Before Fix:
```
setup.html → publishNow() → { businessName, heroTitle, ... }
           ↓
quick-publish.html → /api/sites/guest-publish
           ↓
server.js → saves to site.json
           ↓
site-template.html → tries to read data.brand.name ❌ undefined
```

### After Fix:
```
setup.html → publishNow() → { brand: {name}, hero: {title}, ... }
           ↓
quick-publish.html → /api/sites/guest-publish
           ↓
server.js → saves to site.json
           ↓
site-template.html → reads data.brand.name ✅ "Your Business"
```

---

## Verification

Run these checks to confirm fixes:

```bash
# Check server is running
curl http://localhost:3000/

# Check API returns subdomain
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/users/YOUR_USER_ID/sites

# Should see: {"sites": [{ "id": "...", "subdomain": "...", ... }]}
```

---

## Status

✅ **Issue 1 Fixed:** Edit button now works  
✅ **Issue 2 Fixed:** Sites show user's custom data  
✅ **Committed:** Git commit `efb86524`  
✅ **Server Restarted:** Running with fixes  

**Ready to test!** 🚀

