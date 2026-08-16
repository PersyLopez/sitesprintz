# Backend Documentation

**Last Updated:** 15 August 2026

## Overview

The backend is an Express.js application with business logic kept in `server/services/`, route handlers in `server/routes/`, and data access through Prisma in `database/db.js`. The entry point is `server.js` in the repository root.

## Entry point (`server.js`)

`server.js` performs the following on startup:

1. Loads environment variables and validates required configuration.
2. Tests the database connection (`testConnection`).
3. Initializes security middleware (Helmet, CORS, rate limiting, CSRF, Passport session).
4. Mounts API and public routes.
5. Starts a daily token-cleanup job and a 15-minute booking-reminder job.
6. Serves static files, published-site SSR, and the SPA fallback.

The server listens on `process.env.PORT` or `3000`, bound to `0.0.0.0`.

## Route inventory

All route files live in `server/routes/`. The table below lists the routes that are actually mounted in the working tree and their base paths. A route file may exist on disk but not be mounted.

| Route file | Mounted base path | Notes |
|------------|-------------------|-------|
| `auth.routes.js` | `/api/auth` | Register, login, password reset, email verification, OAuth callbacks. |
| `admin.routes.js` | `/api/admin` | Also mounts `admin-plan-features.routes.js` at `/` and `admin-templates.routes.js` at `/templates`. |
| `analytics.routes.js` | `/api/analytics` | |
| `booking.routes.js` | `/api/booking` | Core booking tenant, services, staff, availability, appointments. |
| `booking-fees.routes.js` | `/api/booking` | Shares `/api/booking` base with `booking.routes.js`. |
| `booking-phase2.routes.js` | `/api/booking` | Shares `/api/booking` base with `booking.routes.js`. |
| `business-mode.routes.js` | `/api/business-mode` | |
| `content.routes.js` | `/api/content` | |
| `domain.routes.js` | `/api/sites` | Mounted under the same base as `sites.routes.js`; last-defined handler wins on collision. |
| `drafts.routes.js` | `/api/drafts` | Critical site-creation flow: `POST /api/drafts` and `POST /api/drafts/:id/publish`. |
| `foundation.routes.js` | `/api/foundation` | Initialized with the query helper from `database/db.js`. |
| `legal.routes.js` | `/legal` | Terms, privacy, cookie, refund policy pages. |
| `orders.routes.js` | `/api/orders` | |
| `payment-facilitator.routes.js` | `/api/payments` | Overlaps base path with `payments.routes.js`. |
| `payments.routes.js` | `/api` | Mounted at root `/api`; overlaps with several other `/api/*` routes. |
| `pricing.routes.js` | `/api/pricing` | Initialized with the query helper. |
| `processor-connect.routes.js` | `/api/payment-processors` and `/api/connect` | Mounted twice. |
| `reviews.routes.js` | `/api/reviews` | |
| `seo.routes.js` | `/` | Must be mounted before static files. |
| `service-requests.routes.js` | `/api/service-requests` | |
| `share.routes.js` | `/api/share` | |
| `showcase.routes.js` | `/api/showcases` | |
| `sites.routes.js` | `/api/sites` | |
| `staff.routes.js` | `/api/staff` | |
| `stripe.routes.js` | `/api/stripe` | |
| `submissions.routes.js` | `/api/submissions` | |
| `templates.routes.js` | `/api/templates` | |
| `tracking.routes.js` | `/api/tracking` | |
| `uploads.routes.js` | `/api/uploads` and `/api/upload` | Alias for backward compatibility. |
| `users.routes.js` | `/api/users` | |
| `visual-editor.routes.js` | `/api` | Mounted at root `/api`; defines `/api/sites/:subdomain/...` paths that may collide with `sites.routes.js`. |
| `webhooks.routes.js` | `/api/webhooks` | Mounted before body-parser JSON to allow raw body verification. |
| `health.js` | `/api/health` and `/health` | |
| `test.routes.js` | `/api` | Mounted only in `development` or `test` environments. |

