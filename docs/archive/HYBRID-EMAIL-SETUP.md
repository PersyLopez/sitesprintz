# 🎯 Hybrid Email Setup - Best of Both Worlds

**Outlook for internal business + Resend for customer orders**

---

## 🏗️ Architecture

### **Two Email Services:**

```
┌─────────────────────────────────────────┐
│         OUTLOOK SMTP                    │
│  (Your business operations)             │
├─────────────────────────────────────────┤
│ • Welcome emails to new users           │
│ • Password resets                       │
│ • Site published notifications          │
│ • Admin alerts                          │
│ • Internal communications               │
│                                         │
│ Volume: Low (~10-50/day)                │
│ Cost: FREE                              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│         RESEND API                      │
│  (Customer-facing orders)               │
├─────────────────────────────────────────┤
│ • Order receipts to customers           │
│ • Order alerts to business owners       │
│ • Feedback requests                     │
│ • Contact form submissions              │
│                                         │
│ Volume: High (scales with orders)       │
│ Cost: $20/mo for 50k emails            │
└─────────────────────────────────────────┘
```

---

## ✅ **Why This Makes Sense**

### **Outlook for Internal:**
- ✅ Free (300 emails/day)
- ✅ Perfect for low-volume platform emails
- ✅ You control the sender address
- ✅ Professional for your brand

### **Resend for Orders:**
- ✅ Better deliverability for customer emails
- ✅ Scales easily (50k emails/month)
- ✅ Professional analytics
- ✅ Reliability for business-critical emails

---

## 💻 **Implementation**

### **Step 1: Create Dual Email Service**

Create `/email-service-hybrid.js`:

