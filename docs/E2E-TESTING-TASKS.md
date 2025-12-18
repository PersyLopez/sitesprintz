# E2E Testing Task List

## Overview
This document outlines all E2E tests that need to be verified, fixed, or updated. There are **39 test files** with approximately **150+ test cases**.

---

## 🔴 Priority 1: Infrastructure & Setup (Must Fix First)

### 1.1 Global Setup & Database Seeding
- [ ] **Verify `tests/setup/global-setup.js` runs successfully**
  - Check database connection works in test environment
  - Verify `seed-test-data.js` completes without errors
  - Ensure all required tables exist (booking_tenants, appointments, etc.)

- [ ] **Verify seed data script (`tests/setup/seed-test-data.js`)**
  - [ ] Test users created correctly (admin@example.com, test@example.com, free@example.com)
  - [ ] Test sites created and linked to users
  - [ ] Booking tenant, services, staff, availability rules created
  - [ ] Sample appointments created
  - [ ] Seed artifact JSON written to `tests/e2e/.seed/seed-data.json`

- [ ] **Environment configuration**
  - [ ] `.env.test` or test environment variables are set
  - [ ] `DATABASE_URL` points to test database (not production!)
  - [ ] `USE_MOCK_EMAIL=true` is set for email mocking
  - [ ] `JWT_SECRET` is set for authentication

### 1.2 Playwright Configuration (`playwright.config.js`)
- [ ] **Web server startup**
  - [ ] Verify `npm run build` completes successfully
  - [ ] Server starts on port 3000 within 120 seconds
  - [ ] `reuseExistingServer` works correctly in local dev

- [ ] **Browser configuration**
  - [ ] Chromium project works
  - [ ] Consider adding Firefox/WebKit for CI
  - [ ] Mobile viewports (optional for now)

---

## 🟠 Priority 2: Authentication Tests

### 2.1 `auth-flow.spec.js` (7 tests)
| Test | Status | Fix Needed |
|------|--------|------------|
| Display homepage with login button | 🔍 Check | Verify selector `a[href="/login.html"]` |
| Navigate to registration page | 🔍 Check | Verify selector and URL pattern |
| Show validation errors | 🔍 Check | Password strength validation added |
| Register new user | 🔍 Check | New password requirements (12+ chars) |
| Fail registration with existing email | 🔍 Check | API returns `USER_ALREADY_EXISTS` code |
| Login with valid credentials | 🔍 Check | Verify test user `test@example.com` exists |
| Fail login with invalid credentials | 🔍 Check | Verify error message selector |

**Tasks:**
- [ ] Update password in tests to meet new requirements: `StrictPwd!2024` (12+ chars, upper, lower, number, special)
- [ ] Update selectors if login/register pages changed
- [ ] Verify error message selectors match new API response format

### 2.2 `auth-csrf.spec.js` (12 tests)
| Test | Status | Fix Needed |
|------|--------|------------|
| Fetch CSRF token on page load | 🔍 Check | Verify `/api/csrf-token` endpoint |
| Register with CSRF | 🔍 Check | - |
| Login with CSRF | 🔍 Check | - |
| Include CSRF in POST | 🔍 Check | - |
| NOT include in GET | 🔍 Check | - |
| Token refresh on 403 | 🔍 Check | - |
| Persist across navigation | 🔍 Check | - |
| Template flow params | 🔍 Check | - |

**Tasks:**
- [ ] Verify CSRF middleware is active in test environment
- [ ] Check that `x-csrf-token` header is being sent

### 2.3 `password-reset.spec.js` (9 tests)
- [x] **Verify forgot password flow**
  - Updated selectors to use `data-testid` where possible
  - Fixed navigation interruption issues
- [x] **Verify reset password with token**
  - Handled CSRF token requirement in `reset-password.html`
  - Fixed password strength validation in tests
- [x] **Check email mock/bypass for reset token**
  - Integrated `X-Test-Bypass-CSRF` for API-driven reset requests
- [x] **Handle expired reset token**
  - Improved error message visibility detection in `reset-password.html`
