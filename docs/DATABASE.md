# 💾 Database Documentation

**Last Updated:** December 2025  
**Version:** 1.0.0

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Models](#models)
4. [Relationships](#relationships)
5. [Indexes](#indexes)
6. [Migrations](#migrations)
7. [Prisma Usage](#prisma-usage)

---

## 🎯 Overview

SiteSprintz uses **PostgreSQL** as the primary database with **Prisma ORM** for type-safe database access.

### Database Provider

- **Production**: Neon (Serverless PostgreSQL)
- **Development**: Local PostgreSQL or Neon
- **ORM**: Prisma 6.x
- **Migrations**: Prisma Migrate

### Key Features

- **UUID Primary Keys**: For users, appointments, and related entities
- **JSON Fields**: For flexible data storage (site_data, features)
- **Timestamps**: Automatic `created_at` and `updated_at`
- **Soft Deletes**: Status fields instead of hard deletes
- **Multi-tenancy**: Booking system supports multiple tenants

---

## 📊 Database Schema

### Schema File

**Location:** `prisma/schema.prisma`

**Key Configuration:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

---

## 🗄 Models

### Users (`users`)

**Purpose:** User accounts and authentication

**Fields:**
- `id` (UUID, Primary Key): User identifier
- `email` (String, Unique): User email address
- `password_hash` (String): Bcrypt hashed password
- `role` (String): User role (`user`, `admin`)
- `status` (String): Account status (`pending`, `active`, `suspended`)
- `subscription_status` (String): Stripe subscription status
- `subscription_plan` (String): Plan tier (`free`, `starter`, `pro`, `premium`)
- `email_verified` (Boolean): Email verification status
- `verification_token` (String, Unique): Email verification token
- `verification_token_expires` (DateTime): Token expiration
- `password_reset_token` (String, Unique): Password reset token
- `password_reset_expires` (DateTime): Reset token expiration
- `google_id` (String, Unique): Google OAuth ID
- `picture` (String): Profile picture URL
- `created_at` (DateTime): Account creation timestamp
- `last_login` (DateTime): Last login timestamp

**Indexes:**
- `email` (unique)
- `google_id` (unique)
- `verification_token`
- `password_reset_token`
- `email_verified`

### Sites (`sites`)

**Purpose:** Website instances

**Fields:**
- `id` (String, Primary Key): Site identifier (subdomain-based)
- `subdomain` (String, Unique): Site subdomain
- `template_id` (String): Template identifier
- `status` (String): Site status (`draft`, `published`, `archived`)
- `plan` (String): Site plan (`free`, `starter`, `pro`, `premium`)
- `published_at` (DateTime): Publication timestamp
- `expires_at` (DateTime): Expiration timestamp (for trials)
- `site_data` (JSON): Site configuration and content
- `json_file_path` (String): Path to site JSON file
- `is_public` (Boolean): Public showcase visibility
- `is_featured` (Boolean): Featured in showcase
- `view_count` (Integer): View counter
- `user_id` (UUID, Foreign Key): Owner user ID
- `created_at` (DateTime): Creation timestamp

**Indexes:**
- `subdomain` (unique)
- `user_id`
- `is_public`
- `is_featured`
- `status`

**Relationships:**
- `users` (many-to-one): Site owner
- `booking_tenants` (one-to-one): Booking configuration
- `submissions` (one-to-many): Contact form submissions

### Booking Tenants (`booking_tenants`)

**Purpose:** Booking system configuration per site

**Fields:**
- `id` (UUID, Primary Key): Tenant identifier
- `site_id` (String, Foreign Key): Associated site
- `user_id` (UUID, Foreign Key): Owner user ID
- `business_name` (String): Business name
- `business_type` (String): Business type
- `phone` (String): Contact phone
- `email` (String): Contact email
- `timezone` (String): Business timezone (default: America/New_York)
- `currency` (String): Currency code (default: USD)
- `booking_page_enabled` (Boolean): Enable booking page
- `confirmation_email_enabled` (Boolean): Send confirmation emails
- `reminder_email_enabled` (Boolean): Send reminder emails
- `status` (String): Tenant status (`active`, `inactive`)
- `created_at` (DateTime): Creation timestamp
- `updated_at` (DateTime): Last update timestamp

**Relationships:**
- `sites` (many-to-one): Associated site
- `users` (many-to-one): Owner user
- `booking_services` (one-to-many): Services offered
- `booking_staff` (one-to-many): Staff members
- `appointments` (one-to-many): Appointments
- `booking_availability_rules` (one-to-many): Availability rules
- `booking_notifications` (one-to-many): Notifications

### Booking Services (`booking_services`)

**Purpose:** Services available for booking

**Fields:**
- `id` (UUID, Primary Key): Service identifier
- `tenant_id` (UUID, Foreign Key): Tenant identifier
- `name` (String): Service name
- `description` (String): Service description
- `category` (String): Service category
- `duration_minutes` (Integer): Service duration
- `price_cents` (Integer): Service price in cents
- `online_booking_enabled` (Boolean): Allow online booking
- `requires_approval` (Boolean): Require manual approval
- `display_order` (Integer): Display order
- `status` (String): Service status (`active`, `inactive`)
- `created_at` (DateTime): Creation timestamp
- `updated_at` (DateTime): Last update timestamp

**Relationships:**
- `booking_tenants` (many-to-one): Parent tenant
- `appointments` (one-to-many): Appointments using this service

### Booking Staff (`booking_staff`)

**Purpose:** Staff members available for appointments

**Fields:**
- `id` (UUID, Primary Key): Staff identifier
- `tenant_id` (UUID, Foreign Key): Tenant identifier
- `name` (String): Staff name
- `email` (String): Staff email
- `phone` (String): Staff phone
- `title` (String): Job title
- `bio` (String): Staff bio
- `avatar_url` (String): Profile picture URL
- `buffer_time_after` (Integer): Buffer time after appointments (minutes)
- `max_advance_booking_days` (Integer): Max days in advance (default: 90)
- `min_advance_booking_hours` (Integer): Min hours in advance (default: 2)
- `display_order` (Integer): Display order
- `is_primary` (Boolean): Primary staff member
- `status` (String): Staff status (`active`, `inactive`)
- `created_at` (DateTime): Creation timestamp
- `updated_at` (DateTime): Last update timestamp

**Relationships:**
- `booking_tenants` (many-to-one): Parent tenant
- `appointments` (one-to-many): Appointments with this staff
- `booking_availability_rules` (one-to-many): Availability rules

### Appointments (`appointments`)

**Purpose:** Booked appointments

**Fields:**
- `id` (UUID, Primary Key): Appointment identifier
- `tenant_id` (UUID, Foreign Key): Tenant identifier
- `service_id` (UUID, Foreign Key): Service identifier
- `staff_id` (UUID, Foreign Key): Staff identifier
- `start_time` (DateTime): Appointment start time
- `end_time` (DateTime): Appointment end time
- `duration_minutes` (Integer): Appointment duration
- `timezone` (String): Appointment timezone
- `customer_name` (String): Customer name
- `customer_email` (String): Customer email
- `customer_phone` (String): Customer phone
- `customer_notes` (String): Customer notes
- `confirmation_code` (String, Unique): Confirmation code
- `booking_source` (String): Booking source (`online`, `phone`, `walk-in`)
- `status` (String): Appointment status (`confirmed`, `pending`, `cancelled`, `completed`)
- `requires_approval` (Boolean): Requires approval
- `cancelled_at` (DateTime): Cancellation timestamp
- `cancellation_reason` (String): Cancellation reason
- `cancelled_by` (String): Who cancelled (`customer`, `staff`, `system`)
- `total_price_cents` (Integer): Total price in cents
- `internal_notes` (String): Internal staff notes
- `created_at` (DateTime): Creation timestamp
- `updated_at` (DateTime): Last update timestamp

**Indexes:**
- `confirmation_code` (unique)
- `customer_email`
- `tenant_id`
- `service_id`
- `staff_id`
- `start_time`
- `status`
- `start_time, end_time` (composite)

**Relationships:**
- `booking_tenants` (many-to-one): Parent tenant
- `booking_services` (many-to-one): Service
- `booking_staff` (many-to-one): Staff member
- `booking_notifications` (one-to-many): Notifications

### Booking Availability Rules (`booking_availability_rules`)

**Purpose:** Staff availability schedules

**Fields:**
- `id` (UUID, Primary Key): Rule identifier
- `tenant_id` (UUID, Foreign Key): Tenant identifier
- `staff_id` (UUID, Foreign Key): Staff identifier
- `day_of_week` (Integer): Day of week (0-6, Sunday=0)
- `start_time` (Time): Availability start time
- `end_time` (Time): Availability end time
- `is_available` (Boolean): Available or blocked
- `created_at` (DateTime): Creation timestamp
- `updated_at` (DateTime): Last update timestamp

**Relationships:**
- `booking_tenants` (many-to-one): Parent tenant
- `booking_staff` (many-to-one): Staff member

### Booking Notifications (`booking_notifications`)

**Purpose:** Email/SMS notifications for bookings

**Fields:**
- `id` (UUID, Primary Key): Notification identifier
- `tenant_id` (UUID, Foreign Key): Tenant identifier
- `appointment_id` (UUID, Foreign Key): Appointment identifier
- `type` (String): Notification type (`confirmation`, `reminder`, `cancellation`)
- `channel` (String): Channel (`email`, `sms`)
- `recipient_email` (String): Recipient email
- `recipient_phone` (String): Recipient phone
- `subject` (String): Email subject
- `message` (String): Notification message
- `status` (String): Status (`pending`, `sent`, `failed`)
- `sent_at` (DateTime): Sent timestamp
- `error_message` (String): Error message if failed
- `provider` (String): Email/SMS provider
- `provider_message_id` (String): Provider message ID
- `created_at` (DateTime): Creation timestamp

**Relationships:**
- `booking_tenants` (many-to-one): Parent tenant
- `appointments` (many-to-one): Related appointment

### Submissions (`submissions`)

**Purpose:** Contact form submissions

**Fields:**
- `id` (Integer, Primary Key): Submission identifier
- `site_id` (String, Foreign Key): Site identifier
- `form_type` (String): Form type (`contact`, `quote`, `booking`)
- `data` (JSON): Submission data
- `status` (String): Status (`unread`, `read`, `replied`, `archived`)
- `created_at` (DateTime): Creation timestamp

**Relationships:**
- `sites` (many-to-one): Associated site

### Pricing (`pricing`)

**Purpose:** Subscription pricing tiers

**Fields:**
- `id` (Integer, Primary Key): Pricing identifier
- `tier` (String, Unique): Tier name (`starter`, `pro`, `premium`)
- `price` (Decimal): Monthly price
- `features` (JSON): Tier features
- `created_at` (DateTime): Creation timestamp
- `updated_at` (DateTime): Last update timestamp

### Menu Items (`menu_items`)

**Purpose:** Restaurant menu items (legacy)

**Fields:**
- `id` (Integer, Primary Key): Item identifier
- `subdomain` (String): Site subdomain
- `name` (String): Item name
- `description` (String): Item description
- `price` (Decimal): Item price
- `category` (String): Item category
- `image` (String): Item image URL
- `display_order` (Integer): Display order
- `created_at` (DateTime): Creation timestamp
- `updated_at` (DateTime): Last update timestamp

### Services (`services`)

**Purpose:** Service offerings (legacy)

**Fields:**
- `id` (Integer, Primary Key): Service identifier
- `subdomain` (String): Site subdomain
- `name` (String): Service name
- `description` (String): Service description
- `duration` (Integer): Service duration
- `price` (Decimal): Service price
- `category` (String): Service category
- `display_order` (Integer): Display order
- `created_at` (DateTime): Creation timestamp
- `updated_at` (DateTime): Last update timestamp

### Products (`products`)

**Purpose:** E-commerce products

**Fields:**
- `id` (Integer, Primary Key): Product identifier
- `subdomain` (String): Site subdomain
- `name` (String): Product name
- `description` (String): Product description
- `price` (Decimal): Product price
- `inventory` (Integer): Stock quantity
- `images` (JSON): Product images array
- `variants` (JSON): Product variants
- `display_order` (Integer): Display order
- `created_at` (DateTime): Creation timestamp
- `updated_at` (DateTime): Last update timestamp

---

## 🔗 Relationships

### Entity Relationship Diagram

```
users (1) ──→ (many) sites
sites (1) ──→ (1) booking_tenants
sites (1) ──→ (many) submissions

booking_tenants (1) ──→ (many) booking_services
booking_tenants (1) ──→ (many) booking_staff
booking_tenants (1) ──→ (many) appointments
booking_tenants (1) ──→ (many) booking_availability_rules
booking_tenants (1) ──→ (many) booking_notifications

booking_services (1) ──→ (many) appointments
booking_staff (1) ──→ (many) appointments
booking_staff (1) ──→ (many) booking_availability_rules

appointments (1) ──→ (many) booking_notifications
```

### Cascade Rules

- **ON DELETE CASCADE**: Deleting a site deletes its booking tenant
- **ON DELETE CASCADE**: Deleting a tenant deletes its services, staff, appointments
- **ON DELETE NO ACTION**: Appointments reference services/staff (prevent orphaned records)

---

## 📇 Indexes

### Performance Indexes

**Users:**
- `email` (unique)
- `google_id` (unique)
- `verification_token`
- `password_reset_token`
- `email_verified`

**Sites:**
- `subdomain` (unique)
- `user_id`
- `is_public`
- `is_featured`
- `status`

**Appointments:**
- `confirmation_code` (unique)
- `customer_email`
- `tenant_id`
- `service_id`
- `staff_id`
- `start_time`
- `status`
- `start_time, end_time` (composite for range queries)
- `staff_id, start_time` (composite for staff availability)

**Booking Services:**
- `tenant_id`
- `category`
- `status`

**Booking Staff:**
- `tenant_id`
- `status`

**Booking Availability Rules:**
- `tenant_id`
- `staff_id`
- `day_of_week`

**Booking Notifications:**
- `tenant_id`
- `appointment_id`
- `status`

---

## 🔄 Migrations

### Migration Management

**Prisma Migrate:**
```bash
npx prisma migrate dev --name migration_name
npx prisma migrate deploy
npx prisma migrate reset
```

**Migration Files:**
- Located in `prisma/migrations/`
- SQL files with up/down migrations
- Timestamped migration names

### Recent Migrations

- `add_email_verification/`: Email verification fields
- `add_password_reset_fields/`: Password reset fields

---

## 🔧 Prisma Usage

### Client Initialization

**Location:** `database/db.js`

```javascript
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
```

### Common Queries

**Find Unique:**
```javascript
const user = await prisma.users.findUnique({
  where: { email: 'user@example.com' }
});
```

**Find Many:**
```javascript
const sites = await prisma.sites.findMany({
  where: { user_id: userId },
  orderBy: { created_at: 'desc' }
});
```

**Create:**
```javascript
const user = await prisma.users.create({
  data: {
    email: 'user@example.com',
    password_hash: hashedPassword
  }
});
```

**Update:**
```javascript
const user = await prisma.users.update({
  where: { id: userId },
  data: { status: 'active' }
});
```

**Delete:**
```javascript
await prisma.sites.delete({
  where: { id: siteId }
});
```

**Include Relations:**
```javascript
const site = await prisma.sites.findUnique({
  where: { id: siteId },
  include: {
    users: true,
    booking_tenants: {
      include: {
        booking_services: true,
        booking_staff: true
      }
    }
  }
});
```

**Transactions:**
```javascript
await prisma.$transaction(async (tx) => {
  await tx.sites.create({ data: siteData });
  await tx.booking_tenants.create({ data: tenantData });
});
```

**Raw Queries:**
```javascript
const result = await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${email}
`;
```

---

## 📚 Related Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [Backend Documentation](./BACKEND.md)
- [API Reference](./API-REFERENCE.md)

---

**Last Updated:** December 2025  
**Maintained by:** SiteSprintz Development Team





