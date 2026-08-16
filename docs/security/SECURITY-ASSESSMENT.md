# SiteSprintz Security Assessment

**Date**: August 15, 2026
**Scope**: Working tree on branch `production-readiness/audit-remediation` (12 committed security commits plus uncommitted/untracked improvements). This assessment reads code on disk, not git HEAD.
**Method**: Direct review of live middleware, routes, config, and utilities against OWASP Top 10 and production-readiness criteria.

---

## Executive Summary

Since the November 2025 assessment, the working tree has materially improved its security posture: boot-time environment validation, explicit secret loading, environment-scoped CORS, CSRF debug removal, token redaction, local-only test routes, AES-256-GCM encryption for processor credentials, path-contained site isolation, multi-processor webhook signature verification with idempotency, and clickwrap legal acceptance with an audit trail.

The remaining gaps are concentrated in three areas: (1) a few legacy fallbacks that contradict the new secret-loading discipline, (2) JWT transport still relying on client-side storage rather than httpOnly cookies, and (3) operational hardening (Redis-backed rate limit/session stores, magic-byte upload validation, OAuth state nonce). None of the open gaps are unknown to the team; they are documented here with file:line citations so they can be triaged.

This document supersedes the November 17, 2025 assessment. Findings here reflect the code as it runs today.

---

## 1. Defenses Present in the Working Tree

### 1.1 Boot-time environment validation

`server/config/validateEnv.js` runs at startup (`server.js:65`) and, in production, blocks startup (`process.exit(1)`) when any of these are missing or set to known dev defaults:

- `JWT_SECRET` missing or equal to `dev-secret-key-change-in-production`
- `ADMIN_TOKEN` missing or equal to `dev-token`
- `ENCRYPTION_KEY` missing or shorter than 32 bytes
- `STRIPE_SECRET_KEY` missing or not a live key (`sk_live_`)
- `STRIPE_WEBHOOK_SECRET` missing
- `STRIPE_PRICE_GROWTH` missing
- `DATABASE_URL` missing
- `GOOGLE_CALLBACK_URL` missing or still pointing at ngrok

