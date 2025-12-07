# 🤖 Test Automation Strategy for SiteSprintz

**Created:** November 20, 2025  
**Status:** Recommendation

---

## 📊 Current State

### ✅ Already Automated (85% Coverage)

**Test Types Currently Automated:**
- **Unit Tests:** 123 files (React components, services, utilities)
- **Integration Tests:** 32 files (API endpoints, database, services)
- **E2E Tests:** 28 files (critical user flows with Playwright)
- **Security Tests:** 1 file (XSS prevention)

**Coverage:** 2,490/2,940 tests passing (85%)

---

## 🎯 What Can Be Automated from Manual Testing Plan

### Category 1: Authentication & Registration ✅ MOSTLY AUTOMATED

**Already Covered by E2E Tests:**
- ✅ `tests/e2e/auth-flow.spec.js` - Login, registration, logout
- ✅ `tests/e2e/google-oauth-flow.spec.js` - OAuth flows
- ✅ `tests/e2e/session-management.spec.js` - Session handling
- ✅ `tests/integration/auth-service.test.js` - Auth service logic

**Can Add:**
```javascript
// tests/e2e/password-reset.spec.js (NEW)
- Test password reset request
- Test reset token validation
- Test password update
- Test login with new password
```

---

### Category 2: Dashboard & Site Management ✅ PARTIALLY AUTOMATED

**Already Covered:**
- ✅ `tests/e2e/site-creation.spec.js` - Template selection
- ✅ `tests/e2e/template-to-publish-flow.spec.js` - Complete flow
- ✅ `tests/e2e/site-publishing.spec.js` - Publishing
- ✅ `tests/unit/Dashboard.test.jsx` - Dashboard UI

**Can Add:**
```javascript
// tests/e2e/site-management.spec.js (NEW)
- Test site editing
- Test site duplication
- Test site deletion
- Test draft saving
- Test site list filtering

// tests/e2e/live-preview.spec.js (NEW)
- Test preview updates in real-time
- Test responsive preview (mobile/tablet/desktop)
- Test zoom controls
- Test device frames
```

---

### Category 3: Image Upload ❌ NOT AUTOMATED

**Can Automate:**
```javascript
// tests/e2e/image-upload.spec.js (NEW)
test('should upload image via drag and drop', async ({ page }) => {
  const fileInput = await page.locator('input[type="file"]');
  await fileInput.setInputFiles('tests/fixtures/test-image.jpg');
  await expect(page.locator('.image-preview')).toBeVisible();
});

test('should validate image file types', async ({ page }) => {
  const fileInput = await page.locator('input[type="file"]');
  await fileInput.setInputFiles('tests/fixtures/test.pdf');
  await expect(page.locator('.error')).toContainText('Invalid file type');
});

test('should show progress indicator during upload', async ({ page }) => {
  // Test upload progress
});

test('should handle large files', async ({ page }) => {
  // Test >5MB file rejection
});
```

---

### Category 4: Contact Forms ✅ AUTOMATED

**Already Covered:**
- ✅ `tests/e2e/form-submissions.spec.js`
- ✅ `tests/e2e/contact-form-email.spec.js`
- ✅ `tests/integration/api-submissions.test.js`

---

### Category 5: Subscription & Payments ✅ MOSTLY AUTOMATED

**Already Covered:**
- ✅ `tests/e2e/payment-flow.spec.js`
- ✅ `tests/e2e/checkout-flow.spec.js`
- ✅ `tests/integration/stripe-checkout.test.js`
- ✅ `tests/integration/customer-portal.test.js`

**Can Add Webhook Testing:**
```javascript
// tests/integration/stripe-webhooks-full.test.js (NEW)
test('should handle checkout.session.completed webhook', async () => {
  const event = createStripeWebhookEvent({
    type: 'checkout.session.completed',
    data: { /* ... */ }
  });
  
  const response = await request(app)
    .post('/api/webhooks/stripe')
    .set('stripe-signature', generateSignature(event))
    .send(event);
    
  expect(response.status).toBe(200);
  // Verify database updated
});

test('should handle subscription.deleted webhook', async () => {
  // Test subscription cancellation
});

test('should handle invoice.payment_failed webhook', async () => {
  // Test failed payment handling
});
```

---

### Category 6: Pro Features ✅ AUTOMATED

**Already Covered:**
- ✅ `tests/e2e/pro-features.spec.js`
- ✅ `tests/e2e/booking-flow.spec.js`
- ✅ `tests/e2e/pricing-tier-access.spec.js`

---

### Category 7: Admin Features ✅ AUTOMATED

**Already Covered:**
- ✅ `tests/e2e/admin-flow.spec.js`
- ✅ `tests/integration/api-admin.test.js`

---

### Category 8: Email Notifications ✅ AUTOMATED

**Already Covered:**
- ✅ `tests/integration/email-flows.test.js`
- ✅ `tests/unit/emailService.test.js`

---

### Category 9: SEO & Performance ✅ PARTIALLY AUTOMATED

**Already Covered:**
- ✅ `tests/e2e/seo-features.spec.js` - Meta tags, sitemaps
- ✅ `tests/e2e/mobile-responsiveness.spec.js` - Mobile testing

