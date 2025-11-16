# Publish Flow - Fixed & Ready to Test

## 🎯 What Was Fixed

### Issue #1: API Mismatch
**Problem:**
- PublishModal was sending `subdomain` and `plan`
- Server API expects `email` and `plan`
- Server auto-generates subdomain from business name

**Solution:**
- Removed subdomain input field from UI
- Now sending user's email from auth context
- Server generates subdomain automatically

### Issue #2: Missing Auth Context
**Problem:**
- PublishModal wasn't using `useAuth` hook
- No access to user information

**Solution:**
- Added `useAuth` hook
- Access user email: `user.email`
- Verify user is logged in before publishing

### Issue #3: Draft Data Structure
**Problem:**
- Draft data wasn't matching server expectations
- Fields were being lost during publish

**Solution:**
- Properly structured `draftData` object with:
  - `templateId` - The template being used
  - `businessData` - All user customizations
    - Business name, hero content, contact info
    - Social links, services, colors
    - Template-specific custom fields

---

## ✅ Updated Publish Flow

### Step 1: User Clicks "🚀 Publish" Button
- Button in Setup page header
- Validation: Template must be selected

### Step 2: PublishModal Opens
- Shows business name in header
- Displays 3 plan options:
  1. **Starter** (Free) - Display-only site
  2. **Checkout** ($29/mo) - Accept payments
  3. **Premium** ($99/mo) - Multi-page layouts
- Default selection: Starter

### Step 3: User Selects Plan & Clicks "🚀 Publish Site"

### Step 4: Backend Process
```javascript
1. Validate user is logged in
   ↓
2. Validate business name exists
   ↓
3. Prepare draft data with all fields:
   - templateId
   - businessData (name, hero, contact, social, services)
   ↓
4. POST /api/drafts
   - Create draft first
   - Get draftId back
   ↓
5. POST /api/drafts/:draftId/publish
   - Send: plan, email
   - Server checks subscription for paid plans
   - Server generates subdomain
   - Server creates site files
   ↓
6. Success!
   - Show success toast with subdomain
   - Redirect to dashboard after 1.5 seconds
```

---

## 🔧 Technical Details

### PublishModal Props
```javascript
<PublishModal 
  siteData={object}    // All site content & customizations
  onClose={function}   // Close modal callback
/>
```

### Draft Data Structure
```javascript
{
  templateId: "restaurant-pro",
  businessData: {
    businessName: "The Grand Table",
    heroTitle: "An Unforgettable Culinary Journey",
    heroSubtitle: "Experience modern American cuisine...",
    heroImage: "https://...",
    email: "contact@thegrandtable.com",
    phone: "(555) 789-0123",
    address: "123 Main St, City, State",
    businessHours: "Mon-Fri: 9am-5pm",
    websiteUrl: "https://...",
    facebookUrl: "https://...",
    instagramUrl: "https://...",
    googleMapsUrl: "https://...",
    services: [...],
    colors: {...},
    templateSpecific: {...}
  }
}
```

### Publish Request
```javascript
POST /api/drafts/:draftId/publish
Headers: {
  'Authorization': 'Bearer <token>',
  'Content-Type': 'application/json'
}
Body: {
  plan: "starter",
  email: "user@example.com"
}
```

### Success Response
```javascript
{
  success: true,
  subdomain: "the-grand-table",
  site: {
    subdomain: "the-grand-table",
    url: "https://yourdomain.com/sites/the-grand-table",
    // ... other site data
  }
}
```

---

## 📋 Testing Checklist

### Prerequisites
- ✅ User is logged in
- ✅ Dev server is running
- ✅ User is on `/setup` page
- ✅ Template is selected
- ✅ Business name is filled in

### Test Cases

#### Test 1: Publish with Starter Plan (Free)
```
1. Select template (e.g., "Restaurant")
2. Fill in business name (e.g., "My Restaurant")
3. Click "🚀 Publish"
4. Modal opens showing "My Restaurant"
5. "Starter" plan is pre-selected
6. Click "🚀 Publish Site"
7. Loading spinner appears
8. Success toast: "🎉 Site published successfully at my-restaurant.sitesprintz.com!"
9. Redirects to dashboard after 1.5s
10. Site appears in dashboard with "Published ✅" status

✅ EXPECTED: Success (Starter is free)
```

#### Test 2: Publish with Checkout Plan (Requires Subscription)
```
1. Select template
2. Fill in business name
3. Click "🚀 Publish"
4. Select "Checkout" plan
5. Click "🚀 Publish Site"
6. IF user has NO subscription:
   - Error: "Subscription required"
   - "Please subscribe first"
7. IF user HAS subscription:
   - Success, site published
   - Redirects to dashboard

✅ EXPECTED: Subscription check works
```

#### Test 3: Publish with Premium Plan (Requires Subscription)
```
1. Select template
2. Fill in business name
3. Click "🚀 Publish"
4. Select "Premium" plan
5. Click "🚀 Publish Site"
6. IF user has NO subscription:
   - Error: "Subscription required"
7. IF user HAS subscription:
   - Success, site published

✅ EXPECTED: Subscription check works
```

#### Test 4: Publish Without Business Name
```
1. Select template
2. DON'T fill in business name
3. Click "🚀 Publish"
4. Error: "Please select a template and add your business name"

✅ EXPECTED: Validation prevents publish
```

