# Database Documentation

**Last Updated:** 15 August 2026

## Overview

SiteSprintz uses PostgreSQL as the primary database with Prisma as the ORM. The Prisma schema is defined in `prisma/schema.prisma`. A legacy hand-written schema also exists in `database/schema.sql` and is not kept in sync with the Prisma model.

## Prisma schema

**Location:** `prisma/schema.prisma`

**Key configuration:**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

The working-tree schema includes the models below. Some models were added or extended by migrations that exist only as untracked files; see the migrations section.

### Core models

| Model | Purpose |
|-------|---------|
| `users` | Accounts, authentication, Stripe Connect, subscription state. |
| `sites` | Published or draft sites, subdomain, plan, custom domain, site data JSON. |
| `drafts` | Draft sites created before publish; references `users` and `sites`. |
| `submissions` | Contact form submissions. |
| `templates` | Template catalog with sections and metadata. |
| `plan_features` | Plan-to-feature mapping used by admin UI. |
| `pricing` | Subscription tier pricing. |
| `refresh_tokens` | JWT refresh token storage. |

### Booking models

| Model | Purpose |
|-------|---------|
| `booking_tenants` | Booking configuration per site (business mode, reminders, payment settings). |
| `booking_services` | Services offered for booking. |
| `booking_staff` | Staff members, availability, and assignment settings. |
| `appointments` | Booked appointments with payment status and cancellation tracking. |
| `booking_availability_rules` | Weekly availability rules per staff member. |
| `booking_notifications` | Confirmation, reminder, and cancellation notifications. |
| `service_staff` | Many-to-many service-to-staff assignments. |
| `staff_users` | Links `booking_staff` to user accounts for employee portal access. |
| `staff_invitations` | Pending staff invitations. |

### E-commerce and orders

| Model | Purpose |
|-------|---------|
| `orders` | Customer orders, Stripe session IDs, payment status, fulfillment. |
| `order_items` | Normalized line items per order. |
| `products` | Product catalog with inventory and variants. |
| `inventory_transactions` | Inventory change audit log. |
| `menu_items` | Legacy restaurant menu items. |
| `services` | Legacy service listings. |

### Payments and webhooks

| Model | Purpose |
|-------|---------|
| `payment_processor_credentials` | Encrypted OAuth tokens for Stripe/Square/PayPal. |
| `site_payment_method` | Active payment method per site. |
| `webhook_events` | Idempotent webhook event log. |

### Analytics

| Model | Purpose |
|-------|---------|
| `analytics_page_views` | Page view events. |
| `analytics_orders` | Order value events. |
| `analytics_conversions` | Conversion events. |

### Tracking and tokens

| Model | Purpose |
|-------|---------|
| `tracking_tokens` | Secure tokens for order/appointment lookup without login. |

## Migrations

Prisma migrations live in `prisma/migrations/`. The working tree contains both tracked migrations and untracked migrations that have not been added to git.

### Tracked migrations (in git)

| Folder | Purpose |
|--------|---------|
| `0_init/` | Initial schema baseline. |
| `add_email_verification/` | Email verification fields on `users`. |
| `add_password_reset_fields/` | Password reset fields on `users`. |
| `add_refresh_tokens/` | Refresh token table. |

### Untracked migrations (working tree only)

| Folder / File | Purpose |
|---------------|---------|
| `20251224003208_add_custom_domain/` | Custom domain fields on `sites`. (Migration file is currently `SELECT 1`; schema already contains the fields.) |
| `20260104172511_add_payment_processor_credentials/` | Payment processor credentials table. (Migration file is currently `SELECT 1`; schema already contains the model.) |
| `20260527010410_add_analytics_tables/` | Creates `analytics_page_views`, `analytics_orders`, `analytics_conversions`. |
| `20260607174057_add_orders_inventory_booking_fields/` | Creates `orders`, `order_items`, `inventory_transactions`; adds booking buffer/reminder fields. |
| `20260607174058_add_double_booking_constraints/` | Exclusion constraint and partial unique index to prevent double-booking. |
| `20260607_add_plan_features/` | Creates `plan_features` table and seeds default features. |
| `add_business_mode/` | Adds business-mode columns to `booking_tenants` and creates `service_staff`. |
| `add_stripe_fields/` | Adds Stripe Connect/customer fields to `users`. |
| `add_custom_domain_migration.sql` | Standalone SQL adding custom domain columns to `sites`. |
| `run-migration-phase2-fees.js` | JavaScript data migration for booking fee policies; not a Prisma migration. |
| `run-migration-phase2-sprint1.js` | JavaScript data migration for reminder/buffer defaults; not a Prisma migration. |

### Applied status

The repository does **not** contain `prisma/migrations/migration_lock.toml`, so the applied state of each migration cannot be determined from disk alone. Run the following against the target database to verify:

```bash
npx prisma migrate status
```

Untracked migration files may not be recorded in `_prisma_migrations` even if their SQL has already been applied manually. The two `run-migration-phase2-*.js` scripts are data migrations and must be executed explicitly with `node` when needed; they are not picked up by `prisma migrate deploy`.

## Legacy SQL files

The `database/` directory contains a non-Prisma migration path:

- `database/schema.sql` — hand-written baseline schema. It does not include booking tables, orders, analytics, or the newer `sites` fields (custom domain, etc.). It also references a `sites.updated_at` trigger that cannot fire because the table lacks an `updated_at` column.
- `database/migrations/` — raw SQL migration files including `add_drafts_table.sql`, `add_plan_features_table.sql`, `add_staff_and_tracking.sql`, and the `002_*_booking_payment_fields.sql` pair.

These files are not used by Prisma Migrate. They exist as documentation and manual migration scripts. Keep them consistent with `prisma/schema.prisma` before relying on them for a fresh environment.

## Data-model gaps

- `server/routes/admin-sections.routes.js` expects a `section_overrides` table. No such model exists in `prisma/schema.prisma`, and the route is not mounted in `server.js`.
- The `plan_features` table is created by both a tracked-style Prisma migration (`20260607_add_plan_features/`) and a raw SQL file (`database/migrations/add_plan_features_table.sql`). The two seed sets use different feature names and plan values; reconciling them is required before the admin UI can treat `plan_features` as canonical.

## Common Prisma patterns

```javascript
import { prisma } from './database/db.js';

// Find one
const user = await prisma.users.findUnique({ where: { email } });

// Find many
const sites = await prisma.sites.findMany({
  where: { user_id: userId },
  orderBy: { created_at: 'desc' }
});

// Transaction
await prisma.$transaction(async (tx) => {
  await tx.sites.create({ data: siteData });
  await tx.booking_tenants.create({ data: tenantData });
});

// Raw query
const result = await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${email}
`;
```

## Related documentation

- `docs/ARCHITECTURE.md` — system architecture.
- `docs/development/BACKEND.md` — backend routes and services.
- `docs/verification/SITE_CREATION_PROCESS_VERIFICATION.md` — site creation and publish flow.
