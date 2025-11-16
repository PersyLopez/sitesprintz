# 📅 Native Booking System - Detailed Implementation Plan

**Last Updated:** November 15, 2025  
**Feature:** P2-NEW-1 Native Booking System  
**Estimated Effort:** 6-8 weeks (expanded from 2-3 weeks due to standalone requirements)  
**Business Model:** Integrated + Standalone SaaS Service

---

## 🎯 Executive Summary

Building a comprehensive booking/appointment system that serves dual purposes:
1. **Integrated Mode:** Native booking for SiteSprintz website customers
2. **Standalone Mode:** Independent SaaS product competing with Calendly, Acuity, Square Appointments

### Key Differentiators
- **No middleman fees:** Unlike Square (2.9% + 30¢), we control the economics
- **White-label ready:** Clients can brand it fully
- **Embedded + standalone:** Works on SiteSprintz sites AND external sites
- **Local business focused:** Time zones, multi-location, staff scheduling built-in
- **Pricing advantage:** Can undercut Calendly ($12-15/mo) and Acuity ($16-45/mo)

---

## 🏗️ Architecture Overview

### 1. Multi-Tenant Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     BOOKING SYSTEM CORE                      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Auth Layer  │  │   API Layer  │  │  Data Layer  │     │
│  │              │  │              │  │              │     │
│  │ - Tenant ID  │  │ - REST API   │  │ - PostgreSQL │     │
│  │ - User Roles │  │ - GraphQL    │  │ - Redis      │     │
│  │ - Permissions│  │ - Webhooks   │  │ - S3/Assets  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐  ┌──────────────────┐  ┌────────────────┐
│  INTEGRATED   │  │   STANDALONE     │  │  EMBED WIDGET  │
│     MODE      │  │      MODE        │  │   (External)   │
│               │  │                  │  │                │
│ SiteSprintz   │  │ app.bookly.io    │  │ <script>       │
│ Websites      │  │ booking.com      │  │ Any website    │
└───────────────┘  └──────────────────┘  └────────────────┘
```

### 2. Deployment Models

#### A. Integrated Mode (SiteSprintz Context)
- User already has SiteSprintz account
- Booking system is a "feature" of their website
- Shared authentication & billing
- Deep integration with site builder
- URL: `{username}.sitesprintz.com/book` or `{customdomain.com}/book`

#### B. Standalone Mode (Independent Service)
- Separate product identity (e.g., "BookSprintz" or "Bookly")
- Independent authentication & billing
- Own marketing site & onboarding
- URL: `app.booksprintz.com/dashboard` or `{businessname}.booksprintz.com`
- Embed code for external sites: `<script src="booksprintz.com/embed.js">`

#### C. Hybrid Mode
- SiteSprintz users can upgrade to standalone features
- Standalone users can add a SiteSprintz website
- Unified account management

---

## 📊 Database Schema

### Core Tables

```sql
-- ============================================
-- TENANT & USER MANAGEMENT
-- ============================================

CREATE TABLE booking_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(100) UNIQUE, -- e.g., 'johnsalon' -> johnsalon.booksprintz.com
  custom_domain VARCHAR(255) UNIQUE, -- e.g., 'book.johnsalon.com'
  
  -- Connection to SiteSprintz (nullable for standalone)
  sitesprintz_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  sitesprintz_site_id INTEGER REFERENCES sites(id) ON DELETE CASCADE,
  
  -- Tenant Mode
  mode VARCHAR(20) NOT NULL DEFAULT 'integrated', -- 'integrated' | 'standalone' | 'hybrid'
  
  -- Business Information
  business_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(100), -- 'salon', 'consultant', 'medical', 'fitness', etc.
  phone VARCHAR(50),
  email VARCHAR(255),
  timezone VARCHAR(100) DEFAULT 'America/New_York',
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Branding (for white-label)
  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#4F46E5',
  booking_page_settings JSONB DEFAULT '{}',
  
  -- Features & Limits
  plan_tier VARCHAR(20) DEFAULT 'free', -- 'free', 'starter', 'professional', 'enterprise'
  max_locations INTEGER DEFAULT 1,
  max_staff INTEGER DEFAULT 1,
  max_services INTEGER DEFAULT 10,
  
  -- Billing
  stripe_customer_id VARCHAR(255) UNIQUE,
  subscription_status VARCHAR(20) DEFAULT 'active',
  trial_ends_at TIMESTAMP,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_booking_tenants_subdomain ON booking_tenants(subdomain);
CREATE INDEX idx_booking_tenants_sitesprintz_user ON booking_tenants(sitesprintz_user_id);
CREATE INDEX idx_booking_tenants_mode ON booking_tenants(mode);

-- ============================================

CREATE TABLE booking_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES booking_tenants(id) ON DELETE CASCADE,
  
  -- Staff Info
  user_id INTEGER REFERENCES users(id), -- Link to main users table if they have login
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  avatar_url TEXT,
  role VARCHAR(50) DEFAULT 'staff', -- 'owner', 'admin', 'staff'
  
  -- Scheduling
  title VARCHAR(255), -- e.g., 'Senior Stylist', 'Massage Therapist'
  bio TEXT,
  availability_template JSONB, -- Default weekly schedule
  
  -- Settings
  buffer_time_before INTEGER DEFAULT 0, -- Minutes before appointments
  buffer_time_after INTEGER DEFAULT 0, -- Minutes after appointments
  max_advance_booking_days INTEGER DEFAULT 90,
  min_advance_booking_hours INTEGER DEFAULT 2,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_booking_staff_tenant ON booking_staff(tenant_id);
CREATE INDEX idx_booking_staff_user ON booking_staff(user_id);

-- ============================================
-- SERVICES & PRICING
-- ============================================

CREATE TABLE booking_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES booking_tenants(id) ON DELETE CASCADE,
  
  -- Service Details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'haircut', 'massage', 'consultation', etc.
  image_url TEXT,
  
  -- Duration & Pricing
  duration_minutes INTEGER NOT NULL, -- e.g., 30, 60, 90
  price_cents INTEGER NOT NULL,
  deposit_required BOOLEAN DEFAULT FALSE,
  deposit_amount_cents INTEGER,
  deposit_percentage INTEGER, -- Alternative to fixed deposit
  
  -- Capacity
  max_capacity INTEGER DEFAULT 1, -- For group bookings (classes, tours)
  booking_type VARCHAR(20) DEFAULT 'individual', -- 'individual' | 'group' | 'class'
  
  -- Availability
  available_at_locations UUID[], -- Array of location IDs
  available_with_staff UUID[], -- Array of staff IDs (empty = any staff)
  
  -- Settings
  requires_approval BOOLEAN DEFAULT FALSE, -- Manual approval before confirming
  online_booking_enabled BOOLEAN DEFAULT TRUE,
  buffer_time_after INTEGER DEFAULT 0, -- Extra time after this service
  
  -- SEO & Bookings
  slug VARCHAR(255) UNIQUE,
  display_order INTEGER DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_booking_services_tenant ON booking_services(tenant_id);
