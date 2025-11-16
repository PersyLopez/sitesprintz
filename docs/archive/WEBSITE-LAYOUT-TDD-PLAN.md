# 🎯 WEBSITE LAYOUT & PRICING TDD IMPLEMENTATION PLAN

**Date:** November 14, 2025  
**Status:** 🚀 **IN PROGRESS**  
**Approach:** Test-Driven Development (TDD)

---

## 📋 CURRENT STATE ANALYSIS

### ✅ **What's Already Correct:**

**Pricing Configuration:**
- `src/utils/planFeatures.js` - ✅ Updated to $15/$45/$100
- Database pricing table - ✅ Created and configured
- `PricingManagement.jsx` - ✅ Admin panel for dynamic pricing

**Components:**
- `PricingCard.jsx` - ✅ Individual pricing card component
- `PricingTiers.jsx` - ✅ Pricing grid component  
- `usePlan.jsx` - ✅ Hook for plan checking

### ⚠️ **What Needs Work:**

**Landing Page (`public/index.html`):**
- Pricing section may have outdated prices
- Need to verify tier descriptions
- May not show "Premium Under Development" badge

**Template Filtering:**
- Need to ensure templates are correctly categorized
- Starter templates (13 base templates)
- Pro templates (12 templates)
- Premium templates (4 templates - under development)

**Navigation & CTAs:**
- Verify all CTAs point to correct tiers
- Update any outdated pricing mentions
- Add development status indicators

---

## 🧪 TDD IMPLEMENTATION PHASES

### **PHASE 1: WRITE FAILING TESTS** (RED)

#### Test 1: Pricing Display Tests
```javascript
// tests/unit/PricingDisplay.test.jsx

describe('Pricing Display', () => {
  test('should display Starter at $15/month', () => {
    // EXPECT: Starter price is $15
  });
  
  test('should display Pro at $45/month', () => {
    // EXPECT: Pro price is $45
  });
  
  test('should display Premium at $100/month', () => {
    // EXPECT: Premium price is $100
  });
  
  test('should mark Pro as "Most Popular"', () => {
    // EXPECT: Pro has popular badge
  });
  
  test('should show Premium as "Under Development"', () => {
    // EXPECT: Premium has dev badge
  });
});
```

#### Test 2: Template Tier Filtering
```javascript
// tests/unit/TemplateFiltering.test.js

describe('Template Tier Filtering', () => {
  test('should show 13 Starter templates', () => {
    // EXPECT: 13 starter templates available
  });
  
  test('should show 12 Pro templates', () => {
    // EXPECT: 12 pro templates available
  });
  
  test('should show 4 Premium templates', () => {
    // EXPECT: 4 premium templates available
  });
  
  test('should filter templates by tier correctly', () => {
    // EXPECT: Filter returns correct templates per tier
  });
});
```

#### Test 3: Feature Access Gating
```javascript
// tests/unit/FeatureGating.test.js

describe('Feature Access Gating', () => {
  test('Starter plan should NOT have Stripe checkout', () => {
    // EXPECT: hasFeature('starter', 'stripe_checkout') === false
  });
  
  test('Pro plan should have Stripe checkout', () => {
    // EXPECT: hasFeature('pro', 'stripe_checkout') === true
  });
  
  test('Premium plan should have live chat', () => {
    // EXPECT: hasFeature('premium', 'live_chat') === true
  });
  
  test('should prevent access to Premium features', () => {
    // EXPECT: Premium features show "Under Development"
  });
});
```

#### Test 4: Checkout Flow per Tier
```javascript
// tests/integration/CheckoutFlow.test.js

describe('Checkout Flow by Tier', () => {
  test('Starter checkout should redirect to upgrade', () => {
    // EXPECT: No checkout for Starter
  });
  
  test('Pro checkout should process payment', () => {
    // EXPECT: Stripe Connect checkout works
  });
  
  test('Premium checkout should show "Coming Soon"', () => {
    // EXPECT: Premium features gated
  });
});
```

