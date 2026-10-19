/**
 * Submissions Routes
 * 
 * Handles contact form submissions and form data management.
 * All submissions are stored in the database (primary).
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { sendEmail, EmailTypes } from '../utils/email-service-wrapper.js';
import { getAbsolutePublishedSiteUrl, getOwnerMessagesUrl } from '../../src/utils/siteWorkspace.js';
import { prisma } from '../../database/db.js';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendForbidden,
  sendNotFound,
  asyncHandler
} from '../utils/apiResponse.js';
import {
  validateEmail,
  validatePhone,
  sanitizeString,
  sanitizeCustomFields
} from '../utils/validators.js';
import {
  isShowcaseDemoSite,
  isShowcaseDemoSiteData,
  buildDemoOrderId,
} from '../utils/showcaseDemo.js';
import {
  HEALTH_PROBE_FORM_TYPE,
  HEALTH_PROBE_HEADER,
  healthProbeSecretMatches,
  purgeOldHealthProbes,
} from '../utils/healthProbe.js';

const router = express.Router();

/** Links in the owner email for a saved shop message. */
export function packageQuoteMessage(message, fields, type) {
  const text = String(message || '').trim();
  if (type !== 'package-quote' || !fields || typeof fields !== 'object') return text;
  const picked = Object.keys(fields)
    .filter((key) => /^item_\d+$/.test(key))
    .sort((a, b) => Number(a.slice(5)) - Number(b.slice(5)))
    .map((key) => String(fields[key] || '').trim())
    .filter(Boolean);
  if (!picked.length) return text;
  const list = picked.join(', ');
  if (!text || text === 'Please quote this package.') return list;
  if (text.includes(list)) return text;
  return `${list}. ${text}`;
}

export function zipCheckMessage(message, zip, type) {
  const text = String(message || '').trim();
  const code = String(zip || '').trim();
  if (type !== 'zip-check' || !/^\d{5}$/.test(code)) return text;
  if (text.startsWith(`ZIP ${code}:`)) return text;
  return text ? `ZIP ${code}: ${text}` : `ZIP ${code}`;
}

export function contactOwnerNotice({ subdomain, siteId, phone }) {
  const siteUrl = getAbsolutePublishedSiteUrl(subdomain);
  return {
    siteUrl: siteUrl || String(subdomain || ''),
    messagesUrl: getOwnerMessagesUrl(siteId) || '',
    submitterPhone: phone ? String(phone) : 'Not provided',
  };
}

/**
 * Where a no-JS contact form returns. Same-origin referer keeps the shop
 * path (including a custom domain). Anything else goes to the public view.
 */
export function contactPostedReturnPath({ host, referer, subdomain }) {
  const fallback = `/view/${encodeURIComponent(subdomain || '')}?contact=sent`;
  if (!referer || !host) return fallback;
  try {
    const url = new URL(referer);
    if (url.host !== host) return fallback;
    url.searchParams.set('contact', 'sent');
    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
  }
}

function replyContactSaved(req, res, subdomain, body, message) {
  if (req.is('application/x-www-form-urlencoded')) {
    return res.redirect(303, contactPostedReturnPath({
      host: req.get('host'),
      referer: req.get('referer'),
      subdomain,
    }));
  }
  return sendCreated(res, body, message);
}

/**
 * Persist a contact-form health probe via the real submit path (no owner email).
 */
export async function createContactHealthProbe() {
  await purgeOldHealthProbes();

  const subdomain = process.env.HEALTH_PROBE_SUBDOMAIN;
  if (!subdomain) {
    return { ok: false, error: 'not_configured' };
  }

  const site = await getSiteBySubdomain(subdomain);
  if (!site) {
    return { ok: false, error: 'site_not_found', subdomain };
  }

  const submission = await prisma.submissions.create({
    data: {
      site_id: site.id,
      form_type: HEALTH_PROBE_FORM_TYPE,
      data: {
        probe: true,
        subdomain,
        source: 'health_probe',
      },
      status: 'read',
      created_at: new Date(),
    },
  });

  return { ok: true, submissionId: submission.id, subdomain };
}

/**
 * Helper: Get site by subdomain with owner info
 */
async function getSiteBySubdomain(subdomain) {
  return prisma.sites.findFirst({
    where: { subdomain },
    select: {
      id: true,
      subdomain: true,
      site_data: true,
      user_id: true,
      users: {
        select: { id: true, email: true }
      }
    }
  });
}

