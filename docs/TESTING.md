# 🧪 Testing Documentation

**Last Updated:** December 2025  
**Version:** 1.0.0

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Test Types](#test-types)
5. [Writing Tests](#writing-tests)
6. [Test Utilities](#test-utilities)
7. [Best Practices](#best-practices)

---

## 🎯 Overview

SiteSprintz uses a comprehensive testing strategy with multiple test types:

- **Unit Tests**: Individual functions/components (Vitest)
- **Integration Tests**: API endpoints and services (Vitest)
- **E2E Tests**: Full user flows (Playwright)
- **Security Tests**: Security vulnerability checks

### Test Coverage

- **Unit Tests**: 85% passing (2,490/2,940 tests)
- **E2E Tests**: 25/25 core flows passing ✅
- **Integration Tests**: Stripe + Email verified ✅

---

## 📁 Test Structure

```
tests/
├── unit/                    # Unit tests (95 files)
│   ├── components/         # React component tests
│   └── services/           # Service unit tests
│
├── integration/             # Integration tests (30+ files)
│   ├── api-*.test.js       # API endpoint tests
│   ├── auth-*.test.js      # Authentication tests
│   └── stripe-*.test.js   # Stripe integration tests
│
├── e2e/                     # End-to-end tests (40+ files)
│   ├── auth-flow.spec.js   # Authentication flows
│   ├── checkout-flow.spec.js # Payment flows
│   └── booking-flow.spec.js # Booking system flows
│
├── security/                # Security tests
│   ├── rate-limiting.test.js
│   ├── sql-injection.test.js
│   └── xss-prevention.test.js
│
├── helpers/                # Test utilities
│   ├── auth-helpers.js     # Auth test helpers
│   ├── api-test-utils.js   # API test utilities
│   └── db-helpers.js       # Database helpers
│
└── mocks/                  # Mock data and services
    └── stripe-mock.js      # Stripe API mocks
```

---

## 🏃 Running Tests

### Unit & Integration Tests

```bash
# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test tests/e2e/auth-flow.spec.js

# Run in headed mode (see browser)
npx playwright test --headed

# Run in debug mode
npx playwright test --debug
```

### Test Specific Files

```bash
# Run specific test file
npm test tests/unit/authService.test.js

# Run tests matching pattern
npm test -- auth

# Run E2E tests for specific feature
npx playwright test tests/e2e/checkout-flow.spec.js
```

---

## 🧩 Test Types

### Unit Tests

**Purpose:** Test individual functions, components, or modules in isolation

**Framework:** Vitest

**Example:**
```javascript
import { describe, it, expect } from 'vitest';
import { isValidEmail } from '../server/utils/helpers.js';

describe('isValidEmail', () => {
  it('should validate correct email', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  it('should reject invalid email', () => {
    expect(isValidEmail('invalid')).toBe(false);
  });
});
```

**Location:** `tests/unit/`

**Coverage Areas:**
- Utility functions
- Service methods
- React components
- Helper functions

### Integration Tests

**Purpose:** Test API endpoints and service integrations

**Framework:** Vitest + Supertest

**Example:**
```javascript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server.js';

describe('POST /api/auth/register', () => {
  it('should create new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
  });
});
```

**Location:** `tests/integration/`

**Coverage Areas:**
- API endpoints
- Database operations
- External service integrations
- Authentication flows

### E2E Tests

**Purpose:** Test complete user flows end-to-end

**Framework:** Playwright

**Example:**
```javascript
import { test, expect } from '@playwright/test';

test('user can register and login', async ({ page }) => {
  // Navigate to register page
  await page.goto('/register');
  
  // Fill registration form
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // Verify redirect to dashboard
  await expect(page).toHaveURL('/dashboard');
});
```

**Location:** `tests/e2e/`

**Coverage Areas:**
- User registration/login
- Site creation/publishing
- Payment flows
- Booking flows
- Admin operations

### Security Tests

**Purpose:** Test security vulnerabilities and protections

**Framework:** Vitest

**Example:**
```javascript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server.js';

describe('Rate Limiting', () => {
  it('should limit registration attempts', async () => {
    const requests = Array(5).fill(null).map(() =>
      request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'pass' })
    );

    const responses = await Promise.all(requests);
    const rateLimited = responses.some(r => r.status === 429);
    
    expect(rateLimited).toBe(true);
  });
});
```

**Location:** `tests/security/`

**Coverage Areas:**
- Rate limiting
- SQL injection prevention
- XSS prevention
- CSRF protection

---

## ✍️ Writing Tests

### Unit Test Template

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { MyService } from '../server/services/myService.js';

describe('MyService', () => {
  let service;

  beforeEach(() => {
    service = new MyService();
  });

  it('should do something', () => {
    const result = service.doSomething();
    expect(result).toBe(expectedValue);
  });
});
```

### Integration Test Template

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../server.js';
import { prisma } from '../../database/db.js';

describe('POST /api/my-endpoint', () => {
  beforeEach(async () => {
    // Setup test data
  });

  afterEach(async () => {
    // Cleanup test data
  });

  it('should handle request correctly', async () => {
    const response = await request(app)
      .post('/api/my-endpoint')
      .send({ data: 'test' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true });
  });
});
```

### E2E Test Template

```javascript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should complete user flow', async ({ page }) => {
    // Navigate
    await page.goto('/path');
    
    // Interact
    await page.click('button');
    await page.fill('input', 'value');
    
    // Assert
    await expect(page.locator('.result')).toBeVisible();
  });
});
```

---

## 🛠️ Test Utilities

### Auth Helpers

**Location:** `tests/helpers/auth-helpers.js`

**Usage:**
```javascript
import { createTestUser, getAuthToken } from '../helpers/auth-helpers.js';

const user = await createTestUser('test@example.com', 'password');
const token = await getAuthToken(user.email, 'password');
```

### API Test Utils

**Location:** `tests/helpers/api-test-utils.js`

**Usage:**
```javascript
import { apiRequest } from '../helpers/api-test-utils.js';

const response = await apiRequest('POST', '/api/endpoint', {
  headers: { Authorization: `Bearer ${token}` },
  body: { data: 'test' }
});
```

### Database Helpers

**Location:** `tests/helpers/db-helpers.js`

**Usage:**
```javascript
import { cleanupTestData, seedTestData } from '../helpers/db-helpers.js';

beforeEach(async () => {
  await seedTestData();
});

afterEach(async () => {
  await cleanupTestData();
});
```

### Mock Services

**Location:** `tests/mocks/`

**Stripe Mock:**
```javascript
import { mockStripe } from '../mocks/stripe-mock.js';

// Mock Stripe API responses
mockStripe.checkout.sessions.create.mockResolvedValue({
  id: 'cs_test_...',
  url: 'https://checkout.stripe.com/...'
});
```

---

## ✅ Best Practices

### 1. Test Isolation

- Each test should be independent
- Clean up test data after each test
- Don't rely on test execution order

### 2. Descriptive Test Names

```javascript
// Good
it('should return 401 when token is invalid', () => { ... });

// Bad
it('should work', () => { ... });
```

### 3. Arrange-Act-Assert Pattern

```javascript
it('should calculate total correctly', () => {
  // Arrange
  const items = [{ price: 10 }, { price: 20 }];
  
  // Act
  const total = calculateTotal(items);
  
  // Assert
  expect(total).toBe(30);
});
```

### 4. Mock External Services

- Mock Stripe API calls
- Mock email service
- Mock database queries (when appropriate)

### 5. Test Error Cases

```javascript
it('should handle errors gracefully', async () => {
  // Test error scenarios
  const response = await request(app)
    .post('/api/endpoint')
    .send({ invalid: 'data' });

  expect(response.status).toBe(400);
  expect(response.body.error).toBeDefined();
});
```

### 6. Use Test Fixtures

```javascript
// Create reusable test data
const testUser = {
  email: 'test@example.com',
  password: 'password123'
};
```

### 7. Keep Tests Fast

- Use mocks for slow operations
- Avoid unnecessary database operations
- Run unit tests separately from E2E tests

---

## 📊 Test Coverage

### Current Status

- **Unit Tests**: 85% passing (2,490/2,940)
- **E2E Tests**: 100% passing (25/25)
- **Integration Tests**: Core flows verified

### Coverage Goals

- **Unit Tests**: 90%+ coverage
- **E2E Tests**: All critical paths covered
- **Integration Tests**: All API endpoints tested

### Generating Coverage Report

```bash
npm run test:coverage
```

Report will be generated in `coverage/` directory.

---

## 🐛 Debugging Tests

### Unit/Integration Tests

```bash
# Run with verbose output
npm test -- --reporter=verbose

# Run specific test file
npm test tests/unit/myTest.test.js

# Run with Node debugger
node --inspect-brk node_modules/.bin/vitest
```

### E2E Tests

```bash
# Run in headed mode
npx playwright test --headed

# Run in debug mode
npx playwright test --debug

# Run with slow motion
npx playwright test --slow-mo=1000

# Take screenshots on failure
npx playwright test --screenshot=only-on-failure
```

---

## 📚 Related Documentation

- [TDD Guidelines](./TDD-GUIDELINES.md)
- [Backend Documentation](./BACKEND.md)
- [Test Coverage Report](./reports/TEST-COVERAGE-REPORT.md)
- [Test Execution Report](./reports/TEST-EXECUTION-REPORT.md)

---

**Last Updated:** December 2025  
**Maintained by:** SiteSprintz Development Team






