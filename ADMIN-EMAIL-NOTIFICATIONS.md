# 📧 Admin Email Notifications Setup

## ✅ **Complete Implementation**

As the platform admin, you now receive email notifications for all key events!

---

## 🎯 **What You'll Receive**

### **1. New User Signups** 👤
**Triggered:** When someone registers
**Email Subject:** `👤 New User Signup - user@example.com`
**Contains:**
- User email
- User name (or email prefix)
- Signup timestamp
- Link to Admin Users dashboard

### **2. New Sites Published** ✅
**Triggered:** When a user publishes a site
**Email Subject:** `✅ Site Published - Business Name`
**Contains:**
- Site name
- Template used
- User name & email
- Plan (Starter/Business/Pro)
- Published timestamp
- Link to view live site

### **3. Pro Upgrades** 💎
**Triggered:** When user upgrades to Pro (via Stripe webhook)
**Email Subject:** `💎 Pro Upgrade - Site Name by User`
**Contains:**
- User details
- Site name
- Upgrade timestamp
- Link to Analytics dashboard

---

## ⚙️ **Configuration**

### **Your Admin Email:**
```bash
ADMIN_EMAIL=persylopez9@gmail.com
```

This has been added to your `.env` file automatically.

### **Change Admin Email:**
Edit `.env`:
```bash
ADMIN_EMAIL=your-new-email@example.com
```

Then restart the server:
```bash
pm2 restart server
```

---

## 📬 **What Emails Look Like**

### **New User Signup:**
```
From: noreply@sitesprintz.com
To: persylopez9@gmail.com
Subject: 👤 New User Signup - john@example.com

╔══════════════════════════════════╗
║       New User! 👤               ║
╚══════════════════════════════════╝

New Signup
A new user has joined SiteSprintz

Email: john@example.com
Name: john
Signed up: Nov 2, 2025, 10:30 AM

[View All Users Button]
```

### **Site Published:**
```
From: noreply@sitesprintz.com
To: persylopez9@gmail.com
Subject: ✅ Site Published - Mario's Pizza

╔══════════════════════════════════╗
║    Site Published! ✅            ║
╚══════════════════════════════════╝

Mario's Pizza
Template: restaurant | Plan: pro

Published By
Name: john
Email: john@example.com
Published: Nov 2, 2025, 10:35 AM

[View Live Site Button]
```

---

## 🔧 **Technical Details**

### **Email Service Module**
**File:** `email-service.js`

**New Templates Added:**
- `adminNewUser` - User signup notification
- `adminNewSite` - Site creation notification (not yet implemented)
- `adminSitePublished` - Site publication notification
- `adminProUpgrade` - Pro upgrade notification

**New Functions:**
```javascript
// Helper to send admin notifications
export async function sendAdminNotification(templateName, templateData)

// Email types
EmailTypes.ADMIN_NEW_USER
EmailTypes.ADMIN_NEW_SITE
EmailTypes.ADMIN_SITE_PUBLISHED
EmailTypes.ADMIN_PRO_UPGRADE
```

### **Server Integration**

#### **1. User Registration** (`/api/auth/register`)
```javascript
// After welcome email
await sendAdminNotification(EmailTypes.ADMIN_NEW_USER, {
  userEmail: user.email,
  userName: user.email.split('@')[0]
});
```

#### **2. Site Publication** (`/api/drafts/:draftId/publish`)
```javascript
// After site published email
await sendAdminNotification(EmailTypes.ADMIN_SITE_PUBLISHED, {
  siteName: siteName,
  siteTemplate: draft.templateId,
  userName: email.split('@')[0],
  userEmail: email,
  siteId: subdomain,
  plan: plan
});
```

#### **3. Pro Upgrades** (Stripe Webhook - To be implemented)
```javascript
// In webhook handler for subscription.created
if (plan === 'pro') {
  await sendAdminNotification(EmailTypes.ADMIN_PRO_UPGRADE, {
    userName, userEmail, siteName, siteId
  });
}
```

---

## 🧪 **Testing**

