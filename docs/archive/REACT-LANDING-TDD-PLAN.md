# REACT LANDING PAGE - TDD IMPLEMENTATION PLAN

**Goal:** Ensure React landing page has all functionality from legacy version

**Approach:** Test-Driven Development (RED → GREEN → REFACTOR)

---

## Missing Functionality Analysis

### Legacy Page Features (port 3000)
1. ✅ **Template Carousel** - Auto-rotate with manual controls
2. ✅ **FAQ Accordion** - JavaScript toggle functionality
3. ❌ **Payment Checkout** - `handlePlanSelection()` with auth check and Stripe integration

### React Page Current State (port 5173)
1. ✅ **Template Carousel** - Implemented with React hooks
2. ✅ **FAQ Accordion** - Native HTML `<details>` (no JS needed)
3. ❌ **Payment Checkout** - All CTAs just navigate to `/register`

---

## TDD Implementation Plan

### Feature: Payment Plan Selection

**User Stories:**
1. As a **visitor**, when I click "Start Free Trial", I should be redirected to `/register`
2. As a **visitor**, when I click "Get Started" (Starter), I should be redirected to `/register?plan=starter`
3. As a **visitor**, when I click "Upgrade to Pro", I should be redirected to `/register?plan=pro`
4. As a **logged-in user**, when I click a paid plan, I should be redirected to Stripe Checkout
5. As a **logged-in user**, when checkout fails, I should see an error message and button should re-enable
6. As a **user**, when processing, I should see "Loading..." and button should be disabled

---

## Phase 1: Write Tests (RED)

### Test File: `tests/unit/LandingPricing.test.jsx`

**Test Suite 1: Unauthenticated User Flow**
```javascript
describe('Landing Page - Pricing Selection (Unauthenticated)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('clicking "Start Free Trial" navigates to /register', () => {
    // Arrange: Render Landing page
    // Act: Click "Start Free Trial" button
    // Assert: Navigate to /register called
  });

  test('clicking "Get Started" (Starter) navigates to /register?plan=starter', () => {
    // Arrange: Render Landing page
    // Act: Click Starter "Get Started" button
    // Assert: Navigate to /register?plan=starter called
  });

  test('clicking "Upgrade to Pro" navigates to /register?plan=pro', () => {
    // Arrange: Render Landing page
    // Act: Click Pro button
    // Assert: Navigate to /register?plan=pro called
  });

  test('Premium "Join Waitlist" button is disabled', () => {
    // Arrange: Render Landing page
    // Assert: Premium button is disabled
  });
});
```

**Test Suite 2: Authenticated User Flow**
```javascript
describe('Landing Page - Pricing Selection (Authenticated)', () => {
  const mockToken = 'mock-jwt-token';
  
  beforeEach(() => {
    localStorage.setItem('authToken', mockToken);
    global.fetch = vi.fn();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  test('clicking "Start Free Trial" still navigates to /register', () => {
    // Arrange: Render Landing page with auth token
    // Act: Click "Start Free Trial"
    // Assert: Navigate to /register (no API call)
  });

  test('clicking Starter plan initiates Stripe checkout', async () => {
    // Arrange: Mock successful API response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://checkout.stripe.com/test' })
    });
    // Act: Click Starter button
    // Assert: 
    //   - fetch called with correct endpoint and headers
    //   - window.location.href set to Stripe URL
  });

  test('clicking Pro plan initiates Stripe checkout', async () => {
    // Same as above for Pro tier
  });

  test('shows "Loading..." and disables button during checkout', async () => {
    // Arrange: Mock delayed API response
    global.fetch.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ url: 'https://checkout.stripe.com/test' })
      }), 100))
    );
    // Act: Click button
    // Assert: 
    //   - Button shows "Loading..."
    //   - Button is disabled
  });

  test('shows error and re-enables button when checkout fails', async () => {
    // Arrange: Mock failed API response
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Payment setup failed' })
    });
    global.alert = vi.fn();
    // Act: Click button
    // Assert:
    //   - alert called with error message
    //   - Button re-enabled
    //   - Button text back to "Get Started"
  });

  test('handles network errors gracefully', async () => {
    // Arrange: Mock network error
    global.fetch.mockRejectedValueOnce(new Error('Network error'));
    global.alert = vi.fn();
    // Act: Click button
    // Assert:
    //   - alert called with generic error
    //   - Button re-enabled
  });
});
```

