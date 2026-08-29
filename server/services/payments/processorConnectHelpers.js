/**
 * Shared helpers for connecting third-party payment processors.
 * Connections are per site. Owners can opt in to reuse a setup on
 * future sites, or copy it to every current site.
 */

import { prisma } from '../../../database/db.js';
import { encrypt } from '../../utils/encryption.js';
import { resolvePlanLimits } from '../../utils/resolveUserPlan.js';
import { getRedis } from '../../utils/redis.js';

export const PROCESSORS = ['stripe', 'square', 'paypal'];

/**
 * Processors visitors may pay with on a live site.
 * Square and PayPal can be connected in the owner dashboard; they are not
 * public checkout until their visitor charge path is finished.
 */
export const PUBLIC_VISITOR_PROCESSORS = ['stripe'];

export function isVisitorProcessorPublic(processor) {
  return PUBLIC_VISITOR_PROCESSORS.includes(processor);
}

export function stripeConnectReady(user) {
  return Boolean(user?.stripe_account_id) && user?.stripe_connected === true;
}

export function processorCredentialReady(byProcessor, processor) {
  return Boolean(byProcessor?.[processor]?.account_id);
}

/**
 * True when a visitor can pay online. Never the SiteSprintz platform ledger.
 * Non-public processors can be connected without making this true.
 *
 * @param {{ user?: object, byProcessor?: object, defaultProcessor?: string|null }} [connected]
 * @returns {boolean}
 */
export function visitorOnlinePaymentReady(connected = {}) {
  return publicVisitorCheckoutProcessor(connected) != null;
}

/**
 * Which processor should run visitor Checkout. Null → pay on site.
 *
 * @param {{ user?: object, byProcessor?: object, defaultProcessor?: string|null }} [connected]
 * @returns {'stripe'|'square'|'paypal'|null}
 */
export function publicVisitorCheckoutProcessor(connected = {}) {
  const { user, byProcessor, defaultProcessor } = connected;
  const preferred = isVisitorProcessorPublic(defaultProcessor) ? defaultProcessor : null;
  const candidates = preferred
    ? [preferred, ...PUBLIC_VISITOR_PROCESSORS.filter((processor) => processor !== preferred)]
    : PUBLIC_VISITOR_PROCESSORS;

  for (const processor of candidates) {
    if (processor === 'stripe' && stripeConnectReady(user)) return 'stripe';
    if (processor !== 'stripe' && processorCredentialReady(byProcessor, processor)) return processor;
  }
  return null;
}

export function visitorCheckoutPublicMap() {
  return Object.fromEntries(PROCESSORS.map((processor) => [
    processor,
    isVisitorProcessorPublic(processor),
  ]));
}

const PENDING_TTL_SECONDS = 60 * 60 * 24 * 30;
const FUTURE_TTL_SECONDS = 60 * 60 * 24 * 90;

function pendingKey(userId, processor) {
  return `processor_pending:${userId}:${processor}`;
}

function futureDefaultsKey(userId) {
  return `payment_future_defaults:${userId}`;
}

export function normalizeApplyTo(value) {
  if (value === 'all' || value === 'future' || value === 'site') return value;
  return 'site';
}

async function savePendingConnection(userId, processor, payload, accountId, applyTo) {
  if (!userId) return;
  const redis = getRedis();
  if (!redis?.setex) return;
  await redis.setex(
    pendingKey(userId, processor),
    PENDING_TTL_SECONDS,
    JSON.stringify({
      processor,
      account_id: accountId,
      applyTo: normalizeApplyTo(applyTo),
      ...payload
    })
  );
}

async function loadPendingConnections(userId) {
  if (!userId) return [];
  const redis = getRedis();
  if (!redis?.get) return [];

  const pending = [];
  for (const processor of PROCESSORS) {
    const raw = await redis.get(pendingKey(userId, processor));
    if (!raw) continue;
    try {
      pending.push(typeof raw === 'string' ? JSON.parse(raw) : raw);
    } catch {
      // Ignore corrupt pending payloads
    }
  }
  return pending;
}

async function clearPendingConnection(userId, processor) {
  if (!userId || !processor) return;
  const redis = getRedis();
  if (!redis?.del) return;
  await redis.del(pendingKey(userId, processor));
}

export async function saveFuturePaymentDefaults(userId, sourceSiteId, enabled = true) {
  if (!userId) return;
  const redis = getRedis();
  if (!redis?.setex) return;

  if (!enabled) {
    if (redis.del) await redis.del(futureDefaultsKey(userId));
    return;
  }

  if (!sourceSiteId) return;
  await redis.setex(
    futureDefaultsKey(userId),
    FUTURE_TTL_SECONDS,
    JSON.stringify({ enabled: true, sourceSiteId })
  );
}

