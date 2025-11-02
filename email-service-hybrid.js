import nodemailer from 'nodemailer';
import { Resend } from 'resend';

const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

// ============================================
// OUTLOOK SMTP (Internal Platform Emails)
// ============================================
let outlookTransporter = null;
function getOutlookTransporter() {
  if (!outlookTransporter && process.env.SMTP_USER && process.env.SMTP_PASS) {
    outlookTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp-mail.outlook.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false
      }
    });
    console.log('📧 Outlook SMTP configured for internal emails');
  }
  return outlookTransporter;
}

// ============================================
// RESEND (Customer-Facing Order Emails)
// ============================================
let resend = null;
function getResend() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
    console.log('📧 Resend configured for customer emails');
  }
  return resend;
}

const FROM_EMAIL_PLATFORM = process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@sitesprintz.com';
const FROM_NAME_PLATFORM = process.env.FROM_NAME || 'SiteSprintz';
const FROM_EMAIL_ORDERS = process.env.RESEND_FROM_EMAIL || 'orders@sitesprintz.com';

console.log('📧 Email Services:');
console.log('   Internal → Outlook:', FROM_EMAIL_PLATFORM);
console.log('   Orders → Resend:', FROM_EMAIL_ORDERS);

// Import all email templates from the original email-service.js
// We'll mark each one for which service to use