CREATE INDEX idx_booking_services_category ON booking_services(category);
CREATE INDEX idx_booking_services_slug ON booking_services(slug);

-- ============================================
-- LOCATIONS
-- ============================================

CREATE TABLE booking_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES booking_tenants(id) ON DELETE CASCADE,
  
  -- Location Info
  name VARCHAR(255) NOT NULL,
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'US',
  timezone VARCHAR(100),
  
  -- Contact
  phone VARCHAR(50),
  email VARCHAR(255),
  
  -- Coordinates (for maps)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Settings
  is_primary BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_booking_locations_tenant ON booking_locations(tenant_id);

-- ============================================
-- AVAILABILITY & SCHEDULE
-- ============================================

CREATE TABLE booking_availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES booking_tenants(id) ON DELETE CASCADE,
  
  -- Scope (applies to staff, location, or service)
  staff_id UUID REFERENCES booking_staff(id) ON DELETE CASCADE,
  location_id UUID REFERENCES booking_locations(id) ON DELETE CASCADE,
  service_id UUID REFERENCES booking_services(id) ON DELETE CASCADE,
  
  -- Rule Type
  rule_type VARCHAR(20) NOT NULL, -- 'recurring' | 'override' | 'block'
  
  -- Recurring Rules (weekly schedule)
  day_of_week INTEGER, -- 0=Sunday, 6=Saturday
  start_time TIME,
  end_time TIME,
  
  -- Date-specific Overrides
  specific_date DATE,
  date_range_start DATE,
  date_range_end DATE,
  
  -- Availability
  is_available BOOLEAN DEFAULT TRUE, -- FALSE for blocks/time off
  reason TEXT, -- e.g., "Vacation", "Holiday", "Training"
  
  -- Recurrence
  recurrence_pattern VARCHAR(50), -- 'weekly', 'biweekly', 'monthly'
  recurrence_end_date DATE,
  
  -- Priority (higher numbers override lower)
  priority INTEGER DEFAULT 0,
  
  -- Status
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_availability_tenant ON booking_availability_rules(tenant_id);
CREATE INDEX idx_availability_staff ON booking_availability_rules(staff_id);
CREATE INDEX idx_availability_location ON booking_availability_rules(location_id);
CREATE INDEX idx_availability_date ON booking_availability_rules(specific_date);

-- ============================================
-- APPOINTMENTS
-- ============================================

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES booking_tenants(id) ON DELETE CASCADE,
  
  -- Appointment Details
  service_id UUID NOT NULL REFERENCES booking_services(id),
  staff_id UUID NOT NULL REFERENCES booking_staff(id),
  location_id UUID REFERENCES booking_locations(id),
  
  -- Timing
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  duration_minutes INTEGER NOT NULL,
  timezone VARCHAR(100),
  
  -- Customer Information
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),
  customer_notes TEXT,
  
  -- Customer Account (if registered user)
  customer_user_id INTEGER REFERENCES users(id),
  
  -- Booking Details
  confirmation_code VARCHAR(50) UNIQUE NOT NULL,
  booking_source VARCHAR(50) DEFAULT 'online', -- 'online', 'manual', 'widget', 'api'
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'confirmed', 'cancelled', 'completed', 'no_show'
  requires_approval BOOLEAN DEFAULT FALSE,
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES booking_staff(id),
  
  -- Cancellation
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,
  cancelled_by VARCHAR(50), -- 'customer', 'staff', 'system'
  
  -- Payment
  total_price_cents INTEGER NOT NULL,
  deposit_paid_cents INTEGER DEFAULT 0,
  full_payment_cents INTEGER DEFAULT 0,
  payment_status VARCHAR(20) DEFAULT 'unpaid', -- 'unpaid', 'deposit_paid', 'paid', 'refunded'
  stripe_payment_intent_id VARCHAR(255),
  
  -- Reminders & Notifications
  reminder_sent_at TIMESTAMP,
  confirmation_sent_at TIMESTAMP,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  internal_notes TEXT, -- Staff-only notes
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT valid_deposit CHECK (deposit_paid_cents <= total_price_cents)
);

CREATE INDEX idx_appointments_tenant ON appointments(tenant_id);
CREATE INDEX idx_appointments_staff ON appointments(staff_id);
CREATE INDEX idx_appointments_customer_email ON appointments(customer_email);
CREATE INDEX idx_appointments_start_time ON appointments(start_time);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_confirmation ON appointments(confirmation_code);

-- ============================================
-- CUSTOMERS (for repeat clients)
-- ============================================

CREATE TABLE booking_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES booking_tenants(id) ON DELETE CASCADE,
  
  -- Customer Info
  user_id INTEGER REFERENCES users(id), -- If they have a login account
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  
  -- Preferences
  preferred_staff_id UUID REFERENCES booking_staff(id),
  preferred_location_id UUID REFERENCES booking_locations(id),
  timezone VARCHAR(100),
  
  -- Communication
  email_notifications BOOLEAN DEFAULT TRUE,
  sms_notifications BOOLEAN DEFAULT FALSE,
  marketing_opt_in BOOLEAN DEFAULT FALSE,
  
  -- Notes & Tags
  notes TEXT,
  tags VARCHAR(100)[],
  
  -- Stats
  total_appointments INTEGER DEFAULT 0,
  total_spent_cents INTEGER DEFAULT 0,
  no_show_count INTEGER DEFAULT 0,
  cancellation_count INTEGER DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(tenant_id, email)
);

CREATE INDEX idx_booking_customers_tenant ON booking_customers(tenant_id);
CREATE INDEX idx_booking_customers_email ON booking_customers(email);
CREATE INDEX idx_booking_customers_user ON booking_customers(user_id);

-- ============================================
-- INTEGRATIONS & SYNC
-- ============================================

CREATE TABLE booking_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES booking_staff(id) ON DELETE CASCADE,
  
  -- Provider
  provider VARCHAR(50) NOT NULL, -- 'google', 'outlook', 'apple'
  provider_account_id VARCHAR(255),
  provider_calendar_id VARCHAR(255),
  
  -- Tokens (encrypted)
  access_token TEXT, -- Should be encrypted
  refresh_token TEXT, -- Should be encrypted
  token_expires_at TIMESTAMP,
  
  -- Sync Settings
  sync_direction VARCHAR(20) DEFAULT 'both', -- 'both', 'to_provider', 'from_provider'
  sync_enabled BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMP,
  
  -- Conflict Resolution
  check_conflicts BOOLEAN DEFAULT TRUE, -- Block times when provider calendar has events
  
  -- Status
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_calendar_connections_staff ON booking_calendar_connections(staff_id);

-- ============================================
-- NOTIFICATIONS & REMINDERS
-- ============================================

