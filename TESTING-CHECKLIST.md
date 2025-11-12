# SiteSprintz React Migration - Testing Checklist

## ✅ Pre-Deployment Checklist

### Build Status
- [x] Production build completed successfully
- [x] Build size: ~270KB JS, ~30KB CSS (gzipped: 83KB + 5.8KB)
- [x] All assets bundled correctly
- [x] Source maps generated

### Server Configuration
- [x] SPA fallback routing added to server.js
- [x] Static file serving configured
- [x] API routes preserved
- [x] Published sites routes preserved
- [x] Upload routes preserved

### Backup Confirmation
- [x] Filesystem backup: ../sitesprintz-backup-20251105-1313/
- [x] Git backup branch: backup-pre-react-refactor
- [x] Git tag: backup-20251105
- [x] Old HTML files archived: public/old/

## 🧪 Manual Testing Guide

### 1. Landing Page (/)
- [ ] Visit http://localhost:3000/
- [ ] Check hero section displays correctly
- [ ] Verify "Get Started" button works
- [ ] Check "View Templates" button
- [ ] Test mobile responsive design
- [ ] Verify animations work
- [ ] Check footer links

### 2. Authentication Flow

#### Registration
- [ ] Visit /register
- [ ] Try registering with invalid email (should show error)
- [ ] Try mismatched passwords (should show error)
- [ ] Register with valid credentials
- [ ] Verify toast notification appears
- [ ] Check redirect to dashboard

#### Login
- [ ] Visit /login
- [ ] Try invalid credentials (should show error)
- [ ] Login with valid credentials
- [ ] Verify toast notification
- [ ] Check redirect to dashboard
- [ ] Test "Forgot Password" link

#### Google OAuth
- [ ] Click "Continue with Google" button
- [ ] Verify redirect to Google (if configured)

### 3. Dashboard (/dashboard)

#### Initial Visit
- [ ] First-time users see welcome modal
- [ ] Modal explains 3-step process
- [ ] "Create Your First Site" button works
- [ ] Modal can be dismissed

#### Site Management
- [ ] View existing sites in grid
- [ ] Check site cards show correct info
- [ ] View site (if published)
- [ ] Edit site button works
- [ ] Delete site shows confirmation
- [ ] Stats display correctly (Total, Published, Drafts)

#### Create New Site
- [ ] Click "Create New Site" button
- [ ] Redirects to /setup

### 4. Site Builder (/setup)

#### Template Selection
- [ ] Templates load correctly
- [ ] Grouped by tier (Pro, Checkout, Starter)
- [ ] Can select a template
- [ ] Selected template highlighted
- [ ] Preview image/icon visible

#### Editor Panel
- [ ] Business Info tab:
  - [ ] Business name field
  - [ ] Hero title field
  - [ ] Hero subtitle textarea
  - [ ] Hero image URL field
  - [ ] All fields update

- [ ] Services tab:
  - [ ] "Add Service" button works
  - [ ] Service name field
  - [ ] Service description textarea
  - [ ] Service price field
  - [ ] Delete service works
  - [ ] Multiple services can be added

- [ ] Contact tab:
  - [ ] Email field
  - [ ] Phone field
  - [ ] Address textarea
  - [ ] Business hours textarea
  - [ ] Social media URLs

- [ ] Colors tab:
  - [ ] Primary color picker
  - [ ] Secondary color picker
  - [ ] Color hex input works
  - [ ] Colors update preview

#### Live Preview
- [ ] Preview loads in iframe
- [ ] Changes reflect immediately
- [ ] Business name updates
- [ ] Services display correctly
- [ ] Contact info shows
- [ ] Colors apply correctly

#### Save & Publish
- [ ] "Save Draft" button works
- [ ] Toast confirmation appears
- [ ] Last saved time updates
- [ ] Auto-save works (wait 30 seconds)
- [ ] "Publish" button opens modal

### 5. Publish Modal

#### Subdomain Input
- [ ] Can enter subdomain
- [ ] Only accepts letters, numbers, hyphens
- [ ] Shows full URL (subdomain.sitesprintz.com)
- [ ] Error if empty

#### Plan Selection
- [ ] Three plans display (Starter, Checkout, Premium)
- [ ] Can select each plan
- [ ] Selected plan highlighted
- [ ] Features list correct
- [ ] Starter shows "Free"

#### Publishing
- [ ] "Publish Site" button works
- [ ] Loading state shows
- [ ] Toast confirmation
- [ ] Redirects to dashboard
- [ ] New site appears in dashboard