export async function getFuturePaymentDefaults(userId) {
  if (!userId) return { enabled: false, sourceSiteId: null };
  const redis = getRedis();
  if (!redis?.get) return { enabled: false, sourceSiteId: null };

  const raw = await redis.get(futureDefaultsKey(userId));
  if (!raw) return { enabled: false, sourceSiteId: null };

  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return {
      enabled: parsed.enabled === true,
      sourceSiteId: parsed.sourceSiteId || null
    };
  } catch {
    return { enabled: false, sourceSiteId: null };
  }
}

export function getFrontendOrigin(req) {
  return (
    process.env.CLIENT_URL ||
    process.env.FRONTEND_URL ||
    req?.headers?.origin ||
    'http://localhost:3000'
  );
}

export function getApiOrigin(req) {
  if (process.env.API_PUBLIC_URL) return process.env.API_PUBLIC_URL;
  if (req?.protocol && req.get) {
    return `${req.protocol}://${req.get('host')}`;
  }
  return process.env.CLIENT_URL || 'http://localhost:3000';
}

export function isProcessorConfigured(processor) {
  if (processor === 'stripe') {
    return Boolean(process.env.STRIPE_SECRET_KEY);
  }
  if (processor === 'square') {
    return Boolean(process.env.SQUARE_APPLICATION_ID && process.env.SQUARE_APPLICATION_SECRET);
  }
  if (processor === 'paypal') {
    return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
  }
  return false;
}

export async function userCanConnectPayments(userId) {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { plan: true, subscription_plan: true }
  });
  return Boolean(resolvePlanLimits(user).payments);
}

export async function resolveOwnedSiteId(userId, siteId) {
  if (siteId) {
    const site = await prisma.sites.findFirst({
      where: { id: siteId, user_id: userId },
      select: { id: true }
    });
    return site?.id || null;
  }

  const site = await prisma.sites.findFirst({
    where: { user_id: userId },
    orderBy: { created_at: 'asc' },
    select: { id: true }
  });
  return site?.id || null;
}

export async function listOwnedSiteIds(userId) {
  if (!userId || typeof prisma.sites.findMany !== 'function') {
    return [];
  }

  const sites = await prisma.sites.findMany({
    where: { user_id: userId },
    select: { id: true }
  });
  return sites.map((site) => site.id);
}

function credentialPayload({
  accountId,
  accessToken,
  refreshToken,
  expiresAt,
  metadata = {}
}) {
  const data = {
    account_id: accountId,
    is_active: true,
    connected_at: new Date(),
    disconnected_at: null,
    expires_at: expiresAt ? new Date(expiresAt) : null,
    metadata
  };

  if (accessToken) {
    data.access_token_encrypted = encrypt(accessToken);
  }
  if (refreshToken) {
    data.refresh_token_encrypted = encrypt(refreshToken);
  }

  return data;
}

function storedCredentialPayload(cred) {
  return {
    account_id: cred.account_id,
    access_token_encrypted: cred.access_token_encrypted,
    refresh_token_encrypted: cred.refresh_token_encrypted,
    webhook_secret_encrypted: cred.webhook_secret_encrypted,
    expires_at: cred.expires_at,
    is_active: true,
    connected_at: cred.connected_at || new Date(),
    disconnected_at: null,
    metadata: cred.metadata || {}
  };
}

async function writeCredentialsToSite(siteId, processor, payload, setDefault, accountId) {
  await prisma.payment_processor_credentials.upsert({
    where: {
      site_id_processor: {
        site_id: siteId,
        processor
      }
    },
    create: {
      site_id: siteId,
      processor,
      ...payload
    },
    update: {
      ...payload,
      updated_at: new Date()
    }
  });

  if (!setDefault) return;

  await prisma.sites.update({
    where: { id: siteId },
    data: { payment_processor: processor }
  });

  if (prisma.site_payment_method?.upsert) {
    await prisma.site_payment_method.upsert({
      where: { site_id: siteId },
      update: {
        provider: processor,
        account_id: accountId,
        is_active: true,
        updated_at: new Date()
      },
      create: {
        site_id: siteId,
        provider: processor,
        account_id: accountId,
        is_active: true
      }
    });
  }
}

async function targetSiteIds({ userId, siteId, applyTo }) {
  const ids = new Set();
  if (normalizeApplyTo(applyTo) === 'all') {
    for (const id of await listOwnedSiteIds(userId)) ids.add(id);
  }
  if (siteId) ids.add(siteId);
  return ids;
}