const templates = {
  // ============================================
  // INTERNAL PLATFORM EMAILS (Use Outlook)
  // ============================================
  
  welcome: (email) => ({
    subject: 'Welcome to SiteSprintz! 🎉',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0; font-size: 2rem;">Welcome! 🎉</h1>
        </div>
        
        <div style="background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
          <p style="font-size: 1.1rem; color: #1e293b; line-height: 1.6; margin: 0 0 20px 0;">
            Thanks for signing up! You can now create professional websites in minutes using our template builder.
          </p>
          
          <ul style="color: #64748b; line-height: 1.8; padding-left: 20px;">
            <li>Browse our 13+ professional templates</li>
            <li>Customize your site with your business info</li>
            <li>Preview your site before publishing</li>
            <li>Publish when ready</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${SITE_URL}/dashboard.html" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 1rem;">
            Go to Dashboard
          </a>
        </div>
      </div>
    `,
    useOutlook: true
  }),

  invitation: (email, tempPassword) => ({
    subject: 'You\'ve been invited to SiteSprintz! 🎉',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0; font-size: 2rem;">You're Invited! 🎉</h1>
        </div>
        
        <div style="background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
          <p style="font-size: 1.1rem; color: #1e293b; line-height: 1.6; margin: 0 0 20px 0;">
            An administrator has invited you to create professional websites using our platform.
          </p>
          
          <div style="background: white; border: 2px solid #e5e7eb; border-radius: 10px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 15px 0; font-weight: 600; color: #1e293b;">Your Login Credentials:</p>
            <p style="margin: 8px 0; color: #64748b;">
              <strong style="color: #1e293b;">Email:</strong> ${email}
            </p>
            <p style="margin: 8px 0; color: #64748b;">
              <strong style="color: #1e293b;">Temporary Password:</strong>
            </p>
            <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; padding: 12px; margin-top: 8px;">
              <code style="font-family: 'Courier New', monospace; font-size: 1rem; color: #92400e; font-weight: 600;">${tempPassword}</code>
            </div>
          </div>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${SITE_URL}/login.html" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 1rem;">
            Login Now
          </a>
        </div>
      </div>
    `,
    useOutlook: true
  }),

  passwordReset: (email, resetToken) => ({
    subject: 'Reset Your Password 🔐',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0; font-size: 2rem;">Reset Your Password 🔐</h1>
        </div>
        
        <div style="background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
          <p style="font-size: 1.1rem; color: #1e293b; line-height: 1.6; margin: 0 0 20px 0;">
            We received a request to reset your password. Click the button below to create a new password:
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${SITE_URL}/reset-password.html?token=${resetToken}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 1rem;">
            Reset Password
          </a>
        </div>
        
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="color: #92400e; font-size: 0.9rem; margin: 0; line-height: 1.5;">
            ⏱️ This link expires in 1 hour for security.
          </p>
        </div>
      </div>
    `,
    useOutlook: true
  }),

  sitePublished: (email, siteName, siteUrl) => ({
    subject: `🚀 Your Site "${siteName}" is Live!`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #10b981; margin: 0; font-size: 2rem;">Your Site is Live! 🚀</h1>
        </div>
        
        <div style="background: #f0fdf4; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
          <p style="font-size: 1.1rem; color: #1e293b; line-height: 1.6; margin: 0 0 20px 0;">
            Congratulations! Your website <strong style="color: #10b981;">${siteName}</strong> has been successfully published and is now live on the internet.
          </p>
        </div>
        
        <div style="background: white; border: 2px solid #10b981; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
          <p style="margin: 0 0 12px 0; font-weight: 600; color: #1e293b;">Your Site URL</p>
          <a href="${siteUrl}" style="color: #2563eb; font-size: 1.2rem;">${siteUrl}</a>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${siteUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #10b981, #059669); color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 1rem; margin-right: 10px;">
            Visit Your Site
          </a>
        </div>
      </div>
    `,
    useOutlook: true
  }),

  // ============================================
  // CUSTOMER-FACING EMAILS (Use Resend)
  // ============================================
  
  orderConfirmation: (customerName, orderId, items, total, currency, businessName, businessEmail) => ({
    subject: `✅ Order Confirmation #${orderId} - ${businessName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #10b981; margin: 0; font-size: 2rem;">✅ Order Confirmed!</h1>
        </div>
        
        <div style="background: #f0fdf4; border-radius: 12px; padding: 30px; margin-bottom: 20px; border: 2px solid #86efac;">
          <p style="font-size: 1.1rem; color: #1e293b; line-height: 1.6; margin: 0 0 20px 0;">
            Thank you for your order, <strong>${customerName}</strong>!
          </p>
          
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #1e293b; font-size: 1.1rem;">📦 Order Details</h3>
            <p style="margin: 0 0 15px 0; color: #64748b;">
              <strong style="color: #1e293b;">Order Number:</strong> #${orderId}
            </p>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 15px;">
              ${items.map(item => `
                <div style="display: flex; justify-content: space-between; align-items: center; margin: 12px 0; padding: 12px; background: #f8fafc; border-radius: 8px;">
                  <div>
                    <div style="color: #1e293b; font-weight: 600;">${item.name}</div>
                    <div style="color: #64748b; font-size: 0.9rem;">Quantity: ${item.quantity}</div>
                  </div>
                  <div style="color: #1e293b; font-weight: 600;">
                    ${currency === 'usd' ? '$' : ''}${item.price.toFixed(2)}
                  </div>
                </div>
              `).join('')}
            </div>
            
            <div style="border-top: 2px solid #e5e7eb; margin-top: 20px; padding-top: 20px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 1.2rem; font-weight: 600; color: #1e293b;">Total:</span>
                <span style="font-size: 1.3rem; font-weight: 700; color: #10b981;">
                  ${currency === 'usd' ? '$' : ''}${total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          
          <p style="color: #64748b; line-height: 1.6; margin: 20px 0 0 0; font-size: 0.95rem;">
            We'll contact you shortly about next steps. If you have any questions, please reply to this email.
          </p>
        </div>
        
        <div style="background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="color: #1e40af; font-size: 0.9rem; margin: 0; line-height: 1.5;">
            💡 <strong>What's Next?</strong> ${businessName} will be in touch soon with delivery/pickup details.
          </p>
        </div>
      </div>
    `,
    replyTo: businessEmail,
    useResend: true
  }),

  newOrderAlert: (businessName, orderId, customerName, customerEmail, customerPhone, items, total, currency, siteId) => ({
    subject: `🎉 New Order #${orderId} - ${businessName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #f59e0b; margin: 0; font-size: 2rem;">🎉 New Order!</h1>
        </div>
        
        <div style="background: #fffbeb; border-radius: 12px; padding: 30px; margin-bottom: 20px; border: 2px solid #fbbf24;">
          <p style="font-size: 1.1rem; color: #1e293b; line-height: 1.6; margin: 0 0 20px 0;">
            You have received a new order for <strong>${businessName}</strong>!
          </p>
          
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #1e293b; font-size: 1.1rem;">📋 Order #${orderId}</h3>
            
            <div style="background: #f8fafc; border-radius: 8px; padding: 15px; margin: 15px 0;">
              <p style="margin: 8px 0; color: #64748b;">
                <strong style="color: #1e293b;">Customer:</strong> ${customerName}
              </p>
              <p style="margin: 8px 0; color: #64748b;">
                <strong style="color: #1e293b;">Email:</strong> 
                <a href="mailto:${customerEmail}" style="color: #2563eb; text-decoration: none;">${customerEmail}</a>
              </p>
              ${customerPhone ? `
                <p style="margin: 8px 0; color: #64748b;">
                  <strong style="color: #1e293b;">Phone:</strong> ${customerPhone}
                </p>
              ` : ''}
            </div>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 15px;">
              <h4 style="margin: 0 0 12px 0; color: #1e293b;">Order Items:</h4>
              ${items.map(item => `
                <div style="display: flex; justify-content: space-between; align-items: center; margin: 12px 0; padding: 12px; background: #f8fafc; border-radius: 8px;">
                  <div>
                    <div style="color: #1e293b; font-weight: 600;">${item.name}</div>
                    <div style="color: #64748b; font-size: 0.9rem;">Qty: ${item.quantity}</div>
                  </div>
                  <div style="color: #1e293b; font-weight: 600;">
                    ${currency === 'usd' ? '$' : ''}${item.price.toFixed(2)}
                  </div>
                </div>
              `).join('')}
            </div>
            
            <div style="border-top: 2px solid #e5e7eb; margin-top: 20px; padding-top: 20px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 1.2rem; font-weight: 600; color: #1e293b;">Total Paid:</span>
                <span style="font-size: 1.3rem; font-weight: 700; color: #f59e0b;">
                  ${currency === 'usd' ? '$' : ''}${total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${SITE_URL}/orders.html?siteId=${siteId}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 1rem; margin-right: 10px;">
            📦 View Order in Dashboard
          </a>
          <a href="mailto:${customerEmail}" style="display: inline-block; padding: 14px 32px; background: #10b981; color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 1rem;">
            📧 Contact Customer
          </a>
        </div>
        
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="color: #991b1b; font-size: 0.9rem; margin: 0; line-height: 1.5;">
            ⏱️ <strong>Action Required:</strong> Contact the customer to arrange delivery or pickup!
          </p>
        </div>
      </div>
    `,
    replyTo: customerEmail,
    useResend: true
  }),

  contactFormSubmission: (businessName, submitterName, submitterEmail, submitterPhone, message, type, siteUrl, submissionTime) => ({
    subject: `🔔 New ${type === 'quote' ? 'Quote Request' : 'Contact Form'} Submission - ${businessName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #10b981; margin: 0; font-size: 2rem;">🔔 New Submission!</h1>
        </div>
        
        <div style="background: #f0fdf4; border-radius: 12px; padding: 30px; margin-bottom: 20px; border: 2px solid #86efac;">
          <p style="font-size: 1.1rem; color: #1e293b; line-height: 1.6; margin: 0 0 20px 0;">
            You have a new ${type === 'quote' ? 'quote request' : 'contact form submission'} for <strong>${businessName}</strong>!
          </p>
          
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #1e293b; font-size: 1.1rem;">📋 Submission Details:</h3>
            
            <p style="margin: 8px 0; color: #64748b;">
              <strong style="color: #1e293b;">From:</strong> ${submitterName}
            </p>
            <p style="margin: 8px 0; color: #64748b;">
              <strong style="color: #1e293b;">Email:</strong> 
              <a href="mailto:${submitterEmail}" style="color: #2563eb; text-decoration: none;">${submitterEmail}</a>
            </p>
            <p style="margin: 8px 0; color: #64748b;">
              <strong style="color: #1e293b;">Phone:</strong> ${submitterPhone}
            </p>
            <p style="margin: 8px 0; color: #64748b;">
              <strong style="color: #1e293b;">Submitted:</strong> ${submissionTime}
            </p>
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #1e293b; font-weight: 600;">Message:</p>
              <div style="background: #f8fafc; border-radius: 8px; padding: 15px; color: #475569; line-height: 1.6; white-space: pre-wrap;">
${message}
              </div>
            </div>
          </div>
        </div>
        
        <div style="background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="color: #1e40af; font-size: 0.9rem; margin: 0; line-height: 1.5;">
            💡 <strong>Pro Tip:</strong> Respond within 1 hour to increase your conversion rate by 7x!
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="mailto:${submitterEmail}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #10b981, #059669); color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 1rem; margin-right: 10px;">
            📧 Reply Now
          </a>
        </div>
      </div>
    `,
    replyTo: submitterEmail,
    useResend: true
  })
};

