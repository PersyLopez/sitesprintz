# 📧 Email Setup for Pro Template Customers

**Let your customers easily configure email notifications for THEIR orders**

---

## 🎯 Goal

Make it simple for Pro template customers to:
1. Enter their email settings (Outlook, Gmail, etc.)
2. Receive order notifications at THEIR email
3. Test it works before going live
4. No technical knowledge required

---

## 🏗️ Architecture

### **Current Flow:**
```
Customer places order
  ↓
Stripe webhook fires
  ↓
Platform sends emails using PLATFORM email
  ↓
Business owner receives notification
```

### **New Flow:**
```
Customer places order
  ↓
Stripe webhook fires
  ↓
Load site-specific email settings
  ↓
Send emails using BUSINESS OWNER'S email
  ↓
Business owner receives at their own email
```

---

## 📦 What to Build

### **1. Email Settings Page**

Add to dashboard: **Site Settings → Email Configuration**

**UI Wireframe:**
```
┌─────────────────────────────────────────┐
│ 📧 Email Notifications                  │
├─────────────────────────────────────────┤
│                                         │
│ Configure email notifications for your │
│ customer orders and contact forms.      │
│                                         │
│ Email Provider:                         │
│ ○ Outlook/Hotmail                       │
│ ○ Gmail                                 │
│ ○ Microsoft 365                         │
│ ○ Custom SMTP                           │
│                                         │
│ Your Email Address:                     │
│ [                            ]          │
│                                         │
│ App Password:                           │
│ [                            ]          │
│ [?] How to get App Password             │
│                                         │
│ From Name:                              │
│ [Your Business Name        ]            │
│                                         │
│ [Test Email] [Save Settings]            │
│                                         │
│ Status: ✅ Configured and working       │
└─────────────────────────────────────────┘
```

---

### **2. Data Storage**

Store per-site in `site.json`:

```json
{
  "name": "Mario's Pizza",
  "ownerEmail": "mario@example.com",
  "emailConfig": {
    "enabled": true,
    "provider": "outlook",
    "smtpHost": "smtp-mail.outlook.com",
    "smtpPort": 587,
    "smtpUser": "mario@pizzeria.com",
    "smtpPass": "encrypted_password_here",
    "fromEmail": "mario@pizzeria.com",
    "fromName": "Mario's Pizza",
    "testSent": true,
    "lastTested": "2025-11-01T10:00:00Z"
  }
}
```

**Security:** Encrypt the password before storing!

---

### **3. Simple Provider Templates**

**Pre-configured settings:**

```javascript
const EMAIL_PROVIDERS = {
  outlook: {
    name: 'Outlook / Hotmail',
    smtpHost: 'smtp-mail.outlook.com',
    smtpPort: 587,
    smtpSecure: false,
    helpUrl: 'https://account.microsoft.com/security',
    instructions: 'Get App Password from Microsoft Account Security settings'
  },
  gmail: {
    name: 'Gmail',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpSecure: false,
    helpUrl: 'https://myaccount.google.com/apppasswords',
    instructions: 'Enable 2FA, then create App Password in Google Account'
  },
  microsoft365: {
    name: 'Microsoft 365',
    smtpHost: 'smtp.office365.com',
    smtpPort: 587,
    smtpSecure: false,
    helpUrl: 'https://account.microsoft.com/security',
    instructions: 'Use your Microsoft 365 business email'
  },
  custom: {
    name: 'Custom SMTP',
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: false,
    instructions: 'Enter your email provider\'s SMTP settings'
  }
};
```

---

### **4. Setup Wizard (User-Friendly)**

**Step-by-step flow:**

