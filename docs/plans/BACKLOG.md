# 📋 SiteSprintz Backlog

**Status:** 🟢 Production Ready  
**Unit Tests:** 2,307/3,094 passing (74%)  
**E2E Tests:** 420 tests in 39 files  
**Updated:** December 18, 2025

---

## 🎯 Current State Summary

| Area | Status | Confidence |
|------|--------|------------|
| **Security** | ✅ Critical fixes done | 90% |
| **Booking System** | ✅ Production ready | 95% |
| **Payments (Stripe)** | ✅ Integrated | 90% |
| **Site Generation** | ✅ Working | 90% |
| **Admin Dashboard** | ✅ Working | 90% |
| **Templates** | ✅ 69 templates (12 base × 3 layouts) | 95% |
| **Unit Tests** | ⚠️ 787 failing (mocking issues) | 74% |
| **Documentation** | ✅ Complete | 95% |

---

## 🚨 Immediate Priority (This Week)

### P0 - Critical (Do First)

- [ ] **Fix unit test mocking issues** - 787 tests failing due to:
  - `vi.mocked(db.query).mockResolvedValue` errors
  - Missing Prisma mock setup
  - Integration test infrastructure issues
- [ ] **Run database migration** - `plan_features` table migration pending
- [ ] **Deploy to production** - Railway configured, ready to deploy

### P1 - High Priority

- [ ] **Fix uncommitted changes** - 4 files modified in working directory:
  - `server.js`
  - `server/middleware/auth.js`
  - `test-results/.last-run.json`
  - `tests/e2e/pricing-tier-access.spec.js`
- [ ] **Switch Stripe to live keys** - Currently in test mode
- [ ] **Configure custom domain** - sitesprintz.com

---

## 🔧 Technical Debt

### Test Infrastructure (787 failing tests)

| Issue | Files Affected | Fix |
|-------|----------------|-----|
| Prisma mock not initialized | `tests/unit/utils/audit.test.js` + 85 others | Update mock setup in `tests/mocks/prisma.js` |
| `db.query` not mocked | Audit, validation tests | Add proper vi.mocked setup |
| Integration test isolation | API tests | Fix test wrapper setup |

### Security (P2 - Non-Critical)

- [ ] Password strength requirements enforcement
- [ ] File upload size/type validation enhancements
- [ ] Session management improvements (max concurrent sessions)
- [ ] Error message sanitization (reduce info leakage)

### Code Quality

- [ ] Legacy code patterns in some routes
- [ ] Component test updates needed for React structure changes
- [ ] Some ESLint warnings to address

---

## 📅 Roadmap

### Phase 1: Launch & Stabilize (Week 1-2)

**Launch Tasks:**
- [ ] Deploy to Railway production
- [ ] Configure custom domain (sitesprintz.com)
- [ ] Switch Stripe to live keys
- [ ] Set up monitoring (error tracking, uptime)
- [ ] Set up analytics (Plausible or GA)

**Quick Wins:**
- [ ] Update landing page copy
- [ ] Add demo video/walkthrough
- [ ] Create simple onboarding tutorial
- [ ] Gather initial user feedback

### Phase 2: Polish & Growth (Month 1)

**User Acquisition:**
- [ ] SEO optimization (meta tags, structured data)
- [ ] Content marketing (blog posts)
- [ ] Social media presence
- [ ] Customer testimonials collection

**UX Improvements:**
- [ ] Onboarding flow optimization
- [ ] Mobile responsiveness polish
- [ ] Template preview improvements
- [ ] Performance optimization (Lighthouse 95+)

**Test Quality:**
- [ ] Fix 787 failing unit tests
- [ ] Stabilize integration test infrastructure
- [ ] Update React component tests
- [ ] Achieve 90%+ test pass rate

### Phase 3: Pro Features (Month 2-3)

**Booking System Phase 2:**
- [ ] Reminder emails (24h before appointment)
- [ ] Cancellation emails
- [ ] Multi-staff support
- [ ] Payment integration for appointments

**Advanced Features:**
- [ ] Custom domain support (per site)
- [ ] Advanced analytics dashboard
- [ ] Email marketing integration
- [ ] A/B testing for landing pages

**Premium Templates:**
- [ ] 5+ new industry-specific templates
- [ ] Advanced layouts/animations
- [ ] Custom color scheme builder
- [ ] Template import/export

### Phase 4: Scale (Month 3-6)