// ============================================
// SEND EMAIL FUNCTION (Routes to correct service)
// ============================================

export async function sendEmail(to, templateName, templateData = {}) {
  try {
    const template = templates[templateName];
    if (!template) {
      throw new Error(`Unknown email template: ${templateName}`);
    }

    const emailContent = typeof template === 'function' 
      ? template(...Object.values(templateData))
      : template;

    // Route to appropriate service
    if (emailContent.useResend) {
      // Use Resend for customer-facing emails
      const resendInstance = getResend();
      
      if (!resendInstance) {
        console.warn('⚠️ Resend not configured, falling back to Outlook');
        return await sendViaOutlook(to, emailContent, templateData);
      }

      console.log(`📧 [Resend] Sending to ${to}: ${emailContent.subject}`);
      
      const fromName = templateData.businessName || 'Orders';
      
      const { data, error } = await resendInstance.emails.send({
        from: `${fromName} <${FROM_EMAIL_ORDERS}>`,
        to: [to],
        replyTo: emailContent.replyTo || undefined,
        subject: emailContent.subject,
        html: emailContent.html,
      });

      if (error) {
        console.error('❌ Resend error:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ [Resend] Email sent:', data.id);
      return { success: true, messageId: data.id, service: 'resend' };

    } else {
      // Use Outlook for internal platform emails
      return await sendViaOutlook(to, emailContent, templateData);
    }

  } catch (error) {
    console.error('❌ Email error:', error);
    return { success: false, error: error.message };
  }
}

async function sendViaOutlook(to, emailContent, templateData) {
  const transporter = getOutlookTransporter();
  
  if (!transporter) {
    console.warn('⚠️ Outlook not configured. Email would be sent to:', to);
    console.log('💡 Set SMTP_USER and SMTP_PASS in .env');
    return { success: false, error: 'Outlook SMTP not configured' };
  }

  console.log(`📧 [Outlook] Sending to ${to}: ${emailContent.subject}`);

  const info = await transporter.sendMail({
    from: `"${FROM_NAME_PLATFORM}" <${FROM_EMAIL_PLATFORM}>`,
    to: to,
    subject: emailContent.subject,
    html: emailContent.html,
  });

  console.log('✅ [Outlook] Email sent:', info.messageId);
  return { success: true, messageId: info.messageId, service: 'outlook' };
}

// Available email types
export const EmailTypes = {
  // Internal (Outlook)
  WELCOME: 'welcome',
  INVITATION: 'invitation',
  PASSWORD_RESET: 'passwordReset',
  SITE_PUBLISHED: 'sitePublished',
  
  // Customer-facing (Resend)
  ORDER_CONFIRMATION: 'orderConfirmation',
  NEW_ORDER_ALERT: 'newOrderAlert',
  CONTACT_FORM_SUBMISSION: 'contactFormSubmission'
};

