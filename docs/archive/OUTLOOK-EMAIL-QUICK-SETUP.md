# ✅ Outlook Email - 5-Minute Setup Checklist

**Get order notifications working with your Outlook email!**

---

## 📋 Quick Setup (5 minutes)

### **Step 1: Get App Password from Outlook** (2 min)

1. Go to: https://account.microsoft.com/security
2. Click **"Advanced security options"**
3. Scroll to **"App passwords"**
4. Click **"Create a new app password"**
5. Copy the password shown (you can't see it again!)

**Example:** `abcd efgh ijkl mnop`

---

### **Step 2: Install Nodemailer** (30 sec)

```bash
npm install nodemailer
```

---

### **Step 3: Update .env File** (1 min)

Add these lines to your `.env` file:

```env
# Outlook Email Configuration
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=abcd efgh ijkl mnop
FROM_EMAIL=your-email@outlook.com
FROM_NAME=SiteSprintz
```

**Replace:**
- `your-email@outlook.com` → Your actual Outlook email
- `abcd efgh ijkl mnop` → Your App Password from Step 1

**Microsoft 365 Business?** Use this instead:
```env
SMTP_HOST=smtp.office365.com
SMTP_USER=noreply@yourdomain.com
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Your Business Name
```

---

### **Step 4: Update server.js** (30 sec)

Open `server.js`, find line ~13, and change:

```javascript
// OLD:
import { sendEmail, EmailTypes } from './email-service.js';

// NEW:
import { sendEmail, EmailTypes } from './email-service-smtp.js';
```

**Save the file!**

---

### **Step 5: Test Email** (1 min)

```bash
node test-email-outlook.js your-email@outlook.com
```

**Expected output:**
```
✅ Welcome email sent successfully!
✅ Order confirmation sent successfully!
✅ New order alert sent successfully!
🎉 Your Outlook email is configured correctly!
```

**Check your inbox!** (Check spam folder too)

---

### **Step 6: Restart Server** (10 sec)

```bash
# Stop server: Ctrl+C
npm start
```

---

## ✅ **Done! Test with Real Order**

1. Create a Pro site
2. Add products
3. Place test order (use card: `4242 4242 4242 4242`)
4. **Check your email for order notification!** 📧

---

## 🚨 Troubleshooting

### **"Authentication failed"**
→ Use App Password, not your regular password  
→ Create App Password at: https://account.microsoft.com/security

### **"No emails received"**
→ Check spam folder  
→ Check SMTP_USER matches FROM_EMAIL  
→ Try sending test email again

### **"Connection timeout"**
→ Port 587 might be blocked  
→ Try changing SMTP_PORT=25 in .env

### **"535 Authentication failed"**
→ Wrong App Password  
→ Create new App Password and try again

### **"Daily limit exceeded"**
→ Outlook.com has 300 emails/day limit  
→ Wait 24 hours or consider Resend for higher volume

---

## 📊 Quick Reference

### **Outlook.com (Free)**
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=yourname@outlook.com
```
**Limit:** 300 emails/day

### **Microsoft 365 Business**
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=you@yourcompany.com
```
**Limit:** 10,000 emails/day

### **Gmail (Alternative)**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourname@gmail.com
```
**Limit:** 500 emails/day  
**App Password:** https://myaccount.google.com/apppasswords

---

## 🎯 Files You Created

- ✅ `email-service-smtp.js` - SMTP email service
- ✅ `test-email-outlook.js` - Test script
- ✅ Updated `.env` - Email configuration
- ✅ Updated `server.js` - Import changed

---

## 📧 What Emails Are Sent?

**1. Welcome Email** - When user signs up  
**2. Order Confirmation** - To customer after order  
**3. New Order Alert** - To business owner when order received  
**4. Site Published** - When site goes live  
**5. Contact Form** - When someone submits contact form  

**All emails will come from your Outlook account!**

---

## 💡 Pro Tips

**1. Use a dedicated email:**
```
orders@yourdomain.com  (if you have Microsoft 365)
or
yourbusiness@outlook.com  (free Outlook account)
```

**2. Set up email forwarding:**
Forward order emails to your personal email so you never miss one!

**3. Test regularly:**
```bash
node test-email-outlook.js
```

**4. Monitor daily limit:**
Outlook.com: 300/day is usually plenty for small businesses  
Exceeding? Consider Resend for production

---

## ✅ Verification Checklist

- [ ] App Password created
- [ ] Nodemailer installed (`npm install nodemailer`)
- [ ] .env updated with SMTP settings
- [ ] server.js import changed to email-service-smtp.js
- [ ] Test script run successfully
- [ ] Test emails received (check spam!)
- [ ] Server restarted
- [ ] Real order test completed
- [ ] Order emails received

**All checked?** → **You're ready to go!** 🚀

---

## 🆘 Still Having Issues?

**Run diagnostics:**
```bash
# Test email configuration
node test-email-outlook.js

# Check .env loaded correctly
node -e "require('dotenv').config(); console.log(process.env.SMTP_USER)"
```

**Common mistakes:**
- ❌ Using regular password instead of App Password
- ❌ Typo in .env (SMTP_USER vs SMTP_PASS)
- ❌ Forgot to restart server after changes
- ❌ FROM_EMAIL doesn't match SMTP_USER

---

**Need more help?** Check:
- `EMAIL-SETUP-OUTLOOK.md` - Detailed guide
- `test-email-outlook.js` - Test script with diagnostics
- `email-service-smtp.js` - Email service code

**Still stuck?** The test script provides specific error messages to help debug!


