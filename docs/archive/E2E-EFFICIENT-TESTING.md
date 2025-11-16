# 🚀 Efficient E2E Testing Setup

**Date:** November 14, 2025  
**Goal:** Run E2E tests efficiently without server restarts

---

## ⚡ Quick Setup (One-Time)

### 1. Start Servers Once (Keep Running)
```bash
# Terminal 1: Start React Dev Server
cd /Users/persylopez/sitesprintz
npm run dev

# Terminal 2: Start Node API Server
cd /Users/persylopez/sitesprintz
ALLOW_MOCK_OAUTH=true node server.js
```

### 2. Run Tests Anytime (No Restart Needed)
```bash
# Terminal 3: Run E2E Tests
cd /Users/persylopez/sitesprintz
npx playwright test

# Or watch mode (auto-rerun on changes)
npx playwright test --ui
```

---

## 🎯 Playwright Configuration (Already Fixed!)

**File:** `playwright.config.js`

```javascript
webServer: [
  {
    url: 'http://localhost:5173',
    reuseExistingServer: true,  // ✅ Don't restart if already running
    timeout: 10000,
  },
  {
    url: 'http://localhost:3000',
    reuseExistingServer: true,  // ✅ Don't restart if already running
    timeout: 10000,
  },
]
```

**How it works:**
- Playwright checks if servers are already running
- If yes: Uses existing servers ✅
- If no: Would start them (but we start manually)
- **Result:** No server restarts! 🚀

---

## 📋 Efficient Test Workflow

### Option 1: Run Specific Test Suite
```bash
# Run only Google OAuth tests
npx playwright test tests/e2e/google-oauth-flow.spec.js

# Run only auth tests
npx playwright test tests/e2e/auth-flow.spec.js

# Run only failed tests
npx playwright test --last-failed
```

### Option 2: Interactive UI Mode (BEST!)
```bash
# Opens Playwright UI - can run/debug tests visually
npx playwright test --ui
```

**Features:**
- ✅ Visual test runner
- ✅ Click to run individual tests
- ✅ Watch mode (auto-rerun on code changes)
- ✅ Time travel debugging
- ✅ No terminal spam
- ✅ Screenshot/video on failure

### Option 3: Headed Mode (See Browser)
```bash
# Run tests with browser visible
npx playwright test --headed

# Run specific test in headed mode
npx playwright test tests/e2e/google-oauth-flow.spec.js:33 --headed
```

### Option 4: Debug Mode (Step Through)
```bash
# Debug a specific test
npx playwright test --debug tests/e2e/google-oauth-flow.spec.js:33
```

### Option 5: Watch Mode
```bash
# Auto-rerun tests when files change
npx playwright test --watch
```

---

## 🎨 Better Test Organization

### Run Tests by Tag
Add tags to tests:

```javascript
// tests/e2e/google-oauth-flow.spec.js
test.describe('Google OAuth @auth @critical', () => {
  test('should display button @ui', async ({ page }) => {
    // ...
  });
  
  test('should handle callback @backend', async ({ page }) => {
    // ...
  });
});
```

Run by tag:
```bash
# Run only critical tests
npx playwright test --grep @critical

# Run only auth tests
npx playwright test --grep @auth

# Run only backend tests (skip slow UI tests)
npx playwright test --grep @backend

# Exclude UI tests
npx playwright test --grep-invert @ui
```

---

## 🔥 Recommended Daily Workflow

### Morning Setup (Once):
```bash
# Start servers (keep running all day)
npm run dev &
ALLOW_MOCK_OAUTH=true node server.js &

# Open Playwright UI (keep open)
npx playwright test --ui
```

### During Development:
1. Write code
2. Click "Run" in Playwright UI
3. Tests auto-run on save (if watch mode enabled)
4. Fix failures
5. Repeat

**No server restarts needed!** ✅

---

## 📊 Test Execution Speed

### Before (With Restarts):
```
Start servers: 10s
Run tests: 90s
Total: 100s per run
```

