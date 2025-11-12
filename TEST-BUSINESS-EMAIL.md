# 🧪 Test Business Owner Email Setup

## ✅ **Quick Test Guide**

Follow these steps to test the email notification system:

---

## 📝 **Test Checklist**

### **✅ Step 1: Login to Dashboard**
```
URL: http://localhost:3000/dashboard.html
Email: (your test account)
```

### **✅ Step 2: Find or Create Pro Site**
- Look for a site with "Plan: pro"
- Or create a new Pro site (Restaurant template)

### **✅ Step 3: Configure Email**
1. Click the **"📧 Email Setup"** button
2. Enter: `persylopez9@gmail.com`
3. Click OK
4. You should see: ✅ Email notifications configured!

### **✅ Step 4: Verify in Console**
Check server logs for:
```
Updated notification email for site abc123: persylopez9@gmail.com
```

### **✅ Step 5: Place Test Order**
1. Click "🌐 View" to open your site
2. Add items to cart
3. Go to checkout
4. Fill in customer details:
   - Name: Test Customer
   - Email: customer@example.com (or another Gmail)
   - Phone: 555-1234
5. Complete payment (use Stripe test card: 4242 4242 4242 4242)

### **✅ Step 6: Check Emails**
**Two emails should be sent:**

1. **Customer Receipt** → `customer@example.com`
   - Subject: ✅ Order Confirmation #ORD-xxxxx
   
2. **Business Owner Alert** → `persylopez9@gmail.com`
   - Subject: 🎉 New Order #ORD-xxxxx

---

## 🔍 **What to Verify**

### **Dashboard UI**
- [x] "📧 Email Setup" button appears for Pro sites only
- [x] Current email is pre-filled in modal
- [x] Email validation works
- [x] Success message appears after save

### **Backend**
- [x] `/api/sites/:siteId/notification-email` saves email
- [x] `/api/sites/:siteId/config.json` returns current email
- [x] `site.json` file updated with `notificationEmail` field
- [x] Order webhook uses notification email

### **Email Delivery**
- [x] Customer receives order confirmation
- [x] Business owner receives order alert
- [x] Both emails contain correct information
- [x] No errors in server logs

---

## 🐛 **Troubleshooting**

### **Button Not Showing**
```javascript
// Check if site has plan: 'pro'
const isProSite = site.plan === 'pro';
```

### **Email Not Saving**
```bash
# Check server logs:
Updated notification email for site abc123: (email)
```

### **Email Not Received**
1. Check spam folder
2. Verify Resend API key in `.env`
3. Check server logs for "✅ Email sent"
4. Review Resend dashboard for delivery status

### **Wrong Email Address**
1. Click "📧 Email Setup" again
2. Enter correct email
3. Save (it will update)

---

## 📊 **Expected Server Logs**

### **Saving Email**
```
Updated notification email for site abc123: persylopez9@gmail.com
```

### **Order Placed**
```
✅ Order confirmation sent to customer: customer@example.com
✅ Order alert sent to: persylopez9@gmail.com
```

### **No Email Configured**
```
⚠️ No notification email configured for site abc123
```

---

## 🎯 **Quick Test Command**

Run this to test all emails (including order notifications):
```bash
node test-all-emails.js
```

Expected output:
```
✅ Passed: 6/6
🎉 ALL TESTS PASSED!
```

---

## ✅ **Success Criteria**

You know it's working when:

1. ✅ Button appears in dashboard for Pro sites
2. ✅ Email can be saved and retrieved
3. ✅ `site.json` contains `notificationEmail` field
4. ✅ Customer receives order confirmation
5. ✅ Business owner receives order alert
6. ✅ No errors in server logs

---

## 🚀 **Next: Real World Test**

1. Create a real Pro site
2. Publish it
3. Share link with a friend
4. Have them place an order
5. Verify both emails arrive

---

**Ready to test?** Start with Step 1! 🎉

