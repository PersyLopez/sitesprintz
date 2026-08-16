/**
 * Policy configuration — single source of truth for legal acceptance.
 *
 * POLICY_VERSION is stamped onto every recorded acceptance so we can prove,
 * for a given user, exactly which version of the agreements they accepted.
 * Bump POLICY_VERSION (and POLICY_LAST_UPDATED) whenever the Terms, Privacy
 * Policy, or Third-Party Services Disclosure change materially — material
 * changes require users to re-accept (clickwrap enforceability requirement).
 */

export const POLICY_VERSION = '2026-06-07';
export const POLICY_LAST_UPDATED = 'June 7, 2026';

/**
 * Independent third-party providers that process data on the platform's
 * behalf. Sensitive information (payments, authentication, contact details)
 * is handled by these providers under their own terms and privacy policies.
 * Keep this list accurate — it is rendered verbatim in the public disclosure.
 */
export const THIRD_PARTY_PROCESSORS = [
  {
    name: 'Stripe, Inc.',
    purpose: 'Payment processing, subscriptions, and merchant payouts',
    data: 'Payment card numbers, billing name and address, bank/payout details, transaction history',
    privacyUrl: 'https://stripe.com/privacy',
    termsUrl: 'https://stripe.com/legal',
  },
  {
    name: 'PayPal Holdings, Inc.',
    purpose: 'Optional alternative payment processing',
    data: 'Payment account identifiers and transaction amounts',
    privacyUrl: 'https://www.paypal.com/us/legalhub/privacy-full',
    termsUrl: 'https://www.paypal.com/us/legalhub/useragreement-full',
  },
  {
    name: 'Block, Inc. (Square)',
    purpose: 'Optional alternative payment processing',
    data: 'Payment card details and transaction data',
    privacyUrl: 'https://squareup.com/us/en/legal/general/privacy',
    termsUrl: 'https://squareup.com/us/en/legal/general/ua',
  },
  {
    name: 'Google LLC',
    purpose: 'Optional single sign-on (Google OAuth login)',
    data: 'Email address, Google account ID, profile name and picture',
    privacyUrl: 'https://policies.google.com/privacy',
    termsUrl: 'https://policies.google.com/terms',
  },
  {
    name: 'Resend',
    purpose: 'Transactional and notification email delivery',
    data: 'Recipient email address and message content',
    privacyUrl: 'https://resend.com/legal/privacy-policy',
    termsUrl: 'https://resend.com/legal/terms-of-service',
  },
  {
    name: 'SMTP email providers (e.g. Microsoft, Google)',
    purpose: 'Fallback email delivery when configured',
    data: 'Recipient email address and message content',
    privacyUrl: 'https://privacy.microsoft.com/privacystatement',
    termsUrl: '',
  },
  {
    name: 'Neon, Inc. (PostgreSQL hosting)',
    purpose: 'Encrypted database hosting and storage',
    data: 'All account and site data (encrypted in transit and at rest)',
    privacyUrl: 'https://neon.tech/privacy-policy',
    termsUrl: 'https://neon.tech/terms-of-service',
  },
  {
    name: 'Cloudflare, Inc. (Turnstile)',
    purpose: 'Bot and abuse prevention (CAPTCHA)',
    data: 'IP address and browser/device signals',
    privacyUrl: 'https://www.cloudflare.com/privacypolicy/',
    termsUrl: 'https://www.cloudflare.com/website-terms/',
  },
];

export default { POLICY_VERSION, POLICY_LAST_UPDATED, THIRD_PARTY_PROCESSORS };
