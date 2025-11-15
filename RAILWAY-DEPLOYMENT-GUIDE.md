# 🚀 Railway Deployment Guide - 15 Minutes to Production

**Repository:** https://github.com/PersyLopez/sitesprintz  
**Platform:** Railway.app (Recommended)  
**Time:** 15 minutes from start to live!

---

## ✅ PREREQUISITES (Already Done!)

- ✅ GitHub repo: sitesprintz
- ✅ All deployment files created:
  - ✅ Dockerfile
  - ✅ railway.json
  - ✅ Procfile
  - ✅ .dockerignore
  - ✅ Updated package.json
- ✅ Environment variables documented
- ✅ Integrations configured (Stripe, Resend, Database)

---

## 🚀 DEPLOYMENT STEPS

### **Step 1: Sign Up for Railway (2 minutes)**

1. Go to: https://railway.app
2. Click **"Login with GitHub"**
3. Authorize Railway to access your repositories
4. Railway gives you **$5 free credit** (good for testing!)

---

###**Step 2: Create New Project (1 minute)**

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose **"sitesprintz"** repository
4. Railway auto-detects:
   - ✅ Node.js project
   - ✅ Dockerfile (will use this)
   - ✅ Build configuration

---

### **Step 3: Add Environment Variables (5 minutes)**

In Railway dashboard:

1. Click your project
2. Go to **"Variables"** tab
3. Click **"+ New Variable"** for each:

```bash
NODE_ENV=production
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
ADMIN_TOKEN=your-secure-admin-token

# URLs (Railway will provide the domain, use that or your custom domain)
BASE_URL=https://sitesprintz.com
SITE_URL=https://sitesprintz.com
FRONTEND_URL=https://sitesprintz.com

# Database
DATABASE_URL=postgresql://neondb_owner:npg_EuHrPY06FInJ@ep-green-shape-ahiippn7-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require

# Stripe
STRIPE_SECRET_KEY=sk_test_51SNKsx1toLbCZloXr6NJ3aVTvs1enifJq8ZJ59lDigDWGIJpKqFigYrTBhvfH0Sxf38U4E6D7BBTfybaEaQpiGbi004BuFBBez
STRIPE_PUBLISHABLE_KEY=pk_test_51SNKsx1toLbCZloXFXmPfC62j933CE9PoWMipTpAEORo4oPiG60gwssmhtdMS9416dc7IvRHJqzOYY3OCq2yFCQn00A4ZXWedy
STRIPE_WEBHOOK_SECRET=whsec_ehVpkdXD9zOqtfynPwjF3aULlaFZ1Ywk

# Email
RESEND_API_KEY=re_D8VRavXh_7UnsrukXcJaRJuE2uhqioU9U
FROM_EMAIL=noreply@sitesprintz.com
FROM_NAME=SiteSprintz
ADMIN_EMAIL=persylopez9@gmail.com

# Google OAuth (optional)
GOOGLE_CLIENT_ID=121242067249-7jiqr5qc0s0c91f1fcdep1b4raru24rk.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_CALLBACK_URL=https://sitesprintz.com/auth/google/callback

# CORS
ALLOWED_ORIGINS=https://sitesprintz.com,https://www.sitesprintz.com
```

**Tip:** Click **"Raw Editor"** to paste all at once!

---

### **Step 4: Deploy (2 minutes)**

Railway automatically:
1. ✅ Builds Docker image
2. ✅ Installs dependencies
3. ✅ Generates Prisma client
4. ✅ Builds frontend (vite build)
5. ✅ Runs database migrations
6. ✅ Starts server
7. ✅ Generates HTTPS URL

**Watch the build logs** in real-time!

---

### **Step 5: Get Your Railway URL (30 seconds)**

After deployment succeeds:

1. Go to **"Settings"** tab
2. Under **"Domains"**, you'll see:
   ```
   sitesprintz-production.up.railway.app
   ```
3. Click it to test your app!

**Test:** Register a user, check if email arrives

---

### **Step 6: Add Custom Domain (3 minutes)**

1. In Railway **"Settings"** → **"Domains"**
2. Click **"+ Custom Domain"**
3. Enter: `sitesprintz.com`
4. Railway shows you DNS records:

```
Type: CNAME
Name: @ (or www)
Value: sitesprintz-production.up.railway.app
```

5. Go to your AWS Route53 (or domain registrar)
6. Add the CNAME record
7. Wait 5-10 minutes for DNS propagation
8. Railway automatically provisions SSL certificate!

---

### **Step 7: Configure Auto-Deployments (30 seconds)**

Railway automatically deploys on every git push!

**To deploy updates:**
```bash
git add .
git commit -m "Update feature"
git push origin main

# Railway automatically deploys! 🚀
```

---

## ✅ VERIFICATION CHECKLIST

After deployment, test these:

**Basic Functionality:**
- [ ] Visit https://sitesprintz.com (or Railway URL)
- [ ] Site loads without errors
- [ ] Register new account
- [ ] Welcome email arrives
- [ ] Login works
- [ ] Dashboard loads

**Payment Flow:**
- [ ] Click "Upgrade to Starter"
- [ ] Checkout page loads
- [ ] Use test card: 4242 4242 4242 4242
- [ ] Payment completes
- [ ] Redirected to dashboard
- [ ] User tier updates to "starter"
- [ ] Confirmation email arrives

**Check Webhooks:**
- [ ] Go to Stripe Dashboard → Webhooks
- [ ] Check webhook deliveries
- [ ] Should show successful 200 responses

