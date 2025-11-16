# Webhook Implementation Documentation

## Overview
This document describes the SiteSprintz Stripe webhook implementation, which follows strict Test-Driven Development (TDD) principles for reliability and maintainability.

## Architecture

### Components
1. **WebhookProcessor Service** (`server/services/webhookProcessor.js`)
   - Pure business logic for webhook processing
   - Fully testable with no HTTP dependencies
   - Handles idempotency, event routing, and database transactions

2. **Webhook Routes** (`server/routes/webhooks.routes.js`)
   - HTTP layer for receiving webhooks
   - Signature verification
   - Raw body parsing
   - Error handling and logging

3. **Database Migration** (`database/migrations/add_webhook_tracking.sql`)
   - Processed webhooks table for idempotency
   - Orders and order_items tables
   - Subscriptions table
   - User subscription columns

## Supported Events

### Payment Events
- `checkout.session.completed` (payment mode)
  - Creates order in database
  - Stores order items
  - Sends confirmation email to customer
  - Sends notification to site owner

### Subscription Events
- `checkout.session.completed` (subscription mode)
  - Creates subscription record
  - Updates user plan
  - Sends welcome/upgrade email

- `customer.subscription.updated`
  - Updates subscription status
  - Detects plan changes
  - Sends notifications for status changes (past_due, etc.)

- `customer.subscription.deleted`
  - Marks subscription as canceled (preserves data)
  - Sends cancellation confirmation

- `invoice.payment_failed`
  - Sends payment failure notification
  - Does not immediately cancel subscription

## Key Features

### Idempotency
Webhooks are idempotent through the `processed_webhooks` table:
- Each event ID is checked before processing
- Duplicate events are acknowledged but not reprocessed
- Safe to receive the same event multiple times

### Security
- Webhook signature verification using Stripe's SDK
- Rejects webhooks with invalid signatures
- Detects and rejects replay attacks (old timestamps)
- Validates payload structure

### Transaction Safety
- All database operations use transactions
- Rollback on any error
- Order creation includes both order and order_items in single transaction
- Subscription creation updates both subscription and user tables atomically

### Race Condition Handling
- Retry logic for user lookups (webhook may arrive before redirect)
- Configurable retry attempts and delays
- Graceful handling of missing data

### Email Resilience
- Email failures don't fail webhook processing
- Logs email errors but continues
- Returns warning in response if email fails

### Error Handling
- Comprehensive try-catch blocks
- Logs all errors with context
- Returns 500 for processing errors (Stripe will retry)
- Returns 200 for successful processing or known duplicates

## Testing

### Test Structure
```
tests/
├── integration/
│   └── api-webhooks.test.js      # 20+ integration tests for HTTP layer
└── unit/
    └── webhookProcessor.test.js   # 30+ unit tests for business logic
```

### Test Coverage
- **Security**: Signature validation, replay attack detection
- **Idempotency**: Duplicate event handling
- **Payment Flow**: Order creation, email notifications
- **Subscription Flow**: Creation, updates, cancellations, plan changes
- **Edge Cases**: Race conditions, database failures, email failures, malformed payloads

### Running Tests
```bash
# Run all webhook tests
npm run test:unit -- webhook

# Run integration tests
npm run test:integration -- api-webhooks

# Run with coverage
npm run test:coverage
```

## Local Development

### Stripe CLI Setup
1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks to local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
4. Copy the webhook signing secret to `.env`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### Testing Webhooks Locally
```bash
# Trigger a test checkout.session.completed event
stripe trigger checkout.session.completed

# Trigger with specific metadata
stripe trigger checkout.session.completed \
  --add checkout_session:metadata.site_id=test-site \
  --add checkout_session:metadata.order_items='[{"name":"Product 1","price":50,"quantity":2}]'

# Trigger subscription events
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
```

### Viewing Webhook Events
- In Stripe Dashboard: https://dashboard.stripe.com/test/webhooks
- In Database: `SELECT * FROM processed_webhooks ORDER BY processed_at DESC;`
- In Logs: Check console output for webhook processing messages

## Production Deployment

