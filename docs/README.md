# SiteSprintz Documentation

Single entry point. Each subfolder has its own `README.md` with canonical docs for that area.

**Agents**: read [`../AGENTS.md`](../AGENTS.md) first.

---

## Start Here

| I need to… | Go to |
|------------|-------|
| Run the project locally | [`setup/QUICK-START.md`](./setup/QUICK-START.md) or [`setup/README.md`](./setup/README.md) |
| Understand the architecture | [`ARCHITECTURE.md`](./ARCHITECTURE.md) |
| Find a file or folder | [`PROJECT_STRUCTURE.md`](./PROJECT_STRUCTURE.md) |
| See feature implementation status | [`features/QUICK_REFERENCE_STATUS.md`](./features/QUICK_REFERENCE_STATUS.md) |
| Write or avoid redundant docs | [`governance/AGENT_DOCUMENTATION_GUIDE.md`](./governance/AGENT_DOCUMENTATION_GUIDE.md) |
| Doc placement rules | [`governance/DOCUMENTATION_POLICIES.md`](./governance/DOCUMENTATION_POLICIES.md) |

---

## By Area

| Folder | Contents |
|--------|----------|
| [`setup/`](./setup/) | Local dev, deploy, OAuth, Stripe, integrations |
| [`development/`](./development/) | JS standards, templates, backend/frontend guides |
| [`features/`](./features/) | Page builder, booking, admin plan features |
| [`ecommerce/`](./ecommerce/) | Cart, checkout, tier gating, E2E tests |
| [`verification/`](./verification/) | Site creation flow verification |
| [`testing/`](./testing/) | Test runbooks and infrastructure |
| [`security/`](./security/) | Security assessment and policies |
| [`plans/`](./plans/) | Backlog and roadmap |
| [`guides/`](./guides/) | Demo and user guides |
| [`reports/`](./reports/) | Report templates only |
| [`governance/`](./governance/) | Documentation policies |
| [`archive/`](./archive/) | Historical docs (read-only) |

---

## Canonical Docs (no duplicates elsewhere)

| Topic | Canonical doc |
|-------|---------------|
| Site creation flow | `verification/SITE_CREATION_PROCESS_VERIFICATION.md` |
| Site from template (quality bar) | `development/SITE-FROM-TEMPLATE-STANDARD.md` |
| E-commerce testing | `ecommerce/ECOMMERCE_TESTING_GUIDE.md` |
| E-commerce tiers | `ecommerce/ECOMMERCE_TIER_CONSOLIDATION.md` |
| Page builder | `features/PLUG_AND_PLAY_IMPLEMENTATION.md` |
| Booking modes | `features/BUSINESS_MODE_CORE_SOLUTION.md` |
| Feature status | `features/QUICK_REFERENCE_STATUS.md` |
| JS standards | `development/JS-STANDARDS.md` |
| Testing standards | `development/TESTING.md` |
| Google OAuth + ngrok | `setup/GOOGLE-OAUTH-NGROK.md` |
| Admin setup | `ADMIN-SETUP.md` |
| Doc efficiency (agents) | `governance/AGENT_DOCUMENTATION_GUIDE.md` |

---

## Maintaining Documentation

1. **Update canonical docs** — do not create parallel `*_SUMMARY`, `*_REPORT`, or index files
2. **Feature status changes** → update `features/QUICK_REFERENCE_STATUS.md`
3. **New primary doc** → add one line to folder `README.md` + row in canonical table above
4. Full rules: [`governance/AGENT_DOCUMENTATION_GUIDE.md`](./governance/AGENT_DOCUMENTATION_GUIDE.md)

## Archive Policy

- **Do not** add new files to `archive/`
- Redundant snapshots: `archive/consolidated-2026/`
- Legacy root docs: `archive/legacy-root/`

---

**Last updated**: June 2026