**Check Logs:**
- [ ] In Railway, go to "Deployments" → "View Logs"
- [ ] Look for errors
- [ ] Should see successful server start

---

## 🎯 EXPECTED RESULTS

**After successful deployment:**

```
✅ App live at: https://sitesprintz.com
✅ Automatic HTTPS/SSL
✅ Database connected (Neon)
✅ Emails sending (Resend)
✅ Payments working (Stripe)
✅ Auto-deploy on git push
✅ Built-in monitoring
✅ Logs accessible
✅ Zero downtime deploys
```

---

## 💰 COST

**Railway Pricing:**
- **Free:** $5/month credit (good for 1-2 months light usage)
- **Usage-based after:** ~$10-20/month
  - ~$5 for compute (512MB RAM, 0.5 vCPU)
  - ~$5 for bandwidth
- **No surprise bills:** Can set spending limits

**Total Stack Cost:**
- Railway: $10-20/month
- Neon DB: Free tier (1GB)
- Resend: Free (3K emails/mo)
- Stripe: Per transaction

**Total: ~$10-20/month** 🎉

---

## 📊 MONITORING

**Railway Dashboard:**
- CPU usage
- Memory usage
- Request metrics
- Response times
- Error rates
- Deployment history

**View Logs:**
```
Railway Dashboard → Deployments → View Logs
```

**Metrics:**
```
Railway Dashboard → Metrics
```

---

## 🔄 UPDATING YOUR APP

**Method 1: Git Push (Automatic)**
```bash
# Make changes
git add .
git commit -m "Add new feature"
git push

# Railway auto-deploys! No manual steps!
```

**Method 2: Manual Deploy**
```
Railway Dashboard → Deployments → Redeploy
```

**Method 3: Rollback**
```
Railway Dashboard → Deployments → Previous Version → Redeploy
```

---

## 🆘 TROUBLESHOOTING

### **Build Fails?**

**Check:**
1. View build logs in Railway
2. Verify all dependencies in package.json
3. Check Dockerfile syntax
4. Verify Prisma schema

**Common Fix:**
```bash
# Test build locally first
docker build -t sitesprintz .
docker run -p 3000:3000 sitesprintz
```

---

### **App Crashes on Start?**

**Check:**
1. Environment variables set correctly
2. DATABASE_URL has `?sslmode=require`
3. PORT is set to 3000
4. View runtime logs for errors

**Debug:**
```
Railway Dashboard → View Logs
Look for error messages
```

---

### **Webhook Not Working?**

**Check:**
1. STRIPE_WEBHOOK_SECRET matches Stripe dashboard
2. Webhook URL is https://sitesprintz.com/api/webhooks/stripe
3. Railway app is running (check logs)
4. Check Stripe webhook logs

---

### **Database Connection Error?**

**Check:**
1. DATABASE_URL is correct
2. Includes `?sslmode=require`
3. Neon database is active
4. Connection pool not exhausted

---

## 🎓 ADVANCED FEATURES

### **Add More Resources**

```
Railway Dashboard → Settings → Resources
- Increase RAM (512MB → 1GB)
- Increase CPU (0.5 → 1 vCPU)
```

### **Add Health Checks**

Already configured in `railway.json`:
```json
{
  "healthcheck": {
    "path": "/api/health",
    "timeout": 100,
    "interval": 60
  }
}
```

You need to add the health check endpoint in server.js:
```javascript
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});
```

### **Setup Monitoring Alerts**

```
Railway Dashboard → Settings → Notifications
- Discord webhook
- Email alerts
- Slack integration
```

---

## 📈 SCALING

**Current Setup:** Single instance (~100-1000 users)

**When to Scale:**
- Response times > 1 second
- CPU usage > 70%
- Memory usage > 80%

**How to Scale:**
1. Increase resources in Railway
2. Enable horizontal scaling (multiple instances)
3. Add Redis for caching
4. Add CDN for static assets

**Or migrate to AWS when:**
- 10,000+ users
- Need multi-region
- Budget > $200/month

---

## ✅ DEPLOYMENT CHECKLIST

**Before First Deploy:**
- [x] All deployment files created
- [x] GitHub repo ready
- [x] Environment variables documented
- [ ] Railway account created
- [ ] Project created in Railway
- [ ] Environment variables added
- [ ] First deployment successful
- [ ] Custom domain configured
- [ ] SSL certificate issued
- [ ] All tests passing

**After Deploy:**
- [ ] Register test user
- [ ] Test subscription flow
- [ ] Verify emails sending
- [ ] Check webhook logs
- [ ] Test site creation
- [ ] Test all templates
- [ ] Monitor for 24 hours
- [ ] Invite beta users

---

## 🎉 SUCCESS!

**Once deployed, you have:**

✅ Production app live at sitesprintz.com  
✅ Automatic HTTPS with free SSL  
✅ Auto-deploy on every git push  
✅ Built-in monitoring and logs  
✅ Database migrations automatic  
✅ Zero-downtime deployments  
✅ Easy rollbacks if needed  
✅ Professional infrastructure  

**Time to deploy:** 15 minutes  
**Monthly cost:** $10-20  
**Complexity:** Zero  
**Maintenance:** Minimal  

---

## 📞 SUPPORT RESOURCES

**Railway:**
- Docs: https://docs.railway.app
- Discord: https://discord.gg/railway
- Status: https://railway.statuspage.io

**Your Stack:**
- Neon: https://neon.tech/docs
- Stripe: https://stripe.com/docs
- Resend: https://resend.com/docs

---

**Ready to deploy? It's just 15 minutes away!** 🚀

**Next:** Create Railway account and follow steps 1-7!