/**
 * Helper: Parse site_data
 */
function parseSiteData(site) {
  if (!site?.site_data) return {};
  if (typeof site.site_data === 'string') {
    try {
      return JSON.parse(site.site_data);
    } catch (e) {
      return {};
    }
  }
  return site.site_data;
}

/**
 * POST /api/submissions/contact
 * Submit a contact form
 */
router.post('/contact', asyncHandler(async (req, res) => {
  const { subdomain, name, email, phone, message, type, ...otherFields } = req.body;
  const probeHeader = req.headers[HEALTH_PROBE_HEADER];
  const wantsProbe = Boolean(probeHeader || type === HEALTH_PROBE_FORM_TYPE);

  if (wantsProbe) {
    if (!healthProbeSecretMatches(probeHeader)) {
      return res.status(401).json({ error: 'Unauthorized', code: 'PROBE_UNAUTHORIZED' });
    }
    const result = await createContactHealthProbe();
    if (!result.ok) {
      if (result.error === 'not_configured') {
        return sendBadRequest(res, 'Health probe not configured', 'PROBE_NOT_CONFIGURED');
      }
      return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
    }
    return sendCreated(res, {
      submissionId: result.submissionId,
      probe: true,
    }, 'Health probe recorded');
  }

  // Validate required fields
  if (!subdomain) {
    return sendBadRequest(res, 'Subdomain is required', 'MISSING_SUBDOMAIN');
  }

  if (!email) {
    return sendBadRequest(res, 'Email is required', 'MISSING_EMAIL');
  }

  if (!message) {
    return sendBadRequest(res, 'Message is required', 'MISSING_MESSAGE');
  }

  // Validate email
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return sendBadRequest(res, emailValidation.error, 'INVALID_EMAIL');
  }

  // Validate phone (optional)
  if (phone) {
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.valid) {
      return sendBadRequest(res, phoneValidation.error, 'INVALID_PHONE');
    }
  }

  // Find site
  const site = await getSiteBySubdomain(subdomain);
  if (!site) {
    return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
  }

  const siteData = parseSiteData(site);
  if (isShowcaseDemoSite(site) || isShowcaseDemoSiteData(siteData)) {
    return replyContactSaved(req, res, subdomain, {
      submissionId: buildDemoOrderId(),
      demo: true,
    }, 'Your message has been sent successfully');
  }

  const siteOwnerEmail = siteData.published?.email || siteData.contact?.email || site.users?.email;
  const businessName = siteData.brand?.name || 'Your Business';

  // Create submission
  const sanitizedName = sanitizeString(name || '', 200);
  const sanitizedMessage = zipCheckMessage(
    packageQuoteMessage(sanitizeString(message, 2000), otherFields, type),
    otherFields.zip,
    type
  );
  const sanitizedPhone = phone ? sanitizeString(String(phone), 40) : null;
  const formType = sanitizeString(type || 'contact', 50) || 'contact';
  const custom = sanitizeCustomFields(otherFields);

  const submission = await prisma.submissions.create({
    data: {
      site_id: site.id,
      form_type: formType,
      data: {
        name: sanitizedName,
        email: emailValidation.value,
        phone: sanitizedPhone,
        message: sanitizedMessage,
        ...(Object.keys(custom).length > 0 ? { custom } : {})
      },
      status: 'unread',
      created_at: new Date()
    }
  });

  // Send notification email (non-blocking; never fail the submission on email errors)
  if (siteOwnerEmail && typeof sendEmail === 'function') {
    const notice = contactOwnerNotice({
      subdomain,
      siteId: site.id,
      phone: sanitizedPhone,
    });
    Promise.resolve(
      sendEmail(siteOwnerEmail, EmailTypes.CONTACT_FORM_SUBMISSION, {
        businessName,
        submitterName: sanitizedName || 'Someone',
        submitterEmail: emailValidation.value,
        submitterPhone: notice.submitterPhone,
        message: sanitizedMessage,
        type: type || 'contact',
        siteUrl: notice.siteUrl,
        submissionTime: new Date().toLocaleString(),
        messagesUrl: notice.messagesUrl,
      })
    ).catch(err => {
      console.error('Failed to send submission notification email:', err);
    });
  }

  return replyContactSaved(req, res, subdomain, {
    submissionId: submission.id
  }, 'Your message has been sent successfully');
}));