```
Step 1: Choose Provider
┌─────────────────────────────────────────┐
│ Which email do you use?                 │
│                                         │
│ [📧 Outlook/Hotmail]  [📧 Gmail]        │
│ [📧 Microsoft 365]    [⚙️ Custom]       │
└─────────────────────────────────────────┘

Step 2: Get App Password
┌─────────────────────────────────────────┐
│ Create an App Password                  │
│                                         │
│ 1. Click this link:                     │
│    [Open Microsoft Account Security →]  │
│                                         │
│ 2. Click "App passwords"                │
│                                         │
│ 3. Create new password                  │
│                                         │
│ 4. Copy the password and paste below    │
│                                         │
│ [Watch 30-second video tutorial →]      │
└─────────────────────────────────────────┘

Step 3: Enter Details
┌─────────────────────────────────────────┐
│ Your Email: [mario@outlook.com    ]     │
│ App Password: [****************   ]     │
│ From Name: [Mario's Pizza          ]    │
│                                         │
│ [← Back]  [Test & Continue →]           │
└─────────────────────────────────────────┘

Step 4: Test
┌─────────────────────────────────────────┐
│ Testing email...                        │
│                                         │
│ ✅ Connection successful!               │
│ ✅ Test email sent to mario@outlook.com │
│                                         │
│ Check your inbox to confirm.            │
│                                         │
│ [Finish Setup →]                        │
└─────────────────────────────────────────┘
```

---

## 💻 Implementation

### **Frontend: Email Settings Page**

Create `/public/email-settings.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Email Settings - SiteSprintz</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <div class="container">
    <h1>📧 Email Notifications</h1>
    
    <!-- Provider Selection -->
    <div id="step1" class="setup-step">
      <h2>Choose Your Email Provider</h2>
      <div class="provider-grid">
        <button onclick="selectProvider('outlook')">
          📧 Outlook/Hotmail
        </button>
        <button onclick="selectProvider('gmail')">
          📧 Gmail
        </button>
        <button onclick="selectProvider('microsoft365')">
          📧 Microsoft 365
        </button>
        <button onclick="selectProvider('custom')">
          ⚙️ Custom SMTP
        </button>
      </div>
    </div>
    
    <!-- Configuration Form -->
    <div id="step2" class="setup-step" style="display: none;">
      <h2>Configure Email</h2>
      
      <div class="help-box">
        <h3>📝 Quick Setup Instructions</h3>
        <ol id="instructions"></ol>
        <a id="helpLink" target="_blank" class="btn-secondary">
          Get App Password →
        </a>
      </div>
      
      <form id="emailForm">
        <div class="form-group">
          <label>Your Email Address</label>
          <input type="email" id="emailAddress" required 
                 placeholder="your-email@example.com">
        </div>
        
        <div class="form-group">
          <label>App Password</label>
          <input type="password" id="appPassword" required 
                 placeholder="Get this from your email provider">
          <small>Not your regular password - use App Password for security</small>
        </div>
        
        <div class="form-group">
          <label>From Name (Your Business Name)</label>
          <input type="text" id="fromName" required 
                 placeholder="Mario's Pizza">
        </div>
        
        <div class="form-actions">
          <button type="button" onclick="testEmail()" class="btn-secondary">
            🧪 Test Email
          </button>
          <button type="submit" class="btn-primary">
            💾 Save Settings
          </button>
        </div>
      </form>
    </div>
    
    <!-- Success -->
    <div id="step3" class="setup-step" style="display: none;">
      <div class="success-message">
        <div class="success-icon">✅</div>
        <h2>Email Configured!</h2>
        <p>You'll now receive order notifications at your email.</p>
        <button onclick="window.location.href='/dashboard.html'" 
                class="btn-primary">
          Back to Dashboard
        </button>
      </div>
    </div>
  </div>
  
  <script src="/email-settings.js"></script>
</body>
</html>
```

---

### **Backend: API Endpoints**

Add to `server.js`:

