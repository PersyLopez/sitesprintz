/**
 * 🟢 GREEN PHASE: EmailService Implementation
 * 
 * Centralized email service with support for multiple providers
 * Implements queue, retry logic, and comprehensive error handling
 * 
 * Features:
 * - Multi-provider support (Resend + Nodemailer/SMTP)
 * - Template rendering with data injection
 * - Email queue with retry logic
 * - Exponential backoff for failed sends
 * - Comprehensive error logging
 * - Provider fallback support
 * 
 * Architecture:
 * - Class-based design for testability
 * - Dependency injection for mocks
 * - Clean separation of concerns
 */

import { Resend } from 'resend';
import nodemailer from 'nodemailer';

export class EmailService {
  constructor(deps = {}) {
    // Initialize logger first
    this.logger = deps.logger || console;

    // Configuration
    this.config = {
      defaultProvider: 'resend',
      retryAttempts: 3,
      retryDelay: 1000, // ms
      exponentialBackoff: true,
      useQueue: false,
      fallbackToSMTP: true,
      ...deps.config
    };

    // Dependency injection for testability
    this.providers = {
      resend: deps.resend !== undefined ? deps.resend : this.initializeResend(),
      smtp: deps.nodemailer !== undefined ? deps.nodemailer : this.initializeNodemailer()
    };

    this.queue = deps.queue || null;

    // Email template registry
    this.templates = this.initializeTemplates();
  }

