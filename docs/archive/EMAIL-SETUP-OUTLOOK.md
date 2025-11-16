# 📧 Email Setup with Outlook - Complete Guide

**Use your Outlook/Microsoft 365 email account to send order notifications**

---

## 🎯 Overview

You have two options:
1. **SMTP** - Use Outlook directly (Recommended)
2. **Resend + Custom Domain** - Professional sender reputation

---

## ✅ **Option 1: SMTP with Outlook (Easiest)**

### **Step 1: Get Outlook SMTP Credentials**

**For Outlook.com / Hotmail:**
```
SMTP Server: smtp-mail.outlook.com
Port: 587
Security: STARTTLS
Username: your-email@outlook.com
Password: Your Outlook password (or App Password)
```

**For Microsoft 365 Business:**
```
SMTP Server: smtp.office365.com
Port: 587
Security: STARTTLS
Username: your-email@yourdomain.com
Password: Your password (or App Password)
```

---

### **Step 2: Enable App Password (Required for Security)**

**Why?** If you have 2FA enabled (recommended), you need an App Password.

**How to create:**
1. Go to https://account.microsoft.com/security
2. Click "Advanced security options"
3. Click "Create a new app password"
4. Copy the generated password
5. Use this instead of your regular password

---

### **Step 3: Install Nodemailer**

```bash
cd /Users/admin/active-directory-website
npm install nodemailer
```

---

### **Step 4: Update .env File**

Add these to your `.env` file:

```env
# Email Configuration (Outlook SMTP)
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-app-password-here
FROM_EMAIL=your-email@outlook.com
FROM_NAME=SiteSprintz

# Optional: Remove or comment out Resend
# RESEND_API_KEY=re_xxxxx
```

**For Microsoft 365 Business:**
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your-app-password-here
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Your Business Name
```

---

### **Step 5: Create New Email Service File**

Create `/email-service-smtp.js`:

```javascript
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
    
    console.log('📧 SMTP Email configured:', SMTP_HOST);
  }
  return transporter;
}

// Email templates (same as before)
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
        </div>
      </div>
    `
  }),

  // Add other templates as needed (sitePublished, contactFormSubmission, etc.)
};

// Send email function
export async function sendEmail(to, templateName, templateData = {}) {
  const transporter = getTransporter();
  
  if (!transporter) {
    console.warn('⚠️ SMTP not configured. Email would be sent to:', to);
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

// Email types
export const EmailTypes = {
  WELCOME: 'welcome',
  ORDER_CONFIRMATION: 'orderConfirmation',
  NEW_ORDER_ALERT: 'newOrderAlert',
  // Add others as needed
};
```

---

### **Step 6: Update server.js**

Change the import at the top of `server.js`:

```javascript
// OLD:
// import { sendEmail, EmailTypes } from './email-service.js';

// NEW:
import { sendEmail, EmailTypes } from './email-service-smtp.js';
```

---

### **Step 7: Test Email**

Create a test file `test-email.js`:

```javascript
import dotenv from 'dotenv';
import { sendEmail } from './email-service-smtp.js';

dotenv.config();

async function testEmail() {
  console.log('Testing email configuration...');
  
  const result = await sendEmail(
    'your-email@example.com',  // Change to your test email
    'orderConfirmation',
    {
      customerName: 'Test Customer',
      orderId: 'TEST-001',
      items: [
        { name: 'Test Product', quantity: 1, price: 10.00 }
      ],
      total: 10.00,
      currency: 'usd',
      businessName: 'Test Business'
    }
  );
  
  console.log('Result:', result);
  
  if (result.success) {
    console.log('✅ Email sent successfully!');
  } else {
    console.error('❌ Email failed:', result.error);
  }
}

testEmail();
```

Run test:
```bash
node test-email.js
```

---

## ✅ **Option 2: Resend with Custom Domain (Professional)**

**Why?** Better deliverability, dedicated IP, professional sender reputation.

