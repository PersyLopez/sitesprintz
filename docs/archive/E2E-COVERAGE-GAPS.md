# 🔴 E2E Test Gap Analysis & TDD Plan

**Date:** November 14, 2025  
**Goal:** Increase E2E coverage for critical missing areas following strict TDD

---

## 📊 Current Coverage Gaps

### 🔴 Critical Gaps (Priority 1 - Today)

#### 1. **Google OAuth Flow** 
**Current Status:** ❌ No E2E tests  
**Risk:** High - Users can't login if broken  
**Lines of Code:** 0  
**Estimated Tests:** 8

#### 2. **Database Connection on Startup**
**Current Status:** ⚠️ Implicit only  
**Risk:** High - App won't work without DB  
**Lines of Code:** 0  
**Estimated Tests:** 5

#### 3. **Dashboard 404 Monitoring**
**Current Status:** ❌ No explicit tests  
**Risk:** Medium - Poor UX, missing features  
**Lines of Code:** 0  
**Estimated Tests:** 3

#### 4. **API Type Conversions**
**Current Status:** ❌ No E2E validation  
**Risk:** High - 403 errors on valid requests  
**Lines of Code:** 0  
**Estimated Tests:** 4

#### 5. **Session Persistence & Refresh**
**Current Status:** ⚠️ Basic only  
**Risk:** Medium - Users logged out unexpectedly  
**Lines of Code:** 0  
**Estimated Tests:** 6

### 🟡 Important Gaps (Priority 2 - This Week)

#### 6. **Form Submissions (Contact Forms)**
**Current Status:** ❌ No visitor E2E tests  
**Risk:** Medium - Lead loss  
**Lines of Code:** 0  
**Estimated Tests:** 7

#### 7. **Site Publishing Validation**
**Current Status:** ⚠️ Basic publish button  
**Risk:** Medium - Broken sites published  
**Lines of Code:** 0  
**Estimated Tests:** 5

#### 8. **Pricing Tier Access Control**
**Current Status:** ⚠️ Pro features only  
**Risk:** Medium - Revenue loss  
**Lines of Code:** 0  
**Estimated Tests:** 8

---

## 🎯 TDD Implementation Plan

### Phase 1: Google OAuth (TODAY - 2 hours)

**File:** `tests/e2e/google-oauth-flow.spec.js`

#### RED Phase (30 min):
Write 8 failing tests:
1. ❌ Should display "Sign in with Google" button
2. ❌ Should redirect to Google OAuth consent page
3. ❌ Should handle OAuth callback with code
4. ❌ Should create new user on first Google login
5. ❌ Should login existing Google user
6. ❌ Should set session cookie/token
7. ❌ Should redirect to dashboard after Google login
8. ❌ Should handle OAuth error/cancellation

#### GREEN Phase (60 min):
- Fix any issues in Google OAuth implementation
- Make all tests pass one by one

#### REFACTOR Phase (30 min):
- Extract helper functions
- Improve error handling
- Add proper logging

---

### Phase 2: Database Health Checks (TODAY - 1 hour)

**File:** `tests/e2e/database-health.spec.js`

#### RED Phase (20 min):
Write 5 failing tests:
1. ❌ Should connect to database on startup
2. ❌ Should verify all required tables exist
3. ❌ Should handle database connection loss gracefully
4. ❌ Should reconnect after temporary DB outage
5. ❌ Should expose health check endpoint

#### GREEN Phase (30 min):
- Add `/health` endpoint if missing
- Add database connection checks
- Make all tests pass

#### REFACTOR Phase (10 min):
- Improve health check response format
- Add more database metadata

---

### Phase 3: Dashboard 404 Monitoring (TODAY - 1 hour)

**File:** `tests/e2e/dashboard-api-coverage.spec.js`

#### RED Phase (20 min):
Write 3 failing tests:
1. ❌ Dashboard should not have any 404 API errors
2. ❌ All expected API endpoints should exist
3. ❌ Missing endpoints should return 501 (Not Implemented) not 404

#### GREEN Phase (30 min):
- Implement missing endpoints or proper error responses
- Make all tests pass

#### REFACTOR Phase (10 min):
- Add API endpoint registry
- Improve 404 handling

---

### Phase 4: Type Conversion Validation (TODAY - 1 hour)

**File:** `tests/e2e/api-type-safety.spec.js`

#### RED Phase (20 min):
Write 4 failing tests:
1. ❌ Should handle string userId in URL params
2. ❌ Should handle numeric userId in auth token
3. ❌ Should match userId types in authorization checks
4. ❌ Should validate all ID parameters consistently

#### GREEN Phase (30 min):
- Add type conversion to all routes with IDs
- Make all tests pass

#### REFACTOR Phase (10 min):
- Create middleware for ID parsing
- Ensure consistency

---

### Phase 5: Session Management (THIS WEEK - 2 hours)

**File:** `tests/e2e/session-management.spec.js`

#### RED Phase (30 min):
Write 6 failing tests:
1. ❌ Should persist session across page reloads
2. ❌ Should maintain session in multiple tabs
3. ❌ Should refresh token before expiration
4. ❌ Should handle expired tokens gracefully
5. ❌ Should logout on invalid/tampered token
6. ❌ Should clear all session data on logout

#### GREEN Phase (60 min):
- Implement token refresh logic
- Add session validation
- Make all tests pass

#### REFACTOR Phase (30 min):
- Improve session storage
- Add security headers

---

## 📋 Test Implementation Order

### Today (5 hours):
1. ✅ **Google OAuth** (Critical, 2h)
2. ✅ **Database Health** (Critical, 1h)
3. ✅ **Dashboard 404s** (Critical, 1h)
4. ✅ **Type Safety** (Critical, 1h)

### This Week (4 hours):
5. Session Management (2h)
6. Form Submissions (1h)
7. Publishing Validation (1h)

### Next Week (3 hours):
8. Pricing Access Control (1.5h)
9. Performance Tests (1.5h)

---

## 🔴 Starting with Google OAuth (RED Phase)

Let's write the first failing test...