---

### **PHASE 2: IMPLEMENT FEATURES** (GREEN)

#### Task 1: Update Landing Page Pricing Section

**File:** `public/index.html`

**Changes Needed:**
```html
<!-- Current pricing section around line 1400 -->
<section id="pricing" class="pricing-section">
  <h2>Choose Your Plan</h2>
  
  <div class="pricing-grid">
    <!-- STARTER CARD -->
    <div class="pricing-card">
      <h3>Starter</h3>
      <div class="price">$15<span>/month</span></div>
      <p>Perfect for service businesses</p>
      <ul>
        <li>✓ Professional website</li>
        <li>✓ Contact forms</li>
        <li>✓ 13 base templates</li>
        <li>✓ Mobile responsive</li>
        <li>✗ No payment processing</li>
      </ul>
      <button>Get Started</button>
    </div>
    
    <!-- PRO CARD (Most Popular) -->
    <div class="pricing-card featured">
      <div class="badge">Most Popular</div>
      <h3>Pro</h3>
      <div class="price">$45<span>/month</span></div>
      <p>Add e-commerce and payments</p>
      <ul>
        <li>✓ Everything in Starter</li>
        <li>✓ Stripe payments</li>
        <li>✓ Order management</li>
        <li>✓ Google Reviews</li>
        <li>✓ Analytics</li>
      </ul>
      <button class="primary">Upgrade to Pro</button>
    </div>
    
    <!-- PREMIUM CARD (Under Development) -->
    <div class="pricing-card premium">
      <div class="badge dev">Under Development</div>
      <h3>Premium</h3>
      <div class="price">$100<span>/month</span></div>
      <p>Full automation and advanced tools</p>
      <ul>
        <li>✓ Everything in Pro</li>
        <li>✓ Live chat widget</li>
        <li>✓ Advanced booking</li>
        <li>✓ Email automation</li>
        <li>🚧 Coming Q1 2026</li>
      </ul>
      <button class="disabled">Join Waitlist</button>
    </div>
  </div>
</section>
```

#### Task 2: Add Premium "Under Development" Badge Component

**File:** `src/components/common/DevBadge.jsx` (NEW)

```jsx
import React from 'react';
import './DevBadge.css';

function DevBadge({ feature, eta }) {
  return (
    <div className="dev-badge">
      <span className="dev-icon">🚧</span>
      <div className="dev-text">
        <strong>{feature}</strong>
        <span className="dev-eta">{eta}</span>
      </div>
    </div>
  );
}

export default DevBadge;
```

#### Task 3: Update Template Filtering Logic

**File:** `src/utils/templateFilters.js` (NEW)

```javascript
export function filterTemplatesByTier(templates, tier) {
  return templates.filter(template => {
    const templateTier = template.plan?.toLowerCase() || 'starter';
    return templateTier === tier.toLowerCase();
  });
}

export function getTemplateCountByTier(templates) {
  return {
    starter: templates.filter(t => !t.plan || t.plan === 'Starter').length,
    pro: templates.filter(t => t.plan === 'Pro').length,
    premium: templates.filter(t => t.plan === 'Premium').length
  };
}

export function isTemplateTierAvailable(tier) {
  const availableTiers = ['starter', 'pro'];
  return availableTiers.includes(tier.toLowerCase());
}
```

#### Task 4: Update PricingCard to Show Dev Status

**File:** `src/components/pricing/PricingCard.jsx`

**Add:**
```jsx
// After line 43 (featured badge)
{product.underDevelopment && (
  <div className="dev-badge-wrapper">
    <span className="dev-badge">🚧 Under Development</span>
    {product.releaseDate && (
      <span className="dev-eta">Expected: {product.releaseDate}</span>
    )}
  </div>
)}
```

#### Task 5: Update planFeatures.js Metadata

**File:** `src/utils/planFeatures.js`

