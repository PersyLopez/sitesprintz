import { Resend } from 'resend';

// Initialize Resend lazily to allow env vars to load
let resend = null;
function getResend() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

// Email templates
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
        
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="color: #991b1b; font-size: 0.9rem; margin: 0; line-height: 1.5;">
            ⚠️ <strong>Important:</strong> This temporary password expires in 7 days. You'll be asked to create a new password on first login.
          </p>
        </div>
        
        <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px;">
          <p style="color: #94a3b8; font-size: 0.875rem; text-align: center; margin: 0;">
            Need help? Reply to this email.
          </p>
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
        
        <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px;">
          <p style="color: #94a3b8; font-size: 0.875rem; text-align: center; margin: 0;">
            If you didn't request this, you can safely ignore this email. Your password will not be changed.
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
        
        <div style="background: #dbeafe; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 25px 0;">
          <p style="color: #1e40af; font-size: 0.95rem; margin: 0 0 10px 0; font-weight: 600;">
            💡 Next Steps:
          </p>
          <ul style="color: #1e40af; font-size: 0.9rem; margin: 0; padding-left: 20px; line-height: 1.8;">
            <li>Share your site with customers and on social media</li>
            <li>Monitor visits from your dashboard</li>
            <li>Update content anytime you need</li>
          </ul>
        </div>
        
        <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px;">
          <p style="color: #94a3b8; font-size: 0.875rem; text-align: center; margin: 0;">
            Keep this email for your records. You can manage your site from your <a href="${SITE_URL}/dashboard.html" style="color: #2563eb;">dashboard</a>.
          </p>
        </div>
      </div>
    `
  })
};

// Send email function
export async function sendEmail(to, templateName, templateData = {}) {
  const resendInstance = getResend();
  
  if (!resendInstance) {
    console.warn('⚠️ RESEND_API_KEY not set. Email would be sent to:', to);
    console.log('📧 Template:', templateName, 'Data:', templateData);
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

    const { data, error } = await resendInstance.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: emailContent.subject,
      html: emailContent.html,
    });

    if (error) {
      console.error('❌ Email send error:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Email sent successfully:', data.id);
    return { success: true, messageId: data.id };
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
  SITE_PUBLISHED: 'sitePublished'
};

