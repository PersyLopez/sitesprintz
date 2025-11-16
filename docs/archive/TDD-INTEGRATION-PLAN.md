# 🎯 TDD Integration Plan for SiteSprintz

**Start Date:** November 12, 2025  
**Strategy:** Gradual adoption with immediate wins  
**Current State:** 88-97% test coverage (test-after)  
**Target:** 100% TDD for new code by Week 4

---

## 📋 Phase 1: Foundation (Week 1)

### ✅ Completed:
- [x] TDD Guidelines document created
- [x] Test mocking infrastructure (DB, Stripe, Email)
- [x] Test wrappers for React components
- [x] 3 missing hooks implemented with tests

### 🎯 Remaining Week 1 Tasks:

#### **Task 1.1: Create Test Templates** (2 hours)
**Location:** `.github/test-templates/`

Files to create:
- `unit-service.test.template.js` - For business logic
- `integration-api.test.template.js` - For API endpoints
- `unit-hook.test.template.jsx` - For React hooks
- `unit-component.test.template.jsx` - For React components

**Purpose:** Copy-paste starting points for new tests

---

#### **Task 1.2: Update PR Template** (30 min)
**File:** `.github/pull_request_template.md`

Add TDD checklist:
```markdown
## TDD Checklist (for new features/fixes)
- [ ] Tests written before implementation
- [ ] All tests passing
- [ ] Coverage ≥ 90% for new code
- [ ] Edge cases tested
- [ ] Error cases tested
```

---

#### **Task 1.3: Create TDD Example** (3 hours)
**Purpose:** Reference implementation showing complete TDD workflow

**Create:** `docs/TDD-EXAMPLE-WALKTHROUGH.md`

**Content:** Complete example of implementing "Custom Domain Management" feature using TDD, showing:
1. Feature specification
2. Test cases identified
3. First test (RED)
4. Implementation (GREEN)
5. Refactor
6. Repeat for all tests
7. Final code

---

## 📋 Phase 2: Apply to Analytics (Week 2)

### **Why Analytics?**
- ✅ New feature (no legacy code)
- ✅ Clear requirements
- ✅ Good complexity (not too simple/hard)
- ✅ Multiple components (service + routes + hooks)
- ✅ High value for users

### **Analytics TDD Workflow:**

#### **Step 1: Specification** (Day 1, 2 hours)
```markdown
# Analytics Feature Specification

## Requirements:
1. Track page views automatically
2. Track custom events (button clicks, form submissions)
3. Store events in database
4. Display analytics in dashboard
5. Filter by date range
6. Show common metrics (views, unique visitors, top pages)

## API Endpoints:
- POST /api/analytics/track
- GET /api/analytics/:siteId/stats
- GET /api/analytics/:siteId/events

## Data Model:
- event_id, site_id, event_type, path, metadata, timestamp, user_id
```

---

#### **Step 2: Test Cases (Day 1, 2 hours)**
```javascript
// tests/integration/api-analytics.test.js

describe('POST /api/analytics/track', () => {
  // Write test cases FIRST (don't implement yet)
  
  describe('page view tracking', () => {
    it('should track page view with all data');
    it('should generate unique event ID');
    it('should store timestamp');
    it('should associate with site');
  });
  
  describe('custom event tracking', () => {
    it('should track button clicks');
    it('should track form submissions');
    it('should store custom metadata');
  });
  
  describe('validation', () => {
    it('should require siteId');
    it('should require event type');
    it('should validate event type');
    it('should handle malformed metadata');
  });
  
  describe('authorization', () => {
    it('should require authentication');
    it('should allow site owner');
    it('should deny non-owner');
  });
  
  describe('edge cases', () => {
    it('should handle rapid concurrent events');
    it('should handle missing referrer');
    it('should handle very long paths');
  });
});
```

---

#### **Step 3: Implement Test by Test** (Day 2-3)

**First Test (RED):**
```javascript
it('should track page view with all data', async () => {
  const response = await request(app)
    .post('/api/analytics/track')
    .set('Authorization', `Bearer ${token}`)
    .send({
      siteId: 'site-123',
      event: 'page_view',
      path: '/about'
    });
  
  expect(response.status).toBe(201);
  expect(response.body).toMatchObject({
    success: true,
    eventId: expect.any(String)
  });
});

// Run: npm test
// ❌ FAILS: Route doesn't exist
```

