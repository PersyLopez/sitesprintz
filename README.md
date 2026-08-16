# SiteSprintz

**Small Business Website Builder** — Launch your professional site in minutes.

[![Tests](https://img.shields.io/badge/tests-85%25-green)]() [![Ready](https://img.shields.io/badge/status-production--ready-brightgreen)]()

---

## Architecture Summary

| Layer | Path | Role |
|-------|------|------|
| Frontend | `src/` | React 19 + Vite — editor, dashboard, published viewer |
| API | `server/routes/` | Express REST — drafts, sites, orders, auth |
| Services | `server/services/` | Business logic, Stripe, booking, templates |
| Data | `prisma/` | PostgreSQL via Prisma ORM |
| Assets | `public/` | Templates, section registry, published sites |
| Tests | `tests/` | Vitest + Playwright |
| Docs | `docs/` | Architecture, setup, verification reports |

**Critical flows**: template → draft → publish → live site; tier-gated features; canonical `sections[]` model.

| Resource | Purpose |
|----------|---------|
| [`AGENTS.md`](./AGENTS.md) | AI assistant & contributor context |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Full architecture |
| [`docs/PROJECT_STRUCTURE.md`](./docs/PROJECT_STRUCTURE.md) | Directory map |
| [`docs/governance/DOCUMENTATION_POLICIES.md`](./docs/governance/DOCUMENTATION_POLICIES.md) | Where docs go |
| [`.cursor/rules/`](./.cursor/rules/) | Scoped agent rules for future changes |

---

## Quick Start

**New here?** Start with [`docs/setup/QUICK-START.md`](./docs/setup/QUICK-START.md) — launch in 15 minutes.

---

## 📚 Essential Documentation

**📖 [Complete Documentation Index](./docs/README.md)** - All documentation organized by category

### Quick Links

| Doc | Purpose | Time |
|-----|---------|------|
| [Production Setup Guide](./docs/setup/PRODUCTION-SETUP-GUIDE.md) | **Complete production deployment with checkboxes** ⭐ | 30-45 min |
| [Quick Start](./docs/setup/QUICK-START.md) | Launch guide, workflow, commands | 5 min |
| [Git Strategy](./docs/setup/GIT-STRATEGY.md) | Branch workflow & daily dev | 3 min |
| [Railway Deploy](./docs/setup/RAILWAY-DEPLOY.md) | Deploy to production | 15 min |
| [Integration Setup](./docs/setup/INTEGRATION-SETUP.md) | Stripe & Email status | 2 min |
| [Admin Setup](./docs/ADMIN-SETUP.md) | 🔐 Create admin account | 2 min |
| [Backlog](./docs/plans/BACKLOG.md) | Current roadmap & tasks | Reference |
| [Strategic Plan](./docs/plans/STRATEGIC-MASTER-PLAN.md) | 3-year vision & unimplemented features | Reference |

---

## ✨ Features

- **12+ Industry Templates** - Restaurant, Salon, Gym, Consultant, etc.
- **3 Layout Variations** per template (Fine-dining, Casual, Fast-casual, etc.)
- **Live Visual Editor** - Drag, drop, and publish
- **Stripe Payments** - Accept orders & subscriptions
- **Email Notifications** - Automated via Resend
- **Interactive Showcase** - Public gallery of sites
- **Booking System** (62.5% complete) - Appointments & reservations
- **Analytics Dashboard** - Track visitors & engagement

---

## 🏃 Run Locally

```bash
# Install
npm install

# Setup database
npm run db:generate

# Dev (backend + frontend)
npm run dev:all

# Test
npm test               # Unit & integration
npm run test:e2e       # End-to-end
```

**Environment:** Copy `.env.example` → `.env` and add your keys.

---

## 🚢 Deploy

**Recommended:** Railway.app (see [`RAILWAY-DEPLOY.md`](./RAILWAY-DEPLOY.md))

```bash
# Build
npm run build:prod

# Start
npm run start:prod
```

**Alternative:** Heroku, AWS, Google Cloud (uses `Procfile` & `Dockerfile`)

---

## 🧪 Test Status

- **Unit Tests:** 2,490/2,940 passing (85%)
- **E2E Tests:** 25/25 core flows passing ✅
- **Integration:** Stripe + Email verified ✅

**Note:** Some test failures are maintenance items, not production bugs. See `BACKLOG.md` → Test Suite Maintenance.

---

## 🛠 Tech Stack

**Frontend:** React, Vite, TailwindCSS  
**Backend:** Node.js, Express  
**Database:** PostgreSQL (Neon) + Prisma ORM  
**Payments:** Stripe Connect  
**Email:** Resend  
**Testing:** Vitest, Playwright  
**Deploy:** Railway, Docker  

---

## 📊 Project Status

| Area | Status |
|------|--------|
| **Core Features** | ✅ 100% Complete |
| **Integrations** | ✅ Stripe + Email |
| **Templates** | ✅ 12 base + 36 layouts |
| **Tests** | ✅ 85% passing |
| **Deployment** | ✅ Production-ready |
| **Booking** | 🟡 62.5% (Phase 1 MVP) |

---

## 🎯 Launch Readiness

**Phase 0:** ✅ **READY NOW**

- All critical paths tested
- Subscriptions working
- Email notifications live
- Templates polished
- Database migrated to Prisma

**Post-Launch:** Test suite maintenance (Week 2-4, non-blocking)

---

## Documentation

**[docs/README.md](./docs/README.md)** — single index. Each subfolder has a `README.md` with canonical docs only.

| Area | Entry point |
|------|-------------|
| Setup | [docs/setup/QUICK-START.md](./docs/setup/QUICK-START.md) |
| Development | [docs/development/JS-STANDARDS.md](./docs/development/JS-STANDARDS.md) |
| Features | [docs/features/QUICK_REFERENCE_STATUS.md](./docs/features/QUICK_REFERENCE_STATUS.md) |
| E-commerce | [docs/ecommerce/README.md](./docs/ecommerce/README.md) |
| Architecture | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) |
| Agent context | [AGENTS.md](./AGENTS.md) |

---

## 🤝 Contributing

**Git Workflow:** `dev` → `staging` → `main`

1. Work on `dev` branch
2. Create `feature/*` branches from `dev`
3. Merge `dev` → `staging` → test
4. Merge `staging` → `main` → deploys

**Documentation:**
- [Git Strategy](./docs/setup/GIT-STRATEGY.md) - Quick reference
- [Git Workflow Best Practices](./docs/setup/GIT-WORKFLOW-BEST-PRACTICES.md) - Complete guide
- [Contributing Guide](./CONTRIBUTING.md) - Full contribution guidelines

---

## 📞 Support

**Email:** persylopez9@gmail.com  
**Admin Portal:** `/admin` (requires ADMIN_TOKEN)

---

## 📝 License

Proprietary - SiteSprintz © 2025

---

**Ready to launch?** → [Quick Start Guide](./docs/setup/QUICK-START.md) 🚀  
**See all docs:** → [Documentation Index](./docs/README.md) 📚
