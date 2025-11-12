# 🧪 Analytics Dashboard - Testing Guide

## ✅ Complete Testing Checklist

Use this guide to thoroughly test both analytics dashboards.

---

## 🎯 **User Analytics Testing**

### Test 1: Basic Access
- [ ] Log in as regular user
- [ ] Navigate to dashboard
- [ ] Verify "📊 Analytics" button is visible (purple)
- [ ] Click "📊 Analytics" button
- [ ] Verify redirect to `/analytics.html`
- [ ] Verify no console errors

**Expected:** Analytics page loads successfully

### Test 2: Authentication
- [ ] Try accessing `/analytics.html` without login
- [ ] Verify redirect to login page
- [ ] Log in and verify return to analytics

**Expected:** Proper authentication enforcement

### Test 3: Data Display
- [ ] Verify 6 stat cards are visible
- [ ] Check "Total Sites" shows correct count
- [ ] Verify "Published Sites" shows accurate number
- [ ] Check trend indicators (↑/↓) display
- [ ] Verify site analytics table populates

**Expected:** All metrics display correctly

### Test 4: Site Table
- [ ] Verify table shows all user's sites
- [ ] Check published sites have clickable links
- [ ] Verify status badges (Published/Draft)
- [ ] Check view counts display
- [ ] Verify creation dates format correctly

**Expected:** Complete site breakdown

### Test 5: Navigation
- [ ] Click "← Dashboard" button
- [ ] Verify return to main dashboard
- [ ] Navigate back to analytics
- [ ] Click "🔄 Refresh" button
- [ ] Verify data reloads

**Expected:** Smooth navigation

### Test 6: Responsive Design
- [ ] Resize browser to mobile width (<768px)
- [ ] Verify cards stack vertically
- [ ] Check table scrolls horizontally if needed
- [ ] Test buttons are touch-friendly
- [ ] Verify header collapses properly

**Expected:** Mobile-friendly layout

### Test 7: Error Handling
- [ ] Temporarily break API endpoint
- [ ] Verify error message displays
- [ ] Check "Try Again" button works
- [ ] Restore endpoint, verify recovery

**Expected:** Graceful error handling

---

## 👑 **Admin Analytics Testing**

### Test 1: Admin Access
- [ ] Log in as admin user
- [ ] Verify "⚙️ Admin" button visible (red)
- [ ] Verify "👥 Users" button visible (blue)
- [ ] Click "⚙️ Admin" button
- [ ] Verify redirect to `/admin-analytics.html`

**Expected:** Admin-only access granted

### Test 2: Non-Admin Restriction
- [ ] Log in as regular user
- [ ] Try accessing `/admin-analytics.html` directly
- [ ] Verify "Admin access required" message
- [ ] Verify redirect to dashboard

**Expected:** Access denied for non-admins

### Test 3: System Health
- [ ] Verify all 5 health metrics display
- [ ] Check "Status" shows "Online"
- [ ] Verify "Uptime" shows percentage
- [ ] Check "Response Time" displays
- [ ] Verify "Active Users" shows count

**Expected:** System monitoring active

### Test 4: Platform Overview
- [ ] Verify "Total Users" shows correct count
- [ ] Check "Total Sites" matches actual
- [ ] Verify "Total Revenue" calculated
- [ ] Check "Conversion Rate" displays
- [ ] Verify all trend indicators (↑/↓) show

**Expected:** Accurate platform metrics

### Test 5: Growth Metrics
- [ ] Check "Signups This Month" displays
- [ ] Verify "Sites Published" shows
- [ ] Check "Payments This Month" displays
- [ ] Verify "Activation Rate" shows

**Expected:** Growth tracking visible

### Test 6: Data Tables
- [ ] Verify "Recent Signups" table populates
- [ ] Check shows last 10 users
- [ ] Verify columns: email, role, status, sites, dates
- [ ] Check "Top Users" table displays
- [ ] Verify sorted by site count

**Expected:** Complete user activity

### Test 7: Auto-Refresh
- [ ] Wait 60 seconds on admin dashboard
- [ ] Verify "Last updated" timestamp changes
- [ ] Check data refreshes automatically
- [ ] Verify no page reload (AJAX only)

**Expected:** Auto-refresh every 60s

### Test 8: Navigation
- [ ] Click "👥 Users" button
- [ ] Verify redirect to user management
- [ ] Navigate back via "📊 Analytics"
- [ ] Click "← Dashboard"
- [ ] Verify return to main dashboard

**Expected:** Seamless navigation

### Test 9: Charts Section
- [ ] Verify 4 chart placeholders visible
- [ ] Check "User Growth" placeholder
- [ ] Check "Revenue Trends" placeholder
- [ ] Verify "Template Popularity" placeholder
- [ ] Check "Conversion Funnel" placeholder
- [ ] Try changing filters (dropdowns)

**Expected:** Chart areas ready for integration

### Test 10: Responsive Design
- [ ] Test on desktop (>1024px)
- [ ] Test on tablet (768px-1024px)
- [ ] Test on mobile (<768px)
- [ ] Verify all cards stack properly
- [ ] Check tables scroll on mobile

**Expected:** Fully responsive

---

## 🔌 **API Endpoint Testing**

### Test User Analytics API

**Test with cURL:**
```bash
# Get auth token (replace with actual token)
TOKEN="your-jwt-token-here"

# Test user analytics endpoint
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:3000/api/users/USER_ID/analytics
```

