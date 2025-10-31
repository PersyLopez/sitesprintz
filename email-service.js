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
  }),

  siteUpdated: (businessName, siteUrl, updateTime) => ({
    subject: `✅ Your Site Has Been Updated - ${businessName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #10b981; margin: 0; font-size: 2rem;">✅ Site Updated!</h1>
        </div>
        
        <div style="background: #f0fdf4; border-radius: 12px; padding: 30px; margin-bottom: 20px; border: 2px solid #86efac;">
          <p style="font-size: 1.1rem; color: #1e293b; line-height: 1.6; margin: 0 0 20px 0;">
            <strong>${businessName}</strong> has been successfully updated!
          </p>
          
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; color: #64748b; font-size: 0.9rem;">
              <strong style="color: #1e293b;">Updated At:</strong> ${updateTime}
            </p>
            <p style="margin: 10px 0 0 0; color: #64748b; font-size: 0.9rem;">
              <strong style="color: #1e293b;">Your Site:</strong>
            </p>
            <a href="${siteUrl}" style="color: #2563eb; text-decoration: none; word-break: break-all; display: block; margin-top: 8px;">
              ${siteUrl}
            </a>
          </div>
          
          <p style="color: #64748b; line-height: 1.6; margin: 20px 0 0 0; font-size: 0.95rem;">
            Your changes are now live! Visit your site to see the updates.
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${siteUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #10b981, #059669); color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 1rem; margin-right: 10px;">
            View Your Site
          </a>
          <a href="${SITE_URL}/dashboard.html" style="display: inline-block; padding: 14px 32px; background: #f1f5f9; color: #475569; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 1rem;">
            Go to Dashboard
          </a>
        </div>
        
        <div style="background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="color: #1e40af; font-size: 0.9rem; margin: 0; line-height: 1.5;">
            💡 <strong>Tip:</strong> All site updates are automatically backed up. You can always roll back to a previous version if needed.
          </p>
        </div>
        
        <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px;">
          <p style="color: #94a3b8; font-size: 0.875rem; text-align: center; margin: 0;">
            Need help? Visit our <a href="${SITE_URL}" style="color: #2563eb; text-decoration: none;">support center</a> or reply to this email.
          </p>
        </div>
      </div>
    `
  }),

  trialExpiringSoon: (businessName, siteUrl, daysLeft) => ({
    subject: `⏰ Your Free Trial Expires in ${daysLeft} Day${daysLeft > 1 ? 's' : ''}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #f59e0b; margin: 0; font-size: 2rem;">⏰ Trial Ending Soon</h1>
        </div>
        
        <div style="background: #fffbeb; border-radius: 12px; padding: 30px; margin-bottom: 20px; border: 2px solid #fbbf24;">
          <p style="font-size: 1.1rem; color: #1e293b; line-height: 1.6; margin: 0 0 20px 0;">
            Your free trial for <strong>${businessName}</strong> will expire in <strong style="color: #f59e0b;">${daysLeft} day${daysLeft > 1 ? 's' : ''}</strong>!
          </p>
          
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; color: #64748b; font-size: 0.9rem;">
              <strong style="color: #1e293b;">Your Site:</strong>
            </p>
            <a href="${siteUrl}" style="color: #2563eb; text-decoration: none; word-break: break-all; display: block; margin-top: 8px;">
              ${siteUrl}
            </a>
          </div>
          
          <p style="color: #92400e; line-height: 1.6; margin: 20px 0 0 0; font-size: 0.95rem;">
            After your trial expires, your site will go offline. Subscribe to any plan to keep it live!
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${SITE_URL}/dashboard.html" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 1rem;">
            🚀 Subscribe Now
          </a>
        </div>
      </div>
    `
  }),

  trialExpired: (businessName, siteUrl) => ({
    subject: `❌ Your Free Trial Has Expired - ${businessName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #ef4444; margin: 0; font-size: 2rem;">❌ Trial Expired</h1>
        </div>
        
        <div style="background: #fef2f2; border-radius: 12px; padding: 30px; margin-bottom: 20px; border: 2px solid #fca5a5;">
          <p style="font-size: 1.1rem; color: #1e293b; line-height: 1.6; margin: 0 0 20px 0;">
            Your free trial for <strong>${businessName}</strong> has expired and your site is now offline.
          </p>
          
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; color: #64748b; font-size: 0.9rem;">
              <strong style="color: #1e293b;">Your Site (Offline):</strong>
            </p>
            <p style="color: #94a3b8; text-decoration: line-through; word-break: break-all; margin: 8px 0;">
              ${siteUrl}
            </p>
          </div>
          
          <p style="color: #991b1b; line-height: 1.6; margin: 20px 0 0 0; font-size: 0.95rem; font-weight: 600;">
            ⚠️ Your site data is saved for 30 days. Subscribe now to restore it!
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${SITE_URL}/dashboard.html" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 1.1rem; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);">
            🚀 Restore My Site Now
          </a>
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
        
        <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px;">
          <p style="color: #94a3b8; font-size: 0.875rem; text-align: center; margin: 0;">
            This submission was sent from your website: <a href="${siteUrl}" style="color: #2563eb;">${siteUrl}</a>
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
  SITE_PUBLISHED: 'sitePublished',
  SITE_UPDATED: 'siteUpdated',
  TRIAL_EXPIRING_SOON: 'trialExpiringSoon',
  TRIAL_EXPIRED: 'trialExpired',
  CONTACT_FORM_SUBMISSION: 'contactFormSubmission'
};

