// Mock for email service
import { vi } from 'vitest';

export const sendEmail = vi.fn().mockResolvedValue({
  success: true,
  messageId: 'mock-message-id',
});

export const EmailTypes = {
  WELCOME: 'welcome',
  VERIFY_EMAIL: 'verifyEmail',
  RESET_PASSWORD: 'resetPassword',
  SITE_PUBLISHED: 'sitePublished',
  SITE_UPDATED: 'siteUpdated',
  TRIAL_EXPIRING: 'trialExpiring',
  TRIAL_EXPIRED: 'trialExpired',
  SUBSCRIPTION_CONFIRMED: 'subscriptionConfirmed',
  PAYMENT_RECEIVED: 'paymentReceived',
  CONTACT_FORM_SUBMISSION: 'contactFormSubmission',
};

export default {
  sendEmail,
  EmailTypes,
};