export async function recordProcessorConnection({
  siteId,
  userId,
  processor,
  accountId,
  accessToken,
  refreshToken,
  expiresAt,
  metadata = {},
  setDefault = true,
  stripeChargesEnabled,
  applyTo = 'site'
}) {
  const payload = credentialPayload({
    accountId,
    accessToken,
    refreshToken,
    expiresAt,
    metadata
  });
  const scope = normalizeApplyTo(applyTo);
  const siteIds = await targetSiteIds({ userId, siteId, applyTo: scope });

  if (siteIds.size === 0) {
    await savePendingConnection(userId, processor, payload, accountId, scope);
  } else {
    for (const id of siteIds) {
      await writeCredentialsToSite(id, processor, payload, setDefault, accountId);
    }
    if (scope === 'future' || scope === 'all') {
      await saveFuturePaymentDefaults(userId, siteId || [...siteIds][0], true);
    }
  }

  if (processor === 'stripe' && userId && accountId) {
    await prisma.users.update({
      where: { id: userId },
      data: {
        stripe_account_id: accountId,
        stripe_connected: stripeChargesEnabled === true
      }
    });
  }
}

export async function copyPaymentSetupToSites({ userId, sourceSiteId, targetSiteIds, applyToFuture = false }) {
  if (!userId || !sourceSiteId) return { copied: 0 };

  const sourceCreds = await prisma.payment_processor_credentials.findMany({
    where: { site_id: sourceSiteId, is_active: true }
  });

  const sourceSite = await prisma.sites.findFirst({
    where: { id: sourceSiteId, user_id: userId },
    select: { payment_processor: true }
  });

  const destinations = (targetSiteIds || []).filter((id) => id && id !== sourceSiteId);
  for (const targetId of destinations) {
    for (const cred of sourceCreds) {
      await writeCredentialsToSite(
        targetId,
        cred.processor,
        storedCredentialPayload(cred),
        sourceSite?.payment_processor === cred.processor,
        cred.account_id
      );
    }
  }

  if (applyToFuture) {
    await saveFuturePaymentDefaults(userId, sourceSiteId, true);
  }

  return { copied: destinations.length };
}

export async function inheritPaymentAccountsForSite(userId, newSiteId) {
  if (!userId || !newSiteId) return;

  const future = await getFuturePaymentDefaults(userId);
  if (future.enabled && future.sourceSiteId && future.sourceSiteId !== newSiteId) {
    await copyPaymentSetupToSites({
      userId,
      sourceSiteId: future.sourceSiteId,
      targetSiteIds: [newSiteId]
    });
    return;
  }

  const pending = await loadPendingConnections(userId);
  if (pending.length === 0) return;

  const sibling = await prisma.sites.findFirst({
    where: {
      user_id: userId,
      id: { not: newSiteId },
      payment_processor: { not: null }
    },
    select: { payment_processor: true }
  });

  let applyPendingToFuture = false;
  for (const cred of pending) {
    await writeCredentialsToSite(
      newSiteId,
      cred.processor,
      storedCredentialPayload(cred),
      sibling?.payment_processor === cred.processor,
      cred.account_id
    );
    if (cred.applyTo === 'future' || cred.applyTo === 'all') {
      applyPendingToFuture = true;
    }
    await clearPendingConnection(userId, cred.processor);
  }

  if (applyPendingToFuture) {
    await saveFuturePaymentDefaults(userId, newSiteId, true);
  }
}

export async function deactivateProcessor({ siteId, userId, processor, applyTo = 'site' }) {
  const siteIds = await targetSiteIds({ userId, siteId, applyTo });

  for (const id of siteIds) {
    await prisma.payment_processor_credentials.updateMany({
      where: { site_id: id, processor },
      data: {
        is_active: false,
        disconnected_at: new Date(),
        updated_at: new Date()
      }
    });

    const method = prisma.site_payment_method?.findUnique
      ? await prisma.site_payment_method.findUnique({ where: { site_id: id } })
      : null;

    if (method?.provider === processor) {
      const fallback = await prisma.payment_processor_credentials.findFirst({
        where: {
          site_id: id,
          is_active: true,
          processor: { not: processor }
        }
      });

      if (fallback) {
        if (prisma.site_payment_method?.update) {
          await prisma.site_payment_method.update({
            where: { site_id: id },
            data: {
              provider: fallback.processor,
              account_id: fallback.account_id,
              updated_at: new Date()
            }
          });
        }
        await prisma.sites.update({
          where: { id },
          data: { payment_processor: fallback.processor }
        });
      } else if (prisma.site_payment_method?.update) {
        await prisma.site_payment_method.update({
          where: { site_id: id },
          data: { is_active: false, updated_at: new Date() }
        });
      }
    }
  }

  const future = await getFuturePaymentDefaults(userId);
  if (future.sourceSiteId && siteIds.has(future.sourceSiteId)) {
    await saveFuturePaymentDefaults(userId, future.sourceSiteId, false);
  }

  if (normalizeApplyTo(applyTo) === 'all') {
    await clearPendingConnection(userId, processor);
  }
}

