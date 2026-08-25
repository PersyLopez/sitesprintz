# E-Commerce Tier Consolidation

**Date**: August 15, 2026
**Status**: ✅ Current — three hosting plans (Starter / Growth / Growth Managed); e-commerce stays Growth software
**Source of truth**: `src/config/tiers.js` → consumed by `src/utils/planFeatures.js` and `src/config/pricing.config.js`

---

## Summary

SiteSprintz sells three hosting plans: **Starter** ($10/mo), **Growth** ($35/mo, you edit), and **Growth Managed** ($75/mo, we take the list), plus a 7-day **Trial** (Starter-equivalent, payment method required to publish). Growth Managed is the same booking/checkout software as Growth. All e-commerce — cart, Stripe checkout, order management, product management — is gated to **Growth software** (`growth` and `growth_managed`). Legacy `pro` / `premium` / `business` / `enterprise` / `checkout` plan names normalize to `growth` via `TIER_ALIASES`. Alias `managed` → `growth_managed`.

The earlier "e-commerce moved from Pro to Growth" change (June 2026) is now superseded: Pro and Premium tiers no longer exist as purchasable plans. This document replaces that narrative.

---

## Tier model (current)

| Tier | Price | Position | E-commerce |
|------|-------|----------|-----------|
| `trial` | $0 (7 days) | below Starter | ❌ blocked |
| `starter` | $10/mo ($96/yr) | base paid | ❌ blocked |
| `growth` | $35/mo ($336/yr) | DIY paid | ✅ full e-commerce |
| `growth_managed` | $75/mo | same software as Growth | ✅ full e-commerce |

Legacy aliases (`pro`, `premium`, `business`, `enterprise`, `checkout`) all resolve to `growth` in `normalizeTier()`. Alias `managed` → `growth_managed`. `PLAN_FEATURES` keys are `trial`, `starter`, `growth`, and `growth_managed` (Managed copies Growth).

---

## Feature availability by tier

| Feature | Trial | Starter | Growth |
|---------|-------|---------|--------|
| Shopping cart (`SHOPPING_CART`) | ❌ | ❌ | ✅ |
| Stripe checkout (`STRIPE_CHECKOUT`) | ❌ | ❌ | ✅ |
| Order management (`ORDER_MANAGEMENT`) | ❌ | ❌ | ✅ |
| Product management (`PRODUCT_MANAGEMENT`) | ❌ | ❌ | ✅ |
| Custom domain (`CUSTOM_DOMAIN`) | ❌ | ❌ | ✅ |
| Remove branding (`REMOVE_BRANDING`) | ❌ | ❌ | ✅ |
| Booking widget (`EMBEDDED_BOOKING`) | ❌ | ❌ | ✅ |
| Service / quote request forms | ❌ | ❌ | ✅ |
| Sales analytics (`SALES_ANALYTICS`) | ❌ | ❌ | ✅ |
| Niche modules (calculator, class scheduler, subscription booking, etc.) | ❌ | ❌ | ✅ |
| Contact forms, service display, basic booking link | ✅ | ✅ | ✅ |

Gating helper: `hasFeature(userPlan, FEATURES.STRIPE_CHECKOUT)` from `src/utils/planFeatures.js`.

---

## Working-tree commerce improvements (uncommitted, KEEP)

These files are untracked/modified in the working tree and represent real forward progress. They should be committed, not discarded.

### Pay-on-site (cash / in-person) checkout
- `src/components/ecommerce/PayOnSiteCheckout.jsx` — customer form that posts to `POST /api/orders/:siteId/pay-on-site`; creates an `unpaid` order the owner fulfills in person.
- `src/components/ecommerce/PaymentStatusCard.css`
- `src/utils/payOnSite.js` — `isPayOnSiteEnabled(siteData)` reads `siteData.settings.payOnSite === true` (explicit owner opt-in; layout `cashPayment` defaults do **not** enable it).
- `CheckoutButton.jsx` / `ShoppingCart.jsx` now accept `paymentsReady` and `payOnSite` props. If neither is true, the cart renders an upgrade/notice state instead of a broken Stripe button. `data-testid` attributes added throughout for E2E.

