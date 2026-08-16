# TDD Guidelines for SiteSprintz

**Status:** Active as of November 12, 2025  
**Applies to:** All new features, bug fixes, and refactoring

---

## 🎯 Our TDD Approach

### **The Rule:**
> Write the test first, then implement. No exceptions for new code.

### **The Cycle:**
```
RED → GREEN → REFACTOR → REPEAT
```

1. **RED**: Write a failing test
2. **GREEN**: Write minimal code to pass
3. **REFACTOR**: Improve code while keeping tests green
4. **REPEAT**: Next test

---

## 📋 TDD Checklist for New Features

### Before Writing Code:
- [ ] Feature specification written
- [ ] Test cases listed (happy path + edge cases)
- [ ] Test file created with `describe` blocks
- [ ] First test written and failing (RED)

### During Development:
- [ ] Only write code to make current test pass
- [ ] Test passes (GREEN)
- [ ] Code refactored for quality
- [ ] All tests still pass
- [ ] Next test written

### Before PR:
- [ ] All tests passing
- [ ] Coverage ≥ 90% for new code
- [ ] Edge cases tested
- [ ] Error cases tested
- [ ] No skipped tests without justification

---

## 🎨 Test Structure Standards

### **File Naming:**
```
Feature: src/services/trialChecker.js
Test:    tests/unit/trialChecker.test.js

Feature: server/routes/analytics.routes.js
Test:    tests/integration/api-analytics.test.js
```

### **Test Organization:**
```javascript
describe('FeatureName', () => {
  describe('methodName', () => {
    // Setup
    beforeEach(() => {
      // Common setup
    });
    
    // Happy path
    it('should handle valid input', () => {
      // Arrange
      const input = { valid: 'data' };
      
      // Act
      const result = method(input);
      
      // Assert
      expect(result).toBe(expected);
    });
    
    // Edge cases
    describe('edge cases', () => {
      it('should handle null input', () => {
        expect(method(null)).toBe(fallback);
      });
      
      it('should handle empty input', () => {
        expect(method('')).toBe(fallback);
      });
    });
    
    // Error cases
    describe('error handling', () => {
      it('should throw on invalid type', () => {
        expect(() => method(123)).toThrow('Invalid type');
      });
    });
  });
});
```

---

## 🔥 TDD Examples by Component Type

### **1. Business Logic / Service Layer**

**Test First:**
```javascript
// tests/unit/subscriptionChecker.test.js
describe('SubscriptionChecker', () => {
  describe('canAccessTemplate', () => {
    it('should allow free users to access starter templates', () => {
      const checker = new SubscriptionChecker();
      const user = { plan: 'free' };
      const template = { tier: 'starter' };
      
      expect(checker.canAccess(user, template)).toBe(true);
    });
    
    it('should deny free users access to pro templates', () => {
      const checker = new SubscriptionChecker();
      const user = { plan: 'free' };
      const template = { tier: 'pro' };
      
      expect(checker.canAccess(user, template)).toBe(false);
    });
    
    it('should allow pro users to access all templates', () => {
      const checker = new SubscriptionChecker();
      const user = { plan: 'pro' };
      
      expect(checker.canAccess(user, { tier: 'starter' })).toBe(true);
      expect(checker.canAccess(user, { tier: 'pro' })).toBe(true);
    });
    
    it('should handle null user', () => {
      const checker = new SubscriptionChecker();
      expect(checker.canAccess(null, {})).toBe(false);
    });
  });
});
```

**Then Implement:**
```javascript
// src/services/subscriptionChecker.js
export class SubscriptionChecker {
  canAccess(user, template) {
    if (!user) return false;
    
    const plan = user.plan || 'free';
    const tier = template.tier || 'starter';
    
    if (plan === 'free') {
      return tier === 'starter';
    }
    
    return true; // Pro/Enterprise can access all
  }
}
```

---

### **2. API Endpoints**