**Expected Response:**
```json
{
  "totalSites": 5,
  "publishedSites": 3,
  "totalViews": 2450,
  "viewsThisMonth": 735,
  "viewsChange": 15,
  "avgEngagement": 45,
  "engagementChange": 5,
  "activeSites": 3,
  "sites": [...]
}
```

**Verify:**
- [ ] 200 OK status code
- [ ] Valid JSON response
- [ ] All expected fields present
- [ ] Site array populated
- [ ] Numbers are realistic

### Test Admin Analytics API

**Test with cURL:**
```bash
# Test admin analytics (requires admin token)
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     http://localhost:3000/api/admin/analytics
```

**Expected Response:**
```json
{
  "system": {...},
  "platform": {...},
  "growth": {...},
  "recentSignups": [...],
  "topUsers": [...]
}
```

**Verify:**
- [ ] 200 OK status code
- [ ] All sections present
- [ ] Arrays populated
- [ ] Metrics calculated correctly

### Test Authorization
- [ ] Try user endpoint without token → 401
- [ ] Try admin endpoint as regular user → 403
- [ ] Try with expired token → 401
- [ ] Try with invalid token → 401

**Expected:** Proper security enforcement

---

## 🎨 **Visual Testing**

### User Dashboard Visuals
- [ ] Purple gradient header renders
- [ ] Stat cards have left border accent
- [ ] Hover effects work on cards
- [ ] Status badges colored correctly
- [ ] Trend arrows (↑/↓) display
- [ ] Loading spinner shows during load
- [ ] Empty state displays if no sites

### Admin Dashboard Visuals
- [ ] Red gradient header renders
- [ ] Health metrics color-coded
- [ ] Cards highlight on hover
- [ ] Badges colored appropriately
- [ ] Tables have alternating row hover
- [ ] Auto-refresh indicator updates

---

## ⚡ **Performance Testing**

### Load Time Testing
- [ ] User analytics loads in <500ms
- [ ] Admin analytics loads in <1s
- [ ] API responses under 200ms
- [ ] No memory leaks after refresh
- [ ] Browser remains responsive

### Data Volume Testing
- [ ] Test with 1 site
- [ ] Test with 10 sites
- [ ] Test with 50+ sites
- [ ] Test with 100+ users (admin)
- [ ] Verify tables remain performant

---

## 🔒 **Security Testing**

### Authentication Tests
- [ ] Cannot bypass login
- [ ] Token required for all endpoints
- [ ] Token validation works
- [ ] Expired tokens rejected
- [ ] Invalid tokens rejected

### Authorization Tests
- [ ] Users can't access admin dashboard
- [ ] Users can't see other users' data
- [ ] Admin can access all features
- [ ] Role checks enforced server-side
- [ ] URL manipulation blocked

### Data Protection
- [ ] No passwords in responses
- [ ] User data properly isolated
- [ ] SQL injection not possible (no SQL)
- [ ] XSS attacks prevented
- [ ] CSRF tokens not needed (stateless)

---

## 🐛 **Edge Cases**

### User Dashboard Edge Cases
- [ ] User with zero sites
- [ ] User with only drafts
- [ ] User with only published sites
- [ ] New user (just registered)
- [ ] User with deleted sites

### Admin Dashboard Edge Cases
- [ ] Platform with zero users
- [ ] Platform with zero sites
- [ ] No signups this month
- [ ] No payments received
- [ ] All users inactive

---

## 📱 **Device Testing**

### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile Devices
- [ ] iPhone (Safari)
- [ ] Android (Chrome)
- [ ] iPad (Safari)
- [ ] Android tablet (Chrome)

### Screen Sizes
- [ ] 320px (iPhone SE)
- [ ] 375px (iPhone 12)
- [ ] 768px (iPad)
- [ ] 1024px (Desktop)
- [ ] 1920px (Full HD)
- [ ] 2560px (4K)

---

## ✅ **Final Verification**

### Deployment Checklist
- [ ] All tests passing
- [ ] No console errors
- [ ] No linting errors
- [ ] Documentation complete
- [ ] Server stable
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Mobile tested
- [ ] Ready for production

---

## 📊 **Test Results Template**

```
Date: __________
Tester: __________
Environment: [Local/Staging/Production]

User Dashboard Tests: ___/7 Passed
Admin Dashboard Tests: ___/10 Passed
API Tests: ___/4 Passed
Visual Tests: ___/14 Passed
Performance Tests: ___/5 Passed
Security Tests: ___/10 Passed
Edge Cases: ___/10 Passed
Device Tests: ___/10 Passed

Overall: ___/70 Passed

Issues Found:
1. __________
2. __________

Status: [PASS/FAIL]
```

---

## 🎯 **Quick Smoke Test** (5 minutes)

Fastest way to verify everything works:

1. **User Test:**
   - Login → Click Analytics → See 6 cards → Back

2. **Admin Test:**
   - Login as admin → Click Admin → See metrics → Wait 60s for refresh

3. **API Test:**
   - Check console for no errors
   - Verify data loads

**If all 3 pass:** ✅ System working!

---

**Testing Guide Version:** 1.0.0  
**Last Updated:** October 31, 2025

Use this checklist to ensure your analytics dashboards are production-ready! 🚀

