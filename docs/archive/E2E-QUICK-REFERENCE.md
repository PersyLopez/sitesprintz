# ⚡ Quick Reference: E2E Testing Commands

**Keep these servers running** (start once, use all day):
```bash
# Terminal 1
npm run dev

# Terminal 2  
ALLOW_MOCK_OAUTH=true node server.js
```

---

## 🚀 Run Tests (No Restarts Needed!)

### All E2E Tests:
```bash
npx playwright test
```

### Specific Test Suite:
```bash
npx playwright test tests/e2e/google-oauth-flow.spec.js
npx playwright test tests/e2e/auth-flow.spec.js
npx playwright test tests/e2e/auth-csrf.spec.js
```

### Single Test:
```bash
npx playwright test tests/e2e/google-oauth-flow.spec.js:33
```

### Interactive UI (BEST!):
```bash
npx playwright test --ui
```

### Only Failed Tests:
```bash
npx playwright test --last-failed
```

### See Browser:
```bash
npx playwright test --headed
```

### Debug Mode:
```bash
npx playwright test --debug
```

---

## 📊 View Results

```bash
npx playwright show-report
```

---

## 🎯 Time Savings

- **All tests:** 60-90s
- **Single suite:** 5-10s  
- **Single test:** 1-2s
- **No restarts:** Save 10-30s per run

**Total:** 50-100x faster than manual testing! 🚀