  /**
   * Initialize Resend client
   */
  initializeResend() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      this.logger.warn('⚠️ RESEND_API_KEY not configured');
      return null;
    }
    this.logger.info('📧 Resend email service initialized');
    return new Resend(apiKey);
  }

  /**
   * Initialize Nodemailer SMTP transporter
   */
  initializeNodemailer() {
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
      this.logger.warn('⚠️ SMTP credentials not configured');
      return null;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp-mail.outlook.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false
      }
    });

    this.logger.info('📧 SMTP email service initialized');
    return transporter;
  }

  /**
   * Initialize email templates
   */
  initializeTemplates() {
    return {
      welcome: (data) => this.renderWelcomeTemplate(data),
      orderReceived: (data) => this.renderOrderReceivedTemplate(data),
      contactFormSubmission: (data) => this.renderContactFormTemplate(data),
      trialExpiring: (data) => this.renderTrialExpiringTemplate(data),
      subscriptionCreated: (data) => this.renderSubscriptionTemplate(data)
    };
  }

  /**
   * Render welcome email template
   */
  renderWelcomeTemplate(data) {
    const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
    return {
      subject: 'Welcome to SiteSprintz! 🎉',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 2rem;">Welcome! 🎉</h1>
          </div>
          
          <div style="background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
            <p style="font-size: 1.1rem; color: #1e293b; line-height: 1.6; margin: 0 0 20px 0;">
              Thanks for signing up! You can now create professional websites in minutes.
            </p>
            
            <ul style="color: #64748b; line-height: 1.8; padding-left: 20px;">
              <li>Browse our 13+ professional templates</li>
              <li>Customize your site with your business info</li>
              <li>Preview before publishing</li>
              <li>Publish when ready</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${siteUrl}/dashboard.html" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; text-decoration: none; border-radius: 10px; font-weight: 600;">
              Go to Dashboard
            </a>
          </div>
        </div>
      `,
      provider: 'smtp'
    };
  }

  /**
   * Render order received email template
   */
  renderOrderReceivedTemplate(data) {
    return {
      subject: `Order Received - ${data.businessName || 'Your Order'}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #059669; margin: 0; font-size: 1.8rem;">Order Received! ✅</h1>
          </div>
          
          <div style="background: #f0fdf4; border: 2px solid #059669; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
            <p style="font-size: 1.1rem; color: #1e293b; line-height: 1.6; margin: 0 0 15px 0;">
              Thank you for your order, ${data.customerName || 'valued customer'}!
            </p>
            <p style="color: #64748b; margin: 0 0 20px 0;">
              <strong style="color: #1e293b;">Order Number:</strong> ${data.orderNumber || 'N/A'}
            </p>
            <p style="color: #64748b; margin: 0 0 20px 0;">
              <strong style="color: #1e293b;">Total:</strong> ${data.total || '$0.00'}
            </p>
            <p style="color: #64748b; margin: 0;">
              ${data.businessName || 'We'} will start preparing your order right away!
            </p>
          </div>
        </div>
      `,
      provider: 'resend'
    };
  }

  /**
   * Render contact form submission email template
   */
  renderContactFormTemplate(data) {
    return {
      subject: `New Contact Form Submission - ${data.businessName || 'Your Site'}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 1.8rem;">New Contact Form Submission 📧</h1>
          </div>
          
          <div style="background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
            <p style="color: #64748b; margin: 0 0 15px 0;">
              <strong style="color: #1e293b;">From:</strong> ${data.submitterName || 'Unknown'}
            </p>
            <p style="color: #64748b; margin: 0 0 15px 0;">
              <strong style="color: #1e293b;">Email:</strong> ${data.submitterEmail || 'No email provided'}
            </p>
            <p style="color: #64748b; margin: 0 0 15px 0;">
              <strong style="color: #1e293b;">Phone:</strong> ${data.submitterPhone || 'No phone provided'}
            </p>
            <div style="margin-top: 20px; padding: 15px; background: white; border-radius: 8px;">
              <strong style="color: #1e293b;">Message:</strong>
              <p style="color: #64748b; margin: 10px 0 0 0; white-space: pre-wrap;">
                ${data.message || 'No message'}
              </p>
            </div>
          </div>
        </div>
      `,
      replyTo: data.submitterEmail,
      provider: 'resend'
    };
  }

  /**
   * Render trial expiring email template
   */
  renderTrialExpiringTemplate(data) {
    const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
    return {
      subject: `Your Trial Expires in ${data.daysRemaining || 0} Days`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #dc2626; margin: 0; font-size: 1.8rem;">Trial Expiring Soon ⏰</h1>
          </div>
          
          <div style="background: #fef2f2; border: 2px solid #dc2626; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
            <p style="font-size: 1.1rem; color: #1e293b; line-height: 1.6; margin: 0 0 15px 0;">
              Your trial for <strong>${data.businessName || 'your site'}</strong> (${data.subdomain || 'N/A'}) expires in <strong>${data.daysRemaining || 0} days</strong>.
            </p>
            <p style="color: #64748b; margin: 0 0 20px 0;">
              Upgrade now to keep your site live and unlock Pro features!
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.upgradeUrl || siteUrl}/dashboard?action=upgrade" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; text-decoration: none; border-radius: 10px; font-weight: 600;">
                Upgrade Now
              </a>
            </div>
          </div>
        </div>
      `,
      provider: 'resend'
    };
  }

  /**
   * Render subscription created email template
   */
  renderSubscriptionTemplate(data) {
    return {
      subject: 'Welcome to SiteSprintz Pro! 🚀',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #059669; margin: 0; font-size: 2rem;">Welcome to ${data.plan || 'Pro'}! 🚀</h1>
          </div>
          
          <div style="background: #f0fdf4; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
            <p style="font-size: 1.1rem; color: #1e293b; line-height: 1.6; margin: 0 0 20px 0;">
              Your subscription is now active! You now have access to all ${data.plan || 'Pro'} features.
            </p>
            
            <ul style="color: #64748b; line-height: 1.8; padding-left: 20px;">
              <li>Unlimited sites</li>
              <li>Pro templates</li>
              <li>Custom domain support</li>
              <li>Priority support</li>
            </ul>
          </div>
        </div>
      `,
      provider: 'smtp'
    };
  }

  /**
   * Main email sending method
   * 
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.template - Template name
   * @param {Object} options.data - Template data
   * @param {string} options.provider - Provider override (optional)
   * @returns {Promise<Object>} Result object { success, messageId, provider, error }
   */
  async sendEmail(options) {
    // Validate required fields
    if (!options.to) {
      throw new Error('Email recipient is required');
    }
    if (!options.template) {
      throw new Error('Email template is required');
    }

    // Check if template exists
    if (!this.templates[options.template]) {
      throw new Error(`Unknown email template: ${options.template}`);
    }

    // If queue is enabled, add to queue instead of sending directly
    if (this.config.useQueue && this.queue) {
      return await this.queueEmail(options);
    }

    // Send email with retry logic
    return await this.sendWithRetry(options);
  }

  /**
   * Queue email for later processing
   */
  async queueEmail(options) {
    try {
      const job = await this.queue.add('send-email', {
        to: options.to,
        template: options.template,
        data: options.data,
        provider: options.provider,
        timestamp: new Date().toISOString()
      });

      this.logger.info(`📧 Email queued: ${job.id}`, { to: options.to, template: options.template });

      return {
        success: true,
        queued: true,
        jobId: job.id
      };
    } catch (error) {
      this.logger.error('Failed to queue email:', error);
      throw error;
    }
  }

  /**
   * Render email template
   */
  renderTemplate(options) {
    const template = this.templates[options.template];
    if (!template) {
      throw new Error(`Unknown email template: ${options.template}`);
    }
    return template(options.data || {});
  }

  /**
   * Select email provider
   */
  selectProvider(options, renderedEmail) {
    const provider = options.provider || renderedEmail.provider || this.config.defaultProvider;
    
    if (!this.providers[provider]) {
      throw new Error(`No email provider configured: ${provider}`);
    }
    
    return provider;
  }

  /**
   * Create success result object
   */
  createSuccessResult(result, provider, attempt) {
    return {
      success: true,
      messageId: result.messageId,
      provider,
      attempt
    };
  }

  /**
   * Handle send error with retry or fallback
   */
  async handleSendError(error, options, attempt) {
    if (attempt >= this.config.retryAttempts) {
      this.logger.error('Email send failed after all retries', {
        to: options.to,
        template: options.template,
        error: error.message,
        attempts: attempt
      });

      const fallbackResult = await this.tryFallbackProvider(options);
      if (fallbackResult) return fallbackResult;

      return {
        success: false,
        error: error.message,
        attempts: attempt
      };
    }

    const delay = this.calculateRetryDelay(attempt);
    this.logger.warn(`Email send failed, retrying in ${delay}ms`, {
      to: options.to,
      template: options.template,
      error: error.message,
      attempt,
      nextAttempt: attempt + 1
    });

    await this.sleep(delay);
    return await this.sendWithRetry(options, attempt + 1);
  }

  /**
   * Try fallback provider if enabled
   */
  async tryFallbackProvider(options) {
    if (this.config.fallbackToSMTP && options.provider !== 'smtp' && this.providers.smtp) {
      this.logger.warn('Falling back to SMTP provider');
      try {
        return await this.sendWithRetry({ ...options, provider: 'smtp' }, 1);
      } catch (fallbackError) {
        this.logger.error('SMTP fallback also failed', fallbackError);
      }
    }
    return null;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(attempt) {
    return this.config.exponentialBackoff
      ? this.config.retryDelay * Math.pow(2, attempt - 1)
      : this.config.retryDelay;
  }

  /**
   * Send email with retry logic and exponential backoff
   */
  async sendWithRetry(options, attempt = 1) {
    try {
      const renderedEmail = this.renderTemplate(options);
      const provider = this.selectProvider(options, renderedEmail);
      
      const result = await this.sendViaProvider(provider, {
        to: options.to,
        subject: renderedEmail.subject,
        html: renderedEmail.html,
        replyTo: renderedEmail.replyTo
      });

      this.logger.info(`✅ Email sent via ${provider}`, {
        to: options.to,
        template: options.template,
        messageId: result.messageId,
        attempt
      });

      return this.createSuccessResult(result, provider, attempt);
    } catch (error) {
      return await this.handleSendError(error, options, attempt);
    }
  }

  /**
   * Send email via specific provider
   */
  async sendViaProvider(provider, emailData) {
    // Check if provider exists and is configured
    if (!this.providers[provider]) {
      throw new Error(`No email provider configured: ${provider}`);
    }

    if (provider === 'resend') {
      return await this.sendViaResend(emailData);
    } else if (provider === 'smtp') {
      return await this.sendViaSMTP(emailData);
    } else {
      throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Send email via Resend
   */
  async sendViaResend(emailData) {
    if (!this.providers.resend) {
      throw new Error('Resend provider not configured');
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@sitesprintz.com';

    const { data, error } = await this.providers.resend.emails.send({
      from: fromEmail,
      to: [emailData.to],
      replyTo: emailData.replyTo || undefined,
      subject: emailData.subject,
      html: emailData.html
    });

    if (error) {
      throw new Error(error.message || 'Resend send failed');
    }

    return {
      messageId: data.id
    };
  }

  /**
   * Send email via SMTP (Nodemailer)
   */
  async sendViaSMTP(emailData) {
    if (!this.providers.smtp) {
      throw new Error('SMTP provider not configured');
    }

    const fromName = process.env.FROM_NAME || 'SiteSprintz';
    const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@sitesprintz.com';

    const info = await this.providers.smtp.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: emailData.to,
      replyTo: emailData.replyTo || undefined,
      subject: emailData.subject,
      html: emailData.html
    });

    return {
      messageId: info.messageId
    };
  }

  /**
   * Convenience method: Send order email
   */
  async sendOrderEmail(options) {
    const templateMap = {
      'received': 'orderReceived',
      'inProgress': 'orderInProgress',
      'ready': 'orderReady',
      'completed': 'orderCompleted'
    };

    return await this.sendEmail({
      to: options.to,
      template: templateMap[options.type] || 'orderReceived',
      data: options.orderData,
      provider: 'resend' // Customer-facing emails use Resend
    });
  }

  /**
   * Convenience method: Send contact form email
   */
  async sendContactFormEmail(options) {
    return await this.sendEmail({
      to: options.to,
      template: 'contactFormSubmission',
      data: {
        businessName: options.businessName,
        ...options.formData
      },
      provider: 'resend'
    });
  }

  /**
   * Convenience method: Send trial email
   */
  async sendTrialEmail(options) {
    const templateMap = {
      'expiring': 'trialExpiring',
      'expired': 'trialExpired'
    };

    return await this.sendEmail({
      to: options.to,
      template: templateMap[options.type] || 'trialExpiring',
      data: options.trialData,
      provider: 'smtp' // Platform emails use SMTP
    });
  }

  /**
   * Helper: Sleep for specified milliseconds
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const emailService = new EmailService();

// Export template types for convenience
export const EmailTemplates = {
  WELCOME: 'welcome',
  ORDER_RECEIVED: 'orderReceived',
  CONTACT_FORM: 'contactFormSubmission',
  TRIAL_EXPIRING: 'trialExpiring',
  SUBSCRIPTION_CREATED: 'subscriptionCreated'
};