**Test First:**
```javascript
// tests/integration/api-analytics.test.js
describe('POST /api/analytics/track', () => {
  it('should track page view event', async () => {
    const response = await request(app)
      .post('/api/analytics/track')
      .set('Authorization', `Bearer ${token}`)
      .send({
        siteId: 'site-123',
        event: 'page_view',
        path: '/about',
        metadata: { referrer: 'google' }
      });
    
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      success: true,
      eventId: expect.any(String)
    });
  });
  
  it('should reject invalid event type', async () => {
    const response = await request(app)
      .post('/api/analytics/track')
      .set('Authorization', `Bearer ${token}`)
      .send({
        siteId: 'site-123',
        event: 'invalid_event'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
  });
  
  it('should require authentication', async () => {
    const response = await request(app)
      .post('/api/analytics/track')
      .send({ event: 'page_view' });
    
    expect(response.status).toBe(401);
  });
});
```

**Then Implement:**
```javascript
// server/routes/analytics.routes.js
import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { analyticsService } from '../../services/analytics.js';

const router = express.Router();

router.post('/track',
  requireAuth,
  validate({ body: 'analyticsEvent' }),
  async (req, res) => {
    try {
      const { siteId, event, path, metadata } = req.body;
      
      const eventId = await analyticsService.track({
        siteId,
        event,
        path,
        metadata,
        userId: req.user.id
      });
      
      res.status(201).json({
        success: true,
        eventId
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
```

---

### **3. React Hooks**

**Test First:**
```javascript
// tests/unit/useAnalytics.test.jsx
describe('useAnalytics', () => {
  it('should track page views automatically', () => {
    const trackSpy = vi.fn();
    vi.mock('../../services/analytics', () => ({
      track: trackSpy
    }));
    
    renderHook(() => useAnalytics('site-123'), {
      wrapper: ({ children }) => (
        <Router>
          {children}
        </Router>
      )
    });
    
    expect(trackSpy).toHaveBeenCalledWith({
      siteId: 'site-123',
      event: 'page_view',
      path: '/'
    });
  });
  
  it('should provide track function', () => {
    const { result } = renderHook(() => useAnalytics('site-123'));
    
    expect(result.current.track).toBeInstanceOf(Function);
  });
  
  it('should track custom events', async () => {
    const { result } = renderHook(() => useAnalytics('site-123'));
    
    await act(async () => {
      await result.current.track('button_click', { button: 'signup' });
    });
    
    // Assert API call was made
  });
});
```

**Then Implement:**
```javascript
// src/hooks/useAnalytics.js
import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../services/api';

export function useAnalytics(siteId) {
  const location = useLocation();
  
  const track = useCallback(async (event, metadata = {}) => {
    try {
      await api.post('/api/analytics/track', {
        siteId,
        event,
        path: location.pathname,
        metadata
      });
    } catch (error) {
      console.error('Analytics tracking failed:', error);
    }
  }, [siteId, location.pathname]);
  
  // Auto-track page views
  useEffect(() => {
    track('page_view');
  }, [location.pathname, track]);
  
  return { track };
}
```

---

## 🐛 TDD for Bug Fixes

### **Process:**

1. **Reproduce bug with failing test**
2. **Fix code until test passes**
3. **Add related edge case tests**
4. **Refactor if needed**

### **Example:**

**Bug Report:** "Users can publish sites even after trial expires"

**Step 1: Write Failing Test**
```javascript
describe('Bug: Trial expiration not enforced', () => {
  it('should reject publish request for expired trial', async () => {
    const expiredUser = await createUserWithExpiredTrial();
    const token = generateToken(expiredUser);
    
    const response = await request(app)
      .post('/api/drafts/123/publish')
      .set('Authorization', `Bearer ${token}`)
      .send({ subdomain: 'test' });
    
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Trial expired');
  });
});

// Run test → ❌ FAILS (returns 200, should return 403)
```

**Step 2: Fix Code**
```javascript
// server/routes/drafts.routes.js
import { requireActiveTrial } from '../middleware/trialExpiration.js';

router.post('/:draftId/publish',
  requireAuth,
  requireActiveTrial, // ✅ Add this middleware
  async (req, res) => {
    // ... existing code
  }
);

// Run test → ✅ PASSES
```