/**
 * GET /api/submissions
 * Get all submissions for authenticated user's sites
 */
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user.userId;
  const { status, limit = 100 } = req.query;

  // Build query
  const where = {
    sites: { user_id: userId }
  };

  if (status) {
    where.status = status;
  }

  const submissions = await prisma.submissions.findMany({
    where,
    include: {
      sites: {
        select: {
          subdomain: true
          // intentionally omit site_data — owners don't need full site blob here
        }
      }
    },
    orderBy: { created_at: 'desc' },
    take: Math.min(parseInt(limit) || 100, 500)
  });

  const formattedSubmissions = submissions.map(sub => {
    const payload = sub.data && typeof sub.data === 'object' ? sub.data : {};
    return {
      id: sub.id,
      name: payload.name || null,
      email: payload.email || null,
      phone: payload.phone || null,
      message: payload.message || null,
      type: sub.form_type,
      status: sub.status,
      submittedAt: sub.created_at,
      subdomain: sub.sites?.subdomain,
      businessName: sub.sites?.subdomain || 'Unknown Site',
      customData: payload.custom || null
    };
  });

  return sendSuccess(res, { submissions: formattedSubmissions });
}));

/**
 * GET /api/submissions/site/:subdomain
 * Get submissions for a specific site
 */
router.get('/site/:subdomain', requireAuth, asyncHandler(async (req, res) => {
  const { subdomain } = req.params;
  const userId = req.user.id || req.user.userId;
  const { status, limit = 100 } = req.query;

  // Find and verify site ownership
  const site = await getSiteBySubdomain(subdomain);
  if (!site) {
    return sendNotFound(res, 'Site', 'SITE_NOT_FOUND');
  }

  if (site.user_id !== userId && req.user.role !== 'admin') {
    return sendForbidden(res, 'Not authorized to view these submissions', 'ACCESS_DENIED');
  }

  // Build query (archived messages are excluded from the inbox unless explicitly requested)
  const where = { site_id: site.id };
  if (status) {
    where.status = status;
  } else {
    where.status = { not: 'archived' };
  }

  const submissions = await prisma.submissions.findMany({
    where,
    orderBy: { created_at: 'desc' },
    take: Math.min(parseInt(limit) || 100, 500)
  });

  const formattedSubmissions = submissions.map(sub => {
    const payload = sub.data && typeof sub.data === 'object' ? sub.data : {};
    return {
      id: sub.id,
      name: payload.name || null,
      email: payload.email || null,
      phone: payload.phone || null,
      message: payload.message || null,
      type: sub.form_type,
      status: sub.status,
      submittedAt: sub.created_at,
      customData: payload.custom || null
    };
  });

  return sendSuccess(res, { submissions: formattedSubmissions });
}));

/**
 * GET /api/submissions/:submissionId
 * Get a single submission
 */
router.get('/:submissionId', requireAuth, asyncHandler(async (req, res) => {
  const submissionId = Number.parseInt(req.params.submissionId, 10);
  if (!Number.isFinite(submissionId)) {
    return sendBadRequest(res, 'Invalid submission id', 'INVALID_ID');
  }
  const userId = req.user.id || req.user.userId;

  const submission = await prisma.submissions.findUnique({
    where: { id: submissionId },
    include: {
      sites: {
        select: {
          subdomain: true,
          user_id: true,
          site_data: true
        }
      }
    }
  });

  if (!submission) {
    return sendNotFound(res, 'Submission', 'SUBMISSION_NOT_FOUND');
  }

  // Verify ownership
  if (submission.sites?.user_id !== userId && req.user.role !== 'admin') {
    return sendForbidden(res, 'Not authorized to view this submission', 'ACCESS_DENIED');
  }

  const siteData = parseSiteData(submission.sites);

  const payload = submission.data && typeof submission.data === 'object' ? submission.data : {};

  return sendSuccess(res, {
    submission: {
      id: submission.id,
      name: payload.name || null,
      email: payload.email || null,
      phone: payload.phone || null,
      message: payload.message || null,
      type: submission.form_type,
      status: submission.status,
      submittedAt: submission.created_at,
      subdomain: submission.sites?.subdomain,
      businessName: siteData?.brand?.name || 'Unknown Site',
      customData: payload.custom || null
    }
  });
}));

