import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp-mail.outlook.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT) || 587;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER;
const FROM_NAME = process.env.FROM_NAME || 'SiteSprintz';
const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

// Create transporter
let transporter = null;
function getTransporter() {
  if (!transporter && SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      },
      tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false
      }
    });
    
    console.log(`📧 SMTP Email configured: ${SMTP_HOST} (${FROM_EMAIL})`);
  }
  return transporter;
}

// Import all templates from existing email-service.js
// You can copy all the template HTML from email-service.js here
// For now, I'll include the critical ones for orders

const templates = {
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
          
          <p style="color: #64748b; line-height: 1.6; margin: 0 0 20px 0;">
            <strong>What's next?</strong>
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
        
        <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px;">
          <p style="color: #94a3b8; font-size: 0.875rem; text-align: center; margin: 0;">
            If you didn't create this account, you can safely ignore this email.
          </p>
        </div>
      </div>
    `
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
    `
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
    `
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
          <p style="margin: 0 0 12px 0; font-weight: 600; color: #1e293b; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em;">
            Your Site URL
          </p>
          <a href="${siteUrl}" style="color: #2563eb; font-size: 1.2rem; word-break: break-all; text-decoration: none; font-weight: 500;">
            ${siteUrl}
          </a>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${siteUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #10b981, #059669); color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 1rem; margin-right: 10px;">
            Visit Your Site
          </a>
          <a href="${SITE_URL}/dashboard.html" style="display: inline-block; padding: 14px 32px; background: #f1f5f9; color: #1e293b; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 1rem;">
            Dashboard
          </a>
        </div>
      </div>
    `
  }),

  orderConfirmation: (customerName, orderId, items, total, currency, businessName) => ({
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
        
        <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px;">
          <p style="color: #94a3b8; font-size: 0.875rem; text-align: center; margin: 0;">
            Questions about your order? Reply to this email and we'll be happy to help!
          </p>
        </div>
      </div>
    `
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
        
        <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px;">
          <p style="color: #94a3b8; font-size: 0.875rem; text-align: center; margin: 0;">
            This order was placed on your SiteSprintz website. Manage all orders from your dashboard.
          </p>
        </div>
      </div>
    `
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
          <a href="${siteUrl}" style="display: inline-block; padding: 14px 32px; background: #f1f5f9; color: #475569; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 1rem;">
            🌐 View Site
          </a>
        </div>
      </div>
    `
  })
};

// Send email function
export async function sendEmail(to, templateName, templateData = {}) {
  const transporter = getTransporter();
  
  if (!transporter) {
    console.warn('⚠️ SMTP not configured. Email would be sent to:', to);
    console.log('📧 Template:', templateName, 'Data:', templateData);
    console.log('💡 Set SMTP_USER and SMTP_PASS in .env to enable emails');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const template = templates[templateName];
    if (!template) {
      throw new Error(`Unknown email template: ${templateName}`);
    }

    const emailContent = typeof template === 'function' 
      ? template(...Object.values(templateData))
      : template;

    console.log(`📧 Sending email to ${to}: ${emailContent.subject}`);

    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: to,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    console.log('✅ Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('❌ Email error:', error);
    return { success: false, error: error.message };
  }
}

// Available email types
export const EmailTypes = {
  WELCOME: 'welcome',
  INVITATION: 'invitation',
  PASSWORD_RESET: 'passwordReset',
  SITE_PUBLISHED: 'sitePublished',
  ORDER_CONFIRMATION: 'orderConfirmation',
  NEW_ORDER_ALERT: 'newOrderAlert',
  CONTACT_FORM_SUBMISSION: 'contactFormSubmission'
};