**Step 3: Add Related Tests**
```javascript
it('should allow publish for active trial', async () => {
  // Ensure we didn't break happy path
});

it('should allow publish for paid users', async () => {
  // Ensure paid users aren't affected
});

it('should show correct error message', async () => {
  // Ensure error is user-friendly
});
```

---

## 🔄 TDD for Refactoring

### **Process:**

1. **Ensure existing tests cover current behavior**
2. **Add tests for untested edge cases**
3. **Refactor code**
4. **All tests should still pass (green)**

### **Example:**

**Goal:** Extract database logic from route handlers

**Step 1: Ensure Coverage**
```javascript
// Add tests if missing
describe('GET /api/users/:userId/sites', () => {
  it('should return user sites');
  it('should handle non-existent user');
  it('should handle unauthorized access');
  it('should paginate results');
});
```

**Step 2: Refactor**
```javascript
// Before (route has DB logic):
router.get('/:userId/sites', async (req, res) => {
  const result = await dbQuery(`
    SELECT * FROM sites WHERE user_id = $1
  `, [req.params.userId]);
  res.json({ sites: result.rows });
});

// After (extracted to repository):
router.get('/:userId/sites', async (req, res) => {
  const sites = await siteRepository.findByUserId(req.params.userId);
  res.json({ sites });
});
```

**Step 3: Verify**
```bash
npm test
# All tests pass ✅
```

---

## 📊 Test Coverage Requirements

### **Minimum Coverage:**
- **Overall:** 90%+
- **New features:** 95%+
- **Bug fixes:** 100% (bug scenario + fix)
- **Critical paths:** 100% (auth, payments, trial logic)

### **Check Coverage:**
```bash
npm run test:coverage

# Output should show:
# Statements   : 90%+
# Branches     : 85%+
# Functions    : 90%+
# Lines        : 90%+
```

---

## 🚫 Common Anti-Patterns to Avoid

### **❌ Writing Test After Implementation**
```javascript
// DON'T DO THIS:
// 1. Write feature
// 2. Manually test
// 3. Write test to match what you built

// DO THIS:
// 1. Write test (specification)
// 2. Implement to pass test
// 3. Refactor
```

### **❌ Testing Implementation Details**
```javascript
// BAD: Tests internal implementation
expect(component.state.counter).toBe(5);

// GOOD: Tests behavior/output
expect(screen.getByText('Count: 5')).toBeInTheDocument();
```

### **❌ One Giant Test**
```javascript
// BAD: Tests everything at once
it('should handle all user operations', async () => {
  // 200 lines of test code
});

// GOOD: Focused tests
describe('User operations', () => {
  it('should create user');
  it('should update user');
  it('should delete user');
  it('should handle errors');
});
```

### **❌ Skipping Edge Cases**
```javascript
// BAD: Only happy path
it('should create site with valid data');

// GOOD: Happy + edge cases
describe('Site creation', () => {
  it('should create site with valid data');
  it('should reject null subdomain');
  it('should reject duplicate subdomain');
  it('should reject invalid characters');
  it('should handle concurrent requests');
});
```

---

## 🎯 Quick Reference

### **Before Writing Any Code:**
1. What's the feature/fix?
2. What are the test cases?
3. Write first test
4. Run test (should fail)
5. Now write code

### **Red-Green-Refactor:**
```
🔴 RED:    Test fails (expected)
🟢 GREEN:  Test passes (minimal code)
🔵 REFACTOR: Improve code (tests stay green)
```

### **When in Doubt:**
> "If I can't write a test for it, I don't understand it well enough to code it."

---

## 📚 Resources

- **Testing Library Docs:** https://testing-library.com/
- **Vitest Docs:** https://vitest.dev/
- **TDD by Example (Kent Beck):** Classic TDD book
- **Project Examples:** See `tests/unit/` for patterns

---

## 🤝 Getting Help

**Questions?** Ask in:
- Team chat: #tdd-help
- Code review: Tag @tech-leads
- Pair programming: Schedule with TDD champions

---

**Remember:** TDD is a skill. It feels slow at first, but you'll get faster and write better code. Give it 2 weeks of practice! 🚀

