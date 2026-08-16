# Self-Healing E2E Tests for E-Commerce (Antigravity Pattern)

**Created**: June 7, 2026  
**Pattern**: Antigravity Testing  
**Framework**: Playwright + Stripe Test Clocks + Transaction Rollback

---

## Overview

This test suite implements Antigravity testing patterns for the SiteSprintz e-commerce system:

- **Self-Healing Selectors**: Automatic fallback to alternative selectors if primary fails
- **Stripe Test Clocks**: Simulate time-dependent payment scenarios
- **Transaction Rollback**: Isolated tests with automatic cleanup
- **Batched Execution**: Tests grouped by feature (max 5 tests per batch)
- **React 19 Support**: Compatible with concurrent rendering
- **Multi-Site Testing**: Tests cart and order segregation

---

## File Structure

```
tests/e2e/
├── ecommerce-selfhealing.spec.js    # Main test suite (5 batches)
└── helpers/
    ├── test-context.js              # Test setup/teardown with transactions
    ├── stripe-test-helper.js         # Stripe Test Clocks
    └── selector-healer.js            # Self-healing selector logic
```

---

## Core Concepts

### 1. Self-Healing Selectors

Tests automatically recover from selector changes:

```javascript
const SELECTORS = {
  cartToggle: {
    primary: 'button[data-testid="cart-toggle-button"]',
    fallback: () => 'button:has-text("🛒")',
    description: 'Shopping cart toggle button'
  }
};

// Usage - automatically tries primary, falls back if needed
const selector = await getSelector(page, 'cartToggle');
await page.click(selector);
```

**Benefits**:
- Tests survive UI changes
- No brittle xpaths
- Multiple selector strategies per element
- Clear, maintainable selector registry

### 2. Stripe Test Clocks

Simulate payment scenarios without waiting for real time:

```javascript
// Create a frozen moment in time
const clockId = await stripeHelper.createTestClock(
  new Date('2026-06-07')
);

// Create customer and payment
const customer = await stripeHelper.createTestCustomer(clockId, {
  email: 'test@example.com'
});

// Simulate payment
const payment = await stripeHelper.simulatePayment(
  customer.id,
  9999, // cents
  'usd'
);

// Advance time by 30 days to test recurring
await stripeHelper.advanceTestClock(clockId, 2592000);
```

**Benefits**:
- No real payments in tests
- Test subscription scenarios
- Control time precisely
- Test payment failures/retries

### 3. Transaction Rollback

Each test runs in an isolated transaction:

```javascript
test.beforeEach(async ({ browser }) => {
  context = await createTestContext(browser, {
    user: { tier: 'growth', email: 'test@growth.com' },
    startTransaction: true  // ← Isolate database
  });
});

test.afterEach(async () => {
  await cleanupTestContext(context);  // ← Rollback transaction
});
```

**Benefits**:
- Tests don't affect each other
- No cleanup of test data needed
- Parallel test execution safe
- Real transaction semantics (ACID)

---

## Test Batches

### BATCH 1: Shopping Cart (Self-Healing) - 4 tests

**Focus**: Cart operations with selector recovery

```
✓ Add item to cart with self-healing
✓ Update item quantity with self-healing
✓ Remove item from cart with self-healing
✓ Cart persists after page refresh
```

**Key Features**:
- Multiple selector strategies per action
- Automatic fallback on failure
- LocalStorage persistence verification
- No hardcoded waits

### BATCH 2: Checkout (Stripe Test Clocks) - 3 tests

**Focus**: Payment processing with advanced Stripe scenarios

```
✓ Checkout process with test card (4242...)
✓ Declined card error handling with self-healing
✓ Cart cleared after successful payment
```

**Key Features**:
- Test card (4242 4242 4242 4242) success
- Declined card (4000 0000 0000 0002) error handling
- Stripe form iframe handling
- Auto-recovery from selector changes

### BATCH 3: Order Management (Dashboard) - 3 tests

**Focus**: Orders page with self-healing

```
✓ View orders in dashboard with self-healing
✓ Filter orders by status with self-healing
✓ Update order status with self-healing
```