### **Step 1: Sign up for Resend**
1. Go to https://resend.com
2. Sign up (free tier: 100 emails/day)
3. Get API key

### **Step 2: Add Your Domain**
1. In Resend dashboard, click "Domains"
2. Add your domain (e.g., yourdomain.com)
3. Add DNS records they provide:
   - SPF record
   - DKIM record
   - DMARC record
4. Wait for verification (5-30 minutes)

### **Step 3: Configure .env**
```env
RESEND_API_KEY=re_YourAPIKey
FROM_EMAIL=noreply@yourdomain.com
SITE_URL=https://yourdomain.com
```

### **Step 4: Done!**
The current `email-service.js` already supports Resend. Just add the API key and it works!

---

## 📊 Comparison

| Feature | Outlook SMTP | Resend + Domain |
|---------|-------------|-----------------|
| **Cost** | Free | Free (100/day), $20/mo (50k/mo) |
| **Setup** | 5 minutes | 30 minutes (DNS) |
| **Deliverability** | Good | Excellent |
| **Daily Limit** | 300-500 | 100 (free), 50,000 (paid) |
| **Professional** | Moderate | Very Professional |
| **Spam Risk** | Low | Very Low |
| **Custom Domain** | Requires MS365 | Yes |

---

## 🎯 Recommendations

### **For Testing / Small Volume:**
→ **Use Outlook SMTP** (Option 1)
- Quick setup
- Free
- Good for <100 emails/day

### **For Production / High Volume:**
→ **Use Resend with Custom Domain** (Option 2)
- Professional
- Better deliverability
- Analytics & tracking
- Scales easily

---

## 🔧 Troubleshooting

### **Outlook SMTP Issues:**

**"Authentication failed"**
- ✅ Use App Password, not regular password
- ✅ Enable "Allow less secure apps" (not recommended)
- ✅ Check 2FA settings

**"Connection timeout"**
- ✅ Check port 587 not blocked by firewall
- ✅ Try port 25 if 587 doesn't work
- ✅ Check SMTP_HOST is correct

**"Sender rejected"**
- ✅ Verify FROM_EMAIL matches SMTP_USER
- ✅ Check email account is active
- ✅ Try sending from Outlook directly first

**"Daily limit exceeded"**
- ✅ Outlook.com: 300 emails/day
- ✅ Microsoft 365: 10,000 emails/day
- ✅ Wait 24 hours or upgrade plan

---

## 📧 Testing Checklist

- [ ] Install nodemailer: `npm install nodemailer`
- [ ] Create `.env` with SMTP settings
- [ ] Get App Password from Outlook
- [ ] Create `email-service-smtp.js`
- [ ] Update `server.js` import
- [ ] Run `node test-email.js`
- [ ] Check inbox for test email
- [ ] Place test order to verify real emails
- [ ] Check spam folder if not received

---

## 🚀 Quick Setup (Copy-Paste)

**1. Install dependency:**
```bash
npm install nodemailer
```

**2. Add to .env:**
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-app-password
FROM_EMAIL=your-email@outlook.com
FROM_NAME=SiteSprintz
```

**3. Download the email-service-smtp.js file (I'll create it next)**

**4. Update server.js import**

**5. Restart server**

**Done!** 🎉

---

## ❓ FAQ

**Q: Can I use Gmail instead?**
A: Yes! Just change SMTP settings:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
```

**Q: Do I need a Microsoft 365 subscription?**
A: No! Free Outlook.com works fine (300 emails/day limit).

**Q: Will emails go to spam?**
A: Unlikely with Outlook. Use Resend for best deliverability.

**Q: Can I customize email templates?**
A: Yes! Edit the `templates` object in the email service file.

**Q: What about tracking/analytics?**
A: Use Resend for built-in analytics. SMTP doesn't include this.

---

**Choose your option and I'll help you set it up!** 📧


