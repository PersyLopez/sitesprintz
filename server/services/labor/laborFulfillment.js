import { LABOR_SKUS } from '../../config/platformPlans.js';
import { createLaborLedger } from './laborLedger.js';
import { redactLaborSecrets } from './laborSecrets.js';

function laborSkuFromSession(session) {
  const type = typeof session?.metadata?.type === 'string' ? session.metadata.type : '';
  return Object.prototype.hasOwnProperty.call(LABOR_SKUS, type) ? type : null;
}

function customerEmailFromSession(session) {
  const email = session?.customer_details?.email || session?.customer_email;
  return typeof email === 'string' && email.includes('@') ? email : null;
}

/**
 * Record a paid extra after webhook signature verify. Does not change hosting plan.
 */
export async function fulfillLaborSession(session, {
  ledger = createLaborLedger(),
  emailService = null,
  opsEmail = process.env.ADMIN_EMAIL,
} = {}) {
  if (session?.metadata?.source !== 'labor_extra') {
    const error = new Error('Not a labor extras session');
    error.code = 'NOT_LABOR_SESSION';
    throw error;
  }

  const skuId = laborSkuFromSession(session);
  if (!skuId) {
    const error = new Error('Labor SKU missing');
    error.code = 'INVALID_LABOR_SKU';
    throw error;
  }

  const sessionId = session.id;
  const existing = await ledger.findBySessionId(sessionId);
  if (existing) {
    return { action: 'labor_duplicate', sku: skuId, sessionId };
  }

  const userId = session.metadata.userId;
  const siteId = session.metadata.siteId || null;
  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id || null;

  await ledger.append({
    sessionId,
    userId,
    siteId,
    sku: skuId,
    mode: session.mode,
    subscriptionId,
    status: session.payment_status || session.status || 'paid',
  });

  const skuName = LABOR_SKUS[skuId].name;
  const to = customerEmailFromSession(session);

  if (emailService && to) {
    try {
      await emailService.sendEmail({
        to,
        template: 'laborPurchaseCustomer',
        data: { skuName },
      });
    } catch {
      // Ledger is the source of truth; do not fail the webhook on mail.
    }
  }

  if (emailService && opsEmail && typeof opsEmail === 'string' && opsEmail.includes('@')) {
    try {
      await emailService.sendEmail({
        to: opsEmail,
        template: 'laborPurchaseOps',
        data: {
          skuName,
          userId: redactLaborSecrets(String(userId || '')),
          siteId: redactLaborSecrets(String(siteId || '')),
          sessionId: redactLaborSecrets(String(sessionId || '')),
        },
      });
    } catch {
      // same
    }
  }

  return { action: 'labor_fulfilled', sku: skuId, sessionId };
}