**Make It Pass (GREEN):**
```javascript
// server/routes/analytics.routes.js
router.post('/track', requireAuth, async (req, res) => {
  const { siteId, event, path } = req.body;
  
  const eventId = `evt-${Date.now()}`;
  
  // Minimal implementation
  await dbQuery(`
    INSERT INTO analytics_events (id, site_id, event_type, path, created_at)
    VALUES ($1, $2, $3, $4, NOW())
  `, [eventId, siteId, event, path]);
  
  res.status(201).json({ success: true, eventId });
});

// Run: npm test
// ✅ PASSES
```

**Refactor:**
```javascript
// Extract to service
import { analyticsService } from '../../services/analytics.js';

router.post('/track', requireAuth, async (req, res) => {
  try {
    const eventId = await analyticsService.track({
      ...req.body,
      userId: req.user.id
    });
    
    res.status(201).json({ success: true, eventId });
  } catch (error) {
    ErrorHandlers.internal(res, error.message);
  }
});

// Run: npm test
// ✅ Still PASSES (refactor successful)
```

**Next Test:**
```javascript
it('should require authentication', async () => {
  const response = await request(app)
    .post('/api/analytics/track')
    .send({ event: 'page_view' });
  
  expect(response.status).toBe(401);
});

// ❌ FAILS: Returns 500 instead of 401
// Fix: Ensure requireAuth middleware is working
// ✅ PASSES
```

**Continue for all tests...**

---

#### **Step 4: Service Layer (Day 3-4)**
```javascript
// tests/unit/analyticsService.test.js

describe('AnalyticsService', () => {
  describe('track', () => {
    it('should generate unique event IDs');
    it('should store event in database');
    it('should handle duplicate prevention');
    it('should validate event data');
  });
  
  describe('getStats', () => {
    it('should aggregate by day');
    it('should calculate unique visitors');
    it('should find top pages');
    it('should filter by date range');
  });
});

// Implement each test one by one
```

---

#### **Step 5: React Hook (Day 4-5)**
```javascript
// tests/unit/useAnalytics.test.jsx

describe('useAnalytics', () => {
  it('should track page views on mount');
  it('should track page views on navigation');
  it('should provide track function');
  it('should handle tracking errors');
  it('should not track in dev mode');
  it('should batch rapid events');
});

// Implement hook to pass all tests
```

---

#### **Day 6-7: Dashboard Integration**
- Write tests for analytics dashboard component
- Implement component
- Write tests for chart components
- Implement charts

**Result:** Complete analytics feature, 100% test coverage, TDD from start to finish

---

## 📋 Phase 3: Apply to Bug Fixes (Week 3)

### **Process for Every Bug:**

#### **1. Reproduce Bug (RED)**
```javascript
// tests/bugs/issue-42-trial-bypass.test.js

describe('Bug #42: Users can bypass trial expiration', () => {
  it('should reject publish for expired trial', async () => {
    const user = await createExpiredTrialUser();
    const token = generateToken(user);
    
    const response = await request(app)
      .post('/api/drafts/123/publish')
      .set('Authorization', `Bearer ${token}`)
      .send({ subdomain: 'test' });
    
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('TRIAL_EXPIRED');
  });
});

// Run test
// ❌ FAILS: Returns 200 (bug reproduced)
```

#### **2. Fix Bug (GREEN)**
```javascript
// Add middleware
router.post('/:draftId/publish',
  requireAuth,
  requireActiveTrial, // ✅ Add this
  async (req, res) => {
    // ...
  }
);

// Run test
// ✅ PASSES (bug fixed)
```

#### **3. Add Related Tests**
```javascript
describe('Trial expiration enforcement', () => {
  it('should allow publish for active trial');
  it('should allow publish for paid users');
  it('should show user-friendly error message');
  it('should not check trial for admins');
});

// Ensure bug won't return
```

---

## 📋 Phase 4: Team Adoption (Week 4)

### **Goals:**
1. All team members comfortable with TDD
2. Process refined based on experience
3. TDD checklist enforced in PRs
4. Metrics tracked

### **Activities:**

#### **Code Review Focus:**
- Every PR reviewed for TDD compliance
- Tests reviewed before implementation
- Test quality feedback

#### **Metrics to Track:**
```javascript
// Track in weekly reports:
{
  newFeatures: {
    total: 5,
    withTDD: 4,
    tddPercentage: 80%
  },
  bugFixes: {
    total: 8,
    withReproductionTest: 8,
    tddPercentage: 100%
  },
  testCoverage: {
    overall: 92%,
    newCode: 95%
  },
  defectRate: {
    beforeTDD: 15bugs/sprint,
    afterTDD: 3bugs/sprint,
    improvement: 80%
  }
}
```