CREATE TABLE booking_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES booking_tenants(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  
  -- Notification Details
  type VARCHAR(50) NOT NULL, -- 'confirmation', 'reminder', 'cancellation', 'rescheduled'
  channel VARCHAR(20) NOT NULL, -- 'email', 'sms'
  
  -- Recipients
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(50),
  
  -- Content
  subject VARCHAR(500),
  message TEXT,
  
  -- Delivery
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'bounced'
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  
  -- Provider Info
  provider VARCHAR(50), -- 'resend', 'twilio', 'sendgrid'
  provider_message_id VARCHAR(255),
  error_message TEXT,
  
  -- Scheduling
  scheduled_for TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_tenant ON booking_notifications(tenant_id);
CREATE INDEX idx_notifications_appointment ON booking_notifications(appointment_id);
CREATE INDEX idx_notifications_status ON booking_notifications(status);
CREATE INDEX idx_notifications_scheduled ON booking_notifications(scheduled_for);

-- ============================================
-- WEBHOOKS (for integrations)
-- ============================================

CREATE TABLE booking_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES booking_tenants(id) ON DELETE CASCADE,
  
  -- Webhook Configuration
  url TEXT NOT NULL,
  secret VARCHAR(255), -- For signature verification
  events VARCHAR(100)[], -- ['appointment.created', 'appointment.cancelled', etc.]
  
  -- Headers (custom headers to send)
  custom_headers JSONB DEFAULT '{}',
  
  -- Status
  enabled BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMP,
  failure_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhooks_tenant ON booking_webhooks(tenant_id);

-- ============================================
-- WEBHOOK DELIVERY LOG
-- ============================================

CREATE TABLE booking_webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES booking_webhooks(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id),
  
  -- Event
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  
  -- Delivery
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'delivered', 'failed'
  http_status_code INTEGER,
  response_body TEXT,
  error_message TEXT,
  
  -- Retry
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP,
  next_retry_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delivered_at TIMESTAMP
);

CREATE INDEX idx_webhook_deliveries_webhook ON booking_webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_status ON booking_webhook_deliveries(status);

-- ============================================
-- ANALYTICS & REPORTING
-- ============================================

CREATE TABLE booking_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES booking_tenants(id) ON DELETE CASCADE,
  
  -- Event Details
  event_type VARCHAR(100) NOT NULL, -- 'page_view', 'booking_started', 'booking_completed', etc.
  event_data JSONB,
  
  -- Session
  session_id VARCHAR(255),
  user_agent TEXT,
  ip_address INET,
  
  -- Attribution
  referrer TEXT,
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analytics_tenant ON booking_analytics_events(tenant_id);
CREATE INDEX idx_analytics_event_type ON booking_analytics_events(event_type);
CREATE INDEX idx_analytics_created_at ON booking_analytics_events(created_at);

-- ============================================
-- EMBED WIDGETS (for external sites)
-- ============================================

CREATE TABLE booking_embed_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES booking_tenants(id) ON DELETE CASCADE,
  
  -- Widget Configuration
  name VARCHAR(255) NOT NULL,
  widget_type VARCHAR(50) DEFAULT 'inline', -- 'inline', 'modal', 'popup', 'button'
  
  -- Appearance
  theme JSONB DEFAULT '{}', -- Colors, fonts, etc.
  custom_css TEXT,
  
  -- Behavior
  preselected_service_id UUID REFERENCES booking_services(id),
  preselected_staff_id UUID REFERENCES booking_staff(id),
  preselected_location_id UUID REFERENCES booking_locations(id),
  
  -- Domains (for security)
  allowed_domains TEXT[], -- Only allow embedding on these domains
  
  -- Tracking
  embed_code TEXT, -- The actual <script> tag
  views_count INTEGER DEFAULT 0,
  bookings_count INTEGER DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_embed_widgets_tenant ON booking_embed_widgets(tenant_id);
```

---

## 🔌 API Design

### REST API Endpoints

#### Public Booking API (Customer-Facing)

```
# Availability
GET    /api/booking/v1/:tenant/availability
  ?service_id=uuid
  &staff_id=uuid (optional)
  &location_id=uuid (optional)
  &date=2025-11-15
  &timezone=America/New_York

# Services
GET    /api/booking/v1/:tenant/services
GET    /api/booking/v1/:tenant/services/:id

# Staff
GET    /api/booking/v1/:tenant/staff
GET    /api/booking/v1/:tenant/staff/:id

# Locations
GET    /api/booking/v1/:tenant/locations

# Book Appointment
POST   /api/booking/v1/:tenant/appointments
  {
    "service_id": "uuid",
    "staff_id": "uuid",
    "location_id": "uuid",
    "start_time": "2025-11-20T14:00:00Z",
    "customer": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890"
    },
    "notes": "First time client",
    "deposit_payment_method": "stripe_token_xyz" // optional
  }

# Manage Appointment
GET    /api/booking/v1/:tenant/appointments/:id?token=customer_token
PUT    /api/booking/v1/:tenant/appointments/:id/reschedule?token=customer_token
DELETE /api/booking/v1/:tenant/appointments/:id/cancel?token=customer_token
```

#### Admin/Dashboard API

```
# Tenant Management
POST   /api/booking/v1/tenants
GET    /api/booking/v1/tenants/:id
PUT    /api/booking/v1/tenants/:id
DELETE /api/booking/v1/tenants/:id

# Services
POST   /api/booking/v1/tenants/:tenant_id/services
PUT    /api/booking/v1/tenants/:tenant_id/services/:id
DELETE /api/booking/v1/tenants/:tenant_id/services/:id

# Staff
POST   /api/booking/v1/tenants/:tenant_id/staff
PUT    /api/booking/v1/tenants/:tenant_id/staff/:id
DELETE /api/booking/v1/tenants/:tenant_id/staff/:id

# Availability Rules
POST   /api/booking/v1/tenants/:tenant_id/availability-rules
PUT    /api/booking/v1/tenants/:tenant_id/availability-rules/:id
DELETE /api/booking/v1/tenants/:tenant_id/availability-rules/:id

# Appointments (Admin View)
GET    /api/booking/v1/tenants/:tenant_id/appointments
  ?start_date=2025-11-01
  &end_date=2025-11-30
  &status=confirmed
  &staff_id=uuid
  &service_id=uuid

PUT    /api/booking/v1/tenants/:tenant_id/appointments/:id
  // Admin can update status, add notes, reassign, etc.

# Calendar Sync
POST   /api/booking/v1/tenants/:tenant_id/calendar-connections
GET    /api/booking/v1/tenants/:tenant_id/calendar-connections
POST   /api/booking/v1/tenants/:tenant_id/calendar-connections/:id/sync

# Analytics
GET    /api/booking/v1/tenants/:tenant_id/analytics/overview
GET    /api/booking/v1/tenants/:tenant_id/analytics/revenue
GET    /api/booking/v1/tenants/:tenant_id/analytics/customers

# Webhooks
POST   /api/booking/v1/tenants/:tenant_id/webhooks
GET    /api/booking/v1/tenants/:tenant_id/webhooks
PUT    /api/booking/v1/tenants/:tenant_id/webhooks/:id
DELETE /api/booking/v1/tenants/:tenant_id/webhooks/:id

