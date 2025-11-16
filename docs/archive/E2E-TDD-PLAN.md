# 🎯 E2E Test-Driven Development Plan

## Goal
Write E2E tests following strict TDD (RED-GREEN-REFACTOR) to prevent production issues from recurring.

---

## 🔴 Phase 1: RED - Write Failing Tests

### Test Suite 1: Complete User Registration Journey
**File:** `tests/e2e/user-registration.spec.js`

**User Story:** As a new visitor, I want to register an account so I can create websites.

**Test Cases:**
1. ✅ Should load registration page without errors
2. ✅ Should display registration form with all fields
3. ✅ Should validate email format
4. ✅ Should validate password requirements
5. ✅ Should not have CORS errors during registration
6. ✅ Should handle CSRF token correctly
7. ✅ Should connect to database successfully
8. ✅ Should create user in database
9. ✅ Should redirect to dashboard after registration
10. ✅ Should display user's dashboard with correct data

**Expected Failures:**
- Tests will fail because E2E infrastructure doesn't exist yet
- Will identify gaps in current implementation

---

### Test Suite 2: Complete User Login Journey
**File:** `tests/e2e/user-login.spec.js`

**User Story:** As a registered user, I want to login so I can manage my sites.

**Test Cases:**
1. ✅ Should load login page without errors
2. ✅ Should display login form
3. ✅ Should reject invalid credentials
4. ✅ Should accept valid credentials
5. ✅ Should set authentication cookie/token
6. ✅ Should redirect to dashboard
7. ✅ Should load user's sites (no 403)
8. ✅ Should display correct user info
9. ✅ Should persist session on page reload
10. ✅ Should allow logout

**Addresses Issues:**
- Issue #5: Type mismatch in userId (403 errors)
- Issue #1: CORS with credentials
- Issue #2: CSRF protection

---

### Test Suite 3: Complete Google OAuth Journey
**File:** `tests/e2e/google-oauth.spec.js`

**User Story:** As a user, I want to login with Google for convenience.

**Test Cases:**
1. ✅ Should show "Sign in with Google" button
2. ✅ Should redirect to Google OAuth page
3. ✅ Should handle OAuth callback
4. ✅ Should create user if first-time
5. ✅ Should login existing Google user
6. ✅ Should redirect to dashboard
7. ✅ Should have authenticated session

**Note:** Will mock Google OAuth in tests

---

### Test Suite 4: Complete Site Creation Journey
**File:** `tests/e2e/site-creation.spec.js`

**User Story:** As a logged-in user, I want to create a new website.

**Test Cases:**
1. ✅ Should show "Create Site" button on dashboard
2. ✅ Should open site creation modal/page
3. ✅ Should display template selection
4. ✅ Should validate subdomain uniqueness
5. ✅ Should create site in database
6. ✅ Should redirect to site editor
7. ✅ Should load site data correctly
8. ✅ Should display new site on dashboard
9. ✅ Should allow user to access only their sites (403 test)

**Addresses Issues:**
- Issue #3: Database connection
- Issue #4: Database tables exist
- Issue #5: Authorization type mismatch

---

### Test Suite 5: Complete Site Editing Journey
**File:** `tests/e2e/site-editing.spec.js`

**User Story:** As a user, I want to edit my website content.

**Test Cases:**
1. ✅ Should load visual editor without errors
2. ✅ Should display site preview
3. ✅ Should allow text editing
4. ✅ Should allow image uploads
5. ✅ Should save changes to database
6. ✅ Should persist changes on reload
7. ✅ Should show save confirmation
8. ✅ Should handle unsaved changes warning

---

### Test Suite 6: Complete Site Publishing Journey
**File:** `tests/e2e/site-publishing.spec.js`

**User Story:** As a user, I want to publish my site so it's live.