#### **Retrospective:**
- What worked well?
- What was challenging?
- Process improvements?
- Documentation gaps?

---

## 📊 Success Metrics

### **Week 1:**
- [ ] TDD guidelines documented
- [ ] Templates created
- [ ] Team training complete

### **Week 2:**
- [ ] Analytics feature implemented with TDD
- [ ] 95%+ test coverage for analytics
- [ ] Zero bugs found in analytics post-deployment

### **Week 3:**
- [ ] All bug fixes have reproduction tests
- [ ] 2+ new features started with TDD
- [ ] Test coverage maintaining 90%+

### **Week 4:**
- [ ] TDD standard for all new code
- [ ] Team velocity stable or improved
- [ ] Bug rate reduced 50%+

### **Month 2+:**
- [ ] 100% TDD adoption
- [ ] Test coverage 95%+
- [ ] Bug rate reduced 70%+
- [ ] Development velocity +30%

---

## 🚀 Quick Wins for Immediate Application

### **Today: Fix Your Next Bug with TDD**
```
1. Take next bug report
2. Write failing test that reproduces it
3. Fix until test passes
4. Add edge case tests
5. Done!

Time investment: +30 minutes
Bug prevention: Permanent
```

### **This Week: Start Analytics Feature**
```
1. Follow Analytics TDD plan above
2. Pair program if needed
3. Track time spent
4. Compare to normal development
```

### **This Sprint: Review All PRs for Tests**
```
1. PR without tests = Request changes
2. Tests after implementation = Ask for test-first next time
3. Good TDD = Praise and approve quickly
```

---

## 🛠️ Tools & Setup

### **VS Code Extensions:**
```json
{
  "recommendations": [
    "vitest.explorer",           // Run tests in sidebar
    "firsttris.vscode-jest-runner", // Run individual tests
    "ryanluker.vscode-coverage-gutters" // Show coverage in editor
  ]
}
```

### **NPM Scripts:**
```json
{
  "test:watch": "vitest --watch",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest run --coverage",
  "test:changed": "vitest --changed"
}
```

### **Git Hooks (Enforce Quality):**
```bash
# .husky/pre-commit
npm run test:changed  # Run tests for changed files only
npm run lint          # Lint changed files

# .husky/pre-push
npm test              # Run all tests before push
```

---

## 📚 Learning Resources

### **Internal:**
- `docs/TDD-GUIDELINES.md` - Our standards
- `docs/TDD-EXAMPLE-WALKTHROUGH.md` - Complete example
- `.github/test-templates/` - Copy-paste templates
- `tests/unit/useAuth.test.jsx` - Good example
- `tests/integration/api-auth.test.js` - Good example

### **External:**
- **Test-Driven Development by Example** (Kent Beck)
- **Growing Object-Oriented Software, Guided by Tests** (Freeman/Pryce)
- **Testing Library docs:** https://testing-library.com/
- **Vitest docs:** https://vitest.dev/

### **Pair Programming:**
- Schedule with team members who've done TDD
- Pair on first TDD feature
- Rotate pairs to spread knowledge

---

## 🎯 Action Items for Tomorrow

### **For Tech Lead:**
- [ ] Share this plan with team
- [ ] Schedule TDD training session (1 hour)
- [ ] Set up code review guidelines
- [ ] Create #tdd-help channel

### **For Developers:**
- [ ] Read TDD-GUIDELINES.md
- [ ] Pick next task (bug or feature)
- [ ] Write tests FIRST
- [ ] Ask for help in #tdd-help if stuck

### **For Next Sprint:**
- [ ] Analytics feature with TDD (primary goal)
- [ ] All bugs fixed with reproduction tests
- [ ] Track metrics (before/after comparison)

---

## 💡 Remember

### **TDD Feels Slow at First**
- Week 1: "This is taking forever" ← Normal
- Week 2: "Getting faster" ← Expected
- Week 3: "Same speed as before" ← Progress
- Week 4: "Wait, this is actually faster" ← Goal
- Month 2: "I can't imagine coding without tests first" ← Success

### **TDD is a Skill**
Like any skill, it requires practice. Give it 2 weeks before judging.

### **Team Support**
- Don't struggle alone
- Ask questions
- Pair program
- Share learnings

---

## 📞 Support

**Questions?**
- Slack: #tdd-help
- Email: tech-leads@sitesprintz.com
- Pair programming: Book anytime

**Issues with Plan?**
This is v1. We'll iterate based on feedback. Speak up!

---

**Let's build SiteSprintz with confidence! 🚀**

_Last Updated: November 12, 2025_