**Add to PLAN_INFO:**
```javascript
premium: {
  name: 'Premium',
  price: 100,
  duration: 'month',
  color: '#8b5cf6',
  description: 'Full automation and advanced tools',
  ctaText: 'Join Waitlist',
  underDevelopment: true,
  releaseDate: 'Q1 2026',
  status: 'coming_soon'
}
```

---

### **PHASE 3: REFACTOR & OPTIMIZE** (REFACTOR)

#### Refactor 1: Centralize Pricing Configuration

**Create:** `src/config/pricing.config.js`

```javascript
export const PRICING_CONFIG = {
  tiers: {
    starter: {
      id: 'starter',
      name: 'Starter',
      price: 15,
      billingPeriod: 'monthly',
      description: 'Perfect for service businesses',
      features: [
        'Professional website',
        'Contact forms',
        '13 base templates',
        'Mobile responsive',
        'Custom domain'
      ],
      limitations: [
        'No payment processing',
        'No order management'
      ],
      cta: 'Get Started',
      color: '#22c55e',
      available: true
    },
    pro: {
      id: 'pro',
      name: 'Pro',
      price: 45,
      billingPeriod: 'monthly',
      description: 'Add e-commerce and payments',
      features: [
        'Everything in Starter',
        'Stripe Connect payments',
        'Order management',
        'Google Reviews',
        'Analytics dashboard',
        'Email notifications'
      ],
      cta: 'Upgrade to Pro',
      color: '#06b6d4',
      popular: true,
      available: true
    },
    premium: {
      id: 'premium',
      name: 'Premium',
      price: 100,
      billingPeriod: 'monthly',
      description: 'Full automation and advanced tools',
      features: [
        'Everything in Pro',
        'Live chat widget',
        'Advanced booking system',
        'Email automation',
        'CRM integration',
        'Multi-location support'
      ],
      cta: 'Join Waitlist',
      color: '#8b5cf6',
      underDevelopment: true,
      releaseDate: 'Q1 2026',
      available: false
    }
  }
};
```

#### Refactor 2: Create Pricing Hooks

**Create:** `src/hooks/usePricing.js`

```javascript
import { useState, useEffect } from 'react';
import { PRICING_CONFIG } from '../config/pricing.config';

export function usePricing() {
  const [pricing, setPricing] = useState(PRICING_CONFIG.tiers);
  const [loading, setLoading] = useState(false);
  
  // Fetch dynamic pricing from API
  useEffect(() => {
    fetchDynamicPricing();
  }, []);
  
  async function fetchDynamicPricing() {
    setLoading(true);
    try {
      const response = await fetch('/api/pricing');
      const data = await response.json();
      
      // Merge API data with config
      const updated = { ...pricing };
      data.forEach(plan => {
        if (updated[plan.plan]) {
          updated[plan.plan].price = plan.price_monthly / 100;
        }
      });
      
      setPricing(updated);
    } catch (error) {
      console.error('Failed to fetch pricing:', error);
    } finally {
      setLoading(false);
    }
  }
  
  return { pricing, loading };
}

export function usePlanCheck(userPlan, requiredPlan) {
  const hierarchy = ['free', 'starter', 'pro', 'premium'];
  const userIndex = hierarchy.indexOf(userPlan?.toLowerCase());
  const requiredIndex = hierarchy.indexOf(requiredPlan?.toLowerCase());
  
  return userIndex >= requiredIndex;
}
```

---

### **PHASE 4: INTEGRATION TESTING**

#### Integration Test 1: Full Pricing Flow

**File:** `tests/integration/pricing-flow.test.js`