### 6. Navigation & Routing

#### Public Routes (Not Logged In)
- [ ] / (landing) - accessible
- [ ] /login - accessible
- [ ] /register - accessible
- [ ] /dashboard - redirects to /login
- [ ] /setup - redirects to /login

#### Protected Routes (Logged In)
- [ ] /dashboard - accessible
- [ ] /setup - accessible
- [ ] / - accessible (shows logout)
- [ ] /login - should redirect to dashboard (already logged in)

#### Browser Navigation
- [ ] Back button works
- [ ] Forward button works
- [ ] Refresh preserves state (if logged in)
- [ ] Direct URL navigation works
- [ ] 404 page for invalid routes

### 7. Responsive Design

#### Desktop (>1024px)
- [ ] 3-panel layout in setup
- [ ] All content visible
- [ ] No horizontal scroll

#### Tablet (768px-1024px)
- [ ] Tabs instead of panels
- [ ] Layout adapts
- [ ] No content cut off

#### Mobile (<768px)
- [ ] Single column layout
- [ ] Buttons full width
- [ ] Text readable
- [ ] No horizontal scroll
- [ ] Touch targets adequate

### 8. Performance

#### Load Times
- [ ] Landing page loads <2s
- [ ] Dashboard loads <3s
- [ ] Setup page loads <3s
- [ ] Navigation instant (<100ms)

#### Interactions
- [ ] Button clicks responsive
- [ ] Form inputs smooth
- [ ] Animations don't lag
- [ ] No console errors

### 9. Backend Compatibility

#### API Endpoints (Unchanged)
- [ ] POST /api/auth/login works
- [ ] POST /api/auth/register works
- [ ] GET /api/auth/me works
- [ ] POST /api/drafts works
- [ ] GET /api/drafts/:id works
- [ ] POST /api/drafts/:id/publish works

#### Published Sites
- [ ] Visit existing published site
- [ ] Site renders correctly (vanilla JS)
- [ ] No impact from React refactor
- [ ] /sites/* routes still work

#### Static Assets
- [ ] /uploads/* images load
- [ ] /data/templates/*.json load
- [ ] /assets/* files load

### 10. Error Handling

#### Network Errors
- [ ] API failure shows error toast
- [ ] Loading states clear
- [ ] User can retry

#### Validation Errors
- [ ] Form validation works
- [ ] Error messages clear
- [ ] Prevents invalid submission

#### Auth Errors
- [ ] 401 redirects to login
- [ ] Invalid token handled
- [ ] Expired session handled

## 🚀 Deployment Steps

### 1. Final Build
```bash
npm run build
```

### 2. Test Production Build
```bash
npm run preview
# Visit http://localhost:4173
# Test all functionality
```

### 3. Start Production Server
```bash
npm start
# Server serves React from /dist automatically
```

### 4. Verify Live
- [ ] Visit http://localhost:3000
- [ ] Test complete user flow
- [ ] Check browser console for errors
- [ ] Test on multiple browsers

### 5. Monitor
- [ ] Check server logs
- [ ] Monitor for errors
- [ ] Verify performance
- [ ] Check database connections

## 📝 Post-Deployment

### Documentation
- [x] REACT-REFACTOR-COMPLETE.md created
- [x] REACT-REFACTOR-PROGRESS.md updated
- [ ] README.md updated with new instructions
- [ ] Team notified of changes

### Cleanup (Optional)
- [ ] Remove old HTML files from public/ (after 1 week)
- [ ] Remove backup files (after confirmed stable)
- [ ] Clean up unused dependencies
- [ ] Update .gitignore if needed

## 🆘 Rollback Procedure

### Option 1: Git Rollback
```bash
git checkout backup-pre-react-refactor
npm install
npm start
```

### Option 2: Filesystem Restore
```bash
rm -rf *
cp -r ../sitesprintz-backup-YYYYMMDD-HHMM/* .
npm install
npm start
```

### Option 3: Restore Old Files
```bash
cp public/old/*.backup public/
# Edit server.js to remove SPA routing
npm start
```

## ✅ Sign-Off

- [ ] All critical tests passed
- [ ] Performance acceptable
- [ ] No blocking bugs
- [ ] Team approved
- [ ] Ready for production

**Tested By**: _________________
**Date**: _________________
**Approved**: _________________

---

## Notes

- React app runs on port 5173 in development
- Backend API on port 3000 (unchanged)
- Production build served from /dist by Express
- All original functionality preserved
- Published sites unaffected
