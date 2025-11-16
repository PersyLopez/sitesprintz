/**
 * 🔴 RED PHASE: EmailService Tests
 * 
 * Comprehensive test suite for EmailService class
 * Following strict TDD methodology - tests written FIRST
 * 
 * Coverage:
 * - Email sending with multiple providers (Resend + Nodemailer)
 * - Template rendering with data
 * - Email queue and retry logic
 * - Error handling and logging
 * - Contact form integration
 * - Order email flow
 * - Trial expiration emails
 * 
 * Total Tests: 30
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmailService } from '../../server/services/emailService.js';

describe('EmailService', () => {
  let emailService;
  let mockResend;
  let mockNodemailer;
  let mockQueue;
  let mockLogger;

  beforeEach(() => {
    // Mock Resend API
    mockResend = {
      emails: {
        send: vi.fn().mockResolvedValue({ 
          data: { id: 'test-email-id-123' }, 
          error: null 
        })
      }
    };

    // Mock Nodemailer transporter
    mockNodemailer = {
      sendMail: vi.fn().mockResolvedValue({ 
        messageId: 'test-message-id-456' 
      }),
      verify: vi.fn().mockResolvedValue(true)
    };

    // Mock queue
    mockQueue = {
      add: vi.fn().mockResolvedValue({ id: 'queue-job-123' }),
      process: vi.fn(),
      on: vi.fn()
    };

    // Mock logger
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn()
    };

    // Create service instance with mocked dependencies
    emailService = new EmailService({
      resend: mockResend,
      nodemailer: mockNodemailer,
      queue: mockQueue,
      logger: mockLogger
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor & Configuration', () => {
    it('should initialize with default configuration', () => {
      const service = new EmailService();
      expect(service).toBeDefined();
      expect(service.config).toBeDefined();
      expect(service.config.defaultProvider).toBe('resend');
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        defaultProvider: 'smtp',
        retryAttempts: 5,
        retryDelay: 2000
      };
      const service = new EmailService({ config: customConfig });
      expect(service.config.defaultProvider).toBe('smtp');
      expect(service.config.retryAttempts).toBe(5);
      expect(service.config.retryDelay).toBe(2000);
    });

    it('should initialize providers based on environment variables', () => {
      process.env.RESEND_API_KEY = 'test-resend-key';
      process.env.SMTP_USER = 'test@example.com';
      process.env.SMTP_PASS = 'test-pass';
      
      const service = new EmailService();
      expect(service.providers.resend).toBeDefined();
      expect(service.providers.smtp).toBeDefined();
    });
  });

  describe('sendEmail - Basic Functionality', () => {
    it('should send email using Resend provider', async () => {
      const result = await emailService.sendEmail({
        to: 'customer@example.com',
        template: 'orderReceived',
        data: { 
          businessName: 'Test Business',
          orderNumber: '12345' 
        },
        provider: 'resend'
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-email-id-123');
      expect(result.provider).toBe('resend');
      expect(mockResend.emails.send).toHaveBeenCalledTimes(1);
    });

    it('should send email using SMTP provider', async () => {
      const result = await emailService.sendEmail({
        to: 'user@example.com',
        template: 'welcome',
        data: { email: 'user@example.com' },
        provider: 'smtp'
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id-456');
      expect(result.provider).toBe('smtp');
      expect(mockNodemailer.sendMail).toHaveBeenCalledTimes(1);
    });

    it('should use default provider when none specified', async () => {
      const result = await emailService.sendEmail({
        to: 'test@example.com',
        template: 'welcome',
        data: {}
      });

      expect(result.success).toBe(true);
      // Welcome uses SMTP (platform emails), not Resend
      expect(mockNodemailer.sendMail).toHaveBeenCalledTimes(1);
    });

    it('should validate required fields (to, template)', async () => {
      await expect(
        emailService.sendEmail({ template: 'welcome', data: {} })
      ).rejects.toThrow('Email recipient is required');

      await expect(
        emailService.sendEmail({ to: 'test@example.com', data: {} })
      ).rejects.toThrow('Email template is required');
    });

    it('should throw error for unknown template', async () => {
      await expect(
        emailService.sendEmail({
          to: 'test@example.com',
          template: 'unknownTemplate',
          data: {}
        })
      ).rejects.toThrow('Unknown email template: unknownTemplate');
    });
  });

  describe('Template Rendering', () => {
    it('should render welcome email template', async () => {
      const result = await emailService.sendEmail({
        to: 'user@example.com',
        template: 'welcome',
        data: { email: 'user@example.com' }
      });

      const emailCall = mockNodemailer.sendMail.mock.calls[0][0];
      expect(emailCall.subject).toContain('Welcome');
      expect(emailCall.html).toContain('Welcome');
    });

    it('should render order received email template', async () => {
      const result = await emailService.sendEmail({
        to: 'customer@example.com',
        template: 'orderReceived',
        data: {
          businessName: 'Test Restaurant',
          orderNumber: 'ORD-12345',
          customerName: 'John Doe',
          total: '$45.99'
        }
      });

      const emailCall = mockResend.emails.send.mock.calls[0][0];
      expect(emailCall.subject).toContain('Order Received');
      expect(emailCall.html).toContain('Test Restaurant');
      expect(emailCall.html).toContain('ORD-12345');
      expect(emailCall.html).toContain('$45.99');
    });

    it('should render contact form submission email', async () => {
      const result = await emailService.sendEmail({
        to: 'owner@business.com',
        template: 'contactFormSubmission',
        data: {
          businessName: 'My Business',
          submitterName: 'Jane Smith',
          submitterEmail: 'jane@example.com',
          message: 'I have a question about your services'
        }
      });

      const emailCall = mockResend.emails.send.mock.calls[0][0];
      expect(emailCall.subject).toContain('New Contact Form');
      expect(emailCall.html).toContain('Jane Smith');
      expect(emailCall.html).toContain('jane@example.com');
      expect(emailCall.html).toContain('I have a question');
    });

    it('should render trial expiration warning email', async () => {
      const result = await emailService.sendEmail({
        to: 'user@example.com',
        template: 'trialExpiring',
        data: {
          businessName: 'My Business',
          daysRemaining: 3,
          subdomain: 'mybusiness'
        }
      });

      const emailCall = mockResend.emails.send.mock.calls[0][0];
      expect(emailCall.subject).toContain('Trial');
      expect(emailCall.subject).toContain('3 Days');
      expect(emailCall.html).toContain('3 days');
      expect(emailCall.html).toContain('mybusiness');
    });

    it('should handle missing template data gracefully', async () => {
      const result = await emailService.sendEmail({
        to: 'test@example.com',
        template: 'welcome',
        data: {} // Missing email field
      });

      expect(result.success).toBe(true);
      const emailCall = mockNodemailer.sendMail.mock.calls[0][0];
      expect(emailCall.html).toBeDefined();
    });
  });

  describe('Email Queue & Retry Logic', () => {
    it('should queue email when queue is enabled', async () => {
      emailService.config.useQueue = true;

      await emailService.sendEmail({
        to: 'test@example.com',
        template: 'welcome',
        data: {}
      });

      expect(mockQueue.add).toHaveBeenCalledTimes(1);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-email',
        expect.objectContaining({
          to: 'test@example.com',
          template: 'welcome'
        })
      );
    });

    it('should retry failed email sends up to configured limit', async () => {
      // Welcome template uses SMTP
      mockNodemailer.sendMail
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ messageId: 'success-id' });

      emailService.config.retryAttempts = 3;
      emailService.config.retryDelay = 10; // Fast retry for testing

      const result = await emailService.sendEmail({
        to: 'test@example.com',
        template: 'welcome',
        data: {}
      });

      expect(result.success).toBe(true);
      expect(mockNodemailer.sendMail).toHaveBeenCalledTimes(3);
      expect(mockLogger.warn).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retry attempts', async () => {
      // Use orderReceived template which uses Resend
      mockResend.emails.send.mockRejectedValue(new Error('Permanent failure'));

      emailService.config.retryAttempts = 2;
      emailService.config.retryDelay = 10;
      emailService.config.fallbackToSMTP = false; // Disable fallback for this test

      const result = await emailService.sendEmail({
        to: 'test@example.com',
        template: 'orderReceived',
        data: { businessName: 'Test' }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Permanent failure');
      expect(mockResend.emails.send).toHaveBeenCalledTimes(2);
    });

    it('should implement exponential backoff for retries', async () => {
      const delays = [];
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn((fn, delay) => {
        delays.push(delay);
        return originalSetTimeout(fn, 0);
      });

      mockNodemailer.sendMail
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce({ messageId: 'success' });

      emailService.config.retryAttempts = 3;
      emailService.config.retryDelay = 100;
      emailService.config.exponentialBackoff = true;

      await emailService.sendEmail({
        to: 'test@example.com',
        template: 'welcome',
        data: {}
      });

      expect(delays[0]).toBe(100);
      expect(delays[1]).toBe(200); // Exponential backoff
      global.setTimeout = originalSetTimeout;
    });
  });

  describe('Error Handling', () => {
    it('should handle Resend API errors gracefully', async () => {
      mockResend.emails.send.mockResolvedValue({
        data: null,
        error: { message: 'Invalid API key' }
      });

      emailService.config.retryAttempts = 1;
      emailService.config.fallbackToSMTP = false;

      const result = await emailService.sendEmail({
        to: 'test@example.com',
        template: 'orderReceived',
        data: { businessName: 'Test' }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid API key');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle SMTP connection errors', async () => {
      mockNodemailer.sendMail.mockRejectedValue(new Error('SMTP connection refused'));

      const result = await emailService.sendEmail({
        to: 'test@example.com',
        template: 'welcome',
        data: {},
        provider: 'smtp'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('SMTP connection refused');
    });

    it('should log all email failures', async () => {
      mockResend.emails.send.mockRejectedValue(new Error('Send failed'));
      emailService.config.retryAttempts = 1;
      emailService.config.fallbackToSMTP = false;

      await emailService.sendEmail({
        to: 'test@example.com',
        template: 'orderReceived',
        data: { businessName: 'Test' }
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Email send failed'),
        expect.any(Object)
      );
    });

    it('should fallback to SMTP if Resend fails permanently', async () => {
      mockResend.emails.send.mockRejectedValue(new Error('Resend unavailable'));
      emailService.config.fallbackToSMTP = true;
      emailService.config.retryAttempts = 1;

      const result = await emailService.sendEmail({
        to: 'test@example.com',
        template: 'welcome',
        data: {},
        provider: 'resend'
      });

      expect(mockNodemailer.sendMail).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Falling back to SMTP')
      );
    });
  });

  describe('Specific Email Types', () => {
    it('should send order received email', async () => {
      const result = await emailService.sendOrderEmail({
        type: 'received',
        to: 'customer@example.com',
        orderData: {
          businessName: 'Test Restaurant',
          orderNumber: 'ORD-001',
          items: [{ name: 'Pizza', quantity: 2, price: '$15.99' }],
          total: '$31.98'
        }
      });

      expect(result.success).toBe(true);
      expect(mockResend.emails.send).toHaveBeenCalled();
    });

    it('should send contact form notification email', async () => {
      const result = await emailService.sendContactFormEmail({
        to: 'owner@business.com',
        formData: {
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '555-1234',
          message: 'Interested in your services'
        },
        businessName: 'My Business'
      });

      expect(result.success).toBe(true);
      expect(mockResend.emails.send).toHaveBeenCalled();
    });

    it('should send trial expiration warning email', async () => {
      const result = await emailService.sendTrialEmail({
        to: 'user@example.com',
        type: 'expiring',
        trialData: {
          businessName: 'My Site',
          daysRemaining: 3,
          subdomain: 'mysite',
          upgradeUrl: 'https://example.com/upgrade'
        }
      });

      expect(result.success).toBe(true);
      expect(mockResend.emails.send).toHaveBeenCalled();
    });

    it('should send subscription created email', async () => {
      const result = await emailService.sendEmail({
        to: 'user@example.com',
        template: 'subscriptionCreated',
        data: { plan: 'pro' }
      });

      expect(result.success).toBe(true);
      // subscriptionCreated uses SMTP (platform email)
      const emailCall = mockNodemailer.sendMail.mock.calls[0][0];
      expect(emailCall.subject).toContain('Subscription');
      expect(emailCall.html).toContain('pro');
    });
  });

  describe('Configuration & Provider Selection', () => {
    it('should route customer-facing emails to Resend', async () => {
      await emailService.sendEmail({
        to: 'customer@example.com',
        template: 'orderReceived',
        data: { businessName: 'Test' }
      });

      expect(mockResend.emails.send).toHaveBeenCalled();
      expect(mockNodemailer.sendMail).not.toHaveBeenCalled();
    });

    it('should route platform emails to SMTP', async () => {
      await emailService.sendEmail({
        to: 'user@example.com',
        template: 'welcome',
        data: {}
      });

      // Welcome emails should go through SMTP (platform emails)
      expect(mockNodemailer.sendMail).toHaveBeenCalled();
    });

    it('should allow manual provider override', async () => {
      await emailService.sendEmail({
        to: 'test@example.com',
        template: 'welcome',
        data: {},
        provider: 'smtp'
      });

      expect(mockNodemailer.sendMail).toHaveBeenCalled();
      expect(mockResend.emails.send).not.toHaveBeenCalled();
    });

    it('should handle missing provider configuration', async () => {
      const serviceWithoutProviders = new EmailService({
        resend: null,
        nodemailer: null
      });

      serviceWithoutProviders.config.fallbackToSMTP = false;
      serviceWithoutProviders.config.retryAttempts = 1;

      const result = await serviceWithoutProviders.sendEmail({
        to: 'test@example.com',
        template: 'welcome',
        data: {}
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No email provider configured');
    });
  });
});

