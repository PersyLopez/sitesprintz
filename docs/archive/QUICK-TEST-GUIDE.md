# 🧪 Quick Test Guide - SiteSprintz

## Live Test URL
```
https://tenurial-subemarginate-fay.ngrok-free.dev
```

---

## ⚡ Quick Tests (60 seconds)

### 1️⃣ **Homepage Loads** (5 sec)
```
✅ Visit homepage
✅ Check all sections appear
✅ No console errors
```

### 2️⃣ **Navigation Works** (10 sec)
```
✅ Click "Templates" → Scrolls to templates
✅ Click "Pricing" → Scrolls to pricing
✅ Click "Login" → Goes to login page
✅ Click "Start Free" → Goes to setup page
```

### 3️⃣ **Free Trial Flow** (15 sec)
```
✅ Click "Start Free Trial" in pricing
✅ Redirects to /setup.html
✅ Can select templates
```

### 4️⃣ **Subscription Flow - New User** (30 sec)
```
✅ Homepage → Click "Subscribe Now" (Starter)
✅ Redirects to /register.html?plan=starter
✅ Shows plan badge: "📦 Selected: Starter Plan - $10/month"
✅ Register new account
✅ Auto-redirects to Stripe Checkout
✅ Use test card: 4242 4242 4242 4242
✅ Complete payment
✅ Success page appears
```

### 5️⃣ **Subscription Flow - Existing User** (20 sec)
```
✅ Log in first
✅ Go to homepage
✅ Click "Subscribe Now" (Pro)
✅ Button shows "Loading..."
✅ Redirects directly to Stripe Checkout
✅ Complete payment
✅ Check dashboard - subscription active
```

---

## 🎯 Critical Paths to Test

### **Path 1: New User → Paid Plan**
```
Homepage → Pricing → Subscribe → Register → Checkout → Payment → Success
Expected time: ~2 minutes
```

### **Path 2: Existing User → Upgrade**
```
Login → Homepage → Pricing → Subscribe → Checkout → Payment → Success
Expected time: ~1 minute
```

### **Path 3: Free Trial**
```
Homepage → Start Free → Setup → Choose Template → Build Site
Expected time: ~30 seconds
```

---

## 🔍 What to Check

### **Visual Checks**
- ✅ All buttons clickable
- ✅ No layout issues
- ✅ Text readable
- ✅ Images load
- ✅ Animations smooth

### **Functional Checks**
- ✅ Buttons respond on click
- ✅ Forms submit correctly
- ✅ Redirects work
- ✅ Payment flow completes
- ✅ Webhooks fire

### **Console Checks (F12)**
- ✅ No JavaScript errors (red text)
- ✅ API calls return 200 OK
- ✅ No 404s

---

## 🧪 Stripe Test Cards

```
✅ Success: 4242 4242 4242 4242
❌ Decline: 4000 0000 0000 0002
⏰ Auth Required: 4000 0025 0000 3155

Expiry: Any future date (e.g., 12/25)
CVC: Any 3 digits (e.g., 123)
ZIP: Any 5 digits (e.g., 12345)
```

---

## 📊 Quick Status Check

### **Server**
```bash
# Check if server is running
curl http://localhost:3000

# Check logs
tail -20 /Users/admin/active-directory-website/server.log
```

### **ngrok**
```bash
# Check ngrok status
curl http://localhost:4040/api/tunnels

# Or visit
http://localhost:4040
```

### **Database**
```bash
# Check if PostgreSQL is running
ps aux | grep postgres
```

---

## 🚨 If Something Breaks

### **Server Not Responding**
```bash
cd /Users/admin/active-directory-website
pkill -f "node server.js"
node server.js &
```

### **ngrok Not Working**
```bash
pkill ngrok
ngrok http 3000 &
sleep 5
cat ngrok.log | grep "url="
```

### **Payment Not Working**
1. Check Stripe keys in `.env`
2. Check webhook secret is correct
3. Check webhook endpoint in Stripe Dashboard
4. Check server logs for errors

### **Webhook Not Firing**
1. Go to Stripe Dashboard → Webhooks
2. Click on your endpoint
3. Check "Events" tab
4. Click "Send test webhook"

---

## ✅ Success Checklist

Before considering testing complete:

- [ ] Homepage loads without errors
- [ ] All navigation links work
- [ ] Free trial flow completes
- [ ] New user can subscribe to Starter plan
- [ ] New user can subscribe to Pro plan
- [ ] Existing user can upgrade to Starter
- [ ] Existing user can upgrade to Pro
- [ ] Stripe checkout appears correctly
- [ ] Test payment completes
- [ ] Webhook updates subscription status
- [ ] User dashboard shows active subscription
- [ ] Email notifications sent (optional)

---

## 📱 Mobile Testing (Optional)

1. Visit ngrok URL on your phone
2. Test all the same flows
3. Check responsive design
4. Verify buttons are tappable
5. Confirm forms work on mobile keyboard

---

## 🎉 Expected Results

### **All Working** ✅
- No console errors
- All buttons respond
- Payments complete successfully
- Webhooks update database
- Users can access paid features

### **Ready for Production** 🚀
- All test cases pass
- No critical bugs
- User experience smooth
- Payment flow reliable

---

## 📞 Quick Reference

| Item | Value |
|------|-------|
| **Public URL** | https://tenurial-subemarginate-fay.ngrok-free.dev |
| **ngrok Dashboard** | http://localhost:4040 |
| **Server Port** | 3000 |
| **Test Card** | 4242 4242 4242 4242 |
| **Admin Email** | persy@sitesprintz.com |
| **Webhook Endpoint** | https://tenurial-subemarginate-fay.ngrok-free.dev/api/webhooks/stripe |

---

## 🏁 Done Testing?

If all tests pass:
1. ✅ Document any issues found
2. ✅ Fix critical bugs
3. ✅ Re-test fixed items
4. ✅ Get approval for production
5. ✅ Switch to live Stripe keys
6. ✅ Update production URLs
7. ✅ Ship it! 🚀

**Happy Testing!** 🎯