# Embed Widgets
POST   /api/booking/v1/tenants/:tenant_id/widgets
GET    /api/booking/v1/tenants/:tenant_id/widgets/:id/embed-code
```

### GraphQL API (Optional, for complex queries)

```graphql
type Tenant {
  id: ID!
  businessName: String!
  subdomain: String
  services: [Service!]!
  staff: [Staff!]!
  locations: [Location!]!
  appointments(
    startDate: DateTime!
    endDate: DateTime!
    status: AppointmentStatus
  ): [Appointment!]!
}

type Service {
  id: ID!
  name: String!
  description: String
  durationMinutes: Int!
  priceCents: Int!
  availableSlots(
    date: Date!
    staffId: ID
    locationId: ID
  ): [TimeSlot!]!
}

type TimeSlot {
  startTime: DateTime!
  endTime: DateTime!
  available: Boolean!
  staff: Staff
  location: Location
}

type Query {
  tenant(subdomain: String!): Tenant
  availability(
    tenantId: ID!
    serviceId: ID!
    dateRange: DateRange!
    staffId: ID
    locationId: ID
  ): [AvailabilitySlot!]!
}

type Mutation {
  createAppointment(input: CreateAppointmentInput!): Appointment!
  cancelAppointment(id: ID!, reason: String): Appointment!
  rescheduleAppointment(id: ID!, newStartTime: DateTime!): Appointment!
}
```

---

## 💻 Tech Stack

### Backend

**Core:**
- **Node.js + Express** (existing stack) OR **NestJS** (for better structure at scale)
- **PostgreSQL** - Main database
- **Redis** - Caching, real-time availability, rate limiting
- **TypeScript** - Type safety

**Key Libraries:**
```json
{
  "date-fns-tz": "^2.0.0",         // Time zone handling
  "luxon": "^3.4.0",               // Alternative date library
  "node-cron": "^3.0.3",           // Scheduled jobs (reminders)
  "bull": "^4.12.0",               // Job queue (email, SMS)
  "ioredis": "^5.3.2",             // Redis client
  "stripe": "^14.0.0",             // Payments
  "@sendgrid/mail": "^8.0.0",      // Email (or Resend)
  "twilio": "^4.19.0",             // SMS notifications
  "googleapis": "^128.0.0",        // Google Calendar sync
  "microsoft-graph-client": "^3.0.7", // Outlook sync
  "ical-generator": "^6.0.0",      // iCal file generation
  "uuid": "^9.0.1",                // UUID generation
  "joi": "^17.11.0",               // Validation
  "helmet": "^7.1.0",              // Security
  "rate-limiter-flexible": "^4.0.0" // Rate limiting
}
```

### Frontend

**Integrated Dashboard (Admin):**
- **React** (existing SiteSprintz stack)
- **Tailwind CSS**
- **Shadcn/UI** components
- **React Query** - Data fetching
- **Zustand** - State management
- **React Big Calendar** - Calendar UI
- **FullCalendar** - Alternative calendar library

**Booking Widget (Public):**
- **Vanilla JS + Web Components** - For embeddability
- **Preact** (lightweight React alternative, 3KB)
- **Lit** - Web components library
- **CSS-in-JS** - Scoped styles

**Key Frontend Libraries:**
```json
{
  "@tanstack/react-query": "^5.17.0",
  "zustand": "^4.4.7",
  "react-big-calendar": "^1.8.5",
  "fullcalendar": "^6.1.10",
  "react-hook-form": "^7.49.2",
  "zod": "^3.22.4",              // Validation
  "date-fns": "^3.0.0",
  "react-datepicker": "^4.21.0",
  "react-select": "^5.8.0",
  "recharts": "^2.10.3",         // Analytics charts
  "framer-motion": "^10.18.0"    // Animations
}
```

### Third-Party Integrations

| Service | Purpose | Priority |
|---------|---------|----------|
| **Stripe** | Payment processing, deposits | P0 |
| **Resend/SendGrid** | Email notifications | P0 |
| **Twilio** | SMS notifications | P1 |
| **Google Calendar API** | Calendar sync | P1 |
| **Microsoft Graph** | Outlook sync | P1 |
| **Zapier** | Webhook integrations | P2 |
| **Segment** | Analytics | P2 |
| **Sentry** | Error tracking | P1 |

---

## 🎨 User Experience & Flows

### Customer Booking Flow (Public)

```
1. Landing Page
   ↓
2. Select Service
   - Browse services
   - View service details (duration, price, description)
   - [Optional] Select staff member (or "First Available")
   ↓
3. Select Date & Time
   - Calendar view
   - Available time slots highlighted
   - Real-time availability check
   - Time zone display
   ↓
4. Enter Information
   - Name, email, phone
   - Special requests/notes
   - [Optional] Create account (save preferences)
   ↓
5. Payment (if deposit required)
   - Stripe card input
   - Show deposit amount vs. total
   - Pay remaining at appointment
   ↓
6. Confirmation
   - Booking confirmation code
   - Add to Calendar (iCal download)
   - SMS confirmation (if phone provided)
   - Email confirmation
   - Cancel/Reschedule link
```

**UX Principles:**
- ⚡ **Fast:** < 3 clicks to book
- 📱 **Mobile-first:** 60% of bookings are mobile
- ♿ **Accessible:** WCAG 2.1 AA compliant
- 🌍 **Multi-language:** Support 5+ languages
- 🎨 **White-label:** Fully customizable branding

### Business Owner Dashboard

**Key Sections:**
```
Dashboard
├── Calendar View (primary)
│   ├── Day / Week / Month views
│   ├── Drag-and-drop rescheduling
│   ├── Color-coded by service/staff
│   ├── Quick add appointment
│   └── Availability blocks
│
├── Appointments
│   ├── Upcoming
│   ├── Past
│   ├── Pending approval
│   └── Cancelled
│
├── Customers
│   ├── Customer list
│   ├── Customer profiles
│   ├── Booking history
│   └── Notes & tags
│
├── Services
│   ├── Service list
│   ├── Add/edit services
│   ├── Pricing
│   └── Availability
│
├── Staff
│   ├── Staff members
│   ├── Schedules
│   ├── Performance stats
│   └── Calendar connections
│
├── Availability
│   ├── Weekly schedule
│   ├── Time off
│   ├── Holidays
│   └── Special hours
│
├── Settings
│   ├── Business info
│   ├── Booking page customization
│   ├── Notifications
│   ├── Integrations
│   ├── Payments
│   └── Embed code
│
└── Analytics
    ├── Revenue
    ├── Bookings
    ├── Customer acquisition
    └── No-show rate
