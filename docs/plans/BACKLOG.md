# SiteSprintz Backlog

**Updated:** 15 August 2026 (working tree on `production-readiness/audit-remediation`)

This backlog is the remaining work after the 15 Aug 2026 pillar audit. Older “787 failing tests / Pro+Premium / production ready” snapshots are obsolete. Do not treat this file as a launch certificate.

---

## Current state

| Area | Status | Notes |
|------|--------|--------|
| Site creation | Working | Draft → preview → publish. Keep the drafts rewrite. |
| Tiers | Working | trial / starter ($10) / growth ($35). Aliases for pro/premium. |
| Public marketing | Mostly working | Story landing, 14 gallery templates, legal footer, OG image. |
| Booking | Working | Phase 1 + Phase 2 in the working tree. Staff id no longer hardcoded. |
| Payments | Working locally | Stripe test mode. Live keys are a launch step, not a code gap. |
| Security | Hardened, not finished | CSRF, Helmet, env validation. Remaining: OAuth nonce, httpOnly JWT cookies. |
| Docs | Rewritten 15 Aug 2026 | Canonical files in `docs/development`, `docs/security`, `docs/ecommerce`. |
| Production launch | Not done | Domain, Railway, Stripe live, monitoring. |

---

## Done in this audit (keep)

- [x] Footer Terms / Privacy / Cookies + Vite `/legal` proxy
- [x] `og-image.jpg` and current `index.html` meta
- [x] AvailabilityScheduler uses tenant staff (or `'default'`)
- [x] Admin plan-features UI uses trial / starter / growth
- [x] FAQ and checkout lock copy say Growth, not Pro
- [x] Stop logging raw `ADMIN_TOKEN` on boot
- [x] `auth-google.js` uses `getRequiredSecret` (no public JWT fallback)
- [x] CORS reads `CORS_ORIGINS` with `ALLOWED_ORIGINS` as alias
- [x] Upload DELETE confined to the uploads directory
- [x] Login / Register / VerifyEmail have Footer
- [x] About / Contact copy matches the landing story
- [x] Landing workshop labels removed; missing templates added to the gallery
- [x] `.gitignore` covers graphify-out, session dumps, retry logs, `public/legacy/`

---

## P0 — launch (ops, not product gaps)

- [ ] Commit KEEP source (layout engine, landing rewrite, booking Phase 2, legal, migrations, `AGENTS.md`). Leave graphify-out, session dumps, `public/legacy/`.
- [ ] Railway production deploy with strong secrets (`JWT_SECRET`, `ADMIN_TOKEN`, `ENCRYPTION_KEY`, `CORS_ORIGINS`)
- [ ] `sitesprintz.com` DNS + HTTPS
- [ ] Stripe live keys and webhook endpoint
- [ ] Uptime / error monitoring

---

## P1 — before public launch

- [ ] OAuth `state` as a random nonce (Redis or session), not plan/intent plaintext
- [ ] Move JWTs to httpOnly cookies; stop returning them in JSON bodies
- [ ] Re-run landing / showcase Playwright after the storytelling rewrite
- [ ] Confirm `node_modules` is not tracked (`git rm --cached -r node_modules` if needed)

---

## P2 — polish and later

- [ ] Replace emoji gallery cards with live showcase thumbnails
- [ ] Structured data / drop unused Inter font / cookie-consent if analytics ship
- [ ] Do **not** mount `admin-sections.routes.js` until a real persistence model exists
- [ ] Redis-backed rate limit, CSRF, and session stores for multi-instance
- [ ] Webhook idempotency should fail closed (503) on DB errors

---

## Out of scope (post-launch)

Niche Phase 2 extras (salon add-ons, waitlists, gym trials). Named-but-unbuilt flags: live chat, blog CMS, A/B testing, CRM. Multi-product plan.

---

## Canonical docs

- `docs/ARCHITECTURE.md`
- `docs/features/QUICK_REFERENCE_STATUS.md`
- `docs/development/FRONTEND.md`, `BACKEND.md`, `DATABASE.md`, `TESTING.md`
- `docs/security/SECURITY-ASSESSMENT.md`
- `docs/setup/PRODUCTION-SETUP-GUIDE.md`