```javascript
import { test, expect } from '@playwright/test';

test.describe('Pricing Flow End-to-End', () => {
  test('should display correct pricing on landing page', async ({ page }) => {
    await page.goto('/');
    
    // Check Starter pricing
    const starterPrice = await page.locator('.pricing-card:has-text("Starter") .price');
    await expect(starterPrice).toHaveText('$15');
    
    // Check Pro pricing
    const proPrice = await page.locator('.pricing-card:has-text("Pro") .price');
    await expect(proPrice).toHaveText('$45');
    
    // Check Premium pricing
    const premiumPrice = await page.locator('.pricing-card:has-text("Premium") .price');
    await expect(premiumPrice).toHaveText('$100');
    
    // Check Premium dev badge
    const devBadge = await page.locator('.pricing-card:has-text("Premium") .dev-badge');
    await expect(devBadge).toBeVisible();
  });
  
  test('should filter templates by tier', async ({ page }) => {
    await page.goto('/setup');
    
    // Filter by Starter
    await page.click('[data-tier-filter="starter"]');
    const starterTemplates = await page.locator('.template-card').count();
    expect(starterTemplates).toBe(13);
    
    // Filter by Pro
    await page.click('[data-tier-filter="pro"]');
    const proTemplates = await page.locator('.template-card').count();
    expect(proTemplates).toBe(12);
    
    // Filter by Premium
    await page.click('[data-tier-filter="premium"]');
    const premiumTemplates = await page.locator('.template-card').count();
    expect(premiumTemplates).toBe(4);
  });
  
  test('should prevent access to Premium features', async ({ page }) => {
    await page.goto('/dashboard.html');
    
    // Try to access Premium feature
    await page.click('[data-feature="live-chat"]');
    
    // Should show upgrade modal
    await expect(page.locator('.upgrade-modal')).toBeVisible();
    await expect(page.locator('.upgrade-modal')).toContainText('Under Development');
  });
});
```

---

## 📊 ACCEPTANCE CRITERIA

### ✅ All Tests Must Pass:

1. **Unit Tests:**
   - [ ] Pricing display shows $15/$45/$100
   - [ ] Template filtering returns correct counts
   - [ ] Feature gating blocks Premium features
   - [ ] Dev badges display correctly

2. **Integration Tests:**
   - [ ] Landing page pricing correct
   - [ ] Template filtering works
   - [ ] Checkout flows per tier
   - [ ] Premium features gated

3. **Visual Tests:**
   - [ ] Pricing cards responsive
   - [ ] Dev badges visible
   - [ ] CTAs correct per tier
   - [ ] Navigation updated

### ✅ Feature Checklist:

- [ ] Landing page pricing updated
- [ ] Premium shows "Under Development"
- [ ] Template counts correct (13/12/4)
- [ ] Feature access properly gated
- [ ] Checkout flows working
- [ ] All tests passing
- [ ] Documentation updated

---

## 🚀 IMPLEMENTATION ORDER

1. **Write all tests first** (RED phase) ← START HERE
2. **Update planFeatures.js** with dev status
3. **Create DevBadge component**
4. **Update PricingCard component**
5. **Update landing page HTML**
6. **Add template filtering logic**
7. **Run tests** (should pass - GREEN phase)
8. **Refactor** common code
9. **Re-run all tests**
10. **Update documentation**

---

## 📝 FILES TO CREATE/UPDATE

### New Files:
- `src/components/common/DevBadge.jsx`
- `src/components/common/DevBadge.css`
- `src/config/pricing.config.js`
- `src/hooks/usePricing.js`
- `src/utils/templateFilters.js`
- `tests/unit/PricingDisplay.test.jsx`
- `tests/unit/TemplateFiltering.test.js`
- `tests/unit/FeatureGating.test.js`
- `tests/integration/pricing-flow.test.js`

### Files to Update:
- `public/index.html` (pricing section)
- `src/components/pricing/PricingCard.jsx`
- `src/utils/planFeatures.js`
- `public/data/templates/index.json` (verify tier classifications)

---

**Status:** 📋 **PLAN COMPLETE - Ready for Implementation**  
**Next Step:** Begin RED phase (write failing tests)  
**Estimated Time:** 4-6 hours for full TDD cycle


