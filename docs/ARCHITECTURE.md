# SiteSprintz Architecture

**Last updated:** 15 August 2026

SiteSprintz is a small-business website builder: pick a template, edit a draft, preview, then publish a live page. Growth plans add booking and checkout. This document describes the system **as it runs on disk**, including uncommitted work on `production-readiness/audit-remediation`.

---

## System overview

```
User → React (src/) → Express API (server/) → Prisma → PostgreSQL
                    ↓
            public/sites/, public/published/
```

| Layer | Location | Responsibility |
|-------|----------|----------------|
| Frontend | `src/` | React 19 + Vite 7 UI, editor, dashboard, public marketing site |
| API | `server/routes/` | REST endpoints, auth, validation |
| Services | `server/services/` | Business logic, Stripe, booking, email |
| Data | `prisma/`, `database/` | PostgreSQL schema + Prisma client |
| Published assets | `public/` | Templates, published sites, static assets |

### Critical flows (do not break without explicit intent)

1. **Site creation:** template → `POST /api/drafts` → preview → `POST /api/drafts/:id/publish`
2. **Feature gating:** `src/config/tiers.js` + `src/utils/planFeatures.js` → applied at publish in `server/routes/drafts.routes.js`
3. **Sections:** `public/data/section-registry.json` → canonical `sections[]` via normalizer/renderer
4. **E-commerce:** Growth+ only for cart/checkout (`hasFeature`)

### Official tiers

`trial` < `starter` ($10/month) < `growth` ($35/month). Legacy names `pro`, `premium`, `business`, and `free` normalize through `TIER_ALIASES` in `src/config/tiers.js`.

---

## Technology stack

**Backend:** Node.js (ES modules), Express 5, PostgreSQL (Prisma), JWT + bcryptjs, Multer, Sharp.

**Frontend:** React 19, Vite 7, React Router 7, component-scoped CSS (no Tailwind), React Context.

**Integrations:** Stripe Connect, Resend (email), Cloudflare Turnstile, Passport Google OAuth.

**Tests:** Vitest (unit/integration), Playwright (E2E).

**Deploy:** Railway container + Neon Postgres. Frontend build (`vite build` → `dist/`) is served by Express.

---

## Request path

```
Request
  → Helmet, CORS (`CORS_ORIGINS`, with `ALLOWED_ORIGINS` as a legacy alias)
  → Rate limiting
  → CSRF (state-changing routes)
  → Auth / admin middleware
  → Route handler (server/routes + server/services)
  → Prisma
  → Error handler
```

Legal HTML is **not** part of the SPA. Express serves `/legal/terms`, `/legal/privacy`, `/legal/cookies`. Vite proxies `/legal` to the API in development.

---

## Site creation data flow

1. Visitor picks a template (landing gallery or `/setup`).
2. `POST /api/drafts` stores a 7-day draft (database, with file fallback).
3. Editor writes through `PUT /api/drafts/:draftId`.
4. `POST /api/drafts/:draftId/publish` loads the template, merges business data, calls `filterFeaturesByPlan()`, creates the user if needed, and writes published files under `public/`.
5. Live site is available at `/sites/:subdomain` (and custom domain when configured).

Layout families in the working tree: Atelier, Craftsman, Counsel, Mercantile, Bazaar (`src/config/layouts.js`, `layoutTokens.js`, `layoutRenderer.js`).

---

## Payments and booking

- **Platform subscription:** Stripe Checkout for Starter/Growth; webhooks update the user plan.
- **Merchant checkout:** Growth-only; gated by `hasFeature` / `normalizeTier`.
- **Booking:** `/api/booking` (core + fees + Phase 2 reminders/recurring). Reminder cron is started from `server.js`. Staff availability uses the tenant’s staff list, with `'default'` aliased to `getOrCreateDefaultStaff`.

---

## Security architecture

Implemented in the working tree: Helmet, CORS, CSRF, rate limiting, env validation (`validateEnv.js`), token redaction, clickwrap on register, encryption helpers, local-only test routes.

Still open before a production launch (see `docs/security/SECURITY-ASSESSMENT.md`):

- OAuth `state` is plan/intent data, not a CSRF nonce
- JWTs are still returned in JSON bodies (not httpOnly cookies)
- In-memory rate-limit / CSRF / session stores (multi-instance)

---

## Route map (mounted)

Canonical inventory: `docs/development/BACKEND.md`. Notable overlaps: `/api/booking` is mounted three times (core, fees, phase2); `/api/sites` is shared by `sites.routes.js` and `domain.routes.js`. `admin-sections.routes.js` exists on disk but is **not mounted** — do not invent a `section_overrides` table.

---

## Frontend architecture

Public marketing pages use `PublicPageLayout` (skip link + Header + Footer) and `story-public.css`. Auth screens use Header + Footer on Login, Register, ForgotPassword, ResetPassword, and VerifyEmail.

Tier checks must go through `normalizeTier` / `hasTierAccess` / `PLAN_FEATURES`. Do not hardcode `free` / `pro` / `premium` in new UI.

---

## Database

PostgreSQL via Prisma. Core models: users, sites, drafts, booking tenants/staff/appointments, orders, submissions. Details: `docs/development/DATABASE.md`.

Required env: `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`. Production also requires a non-default `ADMIN_TOKEN` and `CORS_ORIGINS` (or legacy `ALLOWED_ORIGINS`).

---

## Related documentation

| Topic | Doc |
|-------|-----|
| Backend | [development/BACKEND.md](./development/BACKEND.md) |
| Frontend | [development/FRONTEND.md](./development/FRONTEND.md) |
| Database | [development/DATABASE.md](./development/DATABASE.md) |
| Security | [security/SECURITY-ASSESSMENT.md](./security/SECURITY-ASSESSMENT.md) |
| Feature status | [features/QUICK_REFERENCE_STATUS.md](./features/QUICK_REFERENCE_STATUS.md) |
| Backlog | [plans/BACKLOG.md](./plans/BACKLOG.md) |
| Production launch | [setup/PRODUCTION-SETUP-GUIDE.md](./setup/PRODUCTION-SETUP-GUIDE.md) |
| Doc index | [README.md](./README.md) |