```

---

## 🚀 Implementation Phases

### Phase 1: MVP - Core Booking (Weeks 1-3)

**Goal:** Basic booking functionality for integrated mode

**Features:**
- ✅ Single-tenant booking system
- ✅ Service management (CRUD)
- ✅ Single staff member
- ✅ Weekly availability schedule
- ✅ Date/time slot selection
- ✅ Basic booking form
- ✅ Email confirmations (Resend)
- ✅ Booking management (view, cancel)
- ✅ Simple calendar view

**Database:**
- Tables: `booking_tenants`, `booking_services`, `booking_staff`, `appointments`, `booking_notifications`

**API Endpoints:**
- Public: availability, services, appointments (create, get, cancel)
- Admin: services CRUD, appointments list

**Tests:**
- Unit: availability algorithm, time slot generation
- Integration: booking flow, email sending
- E2E: complete booking journey

**Deliverable:** Working booking system on SiteSprintz sites

---

### Phase 2: Multi-Tenant + Dashboard (Weeks 3-4)

**Goal:** Professional dashboard and multi-location support

**Features:**
- ✅ Full admin dashboard (React)
- ✅ Calendar view (FullCalendar)
- ✅ Multiple locations
- ✅ Multiple staff members
- ✅ Advanced availability rules
- ✅ Time zone handling
- ✅ Customer profiles
- ✅ Manual appointment creation
- ✅ Drag-and-drop rescheduling

**Database:**
- Add: `booking_locations`, `booking_availability_rules`, `booking_customers`

**UI Components:**
- Calendar component
- Appointment form
- Service editor
- Staff scheduler

**Deliverable:** Feature-complete dashboard for business owners

---

### Phase 3: Payments + Notifications (Week 5)

**Goal:** Monetization and customer communication

**Features:**
- ✅ Stripe integration (deposits)
- ✅ Payment status tracking
- ✅ SMS notifications (Twilio)
- ✅ Email reminders (scheduled)
- ✅ Booking confirmation emails
- ✅ Cancellation notifications
- ✅ iCal attachments
- ✅ No-show tracking

**Database:**
- Update: `appointments` (payment fields)
- Enhanced: `booking_notifications` (scheduling)

**Background Jobs:**
- Reminder emails (24 hours before)
- Reminder SMS (2 hours before)
- Follow-up emails (after appointment)

**Deliverable:** Complete payment and notification system

---

### Phase 4: Calendar Sync + Advanced Features (Week 6)

**Goal:** Professional-grade features

**Features:**
- ✅ Google Calendar sync
- ✅ Outlook Calendar sync
- ✅ Two-way sync
- ✅ Conflict detection
- ✅ Webhook system
- ✅ Group bookings (classes)
- ✅ Approval workflow
- ✅ Buffer times
- ✅ Recurring availability

**Database:**
- Add: `booking_calendar_connections`, `booking_webhooks`, `booking_webhook_deliveries`

**OAuth Flows:**
- Google OAuth 2.0
- Microsoft OAuth 2.0

**Deliverable:** Enterprise-ready features

---

### Phase 5: Standalone Mode + Embed Widget (Weeks 7-8)

**Goal:** Standalone SaaS product

**Features:**
- ✅ Standalone subdomain system
- ✅ Independent authentication
- ✅ Embeddable widget (JavaScript)
- ✅ Widget customization
- ✅ Multi-domain support
- ✅ White-label branding
- ✅ API documentation
- ✅ Analytics dashboard
- ✅ Marketing landing page

**Database:**
- Add: `booking_embed_widgets`, `booking_analytics_events`
- Update: `booking_tenants` (mode field)

**New Components:**
- Widget builder (admin)
- Embeddable booking widget
- Standalone onboarding flow

**Deliverable:** Standalone booking product ready to launch

---

## 💰 Business Model & Pricing

### Integrated Mode (SiteSprintz Add-On)

**Starter Tier** - $0/month
- ✅ 1 location
- ✅ 1 staff member
- ✅ Up to 5 services
- ✅ 50 bookings/month
- ✅ Email notifications
- ✅ Basic calendar
- ⛔ No SMS
- ⛔ No calendar sync
- ⛔ No custom branding

**Pro Tier** - $19/month (add-on to SiteSprintz Pro)
- ✅ 1 location
- ✅ Up to 3 staff members
- ✅ Unlimited services
- ✅ 200 bookings/month
- ✅ Email + SMS notifications
- ✅ Google Calendar sync
- ✅ Custom branding
- ✅ Webhooks
- ✅ Analytics

**Business Tier** - $49/month
- ✅ 3 locations
- ✅ Up to 10 staff members
- ✅ Unlimited bookings
- ✅ Google + Outlook sync
- ✅ Priority support
- ✅ API access
- ✅ White-label
- ✅ Advanced analytics

---

### Standalone Mode (BookSprintz/Bookly)

**Free** - $0/month
- ✅ 1 location
- ✅ 1 staff member
- ✅ Up to 3 services
- ✅ 30 bookings/month
- ✅ Email notifications
- ✅ BookSprintz branding
- ⛔ No embed widget
- ⛔ No calendar sync

**Starter** - $12/month (undercut Calendly's $12)
- ✅ 1 location
- ✅ 2 staff members
- ✅ Unlimited services
- ✅ 100 bookings/month
- ✅ Email + SMS (100 SMS/mo)
- ✅ Google Calendar sync
- ✅ Embed widget
- ✅ Remove branding
- ✅ Analytics

**Professional** - $29/month (vs. Acuity $16-34, Square $0 + fees)
- ✅ 3 locations
- ✅ 5 staff members
- ✅ Unlimited bookings
- ✅ Google + Outlook sync
- ✅ Unlimited SMS
- ✅ Webhooks
- ✅ API access
- ✅ Priority support
- ✅ Advanced analytics

**Enterprise** - $99/month
- ✅ Unlimited locations
- ✅ Unlimited staff
- ✅ Unlimited everything
- ✅ White-label
- ✅ Dedicated support
- ✅ Custom integrations
- ✅ SLA guarantee

**Payment Processing:**
- No transaction fees on deposits (we're not Square!)
- Customer uses their own Stripe account
- We facilitate, not middleman

---

### Competitor Analysis

| Feature | **Our Product** | Calendly | Acuity | Square |
|---------|-----------------|----------|--------|--------|
| **Price (Pro)** | $12-29/mo | $12-16/mo | $16-34/mo | Free* |
| **Transaction Fees** | 0% | 0% | 0% | 2.9% + 30¢ |
| **Staff Members** | 2-5 | 1-6 | 1-6 | Unlimited |
| **Calendar Sync** | ✅ | ✅ | ✅ | ✅ |
| **SMS** | ✅ Unlimited | ✅ Limited | ✅ Paid | ✅ Paid |
| **Embed Widget** | ✅ | ✅ | ✅ | ✅ |
| **White-Label** | ✅ $99/mo | ❌ | ✅ $45/mo | ❌ |
| **Website Builder** | ✅ Included | ❌ | ✅ Separate | ✅ Separate |
| **API Access** | ✅ $29/mo | ✅ $16/mo | ✅ $34/mo | ✅ |
| **Self-Hosted** | 🚀 Future | ❌ | ❌ | ❌ |

**Our Advantage:**
1. **No transaction fees** (vs Square's 2.9% + 30¢)
2. **Website + Booking** bundled (vs buying separately)
3. **Unlimited SMS** at Pro tier (others charge per SMS)
4. **Cheaper white-label** ($99 vs Acuity's $45 + higher base)
5. **Local business focus** (multi-location, staff, services)

---

## 🔧 Technical Considerations

### 1. Time Zone Handling

**Challenge:** Customer in NYC books with salon in LA
- Customer sees times in EST
- Salon sees times in PST
- Database stores in UTC

**Solution:**
```javascript
// Store everything in UTC
appointment.start_time = '2025-11-20T22:00:00Z' // UTC

