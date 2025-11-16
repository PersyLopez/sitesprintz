# Test Failure Analysis

**Date:** November 12, 2025  
**Status:** Initial Analysis  
**Current Passing Rate:** 88% (1,290/1,461 tests passing)  
**Failures:** 171 tests

## Summary

Based on previous test runs and code analysis, the remaining 171 test failures fall into these categories:

## 1. Database Connection Errors (Estimated: ~60 failures)

**Pattern:** `ECONNREFUSED` or database query errors in integration tests

**Affected Tests:**
- `tests/integration/api-auth.test.js` - Registration, login endpoints
- `tests/integration/api-submissions.test.js` - Contact form submissions
- `tests/integration/api-sites.test.js` - Site CRUD operations
- `tests/integration/api-payments.test.js` - Payment/subscription endpoints
- `tests/integration/aaa-system.test.js` - AAA (Auth, Authorization, Audit)

**Root Cause:**
- Database mock in `tests/setup.js` is hoisted but may not be intercepting all imports
- Integration tests expect actual database responses with specific structure
- Tests try to INSERT/SELECT but mock returns empty rows

**Fix Strategy:**
- Enhance `tests/mocks/db.js` with realistic response data
- Pre-populate mock responses for common queries (users, sites, submissions)
- Add conditional responses based on query type (INSERT returns id, SELECT returns data)

## 2. React Component Provider Issues (Estimated: ~40 failures)

**Pattern:** "useXXX must be used within Provider" or context errors

**Affected Tests:**
- `tests/unit/hooks/*.test.js` - Custom hooks that depend on context
- `tests/unit/components/*.test.jsx` - Components using contexts
- Any test using `useSite`, `useToast`, `useAuth` without proper wrappers

**Root Cause:**
- Tests render hooks/components without required context providers
- Already fixed `useSite.test.jsx` by adding `ToastProvider`
- Other tests likely have similar issues

**Fix Strategy:**
- Create test utility wrapper that includes all common providers
- Add `ToastProvider`, `SiteProvider`, `Router` to test setup
- Mock `useNavigate`, `useLocation` from react-router

## 3. Validation and Middleware Edge Cases (Estimated: ~30 failures)

**Pattern:** Unexpected 200 responses when expecting 400, or vice versa

**Affected Tests:**
- `tests/integration/validation.test.js` - Schema validation edge cases
- Route tests expecting specific error responses

**Root Cause:**
- Validation middleware may not handle all edge cases (null vs undefined, empty strings)
- Error response format inconsistencies (some return objects, some strings)

**Fix Strategy:**
- Review `server/middleware/validation.js` for edge case handling
- Ensure consistent error format across all validation scenarios
- Add tests for: null values, undefined, empty strings, wrong types

## 4. Import Path and Module Resolution (Estimated: ~20 failures)

**Pattern:** "Cannot find module" or import errors

**Affected Areas:**
- Tests importing from `../../server/routes/` when files are in different locations
- Service mocks not matching actual module structure
- ES module vs CommonJS conflicts

**Root Cause:**
- Some route files may still have incorrect relative import paths
- Mock paths in tests don't match actual file locations
- Circular dependency issues

**Fix Strategy:**
- Audit all import statements in route files
- Verify test mocks use correct paths
- Use absolute paths where possible (via vitest config aliases)

## 5. External Service Mocks (Estimated: ~15 failures)

**Pattern:** Network errors, fetch failures, Stripe/email service errors

**Affected Tests:**
- Tests involving Stripe API calls
- Tests involving email sending
- Tests making external HTTP requests

**Root Cause:**
- Fetch mock in `tests/setup.js` may not cover all cases
- Stripe SDK not mocked properly
- Email service calls not intercepted

**Fix Strategy:**
- Enhance global fetch mock with more scenarios
- Mock Stripe module at test level
- Mock email-service module to prevent actual sends

## 6. E2E Test Configuration (Estimated: ~6 failures)

**Pattern:** Browser launch failures, timeout errors, navigation issues

**Affected Tests:**
- All tests in `tests/e2e/` directory (7 files)

**Root Cause:**
- Playwright may need additional setup
- Server may need to be running for E2E tests
- External services need mocking in browser context

**Fix Strategy:**
- Ensure Playwright browsers are installed
- Add test server startup in E2E setup
- Mock external APIs at network level for browser tests

## Priority Fixes

### Immediate (High Impact)
1. **Database mocks** - Affects 60+ tests
2. **React providers** - Affects 40+ tests
3. **Validation edge cases** - Affects 30+ tests

### Secondary (Medium Impact)
4. **Import paths** - Affects 20+ tests
5. **External service mocks** - Affects 15+ tests

### Later (Low Impact)
6. **E2E configuration** - Affects 6 tests (can run separately)

## Next Steps

1. Enhance database mocks with realistic data
2. Create test utility for provider wrappers
3. Fix validation middleware edge cases
4. Audit and fix import paths
5. Improve external service mocking
6. Configure Playwright properly

## Target

Get from 88% (1,290/1,461) to 95%+ (1,388/1,461) - Fix ~100 tests

