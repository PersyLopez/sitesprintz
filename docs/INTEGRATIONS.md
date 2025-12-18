# 🔌 Integrations Documentation

**Last Updated:** December 2025  
**Version:** 1.0.0

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Stripe Integration](#stripe-integration)
3. [Email Services](#email-services)
4. [OAuth Providers](#oauth-providers)
5. [CAPTCHA (Cloudflare Turnstile)](#captcha-cloudflare-turnstile)
6. [Configuration](#configuration)

---

## 🎯 Overview

SiteSprintz integrates with several third-party services to provide payment processing, email delivery, authentication, and security features.

### Integrated Services

- **Stripe**: Payment processing and subscriptions
- **Resend**: Customer-facing email delivery
- **SMTP (Outlook)**: Platform/internal email delivery
- **Google OAuth**: Social authentication
- **Cloudflare Turnstile**: Bot protection and CAPTCHA

---

## 💳 Stripe Integration

### Overview

Stripe is used for:
- **Subscription Management**: Monthly/yearly subscription payments
- **Stripe Connect**: Allow Pro/Premium users to connect their Stripe accounts
- **E-commerce Checkout**: Shopping cart checkout sessions
- **Webhooks**: Real-time payment event processing

### Configuration

**Environment Variables:**
```bash
STRIPE_SECRET_KEY=sk_test_...          # Stripe secret key
STRIPE_PUBLISHABLE_KEY=pk_test_...     # Stripe publishable key
STRIPE_WEBHOOK_SECRET=whsec_...       # Webhook signing secret
```

### API Endpoints

#### Subscription Checkout

**Endpoint:** `POST /api/create-subscription-checkout`

**Purpose:** Create Stripe Checkout session for subscription

**Request:**
```json
{
  "plan": "starter" | "pro" | "premium",
  "successUrl": "https://yoursite.com/payment-success",
  "cancelUrl": "https://yoursite.com/payment-cancel"
}
```

**Response:**
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

#### Subscription Status

**Endpoint:** `GET /api/subscription/status`

**Purpose:** Get current user's subscription status

**Response:**
```json
{
  "hasSubscription": true,
  "plan": "pro",
  "status": "active",
  "currentPeriodEnd": "2025-12-31T23:59:59Z"
}
```

#### Stripe Connect

**Endpoint:** `POST /api/stripe/connect/onboard`

**Purpose:** Create Stripe Connect account for Pro/Premium users

**Response:**
```json
{
  "accountId": "acct_...",
  "onboardingUrl": "https://connect.stripe.com/..."
}
```

**Endpoint:** `GET /api/stripe/connect/status`

**Purpose:** Check Connect account status

**Response:**
```json
{
  "connected": true,
  "chargesEnabled": true,
  "payoutsEnabled": true,
  "accountId": "acct_..."
}
```

#### E-commerce Checkout

**Endpoint:** `POST /api/checkout/create-session`

**Purpose:** Create checkout session for shopping cart

**Request:**
```json
{
  "items": [
    {
      "name": "Product Name",
      "price": 29.99,
      "quantity": 1
    }
  ],
  "siteId": "site-123"
}
```

**Response:**
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

### Webhooks

**Endpoint:** `POST /api/webhooks/stripe`

**Purpose:** Process Stripe webhook events

**Supported Events:**
- `checkout.session.completed`: Subscription or payment completed
- `customer.subscription.created`: New subscription created
- `customer.subscription.updated`: Subscription updated
- `customer.subscription.deleted`: Subscription cancelled
- `invoice.payment_succeeded`: Payment successful
- `invoice.payment_failed`: Payment failed

**Webhook Processing:**
1. Verify webhook signature
2. Deduplicate by event ID
3. Process event based on type
4. Update database
5. Send notifications

**Security:**
- Webhook signature verification using `STRIPE_WEBHOOK_SECRET`
- Idempotency handling (prevents duplicate processing)
- Event persistence for audit trail

### Implementation Details

**Location:** `server/routes/payments.routes.js`, `server/routes/webhooks.routes.js`

**Key Functions:**
- `createCheckoutSession()`: Create Stripe checkout
- `updateUserSubscription()`: Update subscription in database
- `processWebhookEvent()`: Handle webhook events
- `createStripeCustomer()`: Create or retrieve Stripe customer

---

## 📧 Email Services

### Overview

SiteSprintz uses a **hybrid email system**:
- **Resend**: Customer-facing emails (order confirmations, booking confirmations)
- **SMTP (Outlook)**: Platform/internal emails (welcome, admin notifications)

### Configuration

**Resend (Primary):**
```bash
RESEND_API_KEY=re_...                  # Resend API key
FROM_EMAIL_ORDERS=orders@yourdomain.com # From address for orders
```

**SMTP (Fallback/Internal):**
```bash
SMTP_HOST=smtp-mail.outlook.com        # SMTP host
SMTP_PORT=587                          # SMTP port
SMTP_USER=your-email@outlook.com       # SMTP username
SMTP_PASS=your-password                # SMTP password
SMTP_SECURE=false                      # Use TLS
```

### Email Service Architecture

**Location:** `server/services/emailService.js`

**Features:**
- Multi-provider support (Resend + SMTP)
- Template rendering with data injection
- Retry logic with exponential backoff
- Provider fallback (Resend → SMTP)
- Queue support (optional)

### Email Templates

**Customer-Facing (Resend):**
- `ORDER_CONFIRMATION`: Order confirmation email
- `BOOKING_CONFIRMATION`: Booking confirmation
- `BOOKING_REMINDER`: Appointment reminder
- `BOOKING_CANCELLATION`: Cancellation notice

**Platform (SMTP):**
- `VERIFY_EMAIL`: Email verification
- `PASSWORD_RESET`: Password reset link
- `WELCOME`: Welcome email
- `ADMIN_NEW_USER`: Admin notification

### Usage

**Send Email:**
```javascript
import { sendEmail, EmailTypes } from '../utils/email-service-wrapper.js';

await sendEmail('user@example.com', EmailTypes.ORDER_CONFIRMATION, {
  orderId: '123',
  items: [...],
  total: 29.99
});
```

**Email Service Class:**
```javascript
import { EmailService } from '../services/emailService.js';

const emailService = new EmailService();
await emailService.send({
  to: 'user@example.com',
  type: 'ORDER_CONFIRMATION',
  data: { orderId: '123' }
});
```

### Retry Logic

- **Retry Attempts**: 3 attempts
- **Retry Delay**: 1 second (base)
- **Exponential Backoff**: Enabled
- **Fallback**: Automatic fallback to SMTP if Resend fails

---

## 🔐 OAuth Providers

### Google OAuth

**Purpose:** Social authentication for user registration/login

**Configuration:**
```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

**Flow:**
1. User clicks "Sign in with Google"
2. Redirected to Google OAuth consent screen
3. User authorizes
4. Google redirects to `/oauth/callback`
5. Server exchanges code for tokens
6. User account created/logged in

**Endpoints:**
- `GET /auth/google`: Initiate OAuth flow
- `GET /oauth/callback`: Handle OAuth callback

**Implementation:** `auth-google.js`, `server/routes/auth.routes.js`

### Apple OAuth (Future)

**Status:** Planned, not yet implemented

---

## 🛡️ CAPTCHA (Cloudflare Turnstile)

### Overview

Cloudflare Turnstile is used for bot protection on:
- User registration
- Password reset requests
- Contact form submissions

### Configuration

**Environment Variables:**
```bash
TURNSTILE_SITE_KEY=0x4AAAAAA...        # Public site key (frontend)
TURNSTILE_SECRET_KEY=0x4AAAAAA...       # Secret key (backend)
```

**Frontend Usage:**
```javascript
// Render Turnstile widget
<div className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY}></div>

// Get token on form submit
const token = turnstile.getResponse();
```

**Backend Verification:**
```javascript
import { verifyTurnstile } from '../utils/captcha.js';

const result = await verifyTurnstile(token, clientIp);
if (!result.success) {
  return res.status(400).json({ error: 'CAPTCHA verification failed' });
}
```

### Implementation

**Location:** `server/utils/captcha.js`

**Verification:**
- Sends token to Cloudflare API
- Verifies response
- Returns success/failure

---

## ⚙️ Configuration

### Required Environment Variables

**Core:**
```bash
DATABASE_URL=postgresql://...          # PostgreSQL connection
JWT_SECRET=your-secret-key             # JWT signing secret
ADMIN_TOKEN=your-admin-token           # Admin authentication
```

**Stripe:**
```bash
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Email:**
```bash
RESEND_API_KEY=re_...
FROM_EMAIL_ORDERS=orders@yourdomain.com
```

**Optional:**
```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
TURNSTILE_SITE_KEY=...
TURNSTILE_SECRET_KEY=...
SMTP_HOST=...
SMTP_USER=...
SMTP_PASS=...
```

### Setup Guides

- [Production Setup Guide](setup/PRODUCTION-SETUP-GUIDE.md)
- [Integration Setup](setup/INTEGRATION-SETUP.md)
- [Stripe Go-Live Checklist](STRIPE_GO_LIVE_CHECKLIST.md)

---

## 🔍 Troubleshooting

### Stripe Issues

**Webhook Not Receiving Events:**
- Verify webhook URL in Stripe Dashboard
- Check webhook secret matches `STRIPE_WEBHOOK_SECRET`
- Ensure endpoint is publicly accessible
- Check webhook logs in Stripe Dashboard

**Checkout Session Not Creating:**
- Verify Stripe keys are correct
- Check user authentication
- Verify plan exists
- Check Stripe API logs

### Email Issues

**Emails Not Sending:**
- Verify API keys are set
- Check Resend dashboard for errors
- Verify SMTP credentials if using fallback
- Check email service logs

**Emails Going to Spam:**
- Verify domain SPF/DKIM records
- Use Resend domain verification
- Check sender reputation

### OAuth Issues

**Google OAuth Not Working:**
- Verify redirect URIs match in Google Console
- Check client ID/secret are correct
- Ensure OAuth consent screen is configured
- Check callback URL matches

---

## 📚 Related Documentation

- [Backend Documentation](./BACKEND.md)
- [Security Guide](./security/SECURITY-ASSESSMENT.md)
- [Production Setup Guide](./setup/PRODUCTION-SETUP-GUIDE.md)

---

**Last Updated:** December 2025  
**Maintained by:** SiteSprintz Development Team






