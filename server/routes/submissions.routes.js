/**
 * Submissions Routes
 * 
 * Handles contact form submissions and form data management.
 * All submissions are stored in the database (primary).
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import emailService from '../utils/email-service-wrapper.js';
import { prisma } from '../../database/db.js';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendForbidden,
  sendNotFound,
  sendServerError,
  asyncHandler
} from '../utils/apiResponse.js';
import {
  validateEmail,
  validatePhone,
  sanitizeString,
  generateSecureId
} from '../utils/validators.js';

const router = express.Router();

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
  const siteOwnerEmail = siteData.published?.email || siteData.contact?.email || site.users?.email;
  const businessName = siteData.brand?.name || 'Your Business';

  // Create submission
  const submissionId = generateSecureId('sub');
  const sanitizedName = sanitizeString(name || '', 200);
  const sanitizedMessage = sanitizeString(message, 2000);

  const submission = await prisma.submissions.create({
    data: {
      site_id: site.id,
      form_type: type || 'contact',
      name: sanitizedName,
      email: emailValidation.value,
      phone: phone || null,
      message: sanitizedMessage,
      status: 'unread',
      custom_data: Object.keys(otherFields).length > 0 ? otherFields : null,
      created_at: new Date()
    }
  });

  // Send notification email (non-blocking)
  if (siteOwnerEmail) {
    emailService.sendContactFormEmail({
      to: siteOwnerEmail,
      businessName,
      formData: {
        name: sanitizedName || 'Someone',
        email: emailValidation.value,
        phone: phone || 'Not provided',
        message: sanitizedMessage
      }
    }).catch(err => {
      console.error('Failed to send submission notification email:', err);
    });
  }

  return sendCreated(res, {
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
          subdomain: true,
          site_data: true
        }
      }
    },
    orderBy: { created_at: 'desc' },
    take: Math.min(parseInt(limit) || 100, 500)
  });

  const formattedSubmissions = submissions.map(sub => {
    const siteData = parseSiteData(sub.sites);
    return {
      id: sub.id,
      name: sub.name,
      email: sub.email,
      phone: sub.phone,
      message: sub.message,
      type: sub.form_type,
      status: sub.status,
      submittedAt: sub.created_at,
      readAt: sub.read_at,
      subdomain: sub.sites?.subdomain,
      businessName: siteData?.brand?.name || 'Unknown Site',
      customData: sub.custom_data
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

  // Build query
  const where = { site_id: site.id };
  if (status) {
    where.status = status;
  }

  const submissions = await prisma.submissions.findMany({
    where,
    orderBy: { created_at: 'desc' },
    take: Math.min(parseInt(limit) || 100, 500)
  });

  const formattedSubmissions = submissions.map(sub => ({
    id: sub.id,
    name: sub.name,
    email: sub.email,
    phone: sub.phone,
    message: sub.message,
    type: sub.form_type,
    status: sub.status,
    submittedAt: sub.created_at,
    readAt: sub.read_at,
    customData: sub.custom_data
  }));

  return sendSuccess(res, { submissions: formattedSubmissions });
}));

/**
 * GET /api/submissions/:submissionId
 * Get a single submission
 */
router.get('/:submissionId', requireAuth, asyncHandler(async (req, res) => {
  const { submissionId } = req.params;
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

  return sendSuccess(res, {
    submission: {
      id: submission.id,
      name: submission.name,
      email: submission.email,
      phone: submission.phone,
      message: submission.message,
      type: submission.form_type,
      status: submission.status,
      submittedAt: submission.created_at,
      readAt: submission.read_at,
      subdomain: submission.sites?.subdomain,
      businessName: siteData?.brand?.name || 'Unknown Site',
      customData: submission.custom_data
    }
  });
}));

/**
 * PATCH /api/submissions/:submissionId/read
 * Mark submission as read
 */
router.patch('/:submissionId/read', requireAuth, asyncHandler(async (req, res) => {
  const { submissionId } = req.params;
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
  const { submissionId } = req.params;
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
  const { submissionId } = req.params;
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