export async function getConnectedProcessors(userId, siteId) {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: {
      stripe_account_id: true,
      stripe_connected: true
    }
  });

  const credentials = await prisma.payment_processor_credentials.findMany({
    where: {
      is_active: true,
      ...(siteId
        ? { site_id: siteId }
        : { sites: { user_id: userId } })
    },
    select: {
      processor: true,
      account_id: true,
      connected_at: true,
      metadata: true
    }
  });

  const paymentMethod = siteId && typeof prisma.site_payment_method?.findUnique === 'function'
    ? await prisma.site_payment_method.findUnique({
        where: { site_id: siteId },
        select: { provider: true, account_id: true, is_active: true }
      })
    : null;

  const byProcessor = Object.fromEntries(
    credentials.map((cred) => [cred.processor, cred])
  );

  if (!siteId) {
    const pending = await loadPendingConnections(userId);
    for (const cred of pending) {
      if (!byProcessor[cred.processor]) {
        byProcessor[cred.processor] = {
          processor: cred.processor,
          account_id: cred.account_id,
          connected_at: cred.connected_at || null,
          metadata: cred.metadata || {}
        };
      }
    }
  }

  const futureDefaults = await getFuturePaymentDefaults(userId);

  return {
    user,
    credentials,
    byProcessor,
    defaultProcessor: paymentMethod?.is_active
      ? paymentMethod.provider
      : (byProcessor.stripe ? 'stripe' : null),
    defaultAccountId: paymentMethod?.is_active
      ? paymentMethod.account_id
      : byProcessor.stripe?.account_id || null,
    futureDefaults
  };
}

/**
 * Payment-status payload for dashboard cards. Never throws; never calls Stripe.
 */
export async function getPaymentConnectStatus(userId, requestedSiteId) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY || '';
  const stripePublishable = process.env.STRIPE_PUBLISHABLE_KEY || '';
  const available = {
    stripe: isProcessorConfigured('stripe'),
    stripeOAuth: Boolean(stripeSecret && process.env.STRIPE_CLIENT_ID),
    square: isProcessorConfigured('square'),
    paypal: isProcessorConfigured('paypal')
  };
  const stripeTestMode = available.stripe
    && (stripeSecret.startsWith('sk_test_') || stripePublishable.startsWith('pk_test_'));

  const EMPTY_CONNECT_STATUS = {
    connected: false,
    accountId: null,
    siteId: null,
    chargesEnabled: false,
    payoutsEnabled: false,
    square: { connected: false, accountId: null },
    paypal: { connected: false, accountId: null },
    stripe: { connected: false, accountAvailable: false, accountId: null, testMode: stripeTestMode },
    defaultProcessor: null,
    futureDefaults: { enabled: false, sourceSiteId: null },
    available: {
      stripe: false,
      stripeOAuth: false,
      square: false,
      paypal: false
    },
    visitorCheckout: visitorCheckoutPublicMap(),
  };

  try {
    const siteId = await resolveOwnedSiteId(userId, requestedSiteId);
    let extra;
    try {
      extra = await getConnectedProcessors(userId, siteId);
    } catch (error) {
      console.error('Failed to load connected processors:', error);
      extra = {
        user: null,
        byProcessor: {},
        defaultProcessor: null,
        futureDefaults: EMPTY_CONNECT_STATUS.futureDefaults
      };
    }

    const stripeAccountId = extra.user?.stripe_account_id
      || extra.byProcessor.stripe?.account_id
      || null;
    const stripeReady = extra.user?.stripe_connected === true;
    const squareConnected = Boolean(extra.byProcessor.square);
    const paypalConnected = Boolean(extra.byProcessor.paypal);

    return {
      connected: stripeReady || squareConnected || paypalConnected,
      accountId: stripeAccountId,
      siteId,
      chargesEnabled: stripeReady,
      payoutsEnabled: stripeReady,
      status: stripeReady ? 'active' : (stripeAccountId ? 'pending' : undefined),
      square: {
        connected: squareConnected,
        accountId: extra.byProcessor.square?.account_id || null
      },
      paypal: {
        connected: paypalConnected,
        accountId: extra.byProcessor.paypal?.account_id || null
      },
      stripe: {
        connected: Boolean(extra.byProcessor.stripe),
        accountAvailable: Boolean(stripeAccountId),
        accountId: extra.byProcessor.stripe?.account_id || stripeAccountId,
        testMode: stripeTestMode
      },
      defaultProcessor: extra.defaultProcessor,
      futureDefaults: extra.futureDefaults || EMPTY_CONNECT_STATUS.futureDefaults,
      available,
      visitorCheckout: visitorCheckoutPublicMap(),
    };
  } catch (error) {
    console.error('Failed to build payment connect status:', error);
    return { ...EMPTY_CONNECT_STATUS, available };
  }
}