Warnings (non-blocking) are emitted for `STRIPE_PRICE_STARTER`, `SERVER_IP`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`. `logBootSummary()` prints presence/absence of secrets and Stripe mode (LIVE/TEST) without printing secret values.

### 1.2 Explicit secret loading

`server/config/secrets.js` provides `getRequiredSecret(name, { allowTestFallback })`. It throws if a secret is missing. The test-only fallback (`test-only-<name>-secret`) is permitted only when `NODE_ENV === 'test'`. This is consumed by `server/middleware/auth.js:7`, `server/services/tokenService.js:17`, `server.js:194` (express-session secret) and `server.js:341` (admin token endpoint).

### 1.3 CORS by environment

`server/config/cors.js` builds the CORS options. In production it throws if `CORS_ORIGINS` is empty. Same-origin requests (no `Origin` header) are always allowed. In non-production, localhost/127.0.0.1/`[::1]`/`.local`/`ngrok` origins are allowed. `credentials: true`; allowed headers include `X-CSRF-Token` and `X-Draft-Access-Token`. Mounted at `server.js:134`.

### 1.4 Helmet / CSP

`server.js:88` configures Helmet with a CSP allowlist (`'self'`, Stripe, Cloudflare Turnstile, Google Fonts), `object-src 'none'`, `frameguard: deny`, HSTS 1-year with preload, `noSniff`, `xssFilter`, `referrer-policy: strict-origin-when-cross-origin`. `scriptSrc` and `styleSrc` include `'unsafe-inline'` (required for the React/Vite SPA); this is an accepted tradeoff, not a regression.

### 1.5 CSRF protection

`server/middleware/csrf.js` enforces a double-submit token: `GET /api/csrf-token` issues a 32-byte hex token stored against a `sessionId` cookie (httpOnly, secure in prod, sameSite=lax, 24h). State-changing methods require `X-CSRF-Token` matched with `crypto.timingSafeEqual`. The previous auth-endpoint bypass is commented out (`csrf.js:141-144`). Webhooks (signature-verified) and public checkout endpoints are intentionally exempt. Requests carrying an `Authorization` header are exempt because the browser does not auto-attach that header cross-site. A test bypass header (`x-test-bypass-csrf`) is honored only outside production. Debug logging is gated behind `CSRF_DEBUG=true`.

### 1.6 Authentication and tokens

- Passwords hashed with bcrypt (cost 10) at `server/routes/auth.routes.js:89,232,697,751`.
- Password strength enforced via `ValidationService.validatePasswordStrength` (12+ chars with complexity) at register, reset, and temp-password change.
- Access tokens are short-lived JWTs (15 minutes, `server/services/tokenService.js:19`).
- Refresh tokens are 64-char random hex strings stored in the `refresh_tokens` table with `revoked`/`revoked_at`/`expires_at`/`last_used_at` columns, enabling real revocation (`tokenService.js:139-172`).
- Logout revokes the specific refresh token or all of the user's tokens (`auth.routes.js:593-606`).
- `requireAuth`/`requireAdmin` (`server/middleware/auth.js`) re-load the user from the database on every request and reject suspended/banned accounts.
- Tokens are redacted in error logs via `server/utils/redaction.js` (`redactValue`, `redactObject`).

### 1.7 Rate limiting

`server/middleware/rateLimiting.js` defines limiters, all using `standardHeaders: true`, `legacyHeaders: false`:

| Limiter | Limit | Key |
|---|---|---|
| `registrationLimiter` | 3 / 15 min | IP |
| `loginLimiter` | 5 / 15 min (prod) | IP, skipSuccessful |
| `passwordResetLimiter` | 3 / hour | email |
| `apiLimiter` | 100 / 15 min | IP |
| `uploadLimiter` | 20 / hour | IP |
| `checkoutLimiter` | 10 / min | IP |
| `orderLimiter` | 100 / hour | IP |

Applied at `server.js:180` for `/api/` (webhooks excluded; they have signature protection).

### 1.8 Test routes local-only

`server/routes/test.routes.js` mounts only when `NODE_ENV` is `test` or `development` (`test.routes.js:31-45`). In `development` it further restricts to loopback IPs unless `DEV_TEST_ROUTE_TOKEN` is set. The router is mounted at `server.js:354`.

### 1.9 Encryption at rest for processor credentials

`server/utils/encryption.js` implements AES-256-GCM with a 12-byte random IV and 16-byte auth tag per ciphertext, base64 output. Key length is enforced (32 bytes). Decryption throws on auth-tag mismatch (tamper detection).

### 1.10 Site isolation and path containment

`server/utils/siteIsolation.js` provides `resolveContainedPath()` (rejects `..`, absolute, NUL bytes), `isSafeSiteIdentifier()` (subdomain regex), `validateDraftId`/`validateSubdomain`/`validateTemplateId` wrappers, and moves draft JSON to `storage/drafts/` (outside `public/`). `server.js:140-150` blocks GET/HEAD on `/drafts` and `/users` from the public tree. SSR route (`server.js:593`) calls `isSafeSiteIdentifier()` before lookup.

### 1.11 Webhook signature verification and idempotency

`server/webhooks/multi-processor-handler.js` verifies signatures for Stripe (`stripe-signature`), Square (`x-square-hmacsha256-signature`), and PayPal (transmission headers + PayPal verify API), then checks the `webhook_events` table for duplicate `event_id`+`processor` before processing. Error messages are sanitized (emails and payment IDs redacted). Webhooks are mounted before `bodyParser.json` so Stripe receives the raw body (`server.js:173`).

### 1.12 Legal acceptance (clickwrap) and audit trail

`server/config/policies.js` exports `POLICY_VERSION = '2026-06-07'` and `THIRD_PARTY_PROCESSORS`. Registration requires `acceptedTerms === true` (`auth.routes.js:70-76`) and logs an audit event with userId, email, policy version, IP, and user agent (`auth.routes.js:152-160`). `server/routes/legal.routes.js` renders Terms, Privacy, Cookies, Refunds, and Third-Party Services pages; processor rows are HTML-escaped via `escapeHtml()` and rendered from the shared config so the public disclosure matches the providers in use.

### 1.13 Stack-trace leakage

`server/middleware/errorHandler.js` includes `err.stack` only when `NODE_ENV === 'development'` and `EXPOSE_ERROR_DETAILS === 'true'`. Production responses return only `{ success, error: message }`. `server/middleware/notFoundHandler.js` returns JSON for `/api/` and a static HTML 404 otherwise (no framework banner leakage).

### 1.14 Turnstile bot protection

`server/utils/captcha.js` verifies Cloudflare Turnstile tokens against the siteverify endpoint. Applied at registration (`auth.routes.js:46-53`) when `TURNSTILE_SECRET_KEY` is set. Skipped in test env.

### 1.15 Secrets hygiene in repo

`.gitignore` ignores `.env`, `.env.*.local`, `csrf_debug.log`, `server.log`, `logs/`, `storage/drafts/`, `public/drafts/*.json`, `public/sites/*/`, `tests/e2e/.auth/`, and `.hermes/`. `.env.example` documents all required variables with generation hints (`openssl rand -hex 32`).

## 2. Findings

Priority definitions: P0 = production blocker / active exploit risk. P1 = serious, fix before launch. P2 = hardening, fix soon. P3 = minor.

### P0

None. The previous P0 items (CSRF auth bypass, missing security headers, no env validation) are resolved in the working tree.

### P1

**P1-1. Admin token value printed to stdout on boot — fixed 15 Aug 2026**
`server.js` now logs only presence (`Admin token: set|missing`). Do not print the secret.

**P1-2. Legacy JWT secret fallback in `auth-google.js` — fixed 15 Aug 2026**
`auth-google.js` signs with `getRequiredSecret('JWT_SECRET', { allowTestFallback: true })`, matching `auth.routes.js`.

**P1-3. OAuth `state` is not a CSRF nonce**
`auth-google.js:136-148` — the `state` parameter passed to Google is the selected plan (e.g. `starter` or `free`) optionally followed by `,intent:publish`. It is predictable business data, not an opaque random token, so it does not protect the OAuth flow against login-CSRF / authorization-code interception replay. Fix: prepend a random `crypto.randomBytes(16).toString('hex')` to state, persist it (Redis or session), and verify it on callback before consuming plan/intent.

**P1-4. CORS env var name mismatch — fixed 15 Aug 2026**
`buildCorsOptions()` and payment origin checks now read `CORS_ORIGINS` and fall back to `ALLOWED_ORIGINS`. `.env.example` documents both.

**P1-5. Upload DELETE path traversal — fixed 15 Aug 2026**
`DELETE /api/uploads/:filename` validates the filename and resolves it with `resolveContainedPath()`.

**P1-6. JWT transport still client-side (XSS-exposed)**
Access and refresh tokens are returned in the JSON response body (`auth.routes.js:195-207, 256-268`) and stored client-side (the legacy `AuthContext` used `localStorage`). Short-lived access tokens reduce blast radius and DB-backed refresh revocation is a real improvement, but a successful XSS still exfiltrates the access token for its 15-minute life and the refresh token for up to 7 days. The November 2025 doc flagged this as P0-3; it remains open. Fix: issue access and refresh tokens as httpOnly, secure, sameSite=strict cookies and stop returning them in the response body; keep `Authorization` header support only for non-browser API clients.

### P2

**P2-1. In-memory rate-limit and CSRF stores**
`rateLimiting.js` and `csrf.js` use the default in-memory stores. Under multi-instance deployment (Railway replicas, containers) each instance tracks its own counters, so an attacker can multiply their budget by instance count and CSRF tokens do not survive a request landing on a different instance. Fix: add `rate-limit-redis` and a Redis-backed CSRF store (the code already references Redis for OAuth state in `.env.example`).

**P2-2. In-memory express-session store**
`server.js:193-198` configures `express-session` with no store (default `MemoryStore`). Sessions are lost on restart and not shared across instances. Used only for Passport OAuth flow. Fix: set `store` to a Redis-backed store and add explicit `cookie.sameSite`, `cookie.maxAge`.

**P2-3. Webhook idempotency fails open**
`server/webhooks/multi-processor-handler.js:51-55` — `checkIdempotency()` returns `false` (not a duplicate) when the DB lookup throws, to "avoid blocking valid events." During a DB outage this allows replayed events to be processed. Fix: on lookup failure, return a 503/500 so the processor retries, rather than risking duplicate side effects.

**P2-4. File upload lacks magic-byte validation and EXIF stripping**
`server/routes/uploads.routes.js:30-44` validates extension and MIME type only. A crafted file with an image extension and image MIME type can still carry a non-image payload or EXIF metadata (GPS, camera owner). Fix: validate with `file-type` magic bytes and strip EXIF with `sharp` (already a dependency) before persisting.

**P2-5. Test routes in `server.js` bypass the local-IP guard**
`server.js:357-400` defines inline `/api/test/upgrade-user` and `/api/test/create-draft-site` under the same `NODE_ENV === 'test' || 'development'` guard as `testRoutes`, but without the `isLocalRequest()` check that `test.routes.js` applies. In a development deployment reachable from a LAN, these endpoints mutate user plans and create draft sites for any caller. Fix: route these through `testRoutes` (which already has the guard) or add the `isLocalRequest` check inline.

**P2-6. Admin token exposed via API**
`server.js:340-343` — `GET /api/admin-token` (behind `requireAdmin`) returns the raw `ADMIN_TOKEN` value in the response body. Even admin-only, returning a long-lived shared secret in an API response increases exposure (proxy logs, browser devtools, accidental frontend logging). Fix: remove the endpoint or return a short-lived derived session token instead.

**P2-7. User enumeration on registration**
`auth.routes.js:84-86` returns `409 USER_EXISTS` when an email is already registered, confirming account existence. Login, forgot-password, resend-verification, and magic-link correctly return generic messages. Fix: return a generic "check your email to complete registration" for existing emails and send an "account already exists" email instead.

**P2-8. Legal page dates inconsistent with policy version**
`server/routes/legal.routes.js` — Terms (`:89`), Privacy (`:296`), Cookies (`:486`), Refunds (`:629`) hardcode "Last Updated: November 14, 2025", while the Third-Party Services page (`:853-854`) correctly uses `POLICY_LAST_UPDATED` (June 7, 2026). The clickwrap audit trail stamps `POLICY_VERSION` at acceptance time, but the displayed dates on four pages are stale and inconsistent. Fix: render all five pages from `POLICY_LAST_UPDATED`.

**P2-9. Cookie policy does not match implementation**
`legal.routes.js:502-520` lists `connect.sid`, `jwt`, and `csrf_token` cookies. The live implementation uses a `sessionId` cookie for CSRF (`csrf.js:70`) and returns JWTs in the response body (no `jwt` cookie is set). The published cookie policy is therefore inaccurate. Fix: update the cookie table to reflect `sessionId` and document token storage accurately.

**P2-10. CSRF debug log writes synchronously**
`server/middleware/csrf.js:19-23` defines `logFile = path.resolve('csrf_debug.log')` and `log()` uses `fs.appendFileSync`. When `CSRF_DEBUG=true` this performs a synchronous file write on every state-changing request. Low volume, but blocks the event loop. Fix: use the structured logger or remove the file-based logger now that debug is gated.

### P3

**P3-1. Rate-limit module logs at load time**
`rateLimiting.js:16` — `console.log(\`[RateLimit] NODE_ENV=...\`)` runs on import. Minor log noise; not sensitive. Fix: remove or gate behind a debug flag.

**P3-2. CSRF token map unbounded in long-running dev**
`csrf.js:27` — `csrfTokens` Map has a FIFO cap of 10000 (`cleanupExpiredTokens`), but cleanup is not scheduled automatically. In a long-running dev session the map can grow until manual cleanup. Fix: schedule `cleanupExpiredTokens()` on an interval or move to Redis.

**P3-3. `notFoundHandler` returns styled HTML for non-API 404s**
`notFoundHandler.js:16-74` returns a full HTML 404 page for non-API routes. This is intentional UX, but the inline styles are duplicated rather than served from the design system. Cosmetic only.

## 3. Working-Tree Changes: Real Improvements vs. Open Gaps

### Real improvements (untracked or modified, first-class)

| File | Change | Verdict |
|---|---|---|
| `server/config/validateEnv.js` (untracked) | Boot-time prod secret/Stripe-live checks, `process.exit(1)` on blocking errors | Real, effective |
| `server/config/policies.js` (untracked) | `POLICY_VERSION` clickwrap + processor list | Real, enforceable |
| `server/middleware/notFoundHandler.js` (untracked) | JSON/HTML 404, no framework banner | Real |
| `server/utils/encryption.js` (untracked) | AES-256-GCM, random IV, auth tag | Real, correct |
| `server/utils/siteIsolation.js` (untracked) | Path containment, draft JSON outside `public/` | Real, correct |
| `server/webhooks/multi-processor-handler.js` (untracked) | Signature verify + idempotency + error sanitize | Real; fails open (P2-3) |
| `server/config/cors.js` (committed) | Env-scoped allowlist, throws if empty in prod | Real; name mismatch (P1-4) |
| `server/config/secrets.js` (committed) | `getRequiredSecret`, test-only fallback | Real; `auth-google.js` not migrated (P1-2) |
| `server/middleware/csrf.js` (modified) | Debug gated behind `CSRF_DEBUG`, auth bypass removed | Real |
| `server/middleware/errorHandler.js` (modified) | Stack traces only in dev + explicit flag | Real |
| `server/middleware/rateLimiting.js` (modified) | Per-route limiters with `standardHeaders` | Real; in-memory (P2-1) |
| `server/routes/legal.routes.js` (modified) | Five legal pages, escapeHtml, policy version | Real; date drift (P2-8) |
| `server/routes/auth.routes.js` | Clickwrap acceptance, audit log, refresh-token revocation | Real |
| `.env.example` (modified) | Documents all required vars + generation hints | Real; CORS name mismatch (P1-4) |
| `.gitignore` (modified) | Ignores logs, drafts, auth state, secrets | Real |

### Still-open gaps (not closed by the working tree)

1. JWT transport: still response-body + client storage, not httpOnly cookies (P1-6).
2. OAuth `state` not a random nonce (P1-3).
3. `auth-google.js` JWT secret fallback (P1-2).
4. Admin token logged on boot (P1-1) and exposed via API (P2-6).
5. CORS env var name split (P1-4).
6. Upload DELETE path traversal + no magic-byte/EXIF handling (P1-5, P2-4).
7. Redis backing missing for rate limit, CSRF, session stores (P2-1, P2-2).
8. Inline test routes in `server.js` lack local-IP guard (P2-5).
9. Webhook idempotency fails open on DB error (P2-3).
10. Legal page date/cookie-policy drift (P2-8, P2-9).

---

## 4. Contradictions vs. the November 2025 Assessment

The November 17, 2025 `SECURITY-ASSESSMENT.md` is now largely obsolete. Specific contradictions:

| 2025 claim | Live code (Aug 2026) | Status |
|---|---|---|
| "CSRF bypass on `/api/auth/` is a production blocker" (`csrf.js:107-112`) | Auth bypass commented out (`csrf.js:141-144`); cookie-parser wired (`server.js:177`) | Resolved |
| "JWT secret weak default `your-secret-key-change-in-production`" (`auth.js:4`) | `secrets.js` throws if missing; `auth.js:7` uses getter | Resolved (except `auth-google.js:12`, P1-2) |
| "No environment variable validation" (Phase 3, P2-4) | `validateEnv.js` blocks prod boot on missing secrets | Resolved |
| "No security headers / Helmet" (P0-4) | `server.js:88` Helmet with full CSP, HSTS, frameguard | Resolved |
| "No rate limiting" (P2) | `rateLimiting.js` with 7 limiters | Resolved (in-memory store remains, P2-1) |
| "No Stripe webhook idempotency" (2.2.A.1) | `webhook_events` table + `checkIdempotency` | Resolved (fails open, P2-3) |
| "JWT in localStorage, move to httpOnly cookies" (P0-3) | Tokens still returned in JSON body | Open (P1-6) |
| "Visual editor XSS, no sanitization" (P0-2) | `ValidationService.sanitizeString` applied via `validate` middleware; CSP restricts script sources | Partially resolved; full DOMPurify-on-store not confirmed in `sites.routes.js` — recommend a follow-up code check |
| "No ownership/IDOR verification" (P1-2) | Not re-verified in this audit; flagged for the routes agent | Needs follow-up |

The 2025 doc's "Phase 1-4" implementation plan is no longer the source of truth; use Section 2 findings here.

---

## 5. Files Not Modified by This Audit

Per scope, this audit did not edit any application code. Only two canonical docs were rewritten:

- `docs/security/SECURITY-ASSESSMENT.md` (this file) — rewritten from live code.
- `docs/security/QUICK-START-SECURITY.md` — rewritten from live code.

Untouched (intentionally):
- `docs/ARCHITECTURE.md`, `docs/plans/BACKLOG.md`, `docs/features/QUICK_REFERENCE_STATUS.md`
- `docs/security/PASSWORD-REQUIREMENTS-IMPLEMENTATION.md` (kept; live code enforces 12+ char complexity via `ValidationService`, consistent)
- `docs/security/SESSION-MANAGEMENT-IMPLEMENTATION.md` (kept; live refresh-token revocation in `tokenService.js` is consistent with it, though the httpOnly-cookie recommendation in that doc is not yet implemented — see P1-6)
- `docs/security/README.md`
- All `server/**`, `src/**`, `auth-google.js`, `vite.config.js`, `.env.example`, `.gitignore`

---

## 6. Vite `/legal` Proxy Check

`vite.config.js` proxies `/api`, `/auth`, `/uploads`, and `/data` to the backend. It does **not** proxy `/legal`. In local development (Vite on port 5173), a Register-page link to `/legal/terms` is served by Vite's static middleware as the SPA `index.html`, not by Express's `legal.routes.js`. The server-rendered legal pages are only reachable in dev by hitting port 3000 directly. In production (single Express server on 3000 serving the built SPA from `dist/`), `/legal/*` is handled by Express before the SPA fallback (`server.js:337`), so legal pages render correctly.

Impact: dev-only UX gap (legal links from Register show the SPA shell instead of the legal HTML in dev). Not a security vulnerability. Fix (optional): add `/legal` to the Vite proxy so dev matches prod.

---

## 7. Pre-Launch Checklist (Current State)

| Item | Status | Evidence |
|---|---|---|
| CSRF on all state-changing endpoints (no bypass) | Done | `csrf.js`, auth bypass removed |
| Security headers (Helmet + CSP) | Done | `server.js:88` |
| Env validation at boot | Done | `validateEnv.js` |
| Explicit secret loading (no fallbacks) | Mostly | `secrets.js`; `auth-google.js:12` still falls back (P1-2) |
| Rate limiting on auth/API/upload | Done | `rateLimiting.js` |
| HTTPS enforced in prod (HSTS) | Done | Helmet hsts preload |
| Webhook signature verification + idempotency | Done | `multi-processor-handler.js` |
| Stack traces hidden in prod | Done | `errorHandler.js` |
| Token redaction in logs | Done | `redaction.js` |
| Clickwrap legal acceptance + audit | Done | `policies.js`, `auth.routes.js:152` |
| Encryption at rest for processor creds | Done | `encryption.js` |
| Path containment for drafts/sites | Done | `siteIsolation.js` |
| JWT in httpOnly cookies | Open | P1-6 |
| OAuth state nonce | Open | P1-3 |
| Redis-backed rate/session/CSRF stores | Open | P2-1, P2-2 |
| Magic-byte upload validation | Open | P2-4 |
| Admin token not logged / not exposed | Open | P1-1, P2-6 |
| CORS env name consistent | Open | P1-4 |

---

*Assessment based on the working tree as of August 15, 2026. Re-review when the P1 items are closed.*

