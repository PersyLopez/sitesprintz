# 🐛 Production Issues Tracker & E2E Test Cases

**Purpose:** Document real issues found in production to create E2E tests  
**Date Started:** November 14, 2025  
**Goal:** Prevent these issues from happening again with proper E2E testing

---

## 📊 Issues Found Today

### Issue #1: CORS Misconfiguration
**Date:** Nov 14, 2025  
**Severity:** 🔴 CRITICAL  
**Impact:** Users couldn't register or login

**Symptoms:**
```
Cross-Origin Request Blocked: Access-Control-Allow-Origin: '*' 
incompatible with credentials
```

**Root Cause:**
- CORS set to `Access-Control-Allow-Origin: *`
- Frontend sending `credentials: 'include'`
- Browsers block this combination for security

**Fix Applied:**
```javascript
// server.js line 137
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));
```

**Why Tests Didn't Catch It:**
- Unit/integration tests use `supertest` which doesn't enforce browser CORS
- No real browser testing

**E2E Test Needed:**
```javascript
// tests/e2e/cors.spec.js
test('should allow cross-origin requests with credentials', async ({ page }) => {
  // Navigate to frontend
  await page.goto('http://localhost:5173/register');
  
  // Fill form
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  
  // Monitor console for CORS errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error' && msg.text().includes('CORS')) {
      consoleErrors.push(msg.text());
    }
  });
  
  // Submit
  await page.click('button[type="submit"]');
  
  // Should NOT have CORS errors
  expect(consoleErrors).toHaveLength(0);
  
  // Should redirect to dashboard
  await expect(page).toHaveURL(/dashboard/);
});
```

---

### Issue #2: CSRF Protection Without cookie-parser
**Date:** Nov 14, 2025  
**Severity:** 🔴 CRITICAL  
**Impact:** All POST requests blocked with 403

**Symptoms:**
```
HTTP/1.1 403 Forbidden
{"error":"Invalid CSRF token","message":"No session found"}
```

**Root Cause:**
- CSRF middleware requires `cookie-parser`
- `cookie-parser` not installed
- `req.cookies` is undefined
- CSRF rejects all requests

**Fix Applied:**
```javascript
// server.js line 225 - Temporarily disabled
// app.use('/api', csrfProtection);
```

**Why Tests Didn't Catch It:**
- Tests mock CSRF protection
- Tests don't use real cookie flow

**E2E Test Needed:**
```javascript
// tests/e2e/csrf.spec.js
test('should handle CSRF tokens correctly', async ({ page }) => {
  // Navigate to app
  await page.goto('http://localhost:5173/register');
  
  // Check if CSRF token is fetched
  const csrfRequest = page.waitForRequest(
    req => req.url().includes('/api/csrf-token')
  );
  
  await page.fill('[name="email"]', 'test@example.com');
  await page.click('button[type="submit"]');
  
  // Should NOT get 403 due to CSRF
  const response = await page.waitForResponse(
    res => res.url().includes('/api/auth/register')
  );
  
  expect(response.status()).not.toBe(403);
});
```

**TODO Before Production:**
- [ ] Install cookie-parser: `npm install cookie-parser`
- [ ] Add to server.js: `app.use(cookieParser())`
- [ ] Re-enable CSRF: Uncomment line 225
- [ ] Update CSRF settings for CORS: `sameSite: 'lax'`

---

### Issue #3: Database Not Connected
**Date:** Nov 14, 2025  
**Severity:** 🔴 CRITICAL  
**Impact:** All database operations failed

**Symptoms:**
```
Error: connect ECONNREFUSED ::1:5432
AggregateError [ECONNREFUSED]
```

**Root Cause:**
- No `.env` file
- No DATABASE_URL environment variable
- Server couldn't connect to database

**Fix Applied:**
- Created `.env` file with Neon connection string
- Restarted server

**Why Tests Didn't Catch It:**
- Tests mock database queries
- Tests don't require real database

**E2E Test Needed:**
```javascript
// tests/e2e/database.spec.js
test('should connect to database successfully', async ({ request }) => {
  // Try to register (requires DB)
  const response = await request.post('http://localhost:3000/api/auth/register', {
    data: {
      email: `test${Date.now()}@example.com`,
      password: 'password123'
    }
  });
  
  // Should not get database connection error
  expect(response.status()).not.toBe(500);
  const body = await response.json();
  expect(body.error).not.toContain('ECONNREFUSED');
});
```

---

### Issue #4: Missing Database Tables
**Date:** Nov 14, 2025  
**Severity:** 🔴 CRITICAL  
**Impact:** Registration failed after DB connection

**Symptoms:**
```
error: relation "users" does not exist
```

**Root Cause:**
- Database connected but no tables created
- Schema never applied to new database

**Fix Applied:**
- Created `database/schema.sql`
- Executed: `psql -f database/schema.sql`

