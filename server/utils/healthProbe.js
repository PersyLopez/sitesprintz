import crypto from 'crypto';
import { prisma } from '../../database/db.js';

export const HEALTH_PROBE_HEADER = 'x-health-probe';
export const HEALTH_PROBE_FORM_TYPE = 'health_probe';
const RETENTION_DAYS = 7;

/**
 * Constant-time compare of probe secret. Length mismatch returns false
 * after a dummy compare so timing does not leak secret presence.
 */
export function healthProbeSecretMatches(headerValue) {
  const secret = process.env.HEALTH_PROBE_SECRET;
  if (!secret || !headerValue) {
    return false;
  }
  const a = Buffer.from(String(headerValue), 'utf8');
  const b = Buffer.from(String(secret), 'utf8');
  if (a.length !== b.length) {
    const dummy = Buffer.alloc(a.length || 32);
    crypto.timingSafeEqual(a.length ? a : dummy, dummy);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

export function isHealthProbeConfigured() {
  return Boolean(process.env.HEALTH_PROBE_SECRET && process.env.HEALTH_PROBE_SUBDOMAIN);
}

export function isHealthProbeRequest(req) {
  return Boolean(req.headers?.[HEALTH_PROBE_HEADER]);
}

export async function purgeOldHealthProbes() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  await prisma.submissions.deleteMany({
    where: {
      form_type: HEALTH_PROBE_FORM_TYPE,
      created_at: { lt: cutoff },
    },
  });
}

export async function getFormsHealthSummary() {
  const [lastContact, lastPlatformFeedback] = await Promise.all([
    prisma.submissions.findFirst({
      where: { form_type: 'contact' },
      orderBy: { created_at: 'desc' },
      select: { created_at: true },
    }),
    prisma.submissions.findFirst({
      where: { form_type: 'platform_feedback' },
      orderBy: { created_at: 'desc' },
      select: { created_at: true },
    }),
  ]);

  return {
    contact: {
      lastSubmittedAt: lastContact?.created_at?.toISOString?.() ?? lastContact?.created_at ?? null,
    },
    platformFeedback: {
      lastSubmittedAt: lastPlatformFeedback?.created_at?.toISOString?.() ?? lastPlatformFeedback?.created_at ?? null,
    },
  };
}

export async function getCanaryStatus() {
  const subdomain = process.env.HEALTH_PROBE_SUBDOMAIN;
  const configured = Boolean(subdomain);
  if (!configured) {
    return { configured: false, siteFound: false };
  }
  const site = await prisma.sites.findFirst({
    where: { subdomain },
    select: { id: true },
  });
  return { configured: true, siteFound: Boolean(site) };
}
