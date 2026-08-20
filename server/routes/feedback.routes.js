/**
 * Platform feedback (closed-beta widget)
 */

import express from 'express';
import { prisma } from '../../database/db.js';
import { feedbackLimiter } from '../middleware/rateLimiting.js';
import { sendEmail, EmailTypes, sendAdminNotification } from '../utils/email-service-wrapper.js';
import { validateEmail, sanitizeString } from '../utils/validators.js';
import {
  sendCreated,
  sendBadRequest,
  asyncHandler
} from '../utils/apiResponse.js';

const router = express.Router();

const FEEDBACK_TYPES = new Set(['bug', 'feature', 'question']);
const MAX_MESSAGE_LENGTH = 4000;

router.post('/', feedbackLimiter, asyncHandler(async (req, res) => {
  const { type, message, email, url, userAgent } = req.body;

  if (!type || !FEEDBACK_TYPES.has(type)) {
    return sendBadRequest(res, 'Invalid feedback type', 'INVALID_TYPE');
  }

  if (!message || typeof message !== 'string' || !message.trim()) {
    return sendBadRequest(res, 'Message is required', 'MISSING_MESSAGE');
  }

  const sanitizedMessage = sanitizeString(message, MAX_MESSAGE_LENGTH);
  if (!sanitizedMessage) {
    return sendBadRequest(res, 'Message is required', 'MISSING_MESSAGE');
  }

  let submitterEmail = null;
  if (email) {
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return sendBadRequest(res, emailValidation.error, 'INVALID_EMAIL');
    }
    submitterEmail = emailValidation.value;
  }

  const payload = {
    type,
    message: sanitizedMessage,
    email: submitterEmail,
    url: url ? sanitizeString(String(url), 2000) : null,
    userAgent: userAgent ? sanitizeString(String(userAgent), 500) : null,
    submittedAt: new Date().toISOString()
  };

  const submission = await prisma.submissions.create({
    data: {
      site_id: null,
      form_type: 'platform_feedback',
      data: payload,
      status: 'unread',
      created_at: new Date()
    }
  });

  const notify = () => {
    const templateData = {
      businessName: 'SiteSprintz Platform',
      submitterName: submitterEmail || 'Anonymous',
      submitterEmail: submitterEmail || 'not provided',
      submitterPhone: 'N/A',
      message: `[${type}] ${sanitizedMessage}`,
      type: 'platform_feedback',
      siteUrl: payload.url || 'unknown',
      submissionTime: new Date().toLocaleString()
    };

    if (process.env.ADMIN_EMAIL && typeof sendEmail === 'function') {
      return sendEmail(process.env.ADMIN_EMAIL, EmailTypes.CONTACT_FORM_SUBMISSION, templateData);
    }
    if (typeof sendAdminNotification === 'function') {
      return sendAdminNotification(EmailTypes.CONTACT_FORM_SUBMISSION, templateData);
    }
    return Promise.resolve();
  };

  Promise.resolve(notify()).catch(() => {});

  return sendCreated(res, { submissionId: submission.id }, 'Feedback submitted');
}));

export default router;
