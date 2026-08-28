# SiteSprintz — Agent Development Guide

Canonical context for AI coding assistants working in this repository.
Read this file first, then load area-specific docs only when needed.

---

## Project Overview

**SiteSprintz** is a small-business website builder: template selection → draft editing → publish → live site with optional e-commerce, booking, and admin tooling.

| Layer | Location | Responsibility |
|-------|----------|----------------|
| Frontend | `src/` | React 19 + Vite UI, editor, dashboard |
| API | `server/routes/` | REST endpoints, auth, validation |
| Services | `server/services/` | Business logic, integrations |
| Data | `prisma/`, `database/` | PostgreSQL schema + Prisma client |
| Published assets | `public/` | Templates, published sites, static assets |
| Tests | `tests/` | Vitest (unit/integration), Playwright (E2E) |
| Docs | `docs/` | Architecture, guides, verification reports |

---

## Architecture Summary

```
User → React (src/) → Express API (server/) → Prisma → PostgreSQL
                              ↓
                    public/sites/, public/published/
```

**Critical flows** (do not break without explicit intent):

1. **Site creation**: template → `POST /api/drafts` → preview → `POST /api/drafts/:id/publish`
2. **Feature gating**: `src/config/tiers.js` + `src/utils/planFeatures.js` → applied at publish in `server/routes/drafts.routes.js`
3. **Sections model**: `public/data/section-registry.json` → canonical `sections[]` via normalizer/renderer
4. **E-commerce**: Growth+ tiers get cart/checkout; gated by `hasFeature()`

Deep dive: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

---

## Conventions (Required)

### Code changes

- **Minimize scope** — smallest correct diff; no drive-by refactors
- **Match existing patterns** — naming, imports, error handling in the touched area
- **No `any`** in TypeScript; no `console.log` in production code
- **Tier changes** go through `src/config/tiers.js` and `src/utils/planFeatures.js` only
- **Section changes** update `public/data/section-registry.json` + renderer together
- **Publish path** changes must keep draft → publish → `site.json` parity with preview

### Testing

- Unit/integration: `npm test` (Vitest)
- E2E: `npm run test:e2e` (Playwright)
- Selector priority: `data-testid` → `getByRole` → `getByText` — never CSS classes or XPath
- Mock external deps in unit tests; use transaction rollback or isolated fixtures for integration
- **Turnstile is on for production email signup.** Agents must **log in**, not register. Seed with `npm run seed:testers` (uses `DATABASE_URL`). Credentials: `tests/fixtures/test-credentials.js` — `gallery@sitesprintz.com`, `test@example.com`, `admin@example.com`, `growth@example.com`, `starter@example.com`. Leave `VITE_TURNSTILE_SITE_KEY` unset in local `.env`.

### Documentation (essential only — no redundancy)

**Default: create zero new markdown files.** Prefer code, tests, and chat summaries.

Full guide: [`docs/governance/AGENT_DOCUMENTATION_GUIDE.md`](docs/governance/AGENT_DOCUMENTATION_GUIDE.md)

Create a doc **only if** the user asked, OR all of:
1. No canonical doc exists ([`docs/README.md`](docs/README.md) table)
2. Information is durable (setup, architecture, feature design)
3. It will be reused — not a one-off session report

**Never create**: `*_COMPLETE.md`, `*_SUMMARY.md`, `*_REPORT.md`, session notes, secondary indexes, root markdown, or anything in `docs/archive/`.

**Instead**: update the canonical doc for that topic (see guide). Update `features/QUICK_REFERENCE_STATUS.md` when feature status changes.

**Placement**: [`docs/governance/DOCUMENTATION_POLICIES.md`](docs/governance/DOCUMENTATION_POLICIES.md) — only `README.md`, `AGENTS.md`, `CONTRIBUTING.md` at repo root.

### Git

- Do not commit unless the user asks
- Do not amend pushed commits; no force-push to main
- Conventional commit style when committing

---

## Area-Specific References

| Area | Primary files | Doc |
|------|---------------|-----|
| Site creation | `server/routes/drafts.routes.js`, `src/services/drafts.js` | `docs/verification/SITE_CREATION_PROCESS_VERIFICATION.md` |
| Site from template | named template JSON + publish | `docs/development/SITE-FROM-TEMPLATE-STANDARD.md` |
| Claimable prospects | `server/services/claimTokenService.js`, `server/services/booking/ensurePublishedBooking.js` | `.agent/workflows/claimable_prospect.md` + `.cursor/rules/demo-from-sources.mdc` |
| E-commerce | `src/components/ecommerce/`, `server/routes/orders.routes.js` | `docs/ecommerce/README.md` |
| Tiers & features | `src/config/tiers.js`, `src/utils/planFeatures.js` | `docs/ecommerce/ECOMMERCE_TIER_CONSOLIDATION.md` |
| Page builder | `src/components/setup/PageBuilder.jsx`, `src/config/sectionRegistry.js` | `docs/features/PLUG_AND_PLAY_IMPLEMENTATION.md` |
| Feature status | all features | `docs/features/QUICK_REFERENCE_STATUS.md` |
| Auth / OAuth | `server/routes/auth.routes.js`, `auth-google.js` | `docs/setup/GOOGLE-OAUTH-NGROK.md` |
| JS standards | all `.js`/`.jsx` | `docs/development/JS-STANDARDS.md` |
| Doc efficiency | all tasks | `docs/governance/AGENT_DOCUMENTATION_GUIDE.md` |
| Doc policies | all `docs/**` | `docs/governance/DOCUMENTATION_POLICIES.md` |

---

## Change Workflow for Agents

Before implementing:

1. Identify which **critical flow** is affected (creation, publish, tiers, e-commerce, auth)
2. Read the **smallest set** of files + docs for that area
3. Plan the minimal diff

After implementing:

1. Run relevant tests (`npm test` and/or targeted E2E)
2. Check lints on edited files
3. Update docs only if behavior or setup changed

---

## Environment

Copy `.env.example` → `.env`. Never commit secrets.
Required for local dev: `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`.

---

## Skills (User-Invoked)

When the user invokes a skill by name, follow its workflow:

| Skill | Trigger | Focus |
|-------|---------|-------|
| CodeCraft | "CodeCraft review…" | Code quality, architecture, security |
| TestCraft | "TestCraft…" | Tests; batch max 10; one function/test at a time |
| WebCraft | "WebCraft…" | UI/UX, accessibility, performance |
| FullStackCraft | "FullStackCraft…" | Combined review |
| Antigravity | "Antigravity…" | React 19, Express 5, Playwright advanced patterns |

Skill rules live in `.cursorrules` and `.cursor/GLOBAL_RULES_FOR_CURSOR.md`.

---

## Governance Checklist (Every Non-Trivial Change)

- [ ] Critical flow identified and preserved
- [ ] Tier gating respected if touching features or publish
- [ ] Tests added or updated for behavior changes
- [ ] No secrets, no `console.log`, no unrelated files
- [ ] No new docs unless user asked or durable reference required
- [ ] Updated canonical doc instead of creating parallel report
- [ ] Docs in correct `docs/` subfolder (not repo root, not archive)

---

**Version**: 1.3 | **Last updated**: August 2026

<!-- design-specialist -->
Visual/UI slices (landing, dashboards, Booking, Orders, Products, Analytics) go to `/design-specialist`. Do not use WebCraft or `Task` `generalPurpose` / `explore` as a stand-in. Vault: `vendor/design-specialist/vault/`.
<!-- /design-specialist -->
