/**
 * 🔵 Integration Tests: Email Service Flows
 * 
 * Tests the complete email flow from service calls to email delivery
 * Covers:
 * - Trial expiration email flow
 * - Contact form submission email flow
 * - Order confirmation email flow
 * - Subscription creation email flow
 * - Error handling and retry flows
 * 
 * Total Tests: 15
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmailService, emailService } from '../../server/services/emailService.js';
import { TrialService } from '../../server/services/trialService.js';

describe('Email Service Integration Tests', () => {
  let mockResend;
  let mockNodemailer;
  let mockDb;
  let testEmailService;

  beforeEach(() => {
    // Mock email providers
    mockResend = {
      emails: {
        send: vi.fn().mockResolvedValue({ 
          data: { id: 'test-id-123' }, 
          error: null 
        })
      }
    };

    mockNodemailer = {
      sendMail: vi.fn().mockResolvedValue({ 
        messageId: 'test-message-456' 
      })
    };

    // Create test instance with mocks
    testEmailService = new EmailService({
      resend: mockResend,
      nodemailer: mockNodemailer,
      config: {
        retryAttempts: 2,
        retryDelay: 10,
        fallbackToSMTP: true
      }
    });

    // Mock database
    mockDb = {
      query: vi.fn(),
      transaction: vi.fn()
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Trial Expiration Email Flow', () => {
    it('should send trial warning email through complete flow', async () => {
      const trialService = new TrialService(mockDb, testEmailService);

      // Mock database to return expiring site
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 'site-123',
          subdomain: 'test-site',
          expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          site_data: JSON.stringify({ brand: { name: 'Test Business' } }),
          owner_email: 'owner@example.com',
          warning_sent_at: null,
          user_id: 'user-123'
        }]
      }).mockResolvedValueOnce({ rowCount: 1 }); // UPDATE query

      const result = await trialService.sendTrialWarnings();

      // Verify trial warning was sent
      expect(result.sent).toBe(1);
      expect(mockResend.emails.send).toHaveBeenCalled();
      
      const emailCall = mockResend.emails.send.mock.calls[0][0];
      expect(emailCall.to).toEqual(['owner@example.com']);
      expect(emailCall.subject).toContain('Trial');
      expect(emailCall.html).toContain('Test Business');
      expect(emailCall.html).toContain('3 days');
    });

    it('should handle email failure and mark in database', async () => {
      mockResend.emails.send.mockResolvedValue({
        data: null,
        error: { message: 'Email service unavailable' }
      });

      const trialService = new TrialService(mockDb, testEmailService);

      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 'site-123',
          subdomain: 'test-site',
          expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          site_data: JSON.stringify({ brand: { name: 'Test Business' } }),
          owner_email: 'owner@example.com',
          warning_sent_at: null,
          user_id: 'user-123'
        }]
      });

      const result = await trialService.sendTrialWarnings();

      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(mockDb.query).toHaveBeenCalledTimes(1); // No UPDATE since email failed
    });

    it('should use fallback SMTP when Resend fails', async () => {
      testEmailService.config.fallbackToSMTP = true;
      mockResend.emails.send.mockRejectedValue(new Error('Resend unavailable'));

      const result = await testEmailService.sendTrialEmail({
        to: 'user@example.com',
        type: 'expiring',
        trialData: {
          businessName: 'Test Site',
          daysRemaining: 3,
          subdomain: 'testsite'
        }
      });

      // Should fallback to SMTP
      expect(mockNodemailer.sendMail).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('Contact Form Email Flow', () => {
    it('should send contact form notification to site owner', async () => {
      const result = await testEmailService.sendContactFormEmail({
        to: 'owner@business.com',
        businessName: 'My Business',
        formData: {
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '555-1234',
          message: 'I would like more information about your services'
        }
      });

      expect(result.success).toBe(true);
      expect(mockResend.emails.send).toHaveBeenCalled();

      const emailCall = mockResend.emails.send.mock.calls[0][0];
      expect(emailCall.to).toEqual(['owner@business.com']);
      expect(emailCall.subject).toContain('Contact Form');
      expect(emailCall.html).toContain('Jane Doe');
      expect(emailCall.html).toContain('jane@example.com');
      expect(emailCall.html).toContain('555-1234');
      expect(emailCall.html).toContain('I would like more information');
      expect(emailCall.replyTo).toBe('jane@example.com');
    });

    it('should handle contact form email with missing optional fields', async () => {
      const result = await testEmailService.sendContactFormEmail({
        to: 'owner@business.com',
        businessName: 'My Business',
        formData: {
          name: 'John Smith',
          email: 'john@example.com',
          // phone and message might be optional
          message: 'Quick question'
        }
      });

      expect(result.success).toBe(true);
      expect(mockResend.emails.send).toHaveBeenCalled();
    });

    it('should retry contact form email on temporary failure', async () => {
      mockResend.emails.send
        .mockRejectedValueOnce(new Error('Temporary network error'))
        .mockResolvedValueOnce({ data: { id: 'success-id' }, error: null });

      const result = await testEmailService.sendContactFormEmail({
        to: 'owner@business.com',
        businessName: 'My Business',
        formData: {
          name: 'Test User',
          email: 'test@example.com',
          message: 'Test message'
        }
      });

      expect(result.success).toBe(true);
      expect(result.attempt).toBe(2); // Succeeded on second attempt
      expect(mockResend.emails.send).toHaveBeenCalledTimes(2);
    });
  });

  describe('Order Confirmation Email Flow', () => {
    it('should send order received email to customer', async () => {
      const result = await testEmailService.sendOrderEmail({
        type: 'received',
        to: 'customer@example.com',
        orderData: {
          businessName: 'Pizza Palace',
          orderNumber: 'ORD-12345',
          customerName: 'John Doe',
          total: '$45.99',
          items: [
            { name: 'Large Pepperoni Pizza', quantity: 2, price: '$15.99' },
            { name: 'Garlic Bread', quantity: 1, price: '$5.99' }
          ]
        }
      });

      expect(result.success).toBe(true);
      expect(mockResend.emails.send).toHaveBeenCalled();

      const emailCall = mockResend.emails.send.mock.calls[0][0];
      expect(emailCall.to).toEqual(['customer@example.com']);
      expect(emailCall.subject).toContain('Order Received');
      expect(emailCall.html).toContain('Pizza Palace');
      expect(emailCall.html).toContain('ORD-12345');
      expect(emailCall.html).toContain('$45.99');
    });

    it('should send order email with correct provider (Resend)', async () => {
      await testEmailService.sendOrderEmail({
        type: 'received',
        to: 'customer@example.com',
        orderData: {
          businessName: 'Test Restaurant',
          orderNumber: 'ORD-001',
          total: '$25.00'
        }
      });

      // Order emails should use Resend (customer-facing)
      expect(mockResend.emails.send).toHaveBeenCalled();
      expect(mockNodemailer.sendMail).not.toHaveBeenCalled();
    });
  });

  describe('Subscription Email Flow', () => {
    it('should send subscription created email via SMTP', async () => {
      const result = await testEmailService.sendEmail({
        to: 'user@example.com',
        template: 'subscriptionCreated',
        data: { plan: 'pro' }
      });

      expect(result.success).toBe(true);
      // Subscription emails are platform emails, use SMTP
      expect(mockNodemailer.sendMail).toHaveBeenCalled();

      const emailCall = mockNodemailer.sendMail.mock.calls[0][0];
      expect(emailCall.to).toBe('user@example.com');
      expect(emailCall.subject).toContain('Pro');
      expect(emailCall.html).toContain('pro');
    });

    it('should send welcome email via SMTP', async () => {
      const result = await testEmailService.sendEmail({
        to: 'newuser@example.com',
        template: 'welcome',
        data: {}
      });

      expect(result.success).toBe(true);
      // Welcome emails are platform emails, use SMTP
      expect(mockNodemailer.sendMail).toHaveBeenCalled();
      expect(mockResend.emails.send).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle complete provider failure gracefully', async () => {
      testEmailService.config.fallbackToSMTP = false;
      mockResend.emails.send.mockRejectedValue(new Error('Service completely down'));

      const result = await testEmailService.sendEmail({
        to: 'test@example.com',
        template: 'orderReceived',
        data: { businessName: 'Test' }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Service completely down');
      expect(mockResend.emails.send).toHaveBeenCalledTimes(2); // Retries
    });

    it('should log errors for all failed attempts', async () => {
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn()
      };

      const serviceWithLogger = new EmailService({
        resend: mockResend,
        nodemailer: mockNodemailer,
        logger: mockLogger,
        config: {
          retryAttempts: 2,
          retryDelay: 10,
          fallbackToSMTP: false
        }
      });

      mockResend.emails.send.mockRejectedValue(new Error('Permanent error'));

      await serviceWithLogger.sendEmail({
        to: 'test@example.com',
        template: 'orderReceived',
        data: { businessName: 'Test' }
      });

      // Should log warning for first retry
      expect(mockLogger.warn).toHaveBeenCalled();
      // Should log error after all retries exhausted
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Email send failed after all retries'),
        expect.any(Object)
      );
    });

    it('should handle provider API errors gracefully', async () => {
      mockResend.emails.send.mockResolvedValue({
        data: null,
        error: { message: 'Invalid API key', statusCode: 401 }
      });

      testEmailService.config.fallbackToSMTP = false;

      const result = await testEmailService.sendEmail({
        to: 'test@example.com',
        template: 'orderReceived',
        data: { businessName: 'Test' }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid API key');
    });
  });

  describe('Provider Selection Logic', () => {
    it('should route customer emails to Resend', async () => {
      const customerTemplates = ['orderReceived', 'contactFormSubmission', 'trialExpiring'];

      for (const template of customerTemplates) {
        vi.clearAllMocks();
        
        await testEmailService.sendEmail({
          to: 'customer@example.com',
          template,
          data: { businessName: 'Test' }
        });

        expect(mockResend.emails.send).toHaveBeenCalled();
        expect(mockNodemailer.sendMail).not.toHaveBeenCalled();
      }
    });

    it('should route platform emails to SMTP', async () => {
      const platformTemplates = ['welcome', 'subscriptionCreated'];

      for (const template of platformTemplates) {
        vi.clearAllMocks();
        
        await testEmailService.sendEmail({
          to: 'user@example.com',
          template,
          data: {}
        });

        expect(mockNodemailer.sendMail).toHaveBeenCalled();
        expect(mockResend.emails.send).not.toHaveBeenCalled();
      }
    });

    it('should respect manual provider override', async () => {
      // Force SMTP for an order email (normally uses Resend)
      await testEmailService.sendEmail({
        to: 'test@example.com',
        template: 'orderReceived',
        data: { businessName: 'Test' },
        provider: 'smtp'
      });

      expect(mockNodemailer.sendMail).toHaveBeenCalled();
      expect(mockResend.emails.send).not.toHaveBeenCalled();
    });
  });
});

