# Testing Knowledge Base & Golden Rules

**Last Updated:** 2025-12-12
**Status:** Living Document

This guide serves as the single source of truth for testing SiteSprintz. It documents the standardized patterns, critical "gotchas" (like CSRF and password policies), and troubleshooting steps derived from recent debugging sessions.

---

## 🏗️ Test Architecture

| Type | Directory | Framework | Purpose |
| :--- | :--- | :--- | :--- |
| **E2E** | `tests/e2e/` | Playwright | Critical user flows (Auth, Booking, Admin). Full browser simulation. |
| **Unit** | `tests/unit/` | Vitest | Component logic, utils, and hook isolation. |
| **Setup** | `tests/setup/` | Node Scripts | Database seeding (`seed-test-data.js`), global setup. |

### Key Files
- **`tests/e2e/infrastructure-health.spec.js`**: The "Canary" test. Run this first to verify the environment is healthy before running the full suite.
- **`tests/setup/seed-test-data.js`**: Resets the DB and creates default users (`admin@example.com`, `test@example.com`).

---

## 🔑 Golden Rules of Authentication

**Violation of these rules is the #1 cause of E2E failures.**

### 1. Registration Patterns
When registering new users in tests (E2E or Integration), you **MUST** follow this exact payload structure:

```javascript
const csrfRes = await request.get(`${API_URL}/api/csrf-token`);
const { csrfToken } = await csrfRes.json();

await request.post(`${API_URL}/api/auth/register`, {
  headers: { 'X-CSRF-Token': csrfToken }, // REQUIRED: CSRF Token
  data: {
    email: `unique${Date.now()}@example.com`,
    password: 'StrictPwd!2024',         // REQUIRED: Must meet complexity (Caps + Special + Num)
    confirmPassword: 'StrictPwd!2024',  // REQUIRED: Must match password
    name: 'Test User'
  }
});
```

- **Password**: Do NOT use `Test123!@#` or simple sequences. Use `StrictPwd!2024`.
- **CSRF**: You cannot POST to `/auth` without an `X-CSRF-Token` header.

### 2. Login Patterns
- **Seeded Users**: The `seed-test-data.js` script creates `test@example.com`.
    - **Password**: `password123` (Note: This differs from the strict registration policy for legacy reasons).
- **New Users**: If you registered a user in the test using `StrictPwd!2024`, login with that same password.

### 3. API Expectations
- **Token Field**: The API returns `{ accessToken: '...' }`, **NOT** `{ token: '...' }`. Update destructuring accordingly.

---

## 🚦 Troubleshooting & Common Errors

### `ERR_ERL_KEY_GEN_IPV6`
- **Symptom**: Console warnings about "Invalid key generator" during tests.
- **Cause**: `express-rate-limit` misidentifying IPv6 loopback addresses (`::1`).
- **Fix**: The `server/middleware/rateLimiting.js` has been patched to normalize `::1` to `127.0.0.1`. Do not revert this logic.

### 403 Forbidden on POST
- **Symptom**: API returns 403 for `/api/auth/register` or `/api/auth/login`.
- **Check**: Did you fetch the CSRF token first? Are you passing it in the `X-CSRF-Token` header?

### UI Timeouts / Missing Elements
- **Symptom**: `admin-analytics.spec.js` failing to find "Growth Metrics".
- **Status**: Known non-blocking issue. Often related to data seeding timing or specific frontend rendering delays.
- **Workaround**: Retrying or ensuring the seeded data matches the analytics time window.

---

## 🏃 Running Tests

### Full Suite
```bash
npm run test:e2e
```

### Targeted Run (Recommended for Dev)
```bash
# Verify environment health
npx playwright test tests/e2e/infrastructure-health.spec.js

# Run specific feature tests
npx playwright test tests/e2e/auth-flow.spec.js
```