### Merchant payments per site
- `server/routes/payment-facilitator.routes.js` — connects Stripe per site with optional reuse of credentials.
- `server/routes/payments.routes.js` — `/api/payments/checkout/create-session` returns a `redirectUrl` (Stripe Checkout redirect flow) instead of the old client-side `processCheckout` path.

### Order state machine
- `server/services/orderStateMachine.js` — canonical `ORDER_STATUSES`, `PAYMENT_STATUSES`, and allowed-transition tables (`ORDER_STATE_TRANSITIONS`, `PAYMENT_STATE_TRANSITIONS`) with `isValidOrderTransition` / `isValidPaymentTransition` guards. Terminal states (`cancelled`, `refunded`) have no exits; `failed` may retry to `pending`/`paid`.

### Orders route hardening
- `server/routes/orders.routes.js` — adds `requireOrderManagement` middleware (Growth gate), product-count limits via `resolvePlanLimits`, `subdomain` fallback for site lookup, cents/dollars normalization in `formatOwnerOrder`, `checkoutLimiter` / `orderLimiter` rate limiters, and showcase-demo order helpers.

---

## Integration points (must stay in sync)

1. **`siteId` flow**: cart → `POST /api/payments/checkout/create-session` (or pay-on-site) → order row keyed by site `id` or `subdomain`.
2. **Publish parity**: published `site.json` `features.stripeCheckout` must match the owner's tier at publish time (see `server/routes/drafts.routes.js`).
3. **Stripe keys**: env only; test mode in development. Trial/Starter sites must never expose a working checkout button.
4. **Tier checks**: always go through `hasFeature()` / `resolvePlanLimits()` — never read `user.plan` string directly.

---

## Known tier-source-of-truth contradictions (fix outside this doc)

These are tracked for remediation; this doc reflects the **intended** state, not the stale files.

- `src/pages/AdminPlanFeatures.jsx` uses `trial` / `starter` / `growth` via `TIER_HIERARCHY` — fixed 15 Aug 2026.
- `src/components/common/FAQWidget.jsx` describes Starter vs Growth — fixed 15 Aug 2026.
- `.cursor/rules/ecommerce.mdc` says cart/checkout/order management is "Growth, Pro, Premium" — should read "Growth only". **P2.**
- `docs/development/STARTER-VS-PREMIUM.md` describes a 3-tier (Starter / Premium / Checkout) model with old prices and a 14-day trial — superseded by this document. **Flagged, not deleted.**

---

## Testing

- Unit: `npm test` (Vitest) — `tests/unit/planFeatures.test.js` covers `hasFeature` / `normalizeTier`.
- E2E: `npm run test:e2e` (Playwright) — `tests/e2e/site-orders.spec.js`, `tests/e2e/ecommerce-selfhealing.spec.js`.
- Selectors: `data-testid` first; never CSS classes or XPath.

---

## Related documentation

| Topic | Doc |
|-------|-----|
| Booking system status | [../features/BOOKING-SYSTEM-ASSESSMENT.md](../features/BOOKING-SYSTEM-ASSESSMENT.md) |
| Business mode (solo/team/hybrid) | [../features/BUSINESS_MODE_CORE_SOLUTION.md](../features/BUSINESS_MODE_CORE_SOLUTION.md) |
| E-commerce testing | [./ECOMMERCE_TESTING_GUIDE.md](./ECOMMERCE_TESTING_GUIDE.md) |
| Feature status | [../features/QUICK_REFERENCE_STATUS.md](../features/QUICK_REFERENCE_STATUS.md) |
| Site creation (tier at publish) | [../verification/SITE_CREATION_PROCESS_VERIFICATION.md](../verification/SITE_CREATION_PROCESS_VERIFICATION.md) |

**Doc index**: [../README.md](../README.md)
**Maintaining docs**: Update this file when tier rules change — [../governance/AGENT_DOCUMENTATION_GUIDE.md](../governance/AGENT_DOCUMENTATION_GUIDE.md)