**Test Cases:**
1. ✅ Should show "Publish" button
2. ✅ Should validate site before publishing
3. ✅ Should publish site to subdomain
4. ✅ Should update site status in database
5. ✅ Should display public URL
6. ✅ Should load published site without login
7. ✅ Should show all site content correctly
8. ✅ Should handle unpublishing

---

### Test Suite 7: Complete Payment/Checkout Journey
**File:** `tests/e2e/payment-checkout.spec.js`

**User Story:** As a user, I want to upgrade my plan.

**Test Cases:**
1. ✅ Should display pricing tiers
2. ✅ Should show correct prices ($15/$45/$100)
3. ✅ Should require authentication for purchase
4. ✅ Should redirect to Stripe Checkout
5. ✅ Should handle successful payment
6. ✅ Should update subscription in database
7. ✅ Should unlock plan features
8. ✅ Should display upgraded plan on dashboard

**Addresses Issues:**
- Issue #6: Missing API endpoints (stripe/status)

---

### Test Suite 8: Complete Form Submission Journey
**File:** `tests/e2e/form-submission.spec.js`

**User Story:** As a site visitor, I want to submit a contact form.

**Test Cases:**
1. ✅ Should display contact form on published site
2. ✅ Should validate required fields
3. ✅ Should submit form without login
4. ✅ Should save submission to database
5. ✅ Should send email notification
6. ✅ Should show success message
7. ✅ Should display submissions in dashboard
8. ✅ Should allow site owner to view submissions

---

### Test Suite 9: Network & Security Journey
**File:** `tests/e2e/network-security.spec.js`

**User Story:** As a user, the app should be secure and reliable.

**Test Cases:**
1. ✅ Should not have CORS errors anywhere
2. ✅ Should handle CSRF tokens correctly
3. ✅ Should require authentication for protected routes
4. ✅ Should reject expired sessions
5. ✅ Should rate limit requests appropriately
6. ✅ Should sanitize user inputs
7. ✅ Should prevent XSS attacks
8. ✅ Should prevent SQL injection

**Addresses Issues:**
- Issue #1: CORS misconfiguration
- Issue #2: CSRF without cookie-parser

---

### Test Suite 10: Database & Infrastructure Journey
**File:** `tests/e2e/database-infrastructure.spec.js`

**User Story:** As a developer, the infrastructure should be reliable.

**Test Cases:**
1. ✅ Should connect to database on startup
2. ✅ Should verify all tables exist
3. ✅ Should handle database connection loss
4. ✅ Should retry failed queries
5. ✅ Should log errors properly
6. ✅ Should not have 404 errors on critical endpoints
7. ✅ Should serve static assets correctly
8. ✅ Should handle concurrent requests

**Addresses Issues:**
- Issue #3: Database not running
- Issue #4: Missing tables
- Issue #6: 404 errors

---

## 📊 TDD Test Summary

**Total Test Suites:** 10  
**Total Test Cases:** 80  
**Estimated Time:** 3 days (full TDD cycle)

### Coverage by Issue:
- ✅ Issue #1 (CORS): 12 tests
- ✅ Issue #2 (CSRF): 8 tests
- ✅ Issue #3 (Database): 6 tests
- ✅ Issue #4 (Tables): 5 tests
- ✅ Issue #5 (Auth): 15 tests
- ✅ Issue #6 (404s): 8 tests
- ✅ New Coverage: 26 tests

---

## 🛠️ Implementation Plan

### Day 1: Setup & Critical Flows (RED Phase)
**Morning:**
1. ✅ Install Playwright ✓ DONE
2. Create Playwright config
3. Create test helpers (login, register, cleanup)
4. Write Test Suite 1: Registration (10 tests) - Watch them FAIL

**Afternoon:**
5. Write Test Suite 2: Login (10 tests) - Watch them FAIL
6. Write Test Suite 3: Google OAuth (7 tests) - Watch them FAIL
7. Document all failures

**Evening:**
8. Start GREEN phase: Fix failures one by one
9. Goal: All registration tests passing

---

