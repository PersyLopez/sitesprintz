# 🌐 Ngrok Configuration Reference

**Last Updated:** November 16, 2025  
**Ngrok URL:** https://tenurial-subemarginate-fay.ngrok-free.dev

---

## ✅ What Was Updated

### `.env` File Changes:
```bash
# Added/Updated:
APP_URL=https://tenurial-subemarginate-fay.ngrok-free.dev
GOOGLE_CALLBACK_URL=https://tenurial-subemarginate-fay.ngrok-free.dev/auth/google/callback
ALLOWED_ORIGINS=http://localhost:3000,https://tenurial-subemarginate-fay.ngrok-free.dev
```

### Backup Created:
- Original `.env` backed up to `.env.backup`

---

## 🔧 External Services Configuration

### 1. Google OAuth (For Social Login)

**Google Cloud Console:** https://console.cloud.google.com

**Steps:**
1. Go to your project → Credentials
2. Click on your OAuth 2.0 Client ID
3. Under "Authorized redirect URIs", add:
   ```
   https://tenurial-subemarginate-fay.ngrok-free.dev/auth/google/callback
   ```
4. Save changes

**Test:**
- Visit: https://tenurial-subemarginate-fay.ngrok-free.dev/login
- Click "Sign in with Google"
- Should redirect to Google OAuth

---

### 2. Stripe Webhooks (For Payments)

**Stripe Dashboard:** https://dashboard.stripe.com/test/webhooks

**Steps:**
1. Click "Add endpoint"
2. Endpoint URL:
   ```
   https://tenurial-subemarginate-fay.ngrok-free.dev/api/webhooks/stripe
   ```
3. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Add endpoint
5. Copy the **Signing secret** (starts with `whsec_`)
6. Update `.env`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
   ```
7. Restart backend server

**Test:**
- Stripe Dashboard → Webhooks → Your endpoint
- Click "Send test webhook"
- Check server logs: `tail -f server.log`

---

### 3. Apple Sign In (If Configured)

**Apple Developer:** https://developer.apple.com

**Steps:**
1. Go to your Service ID
2. Update "Return URLs":
   ```
   https://tenuorial-subemarginate-fay.ngrok-free.dev/auth/apple/callback
   ```

---

## 🧪 Testing with Ngrok

### Test OAuth Flow:
```bash
# Open in browser:
https://tenurial-subemarginate-fay.ngrok-free.dev/login

# Click "Sign in with Google"
# Authorize app
# Should redirect back successfully
```

### Test Webhooks:
```bash
# 1. Make a test purchase with Stripe test card
# Card: 4242 4242 4242 4242

# 2. Watch server logs for webhook events
tail -f /Users/persylopez/sitesprintz/server.log | grep webhook

# 3. Check Stripe Dashboard for webhook delivery status
```

### Test From External Device:
```bash
# Access your app from phone/tablet:
https://tenurial-subemarginate-fay.ngrok-free.dev

# Note: You may see an ngrok warning page on first visit
# Click "Visit Site" to continue
```

---

## 📋 URLs Cheat Sheet

| Service | Local URL | Ngrok URL |
|---------|-----------|-----------|
| Frontend | http://localhost:5173 | N/A (use local) |
| Backend | http://localhost:3000 | https://tenurial-subemarginate-fay.ngrok-free.dev |
| Health Check | http://localhost:3000/health/live | https://tenurial-subemarginate-fay.ngrok-free.dev/health/live |
| Google OAuth | N/A | https://tenurial-subemarginate-fay.ngrok-free.dev/auth/google/callback |
| Stripe Webhook | N/A | https://tenurial-subemarginate-fay.ngrok-free.dev/api/webhooks/stripe |

---

## 🔄 Restarting with Ngrok

### If ngrok URL changes:
```bash
# 1. Get new ngrok URL
curl http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url'

# 2. Update .env
# Edit the script: update-env-ngrok.sh
# Change NGROK_URL variable to new URL
bash update-env-ngrok.sh

# 3. Restart backend
pkill -f "node server.js"
node server.js > server.log 2>&1 &

# 4. Update external services (Google, Stripe)
```

---

## 🚨 Troubleshooting

### Issue: OAuth redirect fails
**Solution:**
- Check Google Console has correct callback URL
- Check `.env` has `GOOGLE_CALLBACK_URL` set
- Restart backend server
- Check server logs for OAuth errors

### Issue: Webhooks not received
**Solution:**
- Check Stripe webhook endpoint is active
- Check ngrok is running: `curl http://localhost:4040/api/tunnels`
- Check webhook secret in `.env`
- View webhook attempts in Stripe Dashboard
- Check server logs: `grep webhook server.log`

### Issue: Ngrok "Browser Warning" page
**Solution:**
- This is normal for free ngrok accounts
- Click "Visit Site" to proceed
- Users will see this once per session
- Upgrade to ngrok Pro to remove warning

### Issue: Backend not using new env vars
**Solution:**
```bash
# 1. Kill backend
pkill -f "node server.js"

# 2. Verify .env updated
grep APP_URL .env

# 3. Restart backend
node server.js > server.log 2>&1 &

# 4. Check logs
tail -20 server.log
```

---

## 🛠 Quick Commands

```bash
# View ngrok dashboard (local)
open http://localhost:4040

# Check ngrok status
curl http://localhost:4040/api/tunnels | jq

# Test ngrok endpoint
curl https://tenurial-subemarginate-fay.ngrok-free.dev/health/live

# View real-time requests in ngrok
# Visit: http://localhost:4040

# Restart everything
pkill -f "node server.js"
pkill ngrok
node server.js > server.log 2>&1 &
ngrok http 3000 --log=stdout > ngrok.log 2>&1 &
```

---

## 📝 Notes

- **Ngrok Free Tier:** URL changes each time ngrok restarts
- **Persistent URL:** Requires ngrok paid plan ($8/mo)
- **Security:** Free ngrok URLs are publicly accessible
- **Rate Limits:** Free tier has 40 connections/minute limit
- **Sessions:** Ngrok free sessions expire after 2 hours (restart ngrok)

---

## ✅ Verification Checklist

Before testing OAuth/Webhooks:

- [ ] Ngrok is running and showing URL
- [ ] `.env` updated with ngrok URL
- [ ] Backend server restarted
- [ ] Google OAuth callback URL updated in console
- [ ] Stripe webhook endpoint added in dashboard
- [ ] Webhook signing secret in `.env`
- [ ] Can access: https://tenurial-subemarginate-fay.ngrok-free.dev/health/live
- [ ] Server logs show no errors

---

**Ready to Test!** 🚀

See `MANUAL-TESTING-PLAN.md` for detailed test scenarios.

