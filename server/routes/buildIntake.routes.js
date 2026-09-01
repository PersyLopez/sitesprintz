/**
 * Build-on-request intake (campaign we-build or Growth Managed $75).
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import { prisma } from '../../database/db.js';
import { requireAdmin } from '../middleware/auth.js';
import { buildIntakeLimiter, uploadLimiter } from '../middleware/rateLimiting.js';
import { emailService } from '../services/emailService.js';
import logger from '../utils/logger.js';
import { persistIntakePhoto, INTAKE_UPLOADS_DIR } from '../utils/intakePhoto.js';
import {
  sanitizeBuildIntake,
  BUILD_INTAKE_FORM_TYPE,
  BUILD_INTAKE_STATUSES,
} from '../../src/config/buildIntake.js';
import {
  sendCreated,
  sendBadRequest,
  sendSuccess,
  sendNotFound,
  asyncHandler,
} from '../utils/apiResponse.js';

const router = express.Router();

const intakeUpload = multer({
  dest: INTAKE_UPLOADS_DIR,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const extOk = allowed.test(path.extname(file.originalname || '').toLowerCase());
    const mimeOk = allowed.test(String(file.mimetype || '').toLowerCase());
    if (extOk && mimeOk) {
      cb(null, true);
      return;
    }
    cb(new Error('Only image files are allowed'));
  },
});

function isSafeOpsEmail(value) {
  return typeof value === 'string' && value.includes('@') && value.length <= 80;
}

function listRow(sub) {
  const payload = sub.data && typeof sub.data === 'object' ? sub.data : {};
  return {
    id: sub.id,
    status: sub.status,
    submittedAt: sub.created_at,
    businessName: payload.businessName || '',
    contactName: payload.contactName || '',
    contactEmail: payload.contactEmail || '',
    recommendedPlan: payload.recommendedPlan || payload.plan || '',
    setupOfferCampaignId: payload.setupOfferCampaignId || '',
  };
}

async function sendOpsMail(payload, submissionId) {
  const opsEmail = process.env.ADMIN_EMAIL;
  if (!isSafeOpsEmail(opsEmail)) {
    const error = new Error('ADMIN_EMAIL missing');
    error.code = 'OPS_MAIL_MISSING';
    throw error;
  }
  const result = await emailService.sendEmail({
    to: opsEmail,
    template: 'buildIntakeOps',
    data: { ...payload, submissionId },
  });
  if (!result?.success) {
    const error = new Error(result?.error || 'Ops mail failed');
    error.code = 'OPS_MAIL_FAILED';
    throw error;
  }
}

function queueCustomerMail(payload) {
  if (!payload.contactEmail) return;
  Promise.resolve(
    emailService.sendEmail({
      to: payload.contactEmail,
      template: 'buildIntakeCustomer',
      data: payload,
    }),
  ).catch(() => {
    logger.warn('build_intake_customer_mail_failed', { code: 'CUSTOMER_MAIL_FAILED' });
  });
}

router.post('/photo', uploadLimiter, (req, res) => {
  intakeUpload.single('image')(req, res, async (err) => {
    if (err) {
      return sendBadRequest(res, err.message || 'Upload failed', 'UPLOAD_ERROR');
    }
    if (!req.file) {
      return sendBadRequest(res, 'No file uploaded', 'NO_FILE');
    }
    try {
      const url = await persistIntakePhoto(req.file);
      return sendCreated(res, { url }, 'Photo uploaded');
    } catch (error) {
      logger.warn('build_intake_photo_failed', { code: error.code || 'IMAGE_PROCESS' });
      return sendBadRequest(res, error.message || 'Upload failed', error.code || 'IMAGE_PROCESS');
    }
  });
});

router.get('/', requireAdmin, asyncHandler(async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : '';
  const where = { form_type: BUILD_INTAKE_FORM_TYPE };
  if (status && BUILD_INTAKE_STATUSES.includes(status)) {
    where.status = status;
  }
  const rows = await prisma.submissions.findMany({
    where,
    orderBy: { created_at: 'desc' },
    take: 200,
  });
  return sendSuccess(res, { submissions: rows.map(listRow) });
}));

router.get('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) {
    return sendBadRequest(res, 'Invalid id', 'INVALID_ID');
  }
  const row = await prisma.submissions.findFirst({
    where: { id, form_type: BUILD_INTAKE_FORM_TYPE },
  });
  if (!row) {
    return sendNotFound(res, 'Submission', 'NOT_FOUND');
  }
  return sendSuccess(res, {
    submission: {
      ...listRow(row),
      data: row.data,
    },
  });
}));

router.patch('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const nextStatus = String(req.body?.status || '');
  if (!Number.isFinite(id) || !BUILD_INTAKE_STATUSES.includes(nextStatus)) {
    return sendBadRequest(res, 'Invalid status', 'INVALID_STATUS');
  }
  const row = await prisma.submissions.findFirst({
    where: { id, form_type: BUILD_INTAKE_FORM_TYPE },
  });
  if (!row) {
    return sendNotFound(res, 'Submission', 'NOT_FOUND');
  }
  const updated = await prisma.submissions.update({
    where: { id },
    data: { status: nextStatus },
  });
  return sendSuccess(res, { submission: listRow(updated) });
}));

router.post('/:id/resend-ops', requireAdmin, asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) {
    return sendBadRequest(res, 'Invalid id', 'INVALID_ID');
  }
  const row = await prisma.submissions.findFirst({
    where: { id, form_type: BUILD_INTAKE_FORM_TYPE },
  });
  if (!row) {
    return sendNotFound(res, 'Submission', 'NOT_FOUND');
  }
  try {
    await sendOpsMail(row.data && typeof row.data === 'object' ? row.data : {}, row.id);
    const updated = await prisma.submissions.update({
      where: { id },
      data: { status: row.status === 'notify_failed' ? 'unread' : row.status },
    });
    return sendSuccess(res, { submission: listRow(updated) });
  } catch (error) {
    logger.warn('build_intake_ops_mail_failed', { submissionId: id, code: error.code || 'OPS_MAIL_FAILED' });
    return sendBadRequest(res, 'Could not send ops email', error.code || 'OPS_MAIL_FAILED');
  }
}));

router.post('/', buildIntakeLimiter, asyncHandler(async (req, res) => {
  const result = sanitizeBuildIntake(req.body);
  if (!result.ok) {
    if (result.code === 'SPAM') {
      return sendCreated(res, { accepted: true }, 'Received');
    }
    return sendBadRequest(res, result.error, result.code);
  }

  const payload = result.data;
  const submission = await prisma.submissions.create({
    data: {
      site_id: null,
      form_type: BUILD_INTAKE_FORM_TYPE,
      data: payload,
      status: 'unread',
      created_at: new Date(),
    },
  });

  try {
    await sendOpsMail(payload, submission.id);
  } catch (error) {
    logger.warn('build_intake_ops_mail_failed', {
      submissionId: submission.id,
      code: error.code || 'OPS_MAIL_FAILED',
    });
    await prisma.submissions.update({
      where: { id: submission.id },
      data: { status: 'notify_failed' },
    });
    queueCustomerMail(payload);
    return sendCreated(res, { submissionId: submission.id }, 'Build intake submitted');
  }

  queueCustomerMail(payload);
  return sendCreated(res, { submissionId: submission.id }, 'Build intake submitted');
}));

export default router;
