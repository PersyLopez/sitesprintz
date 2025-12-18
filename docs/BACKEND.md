# 🔧 Backend Documentation

**Last Updated:** December 2025  
**Version:** 1.0.0

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Server Configuration](#server-configuration)
3. [API Routes](#api-routes)
4. [Services](#services)
5. [Middleware](#middleware)
6. [Utilities](#utilities)
7. [Error Handling](#error-handling)
8. [Database Access](#database-access)

---

## 🎯 Overview

The backend is built with **Express.js 5.x** and follows a **layered architecture**:

```
Routes (Controllers) → Services (Business Logic) → Database (Prisma)
```

### Key Principles

- **Separation of Concerns**: Routes handle HTTP, services handle business logic
- **Middleware Chain**: Security → Auth → Validation → Handler
- **Error Handling**: Centralized error handler with consistent responses
- **Type Safety**: JSDoc comments for better IDE support

---

## ⚙️ Server Configuration

### Entry Point: `server.js`

**Key Features:**
- Express app initialization
- Security middleware (Helmet, CORS)
- Session management (Passport.js)
- Route mounting
- Error handling
- SPA routing fallback

**Port Configuration:**
```javascript
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Security Headers:**
- Content Security Policy (CSP)
- HSTS (HTTP Strict Transport Security)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff

**Static File Serving:**
- Production: Serves from `dist/` directory
- Sites: Serves from `public/sites/` directory
- Uploads: Serves from `public/uploads/` directory

---

## 🛣 API Routes

### Route Organization

All routes are organized in `server/routes/` directory:

| Route File | Base Path | Purpose |
|------------|-----------|---------|
| `auth.routes.js` | `/api/auth` | Authentication & user management |
| `sites.routes.js` | `/api/sites`, `/api/drafts` | Site CRUD operations |
| `payments.routes.js` | `/api/payments` | Payment processing |
| `booking.routes.js` | `/api/booking` | Booking system |
| `admin.routes.js` | `/api/admin` | Admin operations |
| `showcase.routes.js` | `/api/showcases` | Public showcase gallery |
| `webhooks.routes.js` | `/api/webhooks` | External webhooks (Stripe) |
| `users.routes.js` | `/api/users` | User profile management |
| `analytics.routes.js` | `/api/analytics` | Analytics endpoints |
| `content.routes.js` | `/api/content` | Content management |
| `templates.routes.js` | `/api/templates` | Template listing |
| `submissions.routes.js` | `/api/submissions` | Contact form submissions |
| `drafts.routes.js` | `/api/drafts` | Draft management |

### Authentication Routes (`auth.routes.js`)

**Endpoints:**

```javascript
POST   /api/auth/register          // Create new user account
POST   /api/auth/login             // Authenticate user
POST   /api/auth/logout            // Logout (client-side token removal)
GET    /api/auth/me                // Get current user
POST   /api/auth/forgot-password   // Request password reset
POST   /api/auth/reset-password    // Reset password with token
POST   /api/auth/verify-email      // Verify email address
POST   /api/auth/resend-verification // Resend verification email
```

**Features:**
- Rate limiting (registration: 3/15min, login: 5/15min)
- CAPTCHA verification (Cloudflare Turnstile)
- Email verification workflow
- Password reset flow
- JWT token generation

### Sites Routes (`sites.routes.js`)

**Endpoints:**

```javascript
GET    /api/site                   // Get current site data
POST   /api/site                   // Update site data (admin)
POST   /api/upload                 // Upload image
DELETE /api/uploads/:filename      // Delete uploaded image
POST   /api/drafts                 // Create draft
GET    /api/drafts/:draftId        // Get draft
DELETE /api/drafts/:draftId        // Delete draft
POST   /api/setup                  // Save site from setup flow
```

**Features:**
- File upload with Multer (5MB limit, images only)
- Draft management with expiration (7 days)
- Template loading and customization
- Business data validation and sanitization

### Booking Routes (`booking.routes.js`)

**Endpoints:**

```javascript
// Tenant Management
POST   /api/booking/tenants                    // Create booking tenant
GET    /api/booking/tenants/:tenantId          // Get tenant config
PUT    /api/booking/tenants/:tenantId          // Update tenant config

// Services
GET    /api/booking/tenants/:tenantId/services // List services
POST   /api/booking/tenants/:tenantId/services // Create service
PUT    /api/booking/services/:serviceId        // Update service
DELETE /api/booking/services/:serviceId        // Delete service

// Staff
GET    /api/booking/tenants/:tenantId/staff     // List staff
POST   /api/booking/tenants/:tenantId/staff    // Create staff member
PUT    /api/booking/staff/:staffId              // Update staff
DELETE /api/booking/staff/:staffId              // Delete staff

// Availability
GET    /api/booking/tenants/:tenantId/availability // Get availability
POST   /api/booking/availability-rules          // Create availability rule
PUT    /api/booking/availability-rules/:ruleId   // Update rule
DELETE /api/booking/availability-rules/:ruleId   // Delete rule

// Appointments
GET    /api/booking/tenants/:tenantId/appointments // List appointments
POST   /api/booking/appointments                // Create appointment
GET    /api/booking/appointments/:id            // Get appointment
PUT    /api/booking/appointments/:id            // Update appointment
DELETE /api/booking/appointments/:id           // Cancel appointment
```

**Features:**
- Multi-tenant booking system
- Service and staff management
- Availability scheduling
- Appointment CRUD operations
- Timezone handling

### Payment Routes (`payments.routes.js`)

**Endpoints:**

```javascript
POST   /api/create-subscription-checkout  // Create Stripe checkout session
GET    /api/subscription/status           // Get subscription status
POST   /api/stripe/connect                // Connect Stripe account
GET    /api/stripe/dashboard               // Get Stripe dashboard URL
```

**Features:**
- Stripe Checkout integration
- Subscription management
- Stripe Connect for payments
- Webhook processing (handled separately)

### Admin Routes (`admin.routes.js`)

**Endpoints:**

```javascript
GET    /api/admin/analytics                // Platform analytics
GET    /api/admin/users                    // List all users
GET    /api/admin/users/:id                // Get user details
PUT    /api/admin/users/:id                // Update user
DELETE /api/admin/users/:id                 // Delete user
POST   /api/admin/users/:id/suspend        // Suspend user
POST   /api/admin/users/:id/activate       // Activate user
PUT    /api/admin/users/:id/role           // Change user role
POST   /api/admin/invite-user              // Invite new user
```

**Features:**
- Requires admin authentication
- User management (CRUD)
- Role management
- Account suspension/activation
- Platform analytics

---

## 🔨 Services

Services contain **business logic** and are located in `server/services/`:

### Email Service (`emailService.js`)

**Purpose:** Centralized email sending with multi-provider support

**Features:**
- Resend (primary) and SMTP (fallback) support
- Email templates with data injection
- Retry logic with exponential backoff
- Queue support (optional)

**Usage:**
```javascript
import { EmailService } from '../services/emailService.js';

const emailService = new EmailService();
await emailService.send({
  to: 'user@example.com',
  type: 'VERIFY_EMAIL',
  data: { verificationLink: '...' }
});
```

**Email Types:**
- `VERIFY_EMAIL`: Email verification
- `PASSWORD_RESET`: Password reset link
- `WELCOME`: Welcome email
- `BOOKING_CONFIRMATION`: Booking confirmation
- `ADMIN_NEW_USER`: Admin notification

### Booking Service (`bookingService.js`)

**Purpose:** Booking system business logic

**Features:**
- Availability calculation
- Conflict detection
- Timezone conversion
- Appointment validation

**Key Methods:**
```javascript
getAvailableSlots(tenantId, serviceId, date, timezone)
createAppointment(tenantId, appointmentData)
checkAvailability(staffId, startTime, endTime)
```

### Analytics Service (`analyticsService.js`)

**Purpose:** Analytics data aggregation

**Features:**
- Site view tracking
- User activity metrics
- Platform-wide statistics
- Time-based aggregations

### Subscription Service (`subscriptionService.js`)

**Purpose:** Subscription management

**Features:**
- Plan upgrades/downgrades
- Trial management
- Subscription status checks
- Feature access control

### Webhook Processor (`webhookProcessor.js`)

**Purpose:** Process Stripe webhooks

**Features:**
- Event verification (Stripe signature)
- Event routing
- Idempotency handling
- Error recovery

**Supported Events:**
- `checkout.session.completed`: Subscription created
- `customer.subscription.updated`: Subscription updated
- `customer.subscription.deleted`: Subscription cancelled
- `invoice.payment_succeeded`: Payment successful
- `invoice.payment_failed`: Payment failed

---

## 🛡 Middleware

Middleware functions are in `server/middleware/`:

### Authentication (`auth.js`)

**Functions:**

#### `requireAuth(req, res, next)`
- Verifies JWT token
- Loads user from database
- Checks account status (active/suspended)
- Checks email verification (if required)
- Attaches user to `req.user`

**Usage:**
```javascript
router.get('/protected', requireAuth, (req, res) => {
  // req.user is available
  res.json({ user: req.user });
});
```

#### `requireAdmin(req, res, next)`
- Extends `requireAuth`
- Additional check: `user.role === 'admin'`
- Returns 403 if not admin

**Usage:**
```javascript
router.get('/admin/users', requireAdmin, (req, res) => {
  // Only admins can access
});
```

### Rate Limiting (`rateLimiting.js`)

**Limiters:**

| Limiter | Window | Max Requests | Purpose |
|---------|--------|--------------|---------|
| `registrationLimiter` | 15 min | 3 | Prevent bot registrations |
| `loginLimiter` | 15 min | 5 | Prevent brute force |
| `passwordResetLimiter` | 1 hour | 3 | Prevent email spam |
| `apiLimiter` | 15 min | 100 | General API protection |
| `uploadLimiter` | 1 hour | 20 | Prevent storage abuse |

**Usage:**
```javascript
import { registrationLimiter } from '../middleware/rateLimiting.js';

router.post('/register', registrationLimiter, handler);
```

### CSRF Protection (`csrf.js`)

**Functions:**
- `csrfProtection`: Validates CSRF tokens
- `csrfTokenEndpoint`: Returns CSRF token

**Usage:**
```javascript
// Get token
GET /api/csrf-token

// Include in requests
POST /api/site
Headers: { 'X-CSRF-Token': '<token>' }
```

### Error Handler (`errorHandler.js`)

**Purpose:** Centralized error handling

**Features:**
- Logs errors with stack traces
- Returns consistent error format
- Handles Prisma errors
- Handles JWT errors
- Handles validation errors

**Error Response Format:**
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Validation (`validation.js`)

**Purpose:** Request validation middleware

**Features:**
- Input sanitization
- Schema validation
- Type checking
- Required field validation

---

## 🧰 Utilities

Utilities are helper functions in `server/utils/`:

### Helpers (`helpers.js`)

**Functions:**
- `isValidEmail(email)`: Email validation
- `isValidPhone(phone)`: Phone validation
- `sanitizeString(str, maxLength)`: String sanitization
- `generateRandomPassword()`: Password generation
- `generateVerificationToken()`: Token generation
- `getUserFilePath(userId)`: File path helper

### Stripe Helpers (`stripe-helpers.js`)

**Functions:**
- `createStripeClient()`: Initialize Stripe
- `createCheckoutSession()`: Create checkout
- `verifyWebhookSignature()`: Verify webhook
- `getSubscriptionStatus()`: Get subscription

### Email Service Wrapper (`email-service-wrapper.js`)

**Purpose:** Wrapper around EmailService for easier usage

**Functions:**
- `sendEmail(to, type, data)`: Send email
- `sendAdminNotification(type, data)`: Notify admin

### Captcha (`captcha.js`)

**Functions:**
- `verifyTurnstile(token, ip)`: Verify Cloudflare Turnstile

**Usage:**
```javascript
const result = await verifyTurnstile(captchaToken, clientIp);
if (!result.success) {
  return res.status(400).json({ error: result.error });
}
```

### Logger (`logger.js`)

**Purpose:** Structured logging with Winston

**Features:**
- Log levels (info, warn, error)
- File rotation
- Console output
- Error tracking

---

## ❌ Error Handling

### Error Types

1. **Validation Errors** (400)
   - Invalid input format
   - Missing required fields
   - Type mismatches

2. **Authentication Errors** (401)
   - Missing token
   - Invalid token
   - Expired token

3. **Authorization Errors** (403)
   - Insufficient permissions
   - Account suspended
   - Email not verified

4. **Not Found Errors** (404)
   - Resource doesn't exist
   - Invalid ID

5. **Rate Limit Errors** (429)
   - Too many requests
   - Retry after header

6. **Server Errors** (500)
   - Database errors
   - External API failures
   - Unexpected errors

### Error Response Format

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context"
  }
}
```

### Error Handler Middleware

```javascript
app.use(errorHandler);
```

The error handler:
1. Logs error with stack trace
2. Determines status code
3. Returns consistent JSON response
4. Handles Prisma errors gracefully

---

## 💾 Database Access

### Prisma Client

**Location:** `database/db.js`

**Usage:**
```javascript
import { prisma } from '../database/db.js';

const user = await prisma.users.findUnique({
  where: { id: userId }
});
```

### Common Patterns

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

**Transactions:**
```javascript
await prisma.$transaction(async (tx) => {
  await tx.sites.create({ data: siteData });
  await tx.booking_tenants.create({ data: tenantData });
});
```

---

## 📚 Related Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [API Reference](./API-REFERENCE.md)
- [Database Schema](./DATABASE.md)
- [Security Guide](./security/SECURITY-ASSESSMENT.md)

---

**Last Updated:** December 2025  
**Maintained by:** SiteSprintz Development Team