```javascript
import crypto from 'crypto';

// Encryption key (store in .env)
const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY || 'change-this-in-production-32chars!!';

// Encrypt password
function encryptPassword(password) {
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// Decrypt password
function decryptPassword(encrypted) {
  const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Save email settings for a site
app.post('/api/sites/:siteId/email-settings', authenticateToken, async (req, res) => {
  try {
    const { siteId } = req.params;
    const { provider, smtpUser, smtpPass, fromName } = req.body;
    
    // Load site
    const siteFile = path.join(__dirname, 'public', 'sites', siteId, 'site.json');
    const siteData = JSON.parse(await fs.readFile(siteFile, 'utf-8'));
    
    // Verify ownership
    if (siteData.ownerEmail !== req.user.email && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get provider settings
    const providers = {
      outlook: { host: 'smtp-mail.outlook.com', port: 587, secure: false },
      gmail: { host: 'smtp.gmail.com', port: 587, secure: false },
      microsoft365: { host: 'smtp.office365.com', port: 587, secure: false }
    };
    
    const providerConfig = providers[provider];
    
    // Encrypt password
    const encryptedPass = encryptPassword(smtpPass);
    
    // Save config
    siteData.emailConfig = {
      enabled: true,
      provider: provider,
      smtpHost: providerConfig.host,
      smtpPort: providerConfig.port,
      smtpSecure: providerConfig.secure,
      smtpUser: smtpUser,
      smtpPass: encryptedPass,
      fromEmail: smtpUser,
      fromName: fromName,
      configuredAt: new Date().toISOString()
    };
    
    await fs.writeFile(siteFile, JSON.stringify(siteData, null, 2));
    
    res.json({ success: true, message: 'Email configured successfully' });
    
  } catch (error) {
    console.error('Email config error:', error);
    res.status(500).json({ error: 'Failed to save email settings' });
  }
});

// Test email settings
app.post('/api/sites/:siteId/test-email', authenticateToken, async (req, res) => {
  try {
    const { siteId } = req.params;
    const { smtpHost, smtpPort, smtpUser, smtpPass, fromEmail, fromName } = req.body;
    
    // Create test transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: false,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });
    
    // Send test email
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: smtpUser,
      subject: '✅ SiteSprintz Email Test',
      html: `
        <h1>Email Test Successful!</h1>
        <p>Your email is configured correctly and you'll receive order notifications at this address.</p>
        <p><strong>Site ID:</strong> ${siteId}</p>
        <p><strong>From Name:</strong> ${fromName}</p>
      `
    });
    
    res.json({ success: true, message: 'Test email sent successfully' });
    
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to send test email' 
    });
  }
});

// Get email settings
app.get('/api/sites/:siteId/email-settings', authenticateToken, async (req, res) => {
  try {
    const { siteId } = req.params;
    
    // Load site
    const siteFile = path.join(__dirname, 'public', 'sites', siteId, 'site.json');
    const siteData = JSON.parse(await fs.readFile(siteFile, 'utf-8'));
    
    // Verify ownership
    if (siteData.ownerEmail !== req.user.email && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Return config (without password)
    const config = siteData.emailConfig || { enabled: false };
    const safeConfig = { ...config };
    delete safeConfig.smtpPass; // Never send password to frontend
    
    res.json({ config: safeConfig });
    
  } catch (error) {
    console.error('Get email config error:', error);
    res.status(500).json({ error: 'Failed to load email settings' });
  }
});
```

---

### **Enhanced Order Notification Function**

Modify `sendOrderNotifications()` in `server.js`:

