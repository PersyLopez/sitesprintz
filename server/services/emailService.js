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
import { redactLaborSecrets } from './labor/laborSecrets.js';

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

    // Email throttling: daily limits per site
    this.DAILY_EMAIL_LIMITS = {
      perSite: 500,
      perUser: 100
    };
    this.emailCounts = deps.emailCounts || new Map();
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
      orderConfirmation: (data) => this.renderOrderConfirmationTemplate(data),
      orderPaymentFailed: (data) => this.renderOrderPaymentFailedTemplate(data),
      newOrder: (data) => this.renderNewOrderTemplate(data),
      paymentFailed: (data) => this.renderPaymentFailedTemplate(data),
      subscriptionCanceled: (data) => this.renderSubscriptionCanceledTemplate(data),
      refundConfirmation: (data) => this.renderRefundConfirmationTemplate(data),
      bookingPaymentFailed: (data) => this.renderBookingPaymentFailedTemplate(data),
      contactFormSubmission: (data) => this.renderContactFormTemplate(data),
      trialExpiring: (data) => this.renderTrialExpiringTemplate(data),
      subscriptionCreated: (data) => this.renderSubscriptionTemplate(data),
      laborPurchaseCustomer: (data) => this.renderLaborPurchaseCustomerTemplate(data),
      laborPurchaseOps: (data) => this.renderLaborPurchaseOpsTemplate(data),
      buildIntakeCustomer: (data) => this.renderBuildIntakeCustomerTemplate(data),
      buildIntakeOps: (data) => this.renderBuildIntakeOpsTemplate(data),
    };
  }

  /**
   * Render welcome email template
   */
  renderWelcomeTemplate(data) {
    const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
    return {
      subject: 'Welcome to Right Site Light! 🎉',
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
            <a href="${siteUrl}/dashboard" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; text-decoration: none; border-radius: 10px; font-weight: 600;">
              Go to Dashboard
            </a>
          </div>
        </div>
      `,
      provider: 'smtp'
    };
  }

  /**
   * Short display reference for order emails (full UUID stays in data.orderId).
   */
  formatOrderRef(orderId) {
    const raw = String(orderId || '').trim();
    if (!raw) return 'N/A';
    return raw.length > 8 ? raw.slice(0, 8).toUpperCase() : raw.toUpperCase();
  }

  formatMoneyFromCents(cents) {
    const n = Number(cents);
    if (!Number.isFinite(n)) return '$0.00';
    return `$${(n / 100).toFixed(2)}`;
  }

  renderOrderItemsRows(items) {
    if (!Array.isArray(items) || items.length === 0) return '';
    return items.map((item) => {
      const name = this.escapeHtml(item.name || 'Item');
      const qty = Number(item.quantity);
      const quantity = Number.isFinite(qty) && qty > 0 ? qty : 1;
      const lineCents = Number.isFinite(Number(item.price))
        ? Number(item.price)
        : Math.round(Number(item.unitPrice || 0) * quantity * 100);
      const qtyLabel = quantity > 1 ? `${quantity} × ` : '';
      return `
        <tr style="border-bottom: 1px solid #e8e6e1;">
          <td style="padding: 10px 0; text-align: left; color: #3f3f46;">${qtyLabel}${name}</td>
          <td style="padding: 10px 0; text-align: right; color: #3f3f46; white-space: nowrap;">${this.formatMoneyFromCents(lineCents)}</td>
        </tr>`;
    }).join('');
  }

  /**
   * Render order received email template
   */
  renderOrderReceivedTemplate(data) {
    const businessName = this.escapeHtml(data.businessName || 'your order');
    const customerName = this.escapeHtml(data.customerName || 'there');
    const orderRefRaw = data.orderNumber || this.formatOrderRef(data.orderId);
    const orderRef = this.escapeHtml(orderRefRaw);
    const total = this.escapeHtml(data.total || '$0.00');

    return {
      subject: `Order received — ${data.businessName || 'Your order'} (${orderRefRaw})`,
      html: `
        <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 560px; margin: 0 auto; padding: 28px 20px; color: #1b1b1f;">
          <p style="margin: 0 0 8px 0; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #6b6b73;">${businessName}</p>
          <h1 style="margin: 0 0 24px 0; font-size: 1.5rem; font-weight: 600; color: #1b1b1f;">Order received</h1>
          <p style="margin: 0 0 16px 0; line-height: 1.6; color: #3f3f46;">Hi ${customerName},</p>
          <p style="margin: 0 0 20px 0; line-height: 1.6; color: #3f3f46;">
            Thank you — we have your order and will begin preparing it shortly.
          </p>
          <table style="width: 100%; border-collapse: collapse; margin: 0 0 20px 0;">
            <tr>
              <td style="padding: 8px 0; color: #6b6b73;">Order</td>
              <td style="padding: 8px 0; text-align: right; color: #1b1b1f; font-family: ui-monospace, Menlo, monospace;">${orderRef}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b6b73;">Total</td>
              <td style="padding: 8px 0; text-align: right; color: #1b1b1f;">${total}</td>
            </tr>
          </table>
          <p style="margin: 0; line-height: 1.6; color: #6b6b73; font-size: 0.95rem;">
            Reply to this email if you need to change anything.
          </p>
        </div>
      `,
      provider: 'resend'
    };
  }

  /**
   * Render order confirmation email template (customer)
   */
  renderOrderConfirmationTemplate(data) {
    const businessName = this.escapeHtml(data.businessName || 'Your order');
    const customerName = this.escapeHtml(data.customerName || 'there');
    const orderRefRaw = this.formatOrderRef(data.orderId);
    const orderRef = this.escapeHtml(orderRefRaw);
    const itemsHtml = this.renderOrderItemsRows(data.items);
    const address = data.businessAddress ? this.escapeHtml(data.businessAddress) : '';
    const total = this.formatMoneyFromCents(data.amount);

    return {
      subject: `Order confirmation — ${data.businessName || 'Your order'} (${orderRefRaw})`,
      html: `
        <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 560px; margin: 0 auto; padding: 28px 20px; color: #1b1b1f;">
          <p style="margin: 0 0 8px 0; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #6b6b73;">${businessName}</p>
          <h1 style="margin: 0 0 24px 0; font-size: 1.5rem; font-weight: 600; color: #1b1b1f;">Order confirmation</h1>
          <p style="margin: 0 0 16px 0; line-height: 1.6; color: #3f3f46;">Hi ${customerName},</p>
          <p style="margin: 0 0 20px 0; line-height: 1.6; color: #3f3f46;">
            ${data.payOnSite
              ? 'Your order is confirmed. Please pay when you pick up or visit.'
              : 'Thank you for your purchase. Here is a summary of your order.'}
          </p>
          <table style="width: 100%; border-collapse: collapse; margin: 0 0 8px 0;">
            <tr>
              <td style="padding: 8px 0; color: #6b6b73;">Order</td>
              <td style="padding: 8px 0; text-align: right; color: #1b1b1f; font-family: ui-monospace, Menlo, monospace;">${orderRef}</td>
            </tr>
          </table>
          ${itemsHtml ? `
          <table style="width: 100%; border-collapse: collapse; margin: 12px 0 16px 0;">
            ${itemsHtml}
            <tr>
              <td style="padding: 14px 0 0 0; color: #1b1b1f; font-weight: 600;">Total</td>
              <td style="padding: 14px 0 0 0; text-align: right; color: #1b1b1f; font-weight: 600;">${total}</td>
            </tr>
          </table>
          ` : `
          <p style="margin: 0 0 16px 0; color: #3f3f46;"><strong>Total:</strong> ${total}</p>
          `}
          <div style="margin: 20px 0; padding: 16px 0; border-top: 1px solid #e8e6e1; border-bottom: 1px solid #e8e6e1;">
            ${address ? `<p style="margin: 0 0 10px 0; line-height: 1.5; color: #3f3f46;"><strong>Pickup / location:</strong> ${address}</p>` : ''}
            ${data.payOnSite ? `<p style="margin: 0 0 10px 0; line-height: 1.5; color: #3f3f46;"><strong>Payment:</strong> Please bring cash. We do not take cards.</p>` : ''}
            <p style="margin: 0; line-height: 1.5; color: #6b6b73; font-size: 0.95rem;">
              ${data.payOnSite
                ? 'We will have your order ready for pickup. Reply if you have any questions.'
                : 'We will send a shipping update when your order is on the way. Reply if you have any questions.'}
            </p>
          </div>
        </div>
      `,
      provider: 'resend'
    };
  }

  /**
   * Render new order notification email template (for site owner)
   */
  renderNewOrderTemplate(data) {
    const siteUrl = process.env.SITE_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    const businessName = this.escapeHtml(data.businessName || 'Your shop');
    const orderRefRaw = this.formatOrderRef(data.orderId);
    const orderRef = this.escapeHtml(orderRefRaw);
    const customerName = this.escapeHtml(data.customerName || 'Customer');
    const customerEmail = this.escapeHtml(data.customerEmail || '—');
    const customerPhone = data.customerPhone ? this.escapeHtml(data.customerPhone) : '';
    const notes = data.notes ? this.escapeHtml(data.notes) : '';
    const itemsHtml = this.renderOrderItemsRows(data.items);
    const total = this.formatMoneyFromCents(data.amount);
    const ordersUrl = `${siteUrl}/dashboard/orders`;

    return {
      subject: `New order — ${data.businessName || 'Your shop'} (${orderRefRaw})`,
      html: `
        <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 560px; margin: 0 auto; padding: 28px 20px; color: #1b1b1f;">
          <p style="margin: 0 0 8px 0; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #6b6b73;">${businessName}</p>
          <h1 style="margin: 0 0 24px 0; font-size: 1.5rem; font-weight: 600; color: #1b1b1f;">New order</h1>
          <p style="margin: 0 0 20px 0; line-height: 1.6; color: #3f3f46;">
            A customer placed an order${data.payOnSite ? ' (pay on site)' : ''}.
          </p>
          <table style="width: 100%; border-collapse: collapse; margin: 0 0 12px 0;">
            <tr>
              <td style="padding: 8px 0; color: #6b6b73;">Order</td>
              <td style="padding: 8px 0; text-align: right; color: #1b1b1f; font-family: ui-monospace, Menlo, monospace;">${orderRef}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b6b73;">Customer</td>
              <td style="padding: 8px 0; text-align: right; color: #1b1b1f;">${customerName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b6b73;">Email</td>
              <td style="padding: 8px 0; text-align: right; color: #1b1b1f;"><a href="mailto:${customerEmail}" style="color: #1b1b1f;">${customerEmail}</a></td>
            </tr>
            ${customerPhone ? `
            <tr>
              <td style="padding: 8px 0; color: #6b6b73;">Phone</td>
              <td style="padding: 8px 0; text-align: right; color: #1b1b1f;">${customerPhone}</td>
            </tr>
            ` : ''}
          </table>
          ${itemsHtml ? `
          <table style="width: 100%; border-collapse: collapse; margin: 8px 0 16px 0;">
            ${itemsHtml}
            <tr>
              <td style="padding: 14px 0 0 0; color: #1b1b1f; font-weight: 600;">Total</td>
              <td style="padding: 14px 0 0 0; text-align: right; color: #1b1b1f; font-weight: 600;">${total}</td>
            </tr>
          </table>
          ` : `
          <p style="margin: 0 0 16px 0; color: #3f3f46;"><strong>Total:</strong> ${total}</p>
          `}
          ${notes ? `<p style="margin: 0 0 16px 0; line-height: 1.5; color: #3f3f46;"><strong>Notes:</strong> ${notes}</p>` : ''}
          ${data.payOnSite ? `<p style="margin: 0 0 20px 0; line-height: 1.5; color: #6b6b73;">Payment is due when they pick up or visit.</p>` : ''}
          <p style="margin: 24px 0 0 0;">
            <a href="${ordersUrl}" style="display: inline-block; padding: 12px 22px; background: #1b1b1f; color: #f6f4ef; text-decoration: none; border-radius: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; font-weight: 600;">
              View orders
            </a>
          </p>
        </div>
      `,
      provider: 'resend'
    };
  }

  /**
   * Render order payment failed email template
   */
  renderOrderPaymentFailedTemplate(data) {
    return {
      subject: `Payment Failed - Order #${data.orderId || 'N/A'}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #dc2626; margin: 0; font-size: 1.8rem;">Payment Issue ⚠️</h1>
          </div>
          
          <div style="background: #fef2f2; border: 2px solid #dc2626; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
            <p style="font-size: 1.1rem; color: #1e293b; line-height: 1.6; margin: 0 0 15px 0;">
              Unfortunately, your payment could not be processed.
            </p>
            <p style="color: #64748b; margin: 0 0 20px 0;">
              Order #: ${data.orderId || 'N/A'}
            </p>
            <p style="color: #64748b; margin: 0;">
              Please try again or contact our support team if you continue to experience issues.
            </p>
          </div>
        </div>
      `,
      provider: 'resend'
    };
  }

  /**
   * Render general payment failed template
   */
  renderPaymentFailedTemplate(data) {
    return this.renderOrderPaymentFailedTemplate(data);
  }

  /**
   * Render subscription canceled template
   */
  renderSubscriptionCanceledTemplate(data) {
    return {
      subject: 'Your Subscription Has Been Canceled',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #dc2626; margin: 0; font-size: 1.8rem;">Subscription Canceled</h1>
          </div>
          
          <div style="background: #fef2f2; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
            <p style="color: #64748b; margin: 0;">
              Your subscription has been canceled as requested. If you change your mind, you can reactivate it anytime from your account dashboard.
            </p>
          </div>
        </div>
      `,
      provider: 'resend'
    };
  }

  /**
   * Render refund confirmation template
   */
  renderRefundConfirmationTemplate(data) {
    return {
      subject: `Refund Processed - Order #${data.orderId || 'N/A'}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #059669; margin: 0; font-size: 1.8rem;">Refund Processed ✅</h1>
          </div>
          
          <div style="background: #f0fdf4; border: 2px solid #059669; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
            <p style="font-size: 1.1rem; color: #1e293b; line-height: 1.6; margin: 0 0 15px 0;">
              Your refund has been processed.
            </p>
            <p style="color: #64748b; margin: 0 0 15px 0;">
              <strong style="color: #1e293b;">Order Number:</strong> ${data.orderId || 'N/A'}
            </p>
            <p style="color: #64748b; margin: 0;">
              <strong style="color: #1e293b;">Refund Amount:</strong> $${(data.amount / 100).toFixed(2)}
            </p>
            <p style="color: #64748b; margin: 15px 0 0 0;">
              The refund should appear in your account within 5-10 business days.
            </p>
          </div>
        </div>
      `,
      provider: 'resend'
    };
  }

  /**
   * Render booking payment failed template
   */
  renderBookingPaymentFailedTemplate(data) {
    return {
      subject: `Payment Failed - Appointment #${data.appointmentId || 'N/A'}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #dc2626; margin: 0; font-size: 1.8rem;">Payment Issue ⚠️</h1>
          </div>
          
          <div style="background: #fef2f2; border: 2px solid #dc2626; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
            <p style="font-size: 1.1rem; color: #1e293b; line-height: 1.6; margin: 0 0 15px 0;">
              Unfortunately, we could not process your payment for your appointment.
            </p>
            <p style="color: #64748b; margin: 0 0 20px 0;">
              Appointment: ${data.appointmentId || 'N/A'}
            </p>
            <p style="color: #64748b; margin: 0;">
              Please try again or contact our support team if you continue to experience issues.
            </p>
          </div>
        </div>
      `,
      provider: 'resend'
    };
  }

  /**
   * Escape user-controlled strings for HTML email bodies
   */
  escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Render contact form submission email template
   */
  renderContactFormTemplate(data) {
    const businessName = this.escapeHtml(data.businessName || 'Your Site');
    const submitterName = this.escapeHtml(data.submitterName || 'Unknown');
    const submitterEmail = this.escapeHtml(data.submitterEmail || 'No email provided');
    const submitterPhone = this.escapeHtml(data.submitterPhone || 'No phone provided');
    const message = this.escapeHtml(data.message || 'No message');

    return {
      subject: `New Contact Form Submission - ${data.businessName || 'Your Site'}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 1.8rem;">New Contact Form Submission</h1>
          </div>
          
          <div style="background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
            <p style="color: #64748b; margin: 0 0 15px 0;">
              <strong style="color: #1e293b;">From:</strong> ${submitterName}
            </p>
            <p style="color: #64748b; margin: 0 0 15px 0;">
              <strong style="color: #1e293b;">Email:</strong> ${submitterEmail}
            </p>
            <p style="color: #64748b; margin: 0 0 15px 0;">
              <strong style="color: #1e293b;">Phone:</strong> ${submitterPhone}
            </p>
            <div style="margin-top: 20px; padding: 15px; background: white; border-radius: 8px;">
              <strong style="color: #1e293b;">Message:</strong>
              <p style="color: #64748b; margin: 10px 0 0 0; white-space: pre-wrap;">
                ${message}
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
      subject: 'Welcome to Right Site Light Pro! 🚀',
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

  renderLaborPurchaseCustomerTemplate(data) {
    const skuName = String(data?.skuName || 'optional extra').slice(0, 80)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;');
    const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
    const buildUrl = `${siteUrl}/build`;
    return {
      subject: `Right Site Light — ${skuName} received`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <p>We received your ${skuName} request. We will follow up from support@rightsitelight.com. The editor stays available if you want to keep going yourself.</p>
          <p style="margin: 24px 0;">
            <a href="${buildUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">
              Share what we should build
            </a>
          </p>
          <p style="color: #64748b; font-size: 14px;">Leave anything unknown blank — we only use what you send.</p>
        </div>
      `,
      provider: 'resend'
    };
  }

  renderLaborPurchaseOpsTemplate(data) {
    const skuName = String(data?.skuName || 'optional extra').slice(0, 80)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;');
    const userId = String(data?.userId || '').slice(0, 80)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;');
    const siteId = String(data?.siteId || '').slice(0, 80)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;');
    return {
      subject: `Labor extra paid — ${skuName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <p>${skuName}</p>
          <p>user: ${userId}</p>
          <p>site: ${siteId || 'none'}</p>
          <p>Two batches/month. Decline drips. Do not include claim links in replies.</p>
        </div>
      `,
      provider: 'resend'
    };
  }

  renderBuildIntakeCustomerTemplate(data) {
    const name = this.escapeHtml(data?.contactName || 'there');
    const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
    const plan = this.escapeHtml(data?.recommendedPlan || data?.plan || 'starter');
    const price = this.escapeHtml(String(data?.planPriceMonthly ?? ''));
    const offerActive = Boolean(data?.setupOfferActive);
    const planLine = offerActive
      ? `We received your request to set the site up for you. After we publish, you get 15 days live — that clock starts when we publish, not today. Then hosting is ${plan} ($${price}/month) unless you pick Growth Managed to keep the list updated.`
      : `Thanks — we received your Growth Managed request ($75/month). The first month includes the initial fill. After that we apply two catalog batches a month.`;
    const streetLine = data?.locationPublic
      ? 'You asked us to publish your street on the live site.'
      : 'Your street stays private on the live site unless you asked us to publish it. If hidden, visitors see your service area and radius; customers get the exact address in booking or order confirmations.';
    return {
      subject: 'Right Site Light — we received your build request',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <p>Hi ${name},</p>
          <p>${planLine}</p>
          <p>This is not instant — we will email you when the page is ready to claim. We only use the details you provided; anything you left blank stays blank on the site.</p>
          <p>You can send more photos as Drive, Dropbox, or https links, or pick them in the form. We do not invent hours, staff, or stock images.</p>
          <p>${streetLine}</p>
          <p>We will follow up from support@rightsitelight.com. You can add more anytime at <a href="${siteUrl}/build">${siteUrl}/build</a>.</p>
        </div>
      `,
      provider: 'resend',
    };
  }

  renderBuildIntakeOpsTemplate(data) {
    const esc = (value) => this.escapeHtml(redactLaborSecrets(String(value || '')));
    const line = (label, value) => (value ? `<p><strong>${label}:</strong> ${esc(value)}</p>` : '');
    const section = (title, body) => (body ? `<h3 style="margin-top:24px;">${title}</h3>${body}` : '');
    const plan = esc(data.recommendedPlan || data.plan || 'growth_managed');
    const catalog = (Array.isArray(data.catalogItems) ? data.catalogItems : [])
      .map((item, index) => line(
        `Catalog ${index + 1}`,
        [item?.name, item?.price, item?.photoUrl].filter(Boolean).join(' — '),
      ))
      .join('');

    const sources = [
      line('Website', data.website),
      line('Instagram', data.instagram),
      line('Facebook', data.facebook),
      line('Scheduler', data.scheduler),
      line('Google Maps', data.googleMaps),
      line('Logo URL', data.logoUrl),
      line('Photos album', data.photosUrl),
    ].join('');

    const brand = [
      line('Business', data.businessName),
      line('Tagline', data.businessTagline),
      line('About', data.aboutBio),
      line('Custom domain', data.customDomain),
      line('Brand colors', data.brandColors),
      line('Brand file', data.brandFileUrl),
      line('Reference URLs', data.referenceUrls),
      line('Vibe', data.vibeSentence),
    ].join('');

    const nap = [
      line('Contact', `${data.contactName} <${data.contactEmail}>`),
      line('Phone', data.contactPhone),
      line('City / service area', data.cityServiceArea),
      line('Street (private unless public)', data.streetAddress),
      line('Publish street on live site', data.locationPublic ? 'yes' : 'no'),
      !data.locationPublic ? line('Public area label', data.serviceAreaLabel) : '',
      !data.locationPublic && data.serviceRadiusMiles ? line('Service radius (miles)', String(data.serviceRadiusMiles)) : '',
    ].join('');

    const hours = data.byAppointment
      ? '<p>By appointment only</p>'
      : line('Hours', data.hoursText);

    const services = data.features?.booking ? [
      line('Services', data.servicesText),
      line('Deposit / cancellation', data.depositCancellationPolicy),
      line('Operating model', data.operatingModel),
      line('Staff names', data.staffNames),
    ].join('') : '';

    const products = data.features?.shop ? [
      line('Products', data.productsText),
      line('Fulfillment', data.fulfillmentMode),
    ].join('') : '';

    const gallery = [
      data.features?.gallery ? line('Extra album', data.extraAlbumUrl) : '',
      data.features?.beforeAfter ? line('Before/after', data.beforeAfterText) : '',
    ].join('');

    const policies = data.features?.faq ? line('FAQ', data.faqText) : '';
    const quotes = data.features?.quotes ? line('Quote requests', data.quotesText) : '';
    const staff = data.features?.staff ? line('Staff profiles', data.staffProfilesText) : '';

    const social = [
      line('Instagram', data.instagram),
      line('Facebook', data.facebook),
    ].join('');

    const requested = Object.entries(data.features || {})
      .filter(([, on]) => on)
      .map(([key]) => key)
      .join(', ') || 'none';

    const missing = '<p>Anything left blank in the form was intentionally unknown — do not invent.</p>';

    return {
      subject: `Build intake — ${esc(data.businessName)} (${plan})`,
      html: `
        <div style="font-family: sans-serif; max-width: 640px; margin: 0 auto; padding: 20px;">
          <p><strong>Plan:</strong> ${plan} — $${esc(String(data.planPriceMonthly || ''))}/mo</p>
          <p><strong>Campaign:</strong> ${esc(data.setupOfferCampaignId || 'managed')}</p>
          <p><strong>Submission:</strong> ${esc(String(data.submissionId || ''))}</p>
          <p><strong>Requested modules:</strong> ${esc(requested)}</p>
          <p><strong>Locale:</strong> ${esc(data.preferredLocale)}</p>
          ${section('Cover', line('Cover photo', data.coverPhotoUrl))}
          ${section('Catalog', catalog)}
          ${section('Sources', sources)}
          ${section('Brand', brand)}
          ${section('NAP', nap)}
          ${section('Hours', hours)}
          ${section('Services', services)}
          ${section('Products', products)}
          ${section('Gallery', gallery)}
          ${section('Policies', policies + quotes)}
          ${section('Staff', staff)}
          ${section('Social', social)}
          ${section('Missing', missing)}
        </div>
      `,
      provider: 'resend',
    };
  }

  /**
   * Check if email can be sent (daily limit check)
   * 
   * @param {string} siteId - Site ID (optional, for per-site limits)
   * @returns {boolean} True if email can be sent
   */
  canSendEmail(siteId = null) {
    if (!siteId) {
      // If no siteId, allow (for system emails)
      return true;
    }

    const today = new Date().toDateString();
    const key = `${siteId}:${today}`;
    const count = this.emailCounts.get(key) || 0;

    if (count >= this.DAILY_EMAIL_LIMITS.perSite) {
      this.logger.warn(`Email limit reached for site ${siteId}: ${count}/${this.DAILY_EMAIL_LIMITS.perSite}`);
      return false;
    }

    // Increment count
    this.emailCounts.set(key, count + 1);
    return true;
  }

  /**
   * Main email sending method
   * 
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.template - Template name
   * @param {Object} options.data - Template data
   * @param {string} options.provider - Provider override (optional)
   * @param {string} options.siteId - Site ID for rate limiting (optional)
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

    // Check daily email limit (if siteId provided)
    if (options.siteId && !this.canSendEmail(options.siteId)) {
      this.logger.warn(`Email send blocked: daily limit reached for site ${options.siteId}`);
      return {
        success: false,
        error: 'Daily email limit reached for this site. Please try again tomorrow.',
        limitReached: true
      };
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

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@rightsitelight.com';

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

    const fromName = process.env.FROM_NAME || 'Right Site Light';
    const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@rightsitelight.com';

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

