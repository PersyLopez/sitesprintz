# ✅ Hybrid Email Setup - Quick Guide

**Outlook for internal + Resend for customer orders**

---

## 🚀 **5-Minute Setup**

### **Step 1: Get Outlook App Password** (2 min)
1. Go to: https://account.microsoft.com/security
2. Create App Password
3. Copy it

### **Step 2: Sign up for Resend** (2 min)
1. Go to: https://resend.com
2. Sign up (free tier: 100 emails/day)
3. Get API key
4. Add your domain (optional, can use test domain for now)

### **Step 3: Update .env** (1 min)

```env
# Outlook (Internal Platform Emails)
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-app-password-here
FROM_EMAIL=your-email@outlook.com
FROM_NAME=SiteSprintz

# Resend (Customer Order Emails)
RESEND_API_KEY=re_YourAPIKeyHere
RESEND_FROM_EMAIL=orders@yourdomain.com

# Site URL
SITE_URL=http://localhost:3000
```

### **Step 4: Install Resend** (30 sec)

```bash
npm install resend
```

(nodemailer already installed)

### **Step 5: Update server.js** (10 sec)

Change line ~13:

```javascript
// OLD:
import { sendEmail, EmailTypes } from './email-service.js';

// NEW:
import { sendEmail, EmailTypes } from './email-service-hybrid.js';
```

### **Step 6: Restart Server**

```bash
npm start
```

---

## ✅ **Done! What Works Now:**

**Internal Emails (via Outlook):**
- ✅ Welcome emails to new users
- ✅ Password resets
- ✅ Site published notifications
- ✅ **All FREE!**

**Customer Emails (via Resend):**
- ✅ Order receipts to end customers
- ✅ Order alerts to business owners
- ✅ Contact form submissions
- ✅ **Professional & scalable!**

---

## 🧪 **Test Both Services:**

```bash
# Place a test order to see it work!
# Or run this test:

node -e "
import('./email-service-hybrid.js').then(async ({ sendEmail }) => {
  // Test Outlook (internal)
  console.log('Testing Outlook...');
  await sendEmail('you@outlook.com', 'welcome', {
    email: 'test@example.com'
  });
  
  console.log('');
  console.log('Testing Resend...');
  // Test Resend (orders)
  await sendEmail('customer@example.com', 'orderConfirmation', {
    customerName: 'Test Customer',
    orderId: 'TEST-001',
    items: [{name: 'Test Pizza', quantity: 1, price: 12.99}],
    total: 12.99,
    currency: 'usd',
    businessName: 'Test Restaurant',
    businessEmail: 'owner@example.com'
  });
});
"
```

---

## 📊 **Email Routing:**

| Email Type | Service | From Address |
|------------|---------|--------------|
| Welcome | Outlook | you@outlook.com |
| Password Reset | Outlook | you@outlook.com |
| Site Published | Outlook | you@outlook.com |
| **Order Receipt** | **Resend** | **orders@yourdomain.com** |
| **Order Alert** | **Resend** | **orders@yourdomain.com** |
| **Contact Form** | **Resend** | **orders@yourdomain.com** |

---

## 💰 **Cost:**

**Starting out:**
- Outlook: FREE
- Resend: FREE (100 emails/day)
- **Total: $0**

**After launch:**
- Outlook: FREE
- Resend: $20/mo (50,000 emails/month)
- **Total: $20/mo**

---

## ✅ **Benefits:**

1. ✅ **Cost-effective** - FREE for internal, cheap for orders
2. ✅ **Reliable** - Two separate services
3. ✅ **Professional** - Right tool for each job
4. ✅ **Scalable** - Resend handles growth
5. ✅ **Simple** - Auto-routes to correct service

---

## 🎉 **That's It!**

Your platform now:
- Sends internal emails via Outlook (free)
- Sends order emails via Resend (professional)
- Automatically routes each email type to the right service
- Scales effortlessly

**Place a test order to see it work!** 🚀