// Display in user's timezone
const customerTimezone = 'America/New_York'
const businessTimezone = 'America/Los_Angeles'

// Customer sees: 5:00 PM EST
// Business sees: 2:00 PM PST
// Database has: 10:00 PM UTC

// Libraries:
- date-fns-tz for conversions
- Luxon for complex timezone logic
- Store timezone with each appointment
```

### 2. Availability Algorithm

**Challenge:** Calculate available slots considering:
- Staff schedule
- Existing appointments
- Buffer times
- Service duration
- Location hours
- Time off / holidays
- Calendar sync conflicts

**Algorithm:**
```javascript
function calculateAvailableSlots(params) {
  const {
    serviceId,
    staffId,
    date,
    timezone
  } = params
  
  // 1. Get base availability (weekly schedule)
  const baseSchedule = getStaffSchedule(staffId, date)
  
  // 2. Apply overrides (time off, holidays)
  const adjustedSchedule = applyOverrides(baseSchedule, staffId, date)
  
  // 3. Get existing appointments
  const existingAppointments = getAppointments(staffId, date)
  
  // 4. Get synced calendar events (conflicts)
  const calendarConflicts = getCalendarConflicts(staffId, date)
  
  // 5. Calculate slots
  const serviceDuration = getService(serviceId).duration_minutes
  const bufferTime = getStaff(staffId).buffer_time_after
  const slotDuration = serviceDuration + bufferTime
  
  // 6. Generate time slots
  const slots = []
  for (let time = adjustedSchedule.start; time < adjustedSchedule.end; time += slotDuration) {
    const slot = {
      start_time: time,
      end_time: time + serviceDuration,
      available: !hasConflict(time, slotDuration, existingAppointments, calendarConflicts)
    }
    slots.push(slot)
  }
  
  // 7. Filter out past times
  const now = DateTime.now().setZone(timezone)
  const availableSlots = slots.filter(slot => slot.start_time > now)
  
  return availableSlots
}
```

**Optimization:**
- Cache availability for 5 minutes (Redis)
- Background job to pre-calculate next 30 days
- Invalidate cache on appointment create/cancel

### 3. Conflict Prevention (Race Conditions)

**Challenge:** Two customers book the same slot simultaneously

**Solution: Optimistic Locking + Database Constraints**
```javascript
// 1. Check availability
const available = await checkSlotAvailable(staffId, startTime, endTime)
if (!available) throw new Error('Slot no longer available')

// 2. Begin transaction
await db.transaction(async (trx) => {
  // 3. Lock the staff's schedule for this time period
  await trx.raw(`
    SELECT * FROM appointments
    WHERE staff_id = ? 
      AND start_time < ?
      AND end_time > ?
    FOR UPDATE
  `, [staffId, endTime, startTime])
  
  // 4. Double-check availability (inside transaction)
  const stillAvailable = await checkSlotAvailable(staffId, startTime, endTime, trx)
  if (!stillAvailable) {
    throw new Error('Slot was just booked')
  }
  
  // 5. Create appointment
  const appointment = await trx('appointments').insert({
    ...appointmentData
  })
  
  // 6. Send confirmation email (after commit)
  await trx.commit()
})

// 7. Queue background job for notifications
await queue.add('send-confirmation', { appointmentId })
```

**Alternative: Redis Distributed Lock**
```javascript
const lock = await redis.lock(`booking:${staffId}:${startTime}`, 5000) // 5 second lock

try {
  // Check availability and book
} finally {
  await lock.unlock()
}
```

### 4. Calendar Sync Strategy

**Two-Way Sync:**
```
SiteSprintz Booking <──────> Staff's Google Calendar

1. When appointment created in our system:
   → Create event in Google Calendar
   → Store google_event_id with appointment
   
2. When event created in Google Calendar:
   → Check if overlaps with available booking slots
   → Create "blocked" time in our system
   → Prevent customers from booking that time
   
3. When appointment cancelled in our system:
   → Delete event from Google Calendar
   
4. When event deleted in Google Calendar:
   → If it's a booking, mark as cancelled
   → Send cancellation notification
```

**Implementation:**
```javascript
// Google Calendar Webhook (push notifications)
app.post('/webhooks/google-calendar/:staffId', async (req, res) => {
  const { staffId } = req.params
  
  // 1. Get changed events since last sync
  const connection = await getCalendarConnection(staffId)
  const events = await google.calendar.events.list({
    calendarId: 'primary',
    timeMin: connection.last_synced_at,
    syncToken: connection.sync_token
  })
  
  // 2. Process each event
  for (const event of events.items) {
    if (event.status === 'cancelled') {
      await handleEventDeleted(event, staffId)
    } else {
      await handleEventUpserted(event, staffId)
    }
  }
  
  // 3. Update sync token
  await updateSyncToken(staffId, events.nextSyncToken)
  
  res.status(200).send('OK')
})
```

### 5. SMS Cost Management

**Challenge:** SMS costs can add up quickly

**Strategy:**
```javascript
// SMS Pricing (Twilio):
// - US/Canada: $0.0079 per SMS
// - International: $0.05-0.15 per SMS

// Cost Control:
1. Default to email notifications
2. SMS only for:
   - Reminders (24h before)
   - Urgent cancellations
   - Day-of changes
3. Let customers opt-in to SMS
4. Set monthly SMS limits per plan:
   - Free: 0 SMS
   - Starter: 100 SMS/mo (~$0.79)
   - Pro: Unlimited SMS
5. Use shortcodes for better deliverability

// SMS Queue with Priority
const sms = {
  priority: 'high', // high, normal, low
  scheduled_for: '2025-11-20T12:00:00Z',
  cost_cents: 79 // Track spending
}
```

### 6. Scalability Considerations

**Current Architecture:**
- Single PostgreSQL instance
- Redis for caching
- Works for: 1,000-10,000 tenants

**Scaling to 100,000+ tenants:**

1. **Database Sharding (by tenant_id)**
```javascript
// Shard by tenant_id hash
const shardNumber = hashCode(tenant_id) % NUM_SHARDS
const db = getDBConnection(shardNumber)
```

2. **Read Replicas**
- Master: writes only
- Replicas: read-heavy queries (availability, appointments list)

3. **Caching Strategy**
```javascript
// Cache layers:
L1: Application memory (10 minutes)
L2: Redis (1 hour)
L3: Database