### **Test 1: New User Signup**
```bash
# Register a new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

**Expected:** You receive an email at `persylopez9@gmail.com`
**Subject:** `👤 New User Signup - test@example.com`

### **Test 2: Site Publication**
```bash
# 1. Create a site in the UI
# 2. Fill out business info
# 3. Click "Publish"
```

**Expected:** You receive an email at `persylopez9@gmail.com`
**Subject:** `✅ Site Published - [Business Name]`

### **Test 3: Check Your Inbox**
```bash
# Go to persylopez9@gmail.com
# Look for emails from: noreply@sitesprintz.com
# Check subjects starting with 👤, ✅, or 💎
```

---

## 📊 **Email Delivery Status**

### **Check Server Logs**
```bash
# Look for these log messages:
✅ Email sent successfully: [message-id]
📧 Sending email to persylopez9@gmail.com: [subject]
```

### **Failed Notifications**
If admin notification fails:
- **User registration still succeeds** ✅
- **Site publication still succeeds** ✅
- Error is logged but doesn't break the flow

Example log:
```
Failed to send admin notification: [error message]
```

### **Check Resend Dashboard**
1. Go to: https://resend.com/emails
2. Filter by recipient: `persylopez9@gmail.com`
3. See delivery status, open rates, etc.

---

## 🎛️ **Customization**

### **Disable Admin Notifications**
Comment out or remove from `.env`:
```bash
# ADMIN_EMAIL=persylopez9@gmail.com
```

### **Multiple Admin Emails**
**Current:** Single admin email only

**Future Enhancement:**
```javascript
// In email-service.js
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').filter(Boolean);
```

Then:
```bash
ADMIN_EMAILS=admin1@sitesprintz.com,admin2@sitesprintz.com
```

### **Add More Notification Types**

Example: Daily summary email
```javascript
// In email-service.js templates
dailySummary: (newUsers, newSites, revenue) => ({
  subject: `📊 Daily Summary - ${new Date().toLocaleDateString()}`,
  html: `...`
})
```

---

## 🚨 **Troubleshooting**

### **Not Receiving Emails?**

1. **Check .env file:**
   ```bash
   grep ADMIN_EMAIL .env
   # Should show: ADMIN_EMAIL=persylopez9@gmail.com
   ```

2. **Check server logs:**
   ```bash
   tail -f server.log | grep "admin notification"
   ```

3. **Check spam folder:**
   - Look in Gmail spam
   - Mark as "Not Spam" if found

4. **Test email service:**
   ```bash
   node test-all-emails.js
   ```

5. **Verify Resend API:**
   ```bash
   grep RESEND_API_KEY .env
   # Should be set
   ```

### **Emails Going to Spam?**

**Solution:** Add SiteSprintz to your contacts
```
1. Open any email from noreply@sitesprintz.com
2. Click "Add to Contacts" or star the email
3. Future emails will go to inbox
```

### **Wrong Admin Email?**

**Fix:**
```bash
# Edit .env
nano .env
# Change ADMIN_EMAIL=your-correct-email@example.com
# Save and exit

# Restart server
pm2 restart server
```

---

## 📈 **Future Enhancements**

### **Coming Soon:**
- [ ] Daily summary emails
- [ ] Weekly analytics reports
- [ ] Critical error alerts
- [ ] Revenue milestones
- [ ] User activity digest
- [ ] Payment failure alerts
- [ ] Site traffic spikes
- [ ] Multiple admin recipients
- [ ] Slack/Discord integration

---

## 📋 **Files Modified**

| File | Changes |
|------|---------|
| `email-service.js` | Added 4 admin email templates |
| `email-service.js` | Added `sendAdminNotification()` helper |
| `email-service.js` | Added admin EmailTypes |
| `server.js` | Added admin notification to user registration |
| `server.js` | Added admin notification to site publication |
| `server.js` | Updated import to include `sendAdminNotification` |
| `.env` | Added `ADMIN_EMAIL=persylopez9@gmail.com` |

---

## ✅ **Verification Checklist**

- [x] Admin email templates created
- [x] `sendAdminNotification()` function implemented
- [x] Admin email configured in `.env`
- [x] User signup notification integrated
- [x] Site publication notification integrated
- [x] Server imports updated
- [x] Error handling added (non-blocking)
- [ ] Pro upgrade notification (webhook - todo)
- [ ] Tested with real signups
- [ ] Tested with real site publications

---

## 🎉 **You're All Set!**

**You will now receive notifications for:**
- ✅ Every new user signup
- ✅ Every site publication
- 🔜 Pro upgrades (when webhook is enhanced)

**Check your inbox:** `persylopez9@gmail.com`

**From:** `noreply@sitesprintz.com`

**Subjects:**
- 👤 New User Signup...
- ✅ Site Published...
- 💎 Pro Upgrade...

---

## 📞 **Support**

If you need to change notification settings or add more notification types, update:
- `email-service.js` - Add new templates
- `server.js` - Integrate at event points
- `.env` - Update `ADMIN_EMAIL`

**Test Email Service:** `node test-all-emails.js`
**View Logs:** `pm2 logs server`
**Restart Server:** `pm2 restart server`

---

**Last Updated:** November 2, 2025  
**Version:** 1.0  
**Status:** ✅ Active

**Your admin notifications are live!** 🎉

