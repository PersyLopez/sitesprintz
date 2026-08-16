# Stripe Go-Live Checklist 💳

**Critical Safety Protocol**: Before switching your environment variables from `sk_test_...` to `sk_live_...`, you MUST perform these verifications. Failure to do so can result in lost revenue or tax compliance issues.

## 1. Safety & Configuration
- [ ] **Rotate Keys**: Ensure `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` are updated to Live keys in your production `.env`.
- [ ] **Webhook Secret**: The `STRIPE_WEBHOOK_SECRET` **CHANGE** when you move to Live. You must create a *new* webhook endpoint in the Stripe Dashboard pointing to `https://your-domain.com/api/webhooks/stripe` and grab the new signing secret (`whsec_...`).
    - *Risk*: If you use the Test secret with Live keys, all webhooks will fail signature verification.
- [ ] **Tax Configuration**:
    - Current Setting: `automatic_tax: { enabled: false }` (Hardcoded in `server/routes/payments.routes.js`).
    - *Action*: If you need to collect sales tax, change this to `true` and configure tax settings in the Stripe Dashboard.

## 2. "The Penny Test" (Live Transaction Verification)
You cannot simulate a live card with a test number. You must use a **real** credit card.

1.  **Create a $0.50 Product**: Create a temporary cheap product or use a coupon to lower the price to the minimum allowed ($0.50 USD).
2.  **Purchase with Real Card**: Buy this product on your live production site.
3.  **Verify Webhook**: Check your Stripe Dashboard > Developers > Webhooks. Did the `checkout.session.completed` event fire? Did your server return `200 OK`?
4.  **Verify Fulfillment**: Did you receive the "Order Confirmation" email? (This proves `RESEND_API_KEY` + Webhook flow are working together).
5.  **Refund Yourself**: In Stripe Dashboard, find the payment and issue a full refund.

## 3. Error Handling
- [ ] **Decline Test**: Attempt a purchase with a card but enter an incorrect CVC or Expiry. Verify the UI shows a clean error message, not a crash.

## 4. Banking & Payouts
- [ ] **Connect Onboarding**: If you use Stripe Connect (for sub-merchants), verify that a real user can complete the "Onboard with Stripe" flow and return to your dashboard with `charges_enabled: true`.

## 5. Radar (Fraud) rules
- [ ] **Review Rules**: In Stripe Dashboard, ensure your fraud rules are not too strict (blocking real customers) or too loose. Default settings are usually fine for launch.

---
> [!IMPORTANT]
> **Do not skip the Webhook Secret update.** This is the #1 cause of "I got paid but no order was created" issues.