/**
 * PATCH /api/submissions/:submissionId/read
 * Mark submission as read
 */
router.patch('/:submissionId/read', requireAuth, asyncHandler(async (req, res) => {
  const submissionId = Number.parseInt(req.params.submissionId, 10);
  if (!Number.isFinite(submissionId)) {
    return sendBadRequest(res, 'Invalid submission id', 'INVALID_ID');
  }
  const userId = req.user.id || req.user.userId;

  // Find submission with site ownership check
  const submission = await prisma.submissions.findUnique({
    where: { id: submissionId },
    include: {
      sites: {
        select: { user_id: true }
      }
    }
  });

  if (!submission) {
    return sendNotFound(res, 'Submission', 'SUBMISSION_NOT_FOUND');
  }

  if (submission.sites?.user_id !== userId && req.user.role !== 'admin') {
    return sendForbidden(res, 'Not authorized to modify this submission', 'ACCESS_DENIED');
  }

  // Update status
  await prisma.submissions.update({
    where: { id: submissionId },
    data: {
      status: 'read',
      read_at: new Date()
    }
  });

  return sendSuccess(res, {}, 'Submission marked as read');
}));

/**
 * PATCH /api/submissions/:submissionId/archive
 * Archive a submission
 */
router.patch('/:submissionId/archive', requireAuth, asyncHandler(async (req, res) => {
  const submissionId = Number.parseInt(req.params.submissionId, 10);
  if (!Number.isFinite(submissionId)) {
    return sendBadRequest(res, 'Invalid submission id', 'INVALID_ID');
  }
  const userId = req.user.id || req.user.userId;

  const submission = await prisma.submissions.findUnique({
    where: { id: submissionId },
    include: {
      sites: {
        select: { user_id: true }
      }
    }
  });

  if (!submission) {
    return sendNotFound(res, 'Submission', 'SUBMISSION_NOT_FOUND');
  }

  if (submission.sites?.user_id !== userId && req.user.role !== 'admin') {
    return sendForbidden(res, 'Not authorized to modify this submission', 'ACCESS_DENIED');
  }

  await prisma.submissions.update({
    where: { id: submissionId },
    data: { status: 'archived' }
  });

  return sendSuccess(res, {}, 'Submission archived');
}));

/**
 * DELETE /api/submissions/:submissionId
 * Delete a submission
 */
router.delete('/:submissionId', requireAuth, asyncHandler(async (req, res) => {
  const submissionId = Number.parseInt(req.params.submissionId, 10);
  if (!Number.isFinite(submissionId)) {
    return sendBadRequest(res, 'Invalid submission id', 'INVALID_ID');
  }
  const userId = req.user.id || req.user.userId;

  const submission = await prisma.submissions.findUnique({
    where: { id: submissionId },
    include: {
      sites: {
        select: { user_id: true }
      }
    }
  });

  if (!submission) {
    return sendNotFound(res, 'Submission', 'SUBMISSION_NOT_FOUND');
  }

  if (submission.sites?.user_id !== userId && req.user.role !== 'admin') {
    return sendForbidden(res, 'Not authorized to delete this submission', 'ACCESS_DENIED');
  }

  await prisma.submissions.delete({
    where: { id: submissionId }
  });

  return sendSuccess(res, {}, 'Submission deleted');
}));

/**
 * GET /api/submissions/stats
 * Get submission statistics for user's sites
 */
router.get('/stats/summary', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user.userId;

  // Get counts by status
  const [total, unread, read, archived] = await Promise.all([
    prisma.submissions.count({
      where: { sites: { user_id: userId } }
    }),
    prisma.submissions.count({
      where: { sites: { user_id: userId }, status: 'unread' }
    }),
    prisma.submissions.count({
      where: { sites: { user_id: userId }, status: 'read' }
    }),
    prisma.submissions.count({
      where: { sites: { user_id: userId }, status: 'archived' }
    })
  ]);

  // Get recent submissions (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentCount = await prisma.submissions.count({
    where: {
      sites: { user_id: userId },
      created_at: { gte: sevenDaysAgo }
    }
  });

  return sendSuccess(res, {
    stats: {
      total,
      unread,
      read,
      archived,
      recentWeek: recentCount
    }
  });
}));

export default router;
