# 🚀 Deploy SiteSprintz for Testing

**Goal:** Get your site online with a public URL for testing payments and webhooks.

---

## ⚡ **Fastest Method: ngrok (2 minutes)**

### **Step 1: Install ngrok**
```bash
# Mac
brew install ngrok

# Or download from: https://ngrok.com/download
```

### **Step 2: Start Your Server**
```bash
cd /Users/admin/active-directory-website
node server.js
```

Keep this terminal running!

### **Step 3: Expose to Internet**

**In a NEW terminal:**
```bash
ngrok http 3000
```

**You'll see something like:**
```
Forwarding    https://abc123.ngrok.io -> http://localhost:3000
```

✅ **Your site is now live!** `https://abc123.ngrok.io`

### **Step 4: Update Stripe Webhook**

1. Copy your ngrok URL (e.g., `https://abc123.ngrok.io`)
2. Go to: https://dashboard.stripe.com/test/webhooks
3. Click "+ Add endpoint"
4. Endpoint URL: `https://abc123.ngrok.io/api/webhooks/stripe`
5. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
6. Click "Add endpoint"
7. **Copy the webhook signing secret**

### **Step 5: Add Webhook Secret**

**In your `.env` file:**
```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxx  # Paste the secret you copied
SITE_URL=https://abc123.ngrok.io   # Add your ngrok URL
```

### **Step 6: Restart Server**
```bash
# Stop server (Ctrl+C)
# Start again:
node server.js
```

### **Step 7: Test It!**

1. Visit your ngrok URL: `https://abc123.ngrok.io`
2. Click "Subscribe Now"
3. Use test card: `4242 4242 4242 4242`
4. Complete payment
5. Check webhook events in Stripe Dashboard
6. Check your email for confirmation!

✅ **Everything should work including webhooks!**

---

## 📱 **Test on Your Phone**

Since ngrok gives you a public URL, you can:
- Open it on your phone
- Share it with friends for feedback
- Test mobile responsiveness
- Test checkout flow on mobile

---

## ⏰ **How Long Does ngrok Last?**

**Free tier:**
- URL stays active as long as ngrok is running
- If you stop ngrok and restart, you get a new URL
- Perfect for testing sessions

**Paid tier ($8/month):**
- Custom subdomain (e.g., `sitesprintz.ngrok.io`)
- URL stays the same even after restart

---

## 🛑 **When You're Done Testing**

1. Stop ngrok: `Ctrl+C` in ngrok terminal
2. Stop server: `Ctrl+C` in server terminal
3. Your site is offline again

---

## 🌐 **Want Permanent Hosting?**

If you like how it works and want to keep it online permanently, check out:

### **Option A: Railway (Recommended)**
- Free tier with 500 hours/month
- PostgreSQL included
- Easy deployment
- See: `DEPLOY-RAILWAY.md`

### **Option B: Render**
- Free tier available
- PostgreSQL included
- Auto-deploys from GitHub
- See: `DEPLOY-RENDER.md`

---

## 🎯 **ngrok Pro Tips**

### **Keep Same URL (Paid)**
```bash
ngrok http 3000 --subdomain=sitesprintz
# Your URL: https://sitesprintz.ngrok.io
```

### **View Requests**
Open: `http://localhost:4040`
- See all HTTP requests
- Debug webhook calls
- Replay requests

### **Custom Domain (Paid)**
```bash
ngrok http 3000 --hostname=test.sitesprintz.com
```

---

## ✅ **Testing Checklist**

Once online, test:

- [ ] Homepage loads
- [ ] Can sign up
- [ ] Can log in
- [ ] Pricing buttons work
- [ ] Stripe checkout opens
- [ ] Payment completes
- [ ] Success page shows
- [ ] Webhook fires in Stripe
- [ ] Subscription activates
- [ ] Dashboard shows subscription
- [ ] Can create site
- [ ] Can publish site
- [ ] Emails are received
- [ ] Mobile works

---

## 🚨 **Important Notes**

### **For Testing:**
- Use Stripe test mode
- Use test cards
- Don't share ngrok URL publicly (it's temporary)

### **For Production:**
- Use proper hosting (Railway/Render/DigitalOcean)
- Use Stripe live mode
- Use custom domain
- Set up monitoring

---

## 📞 **Need Help?**

**Common Issues:**

1. **"This site can't be reached"**
   - Make sure server is running
   - Make sure ngrok is running
   - Check ngrok URL is correct

2. **"Webhook Error"**
   - Update `STRIPE_WEBHOOK_SECRET` in `.env`
   - Restart server after updating `.env`
   - Check webhook endpoint URL in Stripe

3. **"Port 3000 is already in use"**
   ```bash
   # Find and kill the process
   lsof -ti:3000 | xargs kill -9
   # Then start server again
   ```

---

## 🎉 **You're Ready!**

Run these commands to go live in 2 minutes:

```bash
# Terminal 1
cd /Users/admin/active-directory-website
node server.js

# Terminal 2
ngrok http 3000
```

Copy the `https://xxxxx.ngrok.io` URL and start testing! 🚀

---

**Last Updated:** November 2, 2025  
**Method:** ngrok tunnel  
**Time Required:** 2 minutes  
**Cost:** Free

