# E-Commerce Documentation

Canonical docs for cart, checkout, orders, and Stripe integration.

| Document | Use when |
|----------|----------|
| [ECOMMERCE_TIER_CONSOLIDATION.md](./ECOMMERCE_TIER_CONSOLIDATION.md) | Understanding which tiers get checkout (Growth+) |
| [ECOMMERCE_TESTING_GUIDE.md](./ECOMMERCE_TESTING_GUIDE.md) | Full testing methodology |
| [ECOMMERCE_QUICK_TEST.md](./ECOMMERCE_QUICK_TEST.md) | 10-minute smoke test |
| [ECOMMERCE_QUICK_REFERENCE.md](./ECOMMERCE_QUICK_REFERENCE.md) | API endpoints, debugging, code snippets |
| [ECOMMERCE_SELFHEALING_TESTS.md](./ECOMMERCE_SELFHEALING_TESTS.md) | Playwright E2E test suite |

**Code**: `src/components/ecommerce/`, `server/routes/orders.routes.js`, `src/utils/planFeatures.js`

Historical test reports archived in `docs/archive/consolidated-2026/ecommerce/`.

**Maintaining docs**: Update the files above when e-commerce behavior changes. Do not create new `*_REPORT` or `*_SUMMARY` files — see [`../governance/AGENT_DOCUMENTATION_GUIDE.md`](../governance/AGENT_DOCUMENTATION_GUIDE.md).