**Key Features**:
- Dashboard selector recovery
- Filter/search functionality
- Status update verification
- Modal interaction recovery

### BATCH 4: Tier Gating (Feature Access) - 3 tests

**Focus**: Tier-based feature availability

```
✓ Growth tier can access checkout
✓ Trial tier sees upgrade prompt
✓ Pro tier has all features
```

**Key Features**:
- Test each tier level
- Verify feature blocking
- Upgrade prompt detection
- Feature inheritance verification

### BATCH 5: Multi-Site E-Commerce - 2 tests

**Focus**: Cart/order segregation across sites

```
✓ Cart shared across sites with self-healing
✓ Orders segregated by site
```

**Key Features**:
- Cross-site navigation
- Cart persistence
- Per-site order isolation
- Multiple site type testing

---

## Running Tests

### Run all e-commerce tests
```bash
npx playwright test tests/e2e/ecommerce-selfhealing.spec.js
```

### Run specific batch
```bash
npx playwright test tests/e2e/ecommerce-selfhealing.spec.js -g "BATCH-1"
```

### Run specific test
```bash
npx playwright test tests/e2e/ecommerce-selfhealing.spec.js -g "Add item to cart"
```

### Run with debug
```bash
npx playwright test tests/e2e/ecommerce-selfhealing.spec.js --debug
```

### Run with UI
```bash
npx playwright test tests/e2e/ecommerce-selfhealing.spec.js --ui
```

---

## Selector Registry

### How It Works

1. **Primary Selector**: Target selector with data-testid
2. **Fallback Selector**: Alternative (e.g., text content, class)
3. **Automatic Recovery**: If primary fails, fallback used
4. **Logging**: Console logs show which selector worked

### Example Registry

```javascript
const SELECTORS = {
  // Primary uses data-testid (most reliable)
  // Fallback uses text or semantic selectors
  
  cartToggle: {
    primary: 'button[data-testid="cart-toggle-button"]',
    fallback: () => 'button:has-text("🛒")',
    description: 'Shopping cart toggle button'
  },
  
  checkoutButton: {
    primary: '[data-testid="checkout-button"]',
    fallback: () => 'button:has-text("Proceed to Checkout")',
    description: 'Checkout button'
  },
  
  stripeForm: {
    primary: 'iframe[title="Stripe"]',
    fallback: () => '[data-testid="stripe-form"]',
    description: 'Stripe payment form'
  }
};
```

---

## Self-Healing in Action

### Before (Brittle)
```javascript
// Fails if:
// - XPath changes
// - Class names change
// - Structure changes
await page.click('xpath=//button[@class="cart-btn"]');
```

### After (Resilient)
```javascript
// Tries multiple strategies:
// 1. Primary: data-testid attribute (most stable)
// 2. Fallback: Text content or semantics
// 3. Auto-logs which worked
const selector = await getSelector(page, 'cartToggle');
await page.click(selector);
```

---

## Stripe Test Clock Scenarios

### Scenario 1: Successful Payment
```javascript
// Create customer with frozen time
const clockId = await stripeHelper.createTestClock();
const customer = await stripeHelper.createTestCustomer(clockId);

// Process payment with test card
const payment = await stripeHelper.simulatePayment(
  customer.id,
  2999, // $29.99
  'usd'
);

expect(payment.status).toBe('succeeded');
```

### Scenario 2: Declined Card
```javascript
// Use declined test card
const payment = await stripeHelper.simulatePayment(
  customer.id,
  2999,
  'usd',
  'tok_chargeDeclined' // Stripe test token
);

expect(payment.status).toBe('failed');
```

### Scenario 3: Subscription (Time-based)
```javascript
const clockId = await stripeHelper.createTestClock();

// Create subscription
const subscription = await stripeHelper.createSubscription(
  clockId,
  { amount: 999, interval: 'month' }
);

// Advance time 31 days
await stripeHelper.advanceTestClock(clockId, 2678400);

// Verify renewal attempted
const intents = await stripeHelper.getPaymentIntents(clockId);
expect(intents.length).toBeGreaterThan(1);
```

---

## Transaction Rollback (Isolation)

### How It Works