// Cache keys:
availability:{tenant_id}:{staff_id}:{date}
services:{tenant_id}
staff:{tenant_id}
```

4. **Background Job Queue (Bull)**
```javascript
// Separate queues by priority
const criticalQueue = new Bull('critical') // Confirmations
const normalQueue = new Bull('normal')     // Reminders
const lowQueue = new Bull('low')           // Analytics
```

5. **CDN for Widget**
- Serve embed widget from CDN (CloudFlare)
- Versioned: `https://cdn.booksprintz.com/widget/v1.2.3/embed.js`
- Minimize API calls from widget

---

## 🧪 Testing Strategy

### Unit Tests (Target: 80% coverage)

```javascript
// Availability Algorithm
describe('calculateAvailableSlots', () => {
  it('returns available slots for a date')
  it('excludes existing appointments')
  it('handles buffer times')
  it('respects staff schedule')
  it('filters past times')
  it('handles time zone conversions')
  it('applies time-off overrides')
})

// Booking Logic
describe('createAppointment', () => {
  it('creates appointment with valid data')
  it('prevents double-booking')
  it('sends confirmation email')
  it('processes deposit payment')
  it('handles timezone correctly')
})

// Calendar Sync
describe('syncGoogleCalendar', () => {
  it('creates event in Google Calendar')
  it('updates event on reschedule')
  it('deletes event on cancellation')
  it('handles API errors gracefully')
})
```

### Integration Tests

```javascript
// API Endpoints
describe('POST /api/booking/v1/:tenant/appointments', () => {
  it('books appointment successfully')
  it('returns 400 for invalid data')
  it('returns 409 for conflicting time')
  it('returns 404 for invalid service')
  it('handles rate limiting')
})

// Database
describe('Appointment Queries', () => {
  it('retrieves appointments for date range')
  it('filters by staff and service')
  it('handles pagination correctly')
})

// Email Sending
describe('Email Notifications', () => {
  it('sends confirmation email')
  it('sends reminder email 24h before')
  it('sends cancellation email')
  it('handles email failures')
})
```

### E2E Tests (Playwright)

```javascript
test('Customer books appointment', async ({ page }) => {
  // 1. Navigate to booking page
  await page.goto('https://johnsalon.sitesprintz.com/book')
  
  // 2. Select service
  await page.click('[data-testid="service-haircut"]')
  
  // 3. Select date
  await page.click('[data-testid="calendar-date-2025-11-20"]')
  
  // 4. Select time slot
  await page.click('[data-testid="slot-14:00"]')
  
  // 5. Fill customer info
  await page.fill('[name="name"]', 'John Doe')
  await page.fill('[name="email"]', 'john@example.com')
  await page.fill('[name="phone"]', '+1234567890')
  
  // 6. Submit booking
  await page.click('[data-testid="book-now"]')
  
  // 7. Verify confirmation
  await expect(page.locator('[data-testid="confirmation"]')).toBeVisible()
  await expect(page.locator('[data-testid="confirmation-code"]')).toHaveText(/^[A-Z0-9]{8}$/)
})

test('Admin creates manual appointment', async ({ page }) => {
  // Login, navigate to dashboard, create appointment
  // Verify calendar updates
})

test('Customer reschedules appointment', async ({ page }) => {
  // Use reschedule link from email
  // Select new time
  // Verify confirmation
})
```

---

## 📊 Analytics & Metrics

### Business Metrics

**Dashboard KPIs:**
- Total bookings (today, week, month)
- Revenue (booked, collected)
- Conversion rate (visits → bookings)
- Average booking value
- No-show rate
- Cancellation rate
- Customer retention
- Most popular services
- Peak booking times

**Admin Views:**
```sql
-- Revenue Report
SELECT 
  DATE(start_time) as booking_date,
  COUNT(*) as total_bookings,
  SUM(total_price_cents) / 100.0 as total_revenue,
  SUM(deposit_paid_cents) / 100.0 as deposits_collected,
  AVG(total_price_cents) / 100.0 as avg_booking_value
FROM appointments
WHERE tenant_id = :tenant_id
  AND status IN ('confirmed', 'completed')
  AND start_time >= :start_date
  AND start_time <= :end_date
GROUP BY DATE(start_time)
ORDER BY booking_date DESC;

-- Popular Services
SELECT 
  s.name,
  COUNT(*) as booking_count,
  SUM(a.total_price_cents) / 100.0 as revenue
FROM appointments a
JOIN booking_services s ON a.service_id = s.id
WHERE a.tenant_id = :tenant_id
  AND a.status IN ('confirmed', 'completed')
GROUP BY s.id, s.name
ORDER BY booking_count DESC
LIMIT 10;

-- Customer Repeat Rate
WITH customer_bookings AS (
  SELECT 
    customer_email,
    COUNT(*) as booking_count
  FROM appointments
  WHERE tenant_id = :tenant_id
    AND status = 'completed'
  GROUP BY customer_email
)
SELECT 
  SUM(CASE WHEN booking_count > 1 THEN 1 ELSE 0 END)::FLOAT / COUNT(*) * 100 as repeat_rate_pct
FROM customer_bookings;
```

### System Metrics (Monitoring)

**Performance:**
- API response time (p50, p95, p99)
- Database query time
- Cache hit rate
- Widget load time

**Reliability:**
- Uptime (target: 99.9%)
- Error rate
- Failed email/SMS deliveries
- Calendar sync failures

**Usage:**
- Active tenants
- Bookings per day
- API calls per minute
- Concurrent users

**Monitoring Stack:**
- **Sentry** - Error tracking
- **DataDog/New Relic** - APM
- **Grafana + Prometheus** - Metrics
- **LogRocket** - Session replay

---

## 🚨 Security Considerations

### 1. Authentication & Authorization

**Tenant Isolation:**
```javascript
// ALWAYS filter by tenant_id
const appointments = await db('appointments')
  .where('tenant_id', req.user.tenant_id) // Critical!
  .where('staff_id', staffId)

// Use middleware to inject tenant_id
app.use((req, res, next) => {
  req.tenantId = req.user.tenant_id
  next()
})
```

**Public API Security:**
```javascript
// Rate limiting (prevent abuse)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per IP
  keyGenerator: (req) => req.ip
})

app.use('/api/booking/v1/:tenant/appointments', limiter)

// CAPTCHA for booking form
await verifyCaptcha(req.body.captcha_token)
```

### 2. Data Protection

**PII Handling:**
- Encrypt customer phone numbers at rest
- Encrypt calendar tokens
- GDPR compliance (data export, deletion)
- CCPA compliance

**SQL Injection Prevention:**
```javascript
// Use parameterized queries (NEVER string concatenation)
const appointments = await db.raw(`
  SELECT * FROM appointments 
  WHERE tenant_id = ? AND customer_email = ?
`, [tenantId, email])
```

### 3. Embed Widget Security

**CSP (Content Security Policy):**
```javascript
// Restrict widget domains
const widget = await getWidget(widgetId)
const allowedDomains = widget.allowed_domains || []

// Check origin
if (!allowedDomains.includes(req.headers.origin)) {
  return res.status(403).json({ error: 'Domain not allowed' })
}

// Set CSP headers
res.set('Content-Security-Policy', `frame-ancestors ${allowedDomains.join(' ')}`)
```

