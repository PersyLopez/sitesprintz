# Quick Start: Security Implementation

**Date**: August 15, 2026
**Audience**: Developers closing the remaining security gaps on `production-readiness/audit-remediation`.
**Prerequisite**: Read [SECURITY-ASSESSMENT.md](./SECURITY-ASSESSMENT.md) for the full findings and citations.

This guide covers only the items still open. Most of the November 2025 critical list (CSRF, Helmet, env validation, rate limiting, token redaction, webhook idempotency, encryption at rest, clickwrap legal) is already implemented in the working tree and needs no action.

---

## P1 — Fix before launch

### 1. Stop logging the admin token on boot — done

`server.js` logs `Admin token: set` or `missing`, not the secret.

### 2. Migrate `auth-google.js` to `getRequiredSecret` — done

Google OAuth signs JWTs with `getRequiredSecret('JWT_SECRET', { allowTestFallback: true })`.

### 3. Make OAuth `state` a random nonce

In `auth-google.js:131-148`, build state as `nonce + ',' + plan + ',intent:' + intent`. Store the nonce (Redis preferred; `express-session` acceptable for single-instance) and verify it in the callback (`auth-google.js:152`) before consuming plan/intent. Reject the request if the nonce is missing or does not match.

```js
const nonce = crypto.randomBytes(16).toString('hex');
// persist nonce keyed by a short-lived cookie or session
const state = [nonce, plan || 'free', intent ? `intent:${intent}` : null]
  .filter(Boolean).join(',');
```

### 4. Unify the CORS env var name — done

`CORS_ORIGINS` is canonical. `ALLOWED_ORIGINS` is still accepted as an alias by `cors.js` and payment origin checks. `.env.example` documents both.

### 5. Sanitize the upload DELETE filename — done

`DELETE /api/uploads/:filename` rejects unsafe names and resolves the path with `resolveContainedPath()`.

### 6. Move JWTs to httpOnly cookies (optional but recommended)

This is the largest remaining item. The refresh-token revocation in `tokenService.js` already limits blast radius; if a launch is imminent, P1-1 through P1-5 can ship first and this can follow. When ready:

- In `auth.routes.js` login/register/refresh, set `accessToken` and `refreshToken` as cookies: `httpOnly: true`, `secure: NODE_ENV === 'production'`, `sameSite: 'strict'`, `maxAge` matching expiry. Stop returning them in the JSON body.
- In `server/middleware/auth.js:13`, read the token from `req.cookies.accessToken` as a fallback to the `Authorization` header (keep the header for non-browser API clients).
- Frontend: remove `localStorage` token storage in `src/context/AuthContext.jsx` and rely on `credentials: 'include'` fetch.

---

## P2 — Fix soon after launch

### 7. Redis backing for rate limit and CSRF

Add `rate-limit-redis` and a Redis client (`server/utils/redis.js` already exists). In `rateLimiting.js`, set `store: new RedisStore({ client, prefix: 'rl:' })` on each limiter. In `csrf.js`, replace the `csrfTokens` Map with a Redis hash keyed by `sessionId` with a TTL of 24h.

### 8. Redis session store

In `server.js:193-198`, set `store: new RedisStore({ client })` on `express-session` and add `cookie: { sameSite: 'lax', maxAge: 24*60*60*1000 }`.

### 9. Webhook idempotency: fail closed

In `server/webhooks/multi-processor-handler.js:51-55`, when `checkIdempotency` catches a DB error, throw or return a 503 so the processor retries, instead of returning `false`.

### 10. Magic-byte upload validation

In `server/routes/uploads.routes.js`, after `multer.single('image')`, read the buffer and validate with `fileTypeFromBuffer` from `file-type`. Strip EXIF with `sharp` (already installed) before writing to disk.

### 11. Route inline test routes through `testRoutes`

Delete the inline `/api/test/upgrade-user` and `/api/test/create-draft-site` handlers in `server.js:357-400` and move them into `server/routes/test.routes.js`, which already has the `isLocalRequest` guard.

### 12. Remove or replace `/api/admin-token`

`server.js:340-343`. Either delete the endpoint (callers should read `ADMIN_TOKEN` from env, not the API) or return a short-lived derived session token.

### 13. Generic registration response

In `auth.routes.js:84-86`, return a generic 200 with an email-sent message for existing emails, and send an "account already exists" email out-of-band.

### 14. Sync legal page dates and cookie policy

In `server/routes/legal.routes.js`, replace the hardcoded "Last Updated: November 14, 2025" on Terms/Privacy/Cookies/Refunds with `${POLICY_LAST_UPDATED}`. Update the cookie table in the Cookies page to list `sessionId` (not `connect.sid`/`jwt`/`csrf_token`) and describe token storage accurately.

---

## Verification

After each fix, run the relevant checks:

```bash
# Unit tests for the touched middleware/config
npm test -- tests/unit/config
npm test -- tests/unit/middleware

# Lint edited files
npx eslint server/config/cors.js server/middleware/csrf.js server/routes/uploads.routes.js

# Manual smoke for CSRF + auth (dev)
npm run dev:backend &
npm run dev
# Register/login flow should succeed; check /api/csrf-token issues a token and cookies are set
```

For the cookie migration (item 6), verify in DevTools that `accessToken` is `httpOnly` and that `localStorage.getItem('authToken')` returns `null`.

---

## Files this guide touches (when implemented)

- `server.js` (boot log, session store, admin-token endpoint, inline test routes)
- `auth-google.js` (secret getter, OAuth state nonce)
- `server/config/cors.js` (no change; canonical name)
- `.env.example` (rename to `CORS_ORIGINS`)
- `server/routes/payments.routes.js` (read `CORS_ORIGINS`)
- `server/routes/uploads.routes.js` (filename validation, magic bytes, EXIF)
- `server/routes/auth.routes.js` (cookie issuance, generic register response)
- `server/middleware/auth.js` (read token from cookie)
- `server/middleware/rateLimiting.js` (Redis store)
- `server/middleware/csrf.js` (Redis store)
- `server/webhooks/multi-processor-handler.js` (fail closed)
- `server/routes/legal.routes.js` (dates, cookie table)
- `src/context/AuthContext.jsx` (remove localStorage)

Do not edit `docs/ARCHITECTURE.md`, `docs/plans/BACKLOG.md`, or `docs/features/QUICK_REFERENCE_STATUS.md` as part of these fixes; update them only if behavior or setup changes warrant it, per `docs/governance/AGENT_DOCUMENTATION_GUIDE.md`.

---

*Based on the working tree as of August 15, 2026.*