- [x] **Login with new password after reset**
  - Ensured test users are automatically activated in non-production environments

### 2.4 `session-management.spec.js`
- [ ] Verify access token refresh
- [ ] Verify logout clears tokens
- [ ] Check session persistence across tabs

---

## 🟠 Priority 3: Site Management Tests

### 3.1 `site-creation.spec.js` (5 tests)
| Test | Status | Fix Needed |
|------|--------|------------|
| Display dashboard with create button | 🔍 Check | Selector for "Create New Site" |
| Show template selection | 🔍 Check | Template grid loads |
| Create a new site | 🔍 Check | Draft save API |
| Edit existing site | 🔍 Check | Load site by ID |
| Preview site | 🔍 Check | Preview iframe |
| Publish site | 🔍 Check | Publish API |

**Tasks:**
- [ ] Update template mock data if structure changed
- [ ] Verify `/api/drafts` POST endpoint works
- [ ] Check `businessName` input selector
- [ ] Verify "Save Draft" button selector

### 3.2 `site-management.spec.js`
- [ ] Site list display
- [ ] Site filtering/search
- [ ] Site deletion confirmation
- [ ] Site status toggling (draft/published)

### 3.3 `site-publishing.spec.js`
- [ ] Publish workflow
- [ ] Subdomain validation
- [ ] Published site accessibility

### 3.4 `site-products.spec.js`
- [ ] Product CRUD operations
- [ ] Product image upload
- [ ] Price formatting

### 3.5 `site-orders.spec.js`
- [ ] Order list display
- [ ] Order status updates
- [ ] Order details view

---

## 🟠 Priority 4: Booking System Tests

### 4.1 `booking-flow.spec.js`
- [ ] Public booking widget loads
- [ ] Service selection
- [ ] Date/time selection
- [ ] Customer info form
- [ ] Appointment confirmation

### 4.2 `booking-complete-flow.spec.js`
- [ ] End-to-end booking journey
- [ ] Confirmation code display
- [ ] Email confirmation (mocked)

### 4.3 `booking-admin-dashboard.spec.js` (20+ tests)
| Category | Tests | Status |
|----------|-------|--------|
| Dashboard Navigation | 1 | 🔍 Check |
| Service Management | 5 | 🔍 Check |
| Appointment Management | 6 | 🔍 Check |
| Availability Scheduling | 5 | 🔍 Check |
| Quick Actions | 3+ | 🔍 Check |

**Tasks:**
- [ ] Verify booking dashboard route exists
- [ ] Check service CRUD selectors
- [ ] Verify appointment list loads
- [ ] Test availability time slot UI

---

## 🟡 Priority 5: Payment & Checkout Tests

### 5.1 `payment-flow.spec.js`
- [ ] Stripe checkout initialization
- [ ] Payment form display
- [ ] Success/cancel redirects

### 5.2 `checkout-flow.spec.js`
- [ ] Shopping cart functionality
- [ ] Checkout button
- [ ] Order confirmation

### 5.3 `pricing-tier-access.spec.js`
- [ ] Free tier restrictions
- [ ] Pro tier features
- [ ] Upgrade prompts

---

## 🟡 Priority 6: Admin Tests

### 6.1 `admin-flow.spec.js` (15+ tests)
| Category | Tests |
|----------|-------|
| Dashboard access | 2 |
| User management | 4 |
| Site management | 2 |
| Template management | 1 |
| Permissions | 3 |
| Audit log | 1 |

**Tasks:**
- [ ] Login as admin@example.com
- [ ] Verify admin dashboard route
- [ ] Check user list loads
- [ ] Test user role update API

### 6.2 `admin-analytics.spec.js` (4 tests)
- [ ] Analytics dashboard display
- [ ] Growth metrics
- [ ] Subscription breakdown
- [ ] Tab switching

---

## 🟢 Priority 7: Feature Tests

### 7.1 OAuth Tests
- `google-oauth-flow.spec.js`
- `google-oauth-redirects.spec.js`
- `google-button-visibility.spec.js`
- `dashboard-oauth-token.spec.js`