```javascript
async function sendOrderNotifications(order) {
  try {
    // Load site data to get email config
    const siteFile = path.join(publicDir, 'data', 'sites', `${order.siteId}.json`);
    const site = JSON.parse(await fs.readFile(siteFile, 'utf-8'));
    
    const businessName = site.name || site.businessName || 'Your Business';
    
    // Check if site has custom email configured
    if (site.emailConfig && site.emailConfig.enabled) {
      // Use site-specific email settings
      const config = site.emailConfig;
      
      // Decrypt password
      const decryptedPass = decryptPassword(config.smtpPass);
      
      // Create site-specific transporter
      const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpSecure,
        auth: {
          user: config.smtpUser,
          pass: decryptedPass
        }
      });
      
      // Send emails using site's configuration
      // Customer confirmation
      if (order.customer.email) {
        await transporter.sendMail({
          from: `"${config.fromName}" <${config.fromEmail}>`,
          to: order.customer.email,
          subject: `✅ Order Confirmation #${order.orderId}`,
          html: generateOrderConfirmationHTML(order, businessName)
        });
        console.log(`✅ Order confirmation sent to customer via site email`);
      }
      
      // Business owner alert
      if (site.ownerEmail) {
        await transporter.sendMail({
          from: `"${config.fromName}" <${config.fromEmail}>`,
          to: site.ownerEmail,
          subject: `🎉 New Order #${order.orderId}`,
          html: generateNewOrderHTML(order, businessName, order.siteId)
        });
        console.log(`✅ Order alert sent to owner via site email`);
      }
    } else {
      // Fallback to platform email (your SMTP)
      console.log('⚠️ No email configured for site, using platform email');
      
      // Use your sendEmail function
      if (order.customer.email) {
        await sendEmail(order.customer.email, 'orderConfirmation', {
          customerName: order.customer.name,
          orderId: order.orderId,
          items: order.items,
          total: order.amount,
          currency: order.currency,
          businessName: businessName
        });
      }
      
      if (site.ownerEmail) {
        await sendEmail(site.ownerEmail, 'newOrderAlert', {
          businessName: businessName,
          orderId: order.orderId,
          customerName: order.customer.name,
          customerEmail: order.customer.email,
          customerPhone: order.customer.phone,
          items: order.items,
          total: order.amount,
          currency: order.currency,
          siteId: order.siteId
        });
      }
    }
  } catch (error) {
    console.error('Error sending order notifications:', error);
  }
}
```

---

## 🎨 User Experience

### **Customer Journey:**

1. **First Order Received:**
   ```
   Dashboard shows banner:
   "⚠️ Configure email to receive order notifications!"
   [Setup Email Now →]
   ```

2. **Click Setup:**
   - Simple wizard opens
   - 4 steps, takes 2 minutes
   - Built-in help and tutorials

3. **After Setup:**
   ```
   ✅ Email configured!
   You'll receive notifications at: mario@pizzeria.com
   [Send Test Email] [Edit Settings]
   ```

4. **Future Orders:**
   - Automatic notifications
   - From their own email
   - Professional branding

---

## 📊 Implementation Priority

### **Phase 1: Basic (Week 1)**
- [ ] Email settings page UI
- [ ] API endpoints (save, test, get)
- [ ] Simple provider templates (Outlook, Gmail)
- [ ] Password encryption
- [ ] Basic testing

### **Phase 2: Enhanced (Week 2)**
- [ ] Setup wizard with steps
- [ ] Video tutorials
- [ ] More provider templates
- [ ] Email preview
- [ ] Status dashboard

### **Phase 3: Polish (Week 3)**
- [ ] Troubleshooting guides
- [ ] Auto-detection of settings
- [ ] Email templates customization
- [ ] Analytics (emails sent/failed)

---

## 🎯 Success Metrics

**Easy Setup:**
- Average setup time < 3 minutes
- 90%+ success rate on first try
- Clear error messages

**Usage:**
- 80%+ of Pro users configure email
- 95%+ emails delivered successfully
- < 5% support tickets

---

## 💡 Marketing Copy

**For your Pro template sales page:**

```
✅ Receive Order Notifications
Configure your email in 2 minutes - no technical knowledge required!

• Works with Outlook, Gmail, Microsoft 365
• Get instant alerts when customers order
• Professional emails from YOUR business
• Test before going live

Setup takes less time than making coffee! ☕
```

---

## 🚀 Next Steps

1. **I'll build this for you** - Want me to create the email settings page?
2. **You can use fallback** - Platform email works until they configure
3. **Gradual rollout** - Launch with basic version, enhance later

**Which approach do you prefer?**