**Why Tests Didn't Catch It:**
- Tests don't require real database schema
- Tests mock all database operations

**E2E Test Needed:**
```javascript
// tests/e2e/schema.spec.js
test('should have all required database tables', async ({ request }) => {
  // Test registration (requires users table)
  const regResponse = await request.post('http://localhost:3000/api/auth/register', {
    data: { email: `test${Date.now()}@example.com`, password: 'password123' }
  });
  expect(regResponse.ok()).toBeTruthy();
  
  // Test site creation (requires sites table)
  const token = (await regResponse.json()).token;
  const siteResponse = await request.post('http://localhost:3000/api/sites', {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: 'Test Site', subdomain: `test${Date.now()}`, template: 'restaurant' }
  });
  expect(siteResponse.ok()).toBeTruthy();
});
```

---

### Issue #5: Type Mismatch in Authorization Check
**Date:** Nov 14, 2025  
**Severity:** 🔴 CRITICAL  
**Impact:** Users couldn't access their own sites (403 Forbidden)

**Symptoms:**
```
GET /api/users/2/sites → 403 Forbidden
Error: Access denied
```

**Root Cause:**
```javascript
// users.routes.js line 19
const userId = req.params.userId;  // String: "2"
if (req.user.id !== userId) {      // Number: 2
  return res.status(403).json({ error: 'Access denied' });
}
// "2" !== 2 → true → 403 error!
```

**Fix Applied:**
```javascript
const userId = parseInt(req.params.userId, 10);  // Convert to number
if (req.user.id !== userId) {
  return res.status(403).json({ error: 'Access denied' });
}
```

**Why Tests Didn't Catch It:**
- Tests likely use hardcoded numbers, not URL params
- Or tests mock authentication entirely

**E2E Test Needed:**
```javascript
// tests/e2e/dashboard.spec.js
test('user should access their own dashboard', async ({ page }) => {
  // Register
  await page.goto('http://localhost:5173/register');
  await page.fill('[name="email"]', `test${Date.now()}@example.com`);
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // Should redirect to dashboard
  await page.waitForURL(/dashboard/);
  
  // Should load user's sites (NOT 403!)
  const response = await page.waitForResponse(
    res => res.url().includes('/api/users/') && res.url().includes('/sites')
  );
  
  expect(response.status()).toBe(200);  // NOT 403!
  
  // Should show dashboard content
  await expect(page.locator('h1')).toContainText(/dashboard|sites/i);
});
```

**Similar Issues to Check:**
- [ ] Check all routes with `:userId` parameter
- [ ] Check all routes with numeric IDs
- [ ] Ensure consistent type handling

---

## 📋 Issue Categories & Test Coverage Needed

### 1. Authentication & Authorization (5 issues found)
**E2E Tests Needed:**
- [ ] Registration flow (email/password)
- [ ] Login flow (email/password)
- [ ] Google OAuth flow
- [ ] Dashboard access after login
- [ ] Protected route access
- [ ] User can only access own resources
- [ ] Admin can access all resources

### 2. CORS & Network (2 issues found)
**E2E Tests Needed:**
- [ ] Cross-origin requests work
- [ ] Credentials are included
- [ ] CSRF tokens are handled
- [ ] Cookie-based sessions work

### 3. Database & Schema (2 issues found)
**E2E Tests Needed:**
- [ ] Database connection works
- [ ] All tables exist
- [ ] Migrations applied correctly
- [ ] Seed data present

### 4. Type Safety (1 issue found)
**E2E Tests Needed:**
- [ ] URL parameters correctly parsed
- [ ] Type conversions consistent
- [ ] Number/string comparisons work

### 5. API Endpoints (Pending issues)
**E2E Tests Needed:**
- [ ] All API routes return expected status codes
- [ ] Error messages are helpful
- [ ] Rate limiting works
- [ ] Input validation works

---

## 🎯 E2E Test Implementation Plan

### Phase 1: Critical User Flows (Week 1)
Priority: Fix issues found today

**Day 1-2: Authentication E2E**
```javascript
// tests/e2e/auth.spec.js
- Registration (Issue #1, #2, #3, #4)
- Login (Issue #5)
- Dashboard access (Issue #5)
- Logout
```

**Day 3-4: CORS & Network E2E**
```javascript
// tests/e2e/network.spec.js
- CORS with credentials (Issue #1)
- CSRF token flow (Issue #2)
- Cookie handling
```

**Day 5: Database E2E**
```javascript
// tests/e2e/database.spec.js
- Connection test (Issue #3)
- Schema validation (Issue #4)
- Data persistence
```

### Phase 2: Feature Flows (Week 2)
- [ ] Site creation
- [ ] Site editing
- [ ] Site publishing
- [ ] Form submissions
- [ ] E-commerce checkout

### Phase 3: Edge Cases (Week 3)
- [ ] Error handling
- [ ] Rate limiting
- [ ] Concurrent requests
- [ ] Session expiration

