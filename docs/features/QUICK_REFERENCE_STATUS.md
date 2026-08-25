# Quick Reference: SiteSprintz Implementation Status
**Updated:** 16 August 2026 (working tree on `production-readiness/audit-remediation`)

This file is the live status of the product **as it runs on disk**, including uncommitted work. Older “Phase 2 research / 787 failing tests / Pro+Premium” narratives are obsolete.

---

## Current product

SiteSprintz is a small-business website builder: template → draft → preview → publish, with optional Growth booking and checkout.

| Layer | Status |
|-------|--------|
| Site creation (draft → preview → publish) | Working. `drafts.routes.js` rewrite is in the working tree — keep it. |
| Tiers | `trial` / `starter` ($10) / `growth` ($35). Legacy `pro`/`premium` alias to Growth. |
| Public marketing site | Story landing + gallery (14 catalog cards, 12 live examples). Header/Footer on public pages. |
| Layout engine | Atelier / Craftsman / Counsel / Mercantile / Bazaar. All 14 catalog niches compose and SSR. |
| Templates | Wizard lists every catalog type including Tow Truck and Product Ordering. Manual tests passed on localhost. |
| Booking | Phase 1 shipped; Phase 2 (fees, reminders, recurring, business mode) is in the working tree — keep. |
| E-commerce | Growth-only cart/checkout. Pay-on-site opt-in exists. |
| Legal | `/legal/terms`, `/privacy`, `/cookies` served by Express. Footer now links them. Vite proxies `/legal`. |
| Security | CSRF, Helmet, env validation, token redaction, local-only test routes. Google OAuth `state` is a random nonce. JWTs dual-write httpOnly cookies (JSON bodies still returned for current clients). |
| Admin outreach finder | Admin-only Google Places search + scored candidate queue (`/api/outreach`). Prospect site + 14-day claim link from queued/saved rows. |
| Owner dashboard share / QR | Published sites: Share on site card + site dashboard opens ShareModal (WhatsApp, Instagram, TikTok, Facebook) and download QR PNG. |
| Build-on-request intake | Public `/build` form → `POST /api/build-intake` (Growth builds). Address privacy callout + service area/radius when street hidden; ops + customer email; labor CTA links here. |

---

## KEEP source (committed 15 Aug 2026)

Landing rewrite, `PublicPageLayout`, story theme, layout engine, 14-template catalog, booking Phase 2, `validateEnv.js`, `policies.js`, legal HTML, custom domain, tracking pages, `AGENTS.md`, canonical docs.

Do not commit: `graphify-out/`, session/retry logs, `public/legacy/`, `.mantest/runs`, `node_modules`.

---

## Not started (post-launch)

Niche Phase 2 extras (salon add-ons, waitlists, gym trials). Named-but-unbuilt flags: live chat, blog CMS, A/B testing, CRM.

---

## Canonical docs (rewritten 15 Aug 2026)

- `docs/development/FRONTEND.md`, `BACKEND.md`, `DATABASE.md`, `TESTING.md`
- `docs/security/SECURITY-ASSESSMENT.md`, `QUICK-START-SECURITY.md`
- `docs/ecommerce/ECOMMERCE_TIER_CONSOLIDATION.md`
- `docs/features/BOOKING-SYSTEM-ASSESSMENT.md`
- `docs/setup/PRODUCTION-SETUP-GUIDE.md`

Superseded: `docs/development/STARTER-VS-PREMIUM.md` (old 3-tier prices). `docs/testing/README.md` is a June 2026 session dump — use `TESTING.md`.