### Environment Variables
Required in production `.env`:
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
DATABASE_URL=postgresql://...
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@yourdomain.com
SITE_URL=https://yourdomain.com
```

### Stripe Dashboard Setup
1. Go to Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy webhook signing secret to `.env`

### Monitoring
- Monitor webhook processing in Stripe Dashboard
- Check database `processed_webhooks` table for successful events
- Set up alerts for failed webhooks (check Stripe Dashboard > Webhooks > Errors)
- Monitor application logs for error messages

## Troubleshooting

### Webhook Not Received
- Check Stripe Dashboard > Webhooks > Events to see if webhook was sent
- Verify webhook endpoint URL is correct
- Check server logs for any errors
- Ensure server is accessible from internet (not localhost in production)

### Signature Verification Fails
- Verify `STRIPE_WEBHOOK_SECRET` matches the secret in Stripe Dashboard
- Ensure raw body is being used (not parsed JSON)
- Check for any middleware that might modify the request body

### Duplicate Processing
- Check `processed_webhooks` table to see if event was already processed
- Verify idempotency logic is working correctly
- This should not happen with proper implementation

### Database Errors
- Check database connection and credentials
- Verify migrations have been run
- Check database logs for specific error messages
- Ensure transactions are being used correctly

### Email Not Sent
- Check email service configuration (RESEND_API_KEY)
- Verify FROM_EMAIL is configured and verified
- Check application logs for email errors
- Note: Email failures don't fail webhook processing

## Migration from Old Implementation

The old webhook implementation in `server.js` (lines 134-353) has been:
1. Commented out for reference
2. Replaced with new TDD implementation
3. Can be removed after verification

### Key Differences
- **Idempotency**: Now uses database instead of file system
- **Testing**: Comprehensive test coverage vs. no tests
- **Transaction Safety**: All database operations use transactions
- **Error Handling**: More robust with better logging
- **Email Handling**: Failures don't block webhook processing
- **Code Organization**: Separated concerns (routes vs. business logic)

### Verification Checklist
- [ ] All existing webhooks still work
- [ ] Order creation works correctly
- [ ] Subscription creation works correctly
- [ ] Email notifications are sent
- [ ] Duplicate webhooks are handled correctly
- [ ] Errors are logged appropriately
- [ ] Database transactions work correctly

## Future Enhancements

Potential improvements:
1. Add webhook event replay UI for manual testing
2. Add webhook event inspection/debugging tools
3. Add more sophisticated retry logic (exponential backoff)
4. Add webhook event analytics and monitoring dashboard
5. Add support for more Stripe events (refunds, disputes, etc.)
6. Add webhook event archiving/cleanup job

## API Reference

### POST /api/webhooks/stripe
Receives Stripe webhook events.

**Headers:**
- `stripe-signature` (required): Webhook signature from Stripe

**Body:**
Raw JSON body from Stripe

**Responses:**
- `200 OK`: Webhook processed successfully or already processed
  ```json
  {
    "received": true,
    "processed": true,
    "action": "payment_processed",
    "orderId": "uuid"
  }
  ```
- `400 Bad Request`: Invalid signature or malformed payload
  ```json
  {
    "error": "Invalid webhook signature",
    "code": "INVALID_SIGNATURE"
  }
  ```
- `500 Internal Server Error`: Processing error (Stripe will retry)
  ```json
  {
    "error": "Webhook processing failed - will retry",
    "code": "PROCESSING_ERROR",
    "eventId": "evt_123"
  }
  ```

## Database Schema

### processed_webhooks
```sql
CREATE TABLE processed_webhooks (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  data JSONB,
  processed_at TIMESTAMP DEFAULT NOW()
);
```

### orders
```sql
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  stripe_session_id TEXT UNIQUE,
  customer_email TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### order_items
```sql
CREATE TABLE order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### subscriptions
```sql
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  plan TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Contact
For questions or issues with the webhook implementation, contact the development team or refer to:
- Stripe Webhook Documentation: https://stripe.com/docs/webhooks
- SiteSprintz TDD Guidelines: docs/TDD-GUIDELINES.md