### Route mount gaps

- `admin-sections.routes.js` exists but is **not imported or mounted** anywhere in `server.js`. It contains TODO stubs for a `section_overrides` table that does not exist in the current schema.
- `admin-plan-features.routes.js` and `admin-templates.routes.js` are mounted only through `admin.routes.js`, so they are not independently addressable.

## Critical flow: draft to publish

The site-creation flow is implemented in `drafts.routes.js`:

1. `POST /api/drafts` creates a draft with a 7-day expiry and stores it in the `drafts` table, falling back to isolated file storage if the table is missing.
2. `GET /api/drafts/:draftId` returns the draft and marks expired drafts as `expired`.
3. `PUT /api/drafts/:draftId` updates the draft business data.
4. `POST /api/drafts/:draftId/publish`:
   - Validates draft ID, email, and plan.
   - Loads the draft from the database (with file fallback).
   - Loads and normalizes the selected template, then merges tenant business data.
   - Resolves the user plan and calls `filterFeaturesByPlan()` before saving.
   - Creates a user account if the email does not exist.
   - Checks for an active subscription or an existing published site before allowing publish.
   - Allocates a unique subdomain, writes isolated site files, and creates the `sites` record.
   - Marks the draft as `published` and returns the live site URL.

## Services

Business logic lives in `server/services/`:

- `emailService.js` and `email-service-wrapper.js` — email sending.
- `bookingService.js`, `bookingNotificationService.js`, and `booking/*` — booking logic, availability, reminders, fees, cancellations, recurring appointments, business-mode handling.
- `subscriptionService.js`, `planFeaturesService.js`, `trialService.js` — subscriptions and tier gating.
- `analyticsService.js` — analytics aggregation.
- `webhookProcessor.js` — Stripe webhook handling.
- `publishedSiteRenderer.js` — SSR for published sites.
- `templates/*` and `templateNormalizer.js` — template-specific data generation and normalization.
- `ProductCatalogService.js`, `orderStateMachine.js`, `trackingService.js`, `domainService.js`, `BusinessModeService.js` — newer service modules added in the working tree.

## Jobs

Two cron jobs are started directly from `server.js`:

- `server/jobs/tokenCleanup.js` — daily at 02:00, cleans expired refresh tokens via `cleanupExpiredTokens()`.
- `server/jobs/booking-reminders.js` — every 15 minutes, sends appointment reminders via `ReminderScheduler.processReminders()`.

Both jobs start unconditionally when the server boots. Test environments may want to guard these or run them explicitly.

## Middleware

Middleware is in `server/middleware/`:

- `auth.js` — `requireAuth` and `requireAdmin`.
- `errorHandler.js` — centralized error responses.
- `notFoundHandler.js` — 404 handler.
- `rateLimiting.js` — general API rate limiter and specific registration/login limits.
- `csrf.js` — CSRF token endpoint and protection.
- `validation.js` — request validation helpers.
- `subscriptionVerification.js`, `trialExpiration.js` — subscription lifecycle checks.

## Error handling

The `errorHandler` middleware returns a consistent JSON shape:

```json
{
  "error": "Human-readable message",
  "code": "ERROR_CODE",
  "details": {}
}
```

Draft and publish endpoints use `asyncHandler` from `server/utils/apiResponse.js` to catch async errors and forward them to the error handler.

## Database access

Import the Prisma client from `database/db.js`:

```javascript
import { prisma } from './database/db.js';
```

Some modules still use raw queries (`prisma.$queryRaw`, `prisma.$executeRaw`) for legacy tables or where Prisma models are not yet fully aligned with the working schema.

## Related documentation

- `docs/ARCHITECTURE.md` — system architecture.
- `docs/development/DATABASE.md` — schema and migrations.
- `docs/verification/SITE_CREATION_PROCESS_VERIFICATION.md` — publish flow verification.
