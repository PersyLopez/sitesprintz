# Pre-Deployment Comprehensive E2E Testing Guide

## Overview

This test suite ensures **full functionality** before deployment by testing all critical systems:

1. ✅ **Template System** - Pro templates only, no layout variations
2. ✅ **Template Normalization** - Consistent data structure
3. ✅ **Data Merging** - User edits persist through publish
4. ✅ **Feature Gating** - Subscription tier restrictions work correctly
5. ✅ **CSS Routing** - Stylesheets served with correct MIME type
6. ✅ **Publishing Flow** - Complete end-to-end journey
7. ✅ **Trial System** - No permanent free users, only trials

## Quick Start

```bash
# Run all pre-deployment tests
npm run test:e2e:pre-deploy

# Or with Playwright directly
npx playwright test tests/e2e/pre-deployment-comprehensive.spec.js

# Run with UI (recommended for debugging)
npx playwright test tests/e2e/pre-deployment-comprehensive.spec.js --ui

# Run in headed mode (see browser)
npx playwright test tests/e2e/pre-deployment-comprehensive.spec.js --headed
```

## Prerequisites

1. **Database seeded:**
   ```bash
   node tests/setup/seed-test-data.js
   ```

2. **Server running:**
   ```bash
   npm run dev:backend
   ```

3. **Environment variables:**
   - `PLAYWRIGHT_BASE_URL=http://localhost:3000` (default)
   - `VITE_API_URL=http://localhost:3000` (default)

## Test Coverage

### 1. Template System Tests

**What it tests:**
- ✅ Only Pro templates are available (no layout variations)
- ✅ Templates load by base name (no `-pro` suffix needed)
- ✅ Template data structure is normalized
- ✅ No layout selector UI exists

**Expected Results:**
- Template grid loads with Pro templates only
- API returns templates with `tier: 'pro'`
- No layout variation files are accessible
- Template normalization produces consistent structure

### 2. Data Merging and Persistence Tests

**What it tests:**
- ✅ User edits merge correctly with template data
- ✅ Business information persists through publish
- ✅ Hero section edits are preserved
- ✅ All custom data appears in published site

**Expected Results:**
- Published site contains merged user data
- Template defaults are preserved where user didn't edit
- No data loss during publish process

### 3. Feature Gating Tests

**What it tests:**
- ✅ Trial users have limited features (no booking, no checkout)
- ✅ Pro users have all features enabled
- ✅ Features are correctly filtered based on subscription tier
- ✅ Sections are removed for users without access

**Expected Results:**
- Trial users: No booking widget, no checkout, no Pro sections
- Pro users: All features available (if template supports them)
- Feature flags correctly reflect user's plan

### 4. CSS Routing Tests

**What it tests:**
- ✅ `styles.css` is served with `Content-Type: text/css`
- ✅ `premium.css` is served with `Content-Type: text/css`
- ✅ CSS files load without errors

**Expected Results:**
- CSS files return 200 OK
- Content-Type header is `text/css`
- No HTML error pages for CSS requests

### 5. Trial vs Paid Plans Tests

**What it tests:**
- ✅ New users default to trial (not permanent free)
- ✅ Null/undefined plan is treated as trial
- ✅ Trial features are correctly applied

**Expected Results:**
- New registrations get `subscription_plan: null` or `'trial'`
- Feature checks treat null as trial
- Trial users get trial feature set

### 6. End-to-End Publishing Flow

**What it tests:**
- ✅ Complete journey: Register → Select Template → Edit → Publish → View
- ✅ All steps complete without errors
- ✅ Published site is accessible

**Expected Results:**
- User can complete full flow in one session
- Published site is accessible at `/sites/:subdomain`
- Site data is correct and complete

## Running Specific Test Suites

```bash
# Template System only
npx playwright test tests/e2e/pre-deployment-comprehensive.spec.js -g "Template System"

# Feature Gating only
npx playwright test tests/e2e/pre-deployment-comprehensive.spec.js -g "Feature Gating"

# CSS Routing only
npx playwright test tests/e2e/pre-deployment-comprehensive.spec.js -g "CSS Routing"

# Data Merging only
npx playwright test tests/e2e/pre-deployment-comprehensive.spec.js -g "Data Merging"
```

## Debugging Failed Tests

### View Test Report
```bash
npx playwright show-report
```

### Run with Debug Mode
```bash
# Run with headed browser
npx playwright test tests/e2e/pre-deployment-comprehensive.spec.js --headed

# Run with debugger
npx playwright test tests/e2e/pre-deployment-comprehensive.spec.js --debug
```

### View Screenshots and Traces
Failed tests automatically save:
- Screenshots: `test-results/`
- Traces: `test-results/trace.zip`

View traces:
```bash
npx playwright show-trace test-results/trace.zip
```

## Success Criteria

All tests must pass before deployment:

- ✅ **Template System**: All Pro templates load, no layout variations
- ✅ **Normalization**: Template data structure is consistent
- ✅ **Data Merging**: User edits persist correctly
- ✅ **Feature Gating**: Features are correctly restricted by tier
- ✅ **CSS Routing**: Stylesheets load with correct MIME type
- ✅ **Publishing**: Complete flow works end-to-end
- ✅ **Trial System**: New users default to trial

## Known Issues

### Test User Creation
- Test users are created in `beforeAll` hook
- If user creation fails, tests will use fallback credentials
- Check console logs for user creation status

### API Rate Limiting
- Tests create multiple users quickly
- If rate limiting occurs, tests may need to be run separately
- Consider adding delays between user creation if needed

### Database State
- Tests assume clean database state
- Run `node tests/setup/seed-test-data.js` before running tests
- Tests create their own users but may conflict with existing data

## Continuous Integration

These tests are configured to run in CI:

```yaml
# Example GitHub Actions
- name: Run Pre-Deployment Tests
  run: |
    npm run test:e2e:pre-deploy
```

CI configuration:
- Automatic server startup
- Database seeding
- Screenshot on failure
- Trace on retry
- HTML report generation

## Next Steps After Tests Pass

Once all tests pass:

1. ✅ Review test report for any warnings
2. ✅ Check for flaky tests (retries > 0)
3. ✅ Verify all critical paths are covered
4. ✅ Run full E2E suite to ensure no regressions
5. ✅ Deploy to staging environment
6. ✅ Run smoke tests on staging
7. ✅ Deploy to production

## Test Maintenance

### Adding New Tests

When adding new functionality:

1. Add test cases to appropriate describe block
2. Follow existing test patterns
3. Use test utilities from `tests/helpers/`
4. Update this documentation

### Updating Selectors

If UI changes:

1. Update `tests/fixtures/test-config.js` first
2. Update tests to use centralized selectors
3. Prefer `data-testid` attributes

### Test Data

- Use `generateTestEmail()` for unique emails
- Use timestamps for unique business names
- Clean up test data in `afterAll` if needed

## Support

For issues with tests:
1. Check test output and logs
2. Review screenshots and traces
3. Verify server is running and database is seeded
4. Check environment variables
5. Review test configuration in `playwright.config.js`