**CORS:**
```javascript
app.use(cors({
  origin: (origin, callback) => {
    // Check if origin is allowed for this tenant
    const allowed = await checkAllowedOrigin(origin, tenantId)
    callback(null, allowed)
  }
}))
```

---

## 🌍 Internationalization (i18n)

**Supported Languages (Phase 1):**
- English (US)
- Spanish (ES, MX)
- French (FR, CA)

**Implementation:**
```javascript
// Use i18next
import i18n from 'i18next'

// Translations
const translations = {
  en: {
    booking: {
      select_service: 'Select a Service',
      select_date: 'Choose Date & Time',
      confirm: 'Book Appointment'
    }
  },
  es: {
    booking: {
      select_service: 'Seleccionar un Servicio',
      select_date: 'Elegir Fecha y Hora',
      confirm: 'Reservar Cita'
    }
  }
}

// Detect language from:
1. User preference (if logged in)
2. Browser language
3. Domain TLD (.fr, .es)
4. Manual selector
```

**Date/Time Formatting:**
```javascript
// Use locale-specific formats
const formatter = new Intl.DateTimeFormat(locale, {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  timeZoneName: 'short'
})

// US: "Monday, November 20, 2025, 2:00 PM EST"
// FR: "lundi 20 novembre 2025 à 14:00 UTC−5"
```

---

## 📈 Growth & Marketing Strategy

### Standalone Product Launch

**Brand Name Options:**
1. **BookSprintz** (tie to SiteSprintz brand)
2. **Bookly** (simple, memorable - check availability!)
3. **AppointEase**
4. **SlotSync**
5. **Schedulify**

**Launch Checklist:**
- [ ] Product hunt launch
- [ ] Dedicated marketing site
- [ ] SEO-optimized content
- [ ] Video demo
- [ ] Free trial (14-30 days)
- [ ] Customer testimonials
- [ ] Comparison page (vs. Calendly, Acuity)
- [ ] Affiliate program (20% commission)
- [ ] Integration marketplace

**Distribution Channels:**
1. **Direct:** booksprintz.com
2. **SiteSprintz Upsell:** Offer to existing customers
3. **Embed Widget:** Viral growth (powered by BookSprintz)
4. **Integrations:** Zapier, Make, n8n
5. **Marketplaces:** Shopify App Store, WordPress Plugin
6. **Partners:** Web design agencies, consultants

**Content Marketing:**
- Blog: "How to reduce no-shows"
- Templates: "Best appointment reminder email templates"
- Guides: "Complete guide to online booking for salons"
- Case studies: "How [Business] increased bookings 40%"

---

## 🎯 Success Metrics (6 Months Post-Launch)

**Integrated Mode (SiteSprintz):**
- ✅ 500+ SiteSprintz sites using booking (10% adoption)
- ✅ 5,000+ appointments booked per month
- ✅ $15K MRR from Pro/Business upgrades
- ✅ 4.5+ star rating from users

**Standalone Mode:**
- ✅ 1,000+ standalone accounts
- ✅ 200+ paying customers
- ✅ $6K MRR (avg $30/customer)
- ✅ 3% conversion rate (trial → paid)
- ✅ < 5% monthly churn

**Technical:**
- ✅ 99.5%+ uptime
- ✅ < 500ms API response time (p95)
- ✅ < 2s page load time
- ✅ 0 critical security issues

**Support:**
- ✅ < 4 hour response time
- ✅ 90%+ customer satisfaction
- ✅ Comprehensive docs & video tutorials

---

## 🛠️ Development Team & Roles

**Recommended Team:**

1. **Backend Engineer** (Weeks 1-8)
   - Node.js API development
   - Database design & optimization
   - Integration (Stripe, Google Calendar, etc.)
   - Availability algorithm

2. **Frontend Engineer** (Weeks 3-8)
   - Admin dashboard (React)
   - Booking widget (Preact/Vanilla JS)
   - Responsive design
   - Accessibility

3. **Full-Stack Engineer** (You - Weeks 1-8)
   - Architecture decisions
   - Core booking logic
   - E2E testing
   - DevOps & deployment

4. **Designer** (Weeks 1-2, then part-time)
   - UI/UX design
   - Booking flow optimization
   - Widget customization
   - Marketing site

5. **QA/Test Engineer** (Weeks 4-8)
   - E2E test suite
   - Manual testing
   - Security testing
   - Performance testing

**Solo Development (If doing alone):**
- Focus on MVP (Phases 1-3) first: 4-5 weeks
- Launch with basic features
- Iterate based on customer feedback
- Add advanced features (Phases 4-5) post-launch

---

## 📝 Next Steps

### Immediate Actions (Before Starting Development)

1. **✅ Review this plan** - Approve approach & scope
2. **✅ Choose deployment model**
   - Integrated-first? (faster to market)
   - Standalone-first? (bigger opportunity)
   - Both simultaneously? (more work)
3. **✅ Name the standalone product** - Check domain availability
4. **✅ Set up development environment**
   - Database (PostgreSQL + Redis)
   - Stripe test account
   - Calendar API credentials (Google, Microsoft)
   - Twilio account
5. **✅ Create user stories & wireframes**
   - Booking flow (customer)
   - Dashboard (admin)
   - Widget configurator
6. **✅ Set up monitoring**
   - Sentry project
   - Analytics setup
7. **✅ TDD approach** - Write tests first!

### Decision Points

**Question 1:** Integrated or Standalone first?
- **Recommendation:** Start with Integrated (faster to market, existing users)
- Then add Standalone features (Phases 5)

**Question 2:** Billing model?
- **Recommendation:** Monthly subscription (simpler than per-booking)
- Optional: Add per-booking pricing for high-volume (enterprise)

**Question 3:** Build widget from scratch or use iframe?
- **Recommendation:** Custom widget (better UX, faster, more secure than iframe)

**Question 4:** Which calendar sync to prioritize?
- **Recommendation:** Google Calendar first (larger market share)
- Outlook second

**Question 5:** Open source or proprietary?
- **Recommendation:** Proprietary initially, consider open-source license later for community growth

---

## 🚀 Let's Build This!

This is a **comprehensive, market-ready booking system** that will:
- ✅ Add tremendous value to SiteSprintz customers
- ✅ Create a new revenue stream (standalone SaaS)
- ✅ Compete with established players (Calendly, Acuity)
- ✅ Solve real problems for small businesses

**Estimated Timeline:** 6-8 weeks to standalone MVP  
**Estimated Cost to Build:** $40-80K (team) or $0 (solo + time)  
**Potential Revenue (Year 1):** $50-150K MRR  
**Market Size:** $450M+ (online booking software)

**Ready to start? 🎉**

Let me know:
1. Which deployment model to start with (integrated/standalone)
2. Any features to add/remove
3. Any concerns or questions
4. Green light to start coding! 🚀

