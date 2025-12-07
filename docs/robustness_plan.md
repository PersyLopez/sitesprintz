# Robustness Improvement Plan

## Goal
Eliminate "workarounds" and "manual verification" steps by creating robust, deterministic automated tests for **Site Lifecycle** and **Pro Features (Analytics)**.

## 1. Site Lifecycle Robustness (Fixing UI Flakes)

### The Problem
The `site-creation.spec.js` test is flaky because it relies on the real application rendering the "Template Grid" which:
1.  Fetches data from the backend (latency).
2.  Loads images (layout shifts).
3.  Is resource-intensive (causing Webkit crashes).

### The Solution: API Interception & Mocking
Instead of waiting for the real server to return templates, we will **mock the `/api/templates` endpoint** within the test.

**Proposed Changes:**
-   **Mock Data**: create a fixture with a minimal template list.
-   **Interception**: Use `page.route('/api/templates', ...)` to return this mock data instantly.
-   **Benefit**: The UI renders immediately and deterministically. No loading states, no "template not found" errors.

## 2. Analytics Test Robustness (Fixing Tracking Flakes)

### The Problem
The `pro-features.spec.js` analytics test listens for *network requests*. This is flaky because:
1.  Browsers batch analytics (sendBeacon).
2.  Localhost environments often suppress tracking.
3.  Race conditions between page navigation and script execution.

### The Solution: Window Object Spying
Instead of spying on the *network*, we will spy on the **function call** that triggers the tracking.

**Proposed Changes:**
-   **Mock Function**: Inject a mock analytics handler into the page context: `window.plausible = (...) => window.__analyticsCalls.push(...)`.
-   **Assertion**: Assert that `window.__analyticsCalls` has data.
-   **Benefit**: Verifies that *our code* successfully tried to track the event, regardless of whether the network request actually left the browser. This isolates the test to *our application logic*.

## Execution Steps
1.  [ ] Refactor `site-creation.spec.js` to mock `/api/templates`.
2.  [ ] Refactor `pro-features.spec.js` to spy on the analytics function calls.
3.  [ ] Verify both tests run reliably (5x runs).
4.  [ ] Update `PROJECT_STATUS.md` to remove the caveats.