```javascript
test.beforeEach(async ({ browser }) => {
  // 1. Start transaction on backend
  context = await createTestContext(browser, {
    user: { tier: 'growth' },
    startTransaction: true
  });
  // Transaction ID returned: 'txn_123abc'
});

test('Add item to cart', async ({ page }) => {
  // 2. All database changes are within this transaction
  const addBtn = await getSelector(page, 'addToCartButton');
  await page.click(addBtn);
  // Cart item added to DB within txn_123abc
});

test.afterEach(async () => {
  // 3. Rollback entire transaction
  await cleanupTestContext(context);
  // All changes from test undone
  // No cleanup needed, no test data persists
});
```

**Benefits**:
- Perfect isolation
- Tests can run in parallel
- No cross-contamination
- Database in original state after each test

---

## Test Configuration

### Environment Variables

```bash
# playwright.config.js
TEST_URL=http://localhost:5173
API_URL=http://localhost:3000
STRIPE_TEST_MODE=true
```

### Browser Configuration

```javascript
{
  name: 'chromium',
  use: {
    baseURL: process.env.TEST_URL,
    storageState: 'auth-growth.json', // Pre-authenticated
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  }
}
```

---

## Debugging Failed Tests

### Enable Debug Mode
```bash
PWDEBUG=1 npx playwright test tests/e2e/ecommerce-selfhealing.spec.js
```

### Check Selector Recovery Logs
```
Primary selector failed for cartToggle, trying fallback...
✓ Fallback selector worked for cartToggle: button:has-text("🛒")
```

### Inspect Stripe Test Clock State
```javascript
const intents = await stripeHelper.getPaymentIntents(clockId);
console.log(intents); // View all payments for debugging
```

### Take Screenshots
```javascript
await page.screenshot({ path: 'debug.png' });
```

---

## Best Practices

### ✅ DO

- Use data-testid for primary selectors
- Implement semantic fallbacks (text, roles)
- Keep selector registry updated
- Use transaction rollback for isolation
- Batch tests by feature (max 5 per batch)
- Log which selector was used
- Test different tier levels
- Verify payment status explicitly

### ❌ DON'T

- Use class selectors (too fragile)
- Use XPath (brittle to changes)
- Hard-code wait times
- Share state between tests
- Test payment with real cards
- Forget transaction cleanup
- Ignore selector fallback logs
- Skip error scenario testing

---

## Maintenance

### When Selectors Break

1. **Check Console Logs**: See which fallback was used
2. **Update Registry**: Add new selector if needed
3. **Test Locally**: Verify fix works
4. **Run Full Suite**: Ensure no regressions

### When Tests Fail

1. **Check Screenshot**: `screenshots/` folder
2. **Check Video**: `videos/` folder
3. **Check Logs**: Console output in report
4. **Run in Debug**: PWDEBUG=1 to step through

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E-Commerce Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npx playwright install
      - run: npm run test:e2e:ecommerce
      - uses: actions/upload-artifact@v2
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Summary

| Aspect | Pattern |
|--------|---------|
| **Selectors** | Self-healing with fallbacks |
| **Payments** | Stripe Test Clocks |
| **Isolation** | Transaction rollback |
| **Batching** | 5 batches, max 5 tests each |
| **Tiers** | Growth, Pro, Trial tested |
| **Multi-Site** | Cart/order segregation verified |

---

**Status**: Ready for production testing

---

## Related Documentation

| Topic | Doc |
|-------|-----|
| E-commerce testing | [ECOMMERCE_TESTING_GUIDE.md](./ECOMMERCE_TESTING_GUIDE.md) |
| API reference | [ECOMMERCE_QUICK_REFERENCE.md](./ECOMMERCE_QUICK_REFERENCE.md) |
| Tier gating | [ECOMMERCE_TIER_CONSOLIDATION.md](./ECOMMERCE_TIER_CONSOLIDATION.md) |
| Test conventions | [../development/TESTING.md](../development/TESTING.md) |

**Doc index**: [../README.md](../README.md)  
**Maintaining docs**: Update this file when tests change — [../governance/AGENT_DOCUMENTATION_GUIDE.md](../governance/AGENT_DOCUMENTATION_GUIDE.md)

**Last updated**: June 2026