#### Test 5: Publish Without Being Logged In
```
1. Log out
2. Try to access /setup (should redirect to login)
OR
1. If somehow on setup page without auth
2. Click "🚀 Publish"
3. Error: "Please log in to publish your site"

✅ EXPECTED: Auth check works
```

#### Test 6: Custom Data Preservation
```
1. Select template
2. Fill in all fields:
   - Business name
   - Hero title & subtitle
   - Contact email, phone, address
   - Business hours
   - Social links
   - Add 2-3 services
3. Click "🚀 Publish"
4. Select plan
5. Publish
6. Visit published site
7. Verify ALL data appears on site

✅ EXPECTED: No data loss
```

#### Test 7: Multiple Publishes (Same User)
```
1. Publish first site: "Restaurant A"
2. Return to setup
3. Select different template
4. Publish second site: "Salon B"
5. Check dashboard
6. Both sites should be listed

✅ EXPECTED: Multiple sites work
```

---

## 🐛 Error Scenarios

### Error 1: Invalid Template
```
Error: "Template not found"
Cause: Template ID doesn't exist
Fix: Ensure template exists in /public/data/templates/
```

### Error 2: Missing Email
```
Error: "Valid email address is required"
Cause: User object doesn't have email
Fix: Check auth context, ensure user is logged in
```

### Error 3: Invalid Plan
```
Error: "Invalid plan selected"
Cause: Plan is not starter/business/pro/checkout/premium
Fix: Check plan ID in formData
```

### Error 4: Subscription Required
```
Error: "Subscription required"
Cause: User trying to use paid plan without subscription
Fix: User needs to subscribe OR use Starter (free) plan
```

### Error 5: Draft Not Found
```
Error: "Draft not found"
Cause: Draft ID doesn't exist or expired
Fix: Create new draft before publishing
```

---

## 🔍 Debugging Tips

### Check Browser Console
```javascript
// Look for these logs:
console.log('Draft created:', draftId);
console.log('Publishing with:', { plan, email });
console.log('Publish success:', result);
console.error('Publish error:', error);
```

### Check Network Tab
```
1. Open DevTools > Network
2. Filter by "drafts"
3. Look for:
   - POST /api/drafts (should return 200 with draftId)
   - POST /api/drafts/:id/publish (should return 200 with subdomain)
4. Check request payload
5. Check response data
```

### Check Server Logs
```bash
# In terminal where server is running:
# Look for:
"Draft created: [draftId]"
"Publishing site for: [email]"
"Subscription verified for [email]"
"Site published at: [subdomain]"
```

### Check File System
```bash
# Drafts (temporary):
ls -la /path/to/project/var/drafts/

# Published sites:
ls -la /path/to/project/public/sites/

# Should see new directory: public/sites/[subdomain]/
# With files: index.html, site.json
```

---

## 📊 Success Indicators

✅ **Draft Created**
- Status: 200
- Response has `draftId`

✅ **Publish Successful**  
- Status: 200
- Response has `subdomain`
- Success toast appears
- Redirects to dashboard

✅ **Site Files Created**
- `public/sites/[subdomain]/` exists
- `public/sites/[subdomain]/index.html` exists
- `public/sites/[subdomain]/site.json` exists

✅ **Site Accessible**
- Can visit `http://localhost:3000/sites/[subdomain]`
- Site displays with all custom content
- No 404 errors

✅ **Dashboard Updated**
- New site appears in dashboard
- Status shows "Published ✅"
- Can click "View" to see live site

---

## 🚀 Quick Test Script

```bash
# 1. Start server
npm run dev

# 2. Open browser to http://localhost:3000

# 3. Register/Login
# Email: test@example.com
# Password: password123

# 4. Go to Setup
# Click "Create New Site"

# 5. Select Template
# Choose "Restaurant" template

# 6. Fill Business Name
# Type "Test Restaurant"

# 7. Publish
# Click "🚀 Publish"
# Select "Starter" plan
# Click "🚀 Publish Site"

# 8. Verify
# - See success toast
# - Redirected to dashboard
# - Site appears in list
# - Click "View" to see site
```

---

## ✅ What Works Now

✅ **Authentication Integration**
- Uses `useAuth` hook
- Gets user email automatically
- Validates user is logged in

✅ **Draft Creation**
- Creates draft before publishing
- Properly structured data
- All fields preserved

✅ **Publishing**
- Sends correct data to server
- Server auto-generates subdomain
- Success message with subdomain
- Redirects to dashboard

✅ **Plan Selection**
- 3 plans available
- Visual selection
- Server validates subscription for paid plans

✅ **Error Handling**
- Clear error messages
- Helpful validation
- Failed publish doesn't leave broken state

---

## 📝 Files Modified

1. ✅ `src/components/setup/PublishModal.jsx`
   - Added `useAuth` hook
   - Removed subdomain input
   - Fixed draft data structure
   - Fixed publish API call
   - Improved error handling

---

## 🎯 Next Steps

1. **Test the publish flow** with all test cases above
2. **Verify subscription checks** for paid plans
3. **Check site accessibility** after publish
4. **Test with different templates** to ensure all work
5. **Test with different data** (long names, special chars, etc.)

---

**Status:** ✅ Ready to Test  
**Last Updated:** November 5, 2025  
**Version:** 2.0

