/**
 * Build-on-request intake (Growth Managed $75/mo — first month includes the fill)
 */

import express from 'express';
import { prisma } from '../../database/db.js';
import { buildIntakeLimiter } from '../middleware/rateLimiting.js';
import { emailService } from '../services/emailService.js';
import { sanitizeBuildIntake, BUILD_INTAKE_FORM_TYPE } from '../../src/config/buildIntake.js';
import {
  sendCreated,
  sendBadRequest,
  asyncHandler,
} from '../utils/apiResponse.js';

const router = express.Router();

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

  const notify = async () => {
    const opsEmail = process.env.ADMIN_EMAIL;
    const tasks = [];

    if (payload.contactEmail) {
      tasks.push(
        emailService.sendEmail({
          to: payload.contactEmail,
          template: 'buildIntakeCustomer',
          data: payload,
        }),
      );
    }

    if (opsEmail && typeof opsEmail === 'string' && opsEmail.includes('@')) {
      tasks.push(
        emailService.sendEmail({
          to: opsEmail,
          template: 'buildIntakeOps',
          data: { ...payload, submissionId: submission.id },
        }),
      );
    }

    await Promise.allSettled(tasks);
  };

  Promise.resolve(notify()).catch(() => {});

  return sendCreated(res, { submissionId: submission.id }, 'Build intake submitted');
}));

export default router;