### Day 2: Features & Security (RED → GREEN)
**Morning:**
1. Write Test Suite 4: Site Creation (9 tests) - RED
2. Write Test Suite 5: Site Editing (8 tests) - RED
3. Fix failures - GREEN

**Afternoon:**
4. Write Test Suite 6: Publishing (8 tests) - RED
5. Write Test Suite 7: Payments (8 tests) - RED
6. Fix failures - GREEN

**Evening:**
7. Write Test Suite 8: Forms (8 tests) - RED
8. Write Test Suite 9: Security (8 tests) - RED
9. Fix critical security issues - GREEN

---

### Day 3: Infrastructure & Polish (GREEN → REFACTOR)
**Morning:**
1. Write Test Suite 10: Infrastructure (8 tests) - RED
2. Fix all remaining failures - GREEN
3. Achieve 100% pass rate

**Afternoon:**
4. REFACTOR: Improve test helpers
5. REFACTOR: Add test utilities
6. REFACTOR: Optimize test speed

**Evening:**
7. Add E2E tests to CI/CD
8. Document test coverage
9. Update PRODUCTION-ISSUES-TRACKER.md

---

## 🎯 Success Criteria

### ✅ After Day 1:
- [ ] 27 E2E tests written (Registration, Login, OAuth)
- [ ] All registration/login flows working
- [ ] No more 403 errors
- [ ] No more CORS errors

### ✅ After Day 2:
- [ ] 68 E2E tests written (all features)
- [ ] Complete user journey works end-to-end
- [ ] All identified issues fixed

### ✅ After Day 3:
- [ ] 80 E2E tests written
- [ ] 100% pass rate
- [ ] CI/CD integration complete
- [ ] Never debug these issues again!

---

## 📁 File Structure

```
tests/
├── e2e/
│   ├── user-registration.spec.js    (10 tests)
│   ├── user-login.spec.js           (10 tests)
│   ├── google-oauth.spec.js         (7 tests)
│   ├── site-creation.spec.js        (9 tests)
│   ├── site-editing.spec.js         (8 tests)
│   ├── site-publishing.spec.js      (8 tests)
│   ├── payment-checkout.spec.js     (8 tests)
│   ├── form-submission.spec.js      (8 tests)
│   ├── network-security.spec.js     (8 tests)
│   └── database-infrastructure.spec.js (8 tests)
├── helpers/
│   ├── auth-helpers.js              (login, register, logout)
│   ├── site-helpers.js              (create, edit, publish)
│   ├── db-helpers.js                (cleanup, seed)
│   └── test-data.js                 (mock data)
└── playwright.config.js
```

---

## 🔧 Playwright Configuration

**File:** `playwright.config.js`

```javascript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Run sequentially for TDD
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for TDD
  reporter: [
    ['html'],
    ['list'],
    ['json', { outputFile: 'test-results/e2e-results.json' }]
  ],
  
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'node server.js',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
```

---

## 🎓 TDD Principles for E2E

### 1. RED Phase
- Write test that describes desired behavior
- Test MUST fail initially
- Document why it fails
- This validates the test is actually testing something

### 2. GREEN Phase
- Write minimal code to make test pass
- Don't optimize yet
- Just make it work
- Confirm test passes

### 3. REFACTOR Phase
- Improve code quality
- Optimize performance
- Add error handling
- Keep tests passing

### 4. Repeat
- One test at a time
- See it fail, make it pass
- Build confidence with each cycle

---

## 📝 Next Steps

1. **Start RED Phase:**
   - Create `playwright.config.js`
   - Create test helpers
   - Write first failing test
   - Watch it fail
   - Document failure

2. **Continue TDD Cycle:**
   - Fix one test at a time
   - Commit after each GREEN
   - Refactor when multiple tests pass

3. **Track Progress:**
   - Update PRODUCTION-ISSUES-TRACKER.md
   - Mark tests as passing
   - Document learnings

---

**Let's start with RED Phase: First failing test!** 🔴

Ready to write the first test suite?