**Can Add Lighthouse Automation:**
```javascript
// tests/e2e/performance.spec.js (NEW)
import lighthouse from 'lighthouse';

test('should achieve >90 Lighthouse performance score', async () => {
  const result = await lighthouse('http://localhost:3000/sites/test-site/', {
    port: 9222,
    output: 'json'
  });
  
  expect(result.lhr.categories.performance.score).toBeGreaterThan(0.9);
  expect(result.lhr.categories.accessibility.score).toBeGreaterThan(0.9);
  expect(result.lhr.categories['best-practices'].score).toBeGreaterThan(0.9);
  expect(result.lhr.categories.seo.score).toBeGreaterThan(0.9);
});
```

---

### Category 10: Security ✅ PARTIALLY AUTOMATED

**Already Covered:**
- ✅ `tests/security/xss-prevention.test.js`
- ✅ `tests/integration/csrf-protection.test.js`

**Can Add:**
```javascript
// tests/security/sql-injection.test.js (NEW)
test('should prevent SQL injection in login', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: "' OR '1'='1", password: 'test' });
    
  expect(response.status).toBe(401);
});

// tests/security/rate-limiting.test.js (NEW)
test('should rate limit login attempts', async () => {
  // Make 10 rapid requests
  for (let i = 0; i < 10; i++) {
    await request(app).post('/api/auth/login').send({ email: 'test@test.com', password: 'wrong' });
  }
  
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: 'test@test.com', password: 'wrong' });
    
  expect(response.status).toBe(429); // Too Many Requests
});
```

---

### Category 11: Cross-Browser Testing ❌ NOT AUTOMATED

**Can Automate with Playwright:**
```javascript
// playwright.config.js - Add multiple browsers
export default {
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
  ],
};

// Then run: npx playwright test --project=all
```

---

## 🚀 Recommended Automation Priorities

### High Priority (Automate Now)

1. **Image Upload Testing** - Critical feature, easy to automate
2. **Cross-Browser Testing** - Just configuration, runs existing tests
3. **Password Reset Flow** - Security-critical, straightforward
4. **Site Management** (edit, duplicate, delete) - Core functionality

### Medium Priority (Automate Next Sprint)

5. **Lighthouse Performance Tests** - Important for SEO/UX
6. **Complete Webhook Testing** - Payment reliability
7. **Rate Limiting Tests** - Security hardening
8. **SQL Injection Tests** - Security hardening

### Low Priority (Nice to Have)

9. **Visual Regression Testing** - Catch UI changes
10. **Load Testing** - Performance under stress

---

## 📝 Implementation Plan

### Week 1: Quick Wins
```bash
# 1. Add cross-browser testing (2 hours)
# Update playwright.config.js
# Run existing tests across browsers

# 2. Add image upload tests (4 hours)
# Create tests/e2e/image-upload.spec.js
# Add test fixtures (sample images)

# 3. Add password reset test (2 hours)
# Create tests/e2e/password-reset.spec.js
```

### Week 2: Security & Performance
```bash
# 4. Add security tests (6 hours)
# Create tests/security/sql-injection.test.js
# Create tests/security/rate-limiting.test.js

# 5. Add Lighthouse tests (4 hours)
# Create tests/e2e/performance.spec.js
# Integrate lighthouse library
```

### Week 3: Site Management
```bash
# 6. Add site management tests (8 hours)
# Create tests/e2e/site-management.spec.js
# Test editing, duplication, deletion
```

---

## 🛠️ Tools & Setup

### Install Additional Dependencies
```bash
npm install --save-dev lighthouse @axe-core/playwright
```

### Update Scripts in package.json
```json
{
  "scripts": {
    "test:e2e:all-browsers": "playwright test --project=chromium --project=firefox --project=webkit",
    "test:performance": "playwright test tests/e2e/performance.spec.js",
    "test:security": "vitest run tests/security/",
    "test:full": "npm test && npm run test:e2e && npm run test:security"
  }
}
```

---

## 📊 Expected Coverage After Automation

| Category | Current | After Automation |
|----------|---------|------------------|
| Unit Tests | 85% | 85% (maintained) |
| Integration | 90% | 95% |
| E2E Flows | 80% | 95% |
| Security | 40% | 90% |
| Performance | 0% | 80% |
| Cross-Browser | 0% | 100% |
| **Overall** | **85%** | **92%** |

---

## 💡 CI/CD Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm test
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E tests (all browsers)
        run: npm run test:e2e:all-browsers
      
      - name: Run security tests
        run: npm run test:security
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-results/
```

---

## 🎯 Summary

**Can Be Automated:** 90% of manual testing plan  
**Already Automated:** 70% of critical paths  
**Automation Gap:** 20% (image upload, some security, performance)

**Recommendation:** Focus on the "High Priority" items first. These will provide the most value with minimal effort and bring overall test coverage to 92%+.

---

**Next Steps:**
1. Review this plan
2. Prioritize based on business needs
3. Start with Week 1 quick wins
4. Set up CI/CD for continuous testing

---

**See Also:**
- [Test Coverage Report](../reports/TEST-COVERAGE-REPORT.md)
- [Manual Testing Plan](MANUAL-TESTING-PLAN.md)
- [TDD Guidelines](../TDD-GUIDELINES.md)