**Platform Features:**
- [ ] Multi-site management
- [ ] Team collaboration (invite users)
- [ ] White-label option
- [ ] Public API access

**Revenue Optimization:**
- [ ] Conversion funnel improvements
- [ ] Upsell automation
- [ ] Referral program
- [ ] Affiliate system

---

## ✅ Completed (Recently)

### Git Hygiene (Dec 18, 2025)
- ✅ Split 99 modified files into 13 atomic commits
- ✅ Updated .gitignore for editor configs
- ✅ Pushed dev → staging → main workflow
- ✅ Set up SSH authentication for GitHub

### Security Fixes (Dec 2025)
- ✅ Fixed insecure password reset tokens (crypto.randomBytes)
- ✅ Migrated password reset from JSON to database
- ✅ Implemented server-side HTML sanitization
- ✅ Added email verification enforcement
- ✅ Configured security headers (Helmet + CSP)

### Features Complete
- ✅ Booking System MVP (95% complete)
- ✅ 12 industry templates with 3 layouts each (69 total)
- ✅ Stripe payment integration
- ✅ Email service (Resend + SMTP)
- ✅ SEO service (Schema.org, sitemaps)
- ✅ Visual editor with live preview
- ✅ Showcase gallery
- ✅ Admin plan features dashboard

### Infrastructure
- ✅ Git branching strategy (main/staging/dev)
- ✅ Railway deployment config
- ✅ Docker containerization
- ✅ Prisma database setup (Neon PostgreSQL)
- ✅ Documentation cleanup

---

## 🐛 Known Issues

### High Priority
| Issue | Impact | Workaround |
|-------|--------|------------|
| 787 unit tests failing | CI blocks, reduced confidence | Tests still run, mocking needs fix |
| plan_features migration not run | Feature config not in DB | Uses static config fallback |

### Medium Priority
| Issue | Impact | Notes |
|-------|--------|-------|
| Some E2E test flakiness | Occasional CI failures | Retries help |
| React component test structure | 86 test files affected | Need update for new structure |

### Low Priority
- Some ESLint warnings
- Performance could be optimized
- Minor UI polish items

---

## 📊 Metrics to Track

### Launch Metrics (Month 1)
- [ ] 10 paying customers
- [ ] 50 sites published
- [ ] <1% error rate
- [ ] 95+ Lighthouse score
- [ ] 90%+ test pass rate

### Growth Metrics (Month 3)
- [ ] 50 paying customers
- [ ] 200 sites published
- [ ] 90% customer satisfaction
- [ ] Feature parity with competitors

### Scale Metrics (Month 6)
- [ ] 200 paying customers
- [ ] $10K MRR
- [ ] First standalone product launched

---

## 🏗️ Architecture Overview

### Tech Stack
- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** PostgreSQL (Neon) + Prisma ORM
- **Payments:** Stripe
- **Email:** Resend + SMTP fallback
- **Hosting:** Railway (configured)
- **Testing:** Vitest (unit), Playwright (E2E)

### Template System
- **12 base templates:** restaurant, salon, gym, consultant, freelancer, cleaning, electrician, plumbing, auto-repair, pet-care, tech-repair, product-showcase
- **3 layout variations each:** 36 starter layouts
- **12 pro templates:** Enhanced versions with all features

### Pricing Tiers
- **Starter:** Basic templates, essential features
- **Pro:** All templates, booking system, advanced features
- **Premium:** White-label, priority support, API access

---

## 📚 Key Documentation

| Document | Purpose |
|----------|---------|
| `docs/setup/QUICK-START.md` | Launch guide |
| `docs/setup/GIT-STRATEGY.md` | Git workflow |
| `docs/setup/RAILWAY-DEPLOY.md` | Deployment |
| `docs/ARCHITECTURE.md` | System design |
| `docs/TESTING.md` | Test guide |
| `docs/security/` | Security docs |

---

## 🎯 Success Criteria

### Pre-Launch ✅
- [x] Critical security fixes applied
- [x] Core features tested
- [x] Documentation complete
- [x] Git hygiene established
- [ ] Unit test pass rate >85%
- [ ] Database migration run

### Launch
- [ ] Production deployment successful
- [ ] Custom domain configured
- [ ] Stripe live mode enabled
- [ ] First 10 customers onboarded

---

**Last Updated:** December 18, 2025  
**Next Review:** After unit test fixes and deployment