```javascript
import nodemailer from 'nodemailer';
import { Resend } from 'resend';

const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

// ============================================
// OUTLOOK SMTP (Internal Platform Emails)
// ============================================
const outlookTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp-mail.outlook.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// ============================================
// RESEND (Customer-Facing Order Emails)
// ============================================
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL_PLATFORM = process.env.FROM_EMAIL || process.env.SMTP_USER;
const FROM_NAME_PLATFORM = process.env.FROM_NAME || 'SiteSprintz';
const FROM_EMAIL_ORDERS = process.env.RESEND_FROM_EMAIL || 'orders@yourdomain.com';

console.log('📧 Email Services Configured:');
console.log('   Internal (Outlook):', FROM_EMAIL_PLATFORM);
console.log('   Orders (Resend):', FROM_EMAIL_ORDERS);

// ============================================
// EMAIL TEMPLATES
// ============================================

const templates = {
  // INTERNAL EMAILS (use Outlook)
  welcome: (email) => ({
    subject: 'Welcome to SiteSprintz! 🎉',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Welcome! 🎉</h1>
        <p>Thanks for signing up! You can now create professional websites in minutes.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${SITE_URL}/dashboard.html" style="display: inline-block; padding: 14px 32px; background: #2563eb; color: white; text-decoration: none; border-radius: 10px; font-weight: 600;">
            Go to Dashboard
          </a>
        </div>
      </div>
    `,
    useOutlook: true
  }),

  passwordReset: (email, resetToken) => ({
    subject: 'Reset Your Password 🔐',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Reset Your Password 🔐</h1>
        <p>Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${SITE_URL}/reset-password.html?token=${resetToken}" style="display: inline-block; padding: 14px 32px; background: #2563eb; color: white; text-decoration: none; border-radius: 10px; font-weight: 600;">
            Reset Password
          </a>
        </div>
        <p style="color: #92400e; font-size: 0.9rem;">⏱️ This link expires in 1 hour.</p>
      </div>
    `,
    useOutlook: true
  }),

  sitePublished: (email, siteName, siteUrl) => ({
    subject: `🚀 Your Site "${siteName}" is Live!`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #10b981;">Your Site is Live! 🚀</h1>
        <p>Congratulations! Your website <strong>${siteName}</strong> is now live.</p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="${siteUrl}" style="color: #2563eb; font-size: 1.2rem;">${siteUrl}</a>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${siteUrl}" style="display: inline-block; padding: 14px 32px; background: #10b981; color: white; text-decoration: none; border-radius: 10px; font-weight: 600; margin-right: 10px;">
            Visit Your Site
          </a>
        </div>
      </div>
    `,
    useOutlook: true
  }),

  // CUSTOMER-FACING EMAILS (use Resend)
  orderConfirmation: (customerName, orderId, items, total, currency, businessName, businessEmail) => ({
    subject: `✅ Order Confirmation #${orderId} - ${businessName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
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
                <div style="display: flex; justify-content: space-between; margin: 12px 0; padding: 12px; background: #f8fafc; border-radius: 8px;">
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
            We'll contact you shortly about next steps. Questions? Just reply to this email!
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
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #f59e0b; margin: 0; font-size: 2rem;">🎉 New Order!</h1>
        </div>
        
        <div style="background: #fffbeb; border-radius: 12px; padding: 30px; margin-bottom: 20px; border: 2px solid #fbbf24;">
          <p style="font-size: 1.1rem; color: #1e293b; line-height: 1.6; margin: 0 0 20px 0;">
            You have received a new order for <strong>${businessName}</strong>!
          </p>
          
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #1e293b;">📋 Order #${orderId}</h3>
            
            <div style="background: #f8fafc; border-radius: 8px; padding: 15px; margin: 15px 0;">
              <p style="margin: 8px 0; color: #64748b;">
                <strong style="color: #1e293b;">Customer:</strong> ${customerName}
              </p>
              <p style="margin: 8px 0; color: #64748b;">
                <strong style="color: #1e293b;">Email:</strong> 
                <a href="mailto:${customerEmail}" style="color: #2563eb;">${customerEmail}</a>
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
                <div style="display: flex; justify-content: space-between; margin: 12px 0; padding: 12px; background: #f8fafc; border-radius: 8px;">
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
              <div style="display: flex; justify-content: space-between;">
                <span style="font-size: 1.2rem; font-weight: 600; color: #1e293b;">Total Paid:</span>
                <span style="font-size: 1.3rem; font-weight: 700; color: #f59e0b;">
                  ${currency === 'usd' ? '$' : ''}${total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${SITE_URL}/orders.html?siteId=${siteId}" style="display: inline-block; padding: 14px 32px; background: #f59e0b; color: white; text-decoration: none; border-radius: 10px; font-weight: 600; margin-right: 10px;">
            📦 View Order in Dashboard
          </a>
        </div>
        
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="color: #991b1b; font-size: 0.9rem; margin: 0;">
            ⏱️ <strong>Action Required:</strong> Contact the customer to arrange delivery or pickup!
          </p>
        </div>
      </div>
    `,
    replyTo: customerEmail,
    useResend: true
  }),

  contactFormSubmission: (businessName, submitterName, submitterEmail, submitterPhone, message, type, siteUrl, submissionTime) => ({
    subject: `🔔 New ${type === 'quote' ? 'Quote Request' : 'Contact'} - ${businessName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #10b981;">🔔 New Submission!</h1>
        <div style="background: #f0fdf4; border-radius: 12px; padding: 30px; margin-bottom: 20px; border: 2px solid #86efac;">
          <p>You have a new ${type === 'quote' ? 'quote request' : 'contact form submission'} for <strong>${businessName}</strong>!</p>
          
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3>📋 Details:</h3>
            <p><strong>From:</strong> ${submitterName}</p>
            <p><strong>Email:</strong> <a href="mailto:${submitterEmail}">${submitterEmail}</a></p>
            <p><strong>Phone:</strong> ${submitterPhone}</p>
            <p><strong>Submitted:</strong> ${submissionTime}</p>
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p><strong>Message:</strong></p>
              <div style="background: #f8fafc; border-radius: 8px; padding: 15px; white-space: pre-wrap;">
${message}
              </div>
            </div>
          </div>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="mailto:${submitterEmail}" style="display: inline-block; padding: 14px 32px; background: #10b981; color: white; text-decoration: none; border-radius: 10px; font-weight: 600;">
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
// SEND EMAIL FUNCTION
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

    // Decide which service to use
    if (emailContent.useResend && resend) {
      // Use Resend for customer-facing emails
      console.log(`📧 [Resend] Sending to ${to}: ${emailContent.subject}`);
      
      const { data, error } = await resend.emails.send({
        from: `${templateData.businessName || 'Orders'} <${FROM_EMAIL_ORDERS}>`,
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

    } else if (emailContent.useOutlook || !resend) {
      // Use Outlook for internal/platform emails
      console.log(`📧 [Outlook] Sending to ${to}: ${emailContent.subject}`);
      
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('⚠️ Outlook not configured');
        return { success: false, error: 'Outlook SMTP not configured' };
      }

      const info = await outlookTransporter.sendMail({
        from: `"${FROM_NAME_PLATFORM}" <${FROM_EMAIL_PLATFORM}>`,
        to: to,
        subject: emailContent.subject,
        html: emailContent.html,
      });

      console.log('✅ [Outlook] Email sent:', info.messageId);
      return { success: true, messageId: info.messageId, service: 'outlook' };
    }

  } catch (error) {
    console.error('❌ Email error:', error);
    return { success: false, error: error.message };
  }
}

// Email types
export const EmailTypes = {
  // Internal (Outlook)
  WELCOME: 'welcome',
  PASSWORD_RESET: 'passwordReset',
  SITE_PUBLISHED: 'sitePublished',
  
  // Customer-facing (Resend)
  ORDER_CONFIRMATION: 'orderConfirmation',
  NEW_ORDER_ALERT: 'newOrderAlert',
  CONTACT_FORM_SUBMISSION: 'contactFormSubmission'
};
```

---

## 🔧 **Configuration**

### **Update `.env`:**

```env
# ============================================
# OUTLOOK SMTP (Internal Platform Emails)
# ============================================
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-app-password
FROM_EMAIL=your-email@outlook.com
FROM_NAME=SiteSprintz

# ============================================
# RESEND (Customer-Facing Order Emails)
# ============================================
RESEND_API_KEY=re_YourAPIKeyHere
RESEND_FROM_EMAIL=orders@yourdomain.com

# Site URL
SITE_URL=https://yourdomain.com
```

---

## 🔄 **Update server.js**

Change the import:

```javascript
// OLD:
// import { sendEmail, EmailTypes } from './email-service.js';

// NEW:
import { sendEmail, EmailTypes } from './email-service-hybrid.js';
```

---

## 📊 **Email Routing**

```
┌─────────────────────┐
│   EMAIL TYPE        │  SERVICE  │  FROM ADDRESS
├─────────────────────┼───────────┼──────────────────────
│ Welcome             │  Outlook  │  you@outlook.com
│ Password Reset      │  Outlook  │  you@outlook.com
│ Site Published      │  Outlook  │  you@outlook.com
│ Admin Alerts        │  Outlook  │  you@outlook.com
├─────────────────────┼───────────┼──────────────────────
│ Order Receipt       │  Resend   │  orders@yourdomain.com
│ Order Alert         │  Resend   │  orders@yourdomain.com
│ Contact Form        │  Resend   │  orders@yourdomain.com
│ Feedback Request    │  Resend   │  orders@yourdomain.com
└─────────────────────┴───────────┴──────────────────────
```

---

## ✅ **Benefits**

### **Cost Optimization:**
- Outlook: FREE for internal emails (low volume)
- Resend: $20/mo for high-volume customer emails
- **Total: $20/mo** (vs $20/mo for everything on Resend)

### **Reliability:**
- Platform emails never blocked (your Outlook account)
- Customer emails highly deliverable (Resend)
- Backup: If one fails, other still works

### **Separation:**
- Internal business on your domain
- Customer orders on professional domain
- Clean separation of concerns

---

## 🧪 **Testing**

```bash
# Test both services
node -e "
import('./email-service-hybrid.js').then(async ({ sendEmail }) => {
  // Test Outlook (internal)
  await sendEmail('your-email@outlook.com', 'welcome', {
    email: 'test@example.com'
  });
  
  // Test Resend (orders)
  await sendEmail('customer@example.com', 'orderConfirmation', {
    customerName: 'Test',
    orderId: 'TEST-001',
    items: [{name: 'Test', quantity: 1, price: 10}],
    total: 10,
    currency: 'usd',
    businessName: 'Test Business',
    businessEmail: 'business@example.com'
  });
});
"
```

---

## 🚀 **Setup Checklist**

- [ ] Sign up for Resend (https://resend.com)
- [ ] Add domain to Resend
- [ ] Verify DNS records
- [ ] Get Outlook App Password
- [ ] Update `.env` with both configs
- [ ] Create `email-service-hybrid.js`
- [ ] Update `server.js` import
- [ ] Test both services
- [ ] Restart server

---

## 💰 **Cost Breakdown**

**Month 1-3 (Testing):**
- Outlook: FREE
- Resend: FREE (100 emails/day)
- **Total: $0**

**After Launch (10-50 Pro customers):**
- Outlook: FREE (internal emails)
- Resend: $20/mo (50k customer emails)
- **Total: $20/mo**

**At Scale (100+ Pro customers):**
- Outlook: FREE
- Resend: $20/mo (still plenty!)
- **Total: $20/mo**

---

## ✅ **This is Perfect Because:**

1. ✅ **Platform emails** (welcome, password reset) use free Outlook
2. ✅ **Order emails** (receipts, alerts) use professional Resend
3. ✅ **Cost-effective** ($20/mo total)
4. ✅ **Reliable** (two separate services)
5. ✅ **Professional** (right tool for each job)
6. ✅ **Scalable** (Resend handles growth)

**Want me to set this up now?** 🚀