**Test Suite 3: Component Integration**
```javascript
describe('Landing Page - Integration Tests', () => {
  test('all pricing cards are rendered', () => {
    // Assert: 4 pricing cards visible (Free, Starter, Pro, Premium)
  });

  test('Pro card has "Most Popular" badge', () => {
    // Assert: Pro card has featured class and badge
  });

  test('Premium card has "Under Development" badge', () => {
    // Assert: Premium card has under-dev class and Q1 2026 badge
  });

  test('value badges display correct savings', () => {
    // Assert:
    //   - Starter: "$144/year"
    //   - Pro: "$720/year"  
    //   - Premium: "$1,440/year"
  });
});
```

---

## Phase 2: Implement (GREEN)

### Step 1: Add Required Imports and State
```javascript
// src/pages/Landing.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const [isProcessing, setIsProcessing] = useState({});
const navigate = useNavigate();
```

### Step 2: Implement `handlePlanSelection` Function
```javascript
const handlePlanSelection = async (plan) => {
  if (plan === 'free') {
    navigate('/register');
    return;
  }
  
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    navigate(`/register?plan=${plan}`);
    return;
  }
  
  setIsProcessing(prev => ({ ...prev, [plan]: true }));
  
  try {
    const response = await fetch('/api/payments/create-subscription-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ plan })
    });
    
    const data = await response.json();
    
    if (response.ok && data.url) {
      window.location.href = data.url;
    } else {
      alert(data.error || 'Failed to start checkout. Please try again.');
      setIsProcessing(prev => ({ ...prev, [plan]: false }));
    }
  } catch (error) {
    console.error('Checkout error:', error);
    alert('Something went wrong. Please try again.');
    setIsProcessing(prev => ({ ...prev, [plan]: false }));
  }
};
```

### Step 3: Update Pricing Buttons
Replace `<Link>` components with `<button>` elements:
```jsx
<button 
  onClick={() => handlePlanSelection('starter')} 
  className="btn-pricing"
  disabled={isProcessing.starter}
>
  {isProcessing.starter ? 'Loading...' : 'Get Started'}
</button>
```

### Step 4: Add Loading State Styles
```css
/* src/pages/Landing.css */
.btn-pricing:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

---

## Phase 3: Refactor (REFACTOR)

### Potential Improvements
1. **Extract to custom hook:** `useCheckout(plan)`
2. **Better error handling:** Show inline error messages instead of alerts
3. **Toast notifications:** Replace alerts with toast component
4. **Analytics tracking:** Track plan selection events
5. **Loading spinner:** Replace text with spinner component

---

## Testing Checklist

### Unit Tests
- [ ] Unauthenticated user redirects to register
- [ ] Unauthenticated user includes plan in query param
- [ ] Authenticated user initiates Stripe checkout
- [ ] Loading state shows during API call
- [ ] Error state re-enables button
- [ ] Network errors handled gracefully

### Integration Tests
- [ ] All 4 pricing cards render correctly
- [ ] Badges display on correct tiers
- [ ] Value badges show correct savings
- [ ] Buttons have correct styling

### E2E Tests (Manual)
- [ ] Click each plan button (logged out)
- [ ] Click each plan button (logged in)
- [ ] Verify Stripe checkout opens
- [ ] Verify error handling
- [ ] Test on mobile viewport

---

## Success Criteria

✅ All tests pass (RED → GREEN)  
✅ No linter errors  
✅ React landing page has feature parity with legacy  
✅ Code follows existing patterns  
✅ Proper error handling implemented  
✅ Loading states provide good UX  

---

## Execution Order

1. ✅ Create this plan
2. ⏳ Write test file `tests/unit/LandingPricing.test.jsx`
3. ⏳ Run tests (expect RED/failures)
4. ⏳ Implement `handlePlanSelection` function
5. ⏳ Update pricing button components
6. ⏳ Run tests (expect GREEN/passing)
7. ⏳ Refactor if needed
8. ⏳ Manual testing
9. ✅ Complete!