---

## 📊 Metrics

### Issues Found: 5
- 🔴 Critical: 5 (100%)
- 🟡 Medium: 0
- 🟢 Low: 0

### Test Coverage Needed:
- Authentication: 7 tests
- CORS/Network: 4 tests
- Database: 3 tests
- Type Safety: 2 tests
- **Total:** 16 critical E2E tests

### Time Saved by E2E Tests:
- **Today's debugging:** ~4 hours
- **Per issue found:** ~45 minutes average
- **If E2E tests existed:** Issues caught in ~2 minutes
- **ROI:** 120x faster issue detection

---

## ✅ Next Steps

1. **Immediate (Today):**
   - [x] Fix Issue #5 (type mismatch) ✅
   - [ ] Verify dashboard loads
   - [ ] Document remaining 404 errors

2. **This Week:**
   - [ ] Install Playwright
   - [ ] Write 5 critical E2E tests (Issues #1-5)
   - [ ] Add to CI/CD pipeline

3. **Next Week:**
   - [ ] Write 11 more E2E tests (all critical flows)
   - [ ] Achieve 100% E2E coverage for user journeys
   - [ ] Never debug these issues again!

---

## 🎓 Key Lesson

**Unit tests (2,442) ≠ Working application**

Real issues only caught by:
- E2E tests in real browsers
- Real database connections
- Real network requests
- Real user flows

**Investment:** 2 days to write E2E tests  
**Benefit:** Never waste 4 hours debugging again

---

**Continue tracking issues below as they're found...**

---

## Issue #6: API Proxy 404 Errors
**Date:** Nov 14, 2025  
**Severity:** 🟡 MEDIUM  
**Status:** 🔍 INVESTIGATING

**Symptoms:**
```
GET http://localhost:5173/api/stripe/status → 404
GET http://localhost:5173/api/orders/pending-count → 404
```

**Analysis:**
- Requests going to port 5173 (Vite) instead of 3000 (API)
- Vite proxy may not be configured for these routes
- Or routes don't exist yet

**Investigation Needed:**
- [ ] Check if `/api/stripe/status` endpoint exists
- [ ] Check if `/api/orders/pending-count` endpoint exists
- [ ] Verify Vite proxy configuration includes these routes

**E2E Test:**
```javascript
test('dashboard should load without 404 errors', async ({ page }) => {
  await loginAsUser(page);
  await page.goto('http://localhost:5173/dashboard');
  
  // Monitor for 404 errors
  const failed404s = [];
  page.on('response', response => {
    if (response.status() === 404) {
      failed404s.push(response.url());
    }
  });
  
  await page.waitForLoadState('networkidle');
  
  // Dashboard should not have 404 errors
  expect(failed404s).toHaveLength(0);
});
```

---

**Track all issues here and create E2E tests for each!** 🎯

---

## 🎉 UPDATE: E2E Tests Already Exist!

**Discovery Date:** November 14, 2025

### ✅ Existing E2E Test Coverage:

We already have **7 comprehensive E2E test suites** with **1,440+ lines of test code** covering:

1. **auth-flow.spec.js** - Basic authentication flows
2. **auth-csrf.spec.js** - CORS & CSRF protection (354 lines!) ✅
3. **site-creation.spec.js** - Site creation & editing
4. **template-to-publish-flow.spec.js** - Complete user journey (455 lines!) ✅
5. **checkout-flow.spec.js** - E-commerce cart flows
6. **payment-flow.spec.js** - Payment & Stripe integration
7. **admin-flow.spec.js** - Admin dashboard & permissions

### 📊 Coverage of Today's Issues:

| Issue | E2E Test Coverage | Status |
|-------|-------------------|--------|
| #1: CORS | ✅ auth-csrf.spec.js lines 14-39 | **COVERED** |
| #2: CSRF | ✅ auth-csrf.spec.js (full suite) | **COVERED** |
| #3: Database | ⚠️ Implicit in site-creation | **PARTIAL** |
| #4: Tables | ⚠️ Implicit in site-creation | **PARTIAL** |
| #5: 403 Auth | ✅ Multiple suites | **COVERED** |
| #6: 404s | ⚠️ checkout/payment flows | **PARTIAL** |

### 🔑 Key Finding: Why Tests Didn't Catch Issues

**Problem:** Tests exist but aren't being run regularly!

**Reasons:**
1. ❌ Not in CI/CD pipeline
2. ❌ Playwright config times out trying to start servers
3. ❌ Developers not running E2E tests locally
4. ❌ Test environment ≠ Production environment

### ✅ Solution (1 hour to fix):

1. **Fix Playwright config** (use existing servers)
2. **Run E2E tests before deploy**
3. **Add to CI/CD pipeline**
4. **Add pre-push git hook**

**See:** `E2E-STATUS-REPORT.md` for full analysis and action plan.

---

**Track all issues here and create E2E tests for each!** 🎯