### After (Reuse Servers):
```
Run tests: 90s
Total: 90s per run
Savings: 10s per run
```

### With Test Selection:
```
Run single suite: 5-10s
Run single test: 1-2s
Savings: 80-90s per run
```

---

## 🛠️ NPM Scripts for Convenience

Add to `package.json`:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:auth": "playwright test tests/e2e/auth-*.spec.js",
    "test:e2e:oauth": "playwright test tests/e2e/google-oauth-flow.spec.js",
    "test:e2e:watch": "playwright test --watch",
    "test:e2e:report": "playwright show-report",
    "servers:start": "concurrently \"npm run dev\" \"ALLOW_MOCK_OAUTH=true node server.js\"",
    "dev:test": "npm run servers:start & npx playwright test --ui"
  }
}
```

Usage:
```bash
# Run all E2E tests
npm run test:e2e

# Open UI
npm run test:e2e:ui

# Run OAuth tests only
npm run test:e2e:oauth

# Start servers + open test UI
npm run dev:test
```

---

## 🎯 Parallel Test Execution

For even faster tests:

```javascript
// playwright.config.js
export default defineConfig({
  workers: 3, // Run 3 tests in parallel
  fullyParallel: true, // Enable parallel execution
  
  // Or run in parallel only in CI
  workers: process.env.CI ? 4 : 1,
});
```

**Speed improvement:**
- 1 worker: 90s
- 3 workers: 30s
- **3x faster!** ⚡

---

## 🐛 Debugging Without Restarts

### Check Server Logs:
```bash
# Watch React logs
tail -f /dev/stdout  # or wherever npm run dev logs

# Watch Node logs
tail -f server-oauth.log

# Or start with logging
ALLOW_MOCK_OAUTH=true node server.js | tee server.log
```

### Check Test Failures:
```bash
# View last test report
npx playwright show-report

# Or use UI mode for interactive debugging
npx playwright test --ui
```

### Hot Reload:
- React: ✅ Auto-reloads on save
- Node: ❌ Needs restart on code changes

**Solution for Node hot reload:**
```bash
# Install nodemon
npm install -D nodemon

# Run with nodemon (auto-restart on changes)
nodemon --watch server --watch auth-google.js server.js
```

---

## ✅ Best Practice: VS Code Integration

Install **Playwright Test for VSCode** extension:

**Features:**
- ✅ Run tests from editor (click icon)
- ✅ Debug tests with breakpoints
- ✅ See test results inline
- ✅ No terminal needed
- ✅ Auto-complete for Playwright API

**Setup:**
1. Install extension: `ms-playwright.playwright`
2. Open test file
3. Click green arrow next to test
4. Test runs in background
5. Results show inline

**Result:** Ultimate developer experience! 🚀

---

## 🎓 Summary

### ❌ Old Way (Inefficient):
```bash
pkill node
sleep 2
node server.js &
sleep 3
npx playwright test
# 100+ seconds per run
```

### ✅ New Way (Efficient):
```bash
# Once per day:
npm run dev &
ALLOW_MOCK_OAUTH=true node server.js &

# Then, anytime:
npx playwright test --ui
# Click to run specific tests
# 1-5 seconds per test
```

### ⚡ Fastest Way:
```bash
# Install VS Code extension
# Click green arrow next to test
# Test runs instantly
```

---

## 🔥 Recommended Setup

```bash
# Terminal 1 (React - leave running)
npm run dev

# Terminal 2 (Node - leave running)
nodemon --watch server --watch auth-google.js -e js,mjs \
  --exec "ALLOW_MOCK_OAUTH=true node" server.js

# Terminal 3 (Tests - interactive)
npx playwright test --ui
```

**Benefits:**
- ✅ No server restarts
- ✅ Auto-reload on code changes (nodemon)
- ✅ Visual test runner
- ✅ Click to run any test
- ✅ Debug with time-travel
- ✅ Screenshots/videos on failure

**Speed:** 50-100x faster development! 🚀

---

**Ready to try the UI mode?**

```bash
npx playwright test --ui
```

It's game-changing! 🎮