**Tasks:**
- [ ] Mock Google OAuth endpoints
- [ ] Verify OAuth button visibility
- [ ] Test redirect flows

### 7.2 Showcase/Gallery Tests
- `showcase-feature.spec.js`
- `showcase-gallery.spec.js`

**Tasks:**
- [ ] Verify public site showcase
- [ ] Gallery filtering
- [ ] Site cards display

### 7.3 Form Tests
- `form-submissions.spec.js`
- `contact-form-email.spec.js`

### 7.4 SEO Tests
- `seo-features.spec.js`

### 7.5 Image Upload Tests
- `image-upload.spec.js`

### 7.6 Reviews Tests
- `reviews-integration.spec.js`

### 7.7 Share Tests
- `share-card-generation.spec.js`

### 7.8 Foundation/Settings Tests
- `foundation-settings.spec.js`

---

## 🟢 Priority 8: Infrastructure & Health Tests

### 8.1 Health Checks
- `database-health.spec.js` - Database connectivity
- `infrastructure-health.spec.js` - Server health

### 8.2 Performance
- `performance.spec.js` - Page load times

### 8.3 Security
- `cookie-samesite.spec.js` - Cookie security
- `api-type-safety.spec.js` - Input validation

### 8.4 Responsiveness
- `mobile-responsiveness.spec.js` - Mobile layouts

### 8.5 Self-Healing
- `self-healing.spec.js` - Recovery mechanisms

---

## 📋 Test Execution Checklist

### Before Running Tests
- [ ] Database is accessible and seeded
- [ ] Server can build successfully (`npm run build`)
- [ ] All environment variables set
- [ ] No other process on port 3000

### Run Specific Test File
```bash
npx playwright test tests/e2e/auth-flow.spec.js
```

### Run All Tests
```bash
npx playwright test
```

### Run with UI
```bash
npx playwright test --ui
```

### Debug Mode
```bash
npx playwright test --debug
```

### Generate Report
```bash
npx playwright show-report
```

---

## 🔧 Common Fixes Reference

### Fix: Selector Not Found
```javascript
// Before (brittle)
await page.click('button.primary');

// After (robust)
await page.click('button:has-text("Submit")');
await page.getByRole('button', { name: 'Submit' }).click();
```

### Fix: Timing Issues
```javascript
// Before
await page.click('button');
await expect(page.locator('.result')).toBeVisible();

// After
await page.click('button');
await expect(page.locator('.result')).toBeVisible({ timeout: 10000 });
```

### Fix: API Response Changed
```javascript
// Before
expect(response.body.token).toBeDefined();

// After (new token format)
expect(response.body.accessToken).toBeDefined();
expect(response.body.refreshToken).toBeDefined();
```

### Fix: Network Race Conditions
```javascript
// Before
await page.click('button');
const data = await response.json();

// After
const [response] = await Promise.all([
  page.waitForResponse(r => r.url().includes('/api/endpoint')),
  page.click('button')
]);
```

---

## 📊 Test Coverage Goals

| Category | Target | Current |
|----------|--------|---------|
| Authentication | 100% | TBD |
| Site Management | 90% | TBD |
| Booking System | 90% | TBD |
| Payments | 80% | TBD |
| Admin | 80% | TBD |
| Features | 70% | TBD |

---

## 🚀 Recommended Fix Order

1. **Week 1: Infrastructure**
   - Fix global setup and seeding
   - Verify server starts correctly
   - Run and fix `auth-flow.spec.js`

2. **Week 2: Core Flows**
   - [x] Stabilize `password-reset.spec.js` (9/9 pass)
   - [ ] Fix `site-creation.spec.js`
   - [ ] Fix `booking-flow.spec.js`
   - [ ] Fix `admin-flow.spec.js`

3. **Week 3: Payments & Pro**
   - Fix `payment-flow.spec.js`
   - Fix `checkout-flow.spec.js`
   - Fix `pricing-tier-access.spec.js`

4. **Week 4: Polish**
   - Fix remaining feature tests
   - Add missing test cases
   - CI/CD integration

---

*Last Updated: December 2024*






