# 🚢 Railway Deployment

**Time:** 15 minutes  
**Cost:** $10-20/month

---

## Quick Deploy

### **1. Create Account**
- https://railway.app
- Login with GitHub

### **2. Create Project**
- "New Project" → "Deploy from GitHub"
- Select `sitesprintz` repo
- Auto-detects: Node.js + Docker + Prisma

### **3. Environment Variables**

Click "Variables" and add:

```bash
NODE_ENV=production
PORT=3000
JWT_SECRET=your-secret-32-chars-minimum
ADMIN_TOKEN=your-admin-token

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

# URLs
BASE_URL=https://sitesprintz.com
SITE_URL=https://sitesprintz.com
FRONTEND_URL=https://sitesprintz.com
```

### **4. Deploy**
- Railway builds automatically
- Generates URL: `sitesprintz-production.up.railway.app`
- Test it!

### **5. Custom Domain**
- Settings → Domains → Add `sitesprintz.com`
- Update DNS (Railway provides instructions)
- SSL auto-provisioned

---

## Test on Production

```bash
# Visit your Railway URL
# Register test account
# Try subscription: 4242 4242 4242 4242
# Verify webhooks in Stripe dashboard
```

---

## Multiple Environments (Optional)

Create 3 Railway projects:

```
1. sitesprintz-production (main branch)
2. sitesprintz-staging (staging branch)
3. sitesprintz-dev (dev branch)
```

Each auto-deploys on push!

---

## Troubleshooting

**Build fails?**
- Check Railway logs
- Verify Prisma generates correctly

**App crashes?**
- Check environment variables
- Verify DATABASE_URL

**Webhook not working?**
- Update webhook URL in Stripe to Railway domain
- Get new webhook secret

---

## Going Live

When ready for real payments:

1. Get Stripe **live** keys (not test)
2. Update webhook to production URL
3. Update env vars with live keys
4. Set `NODE_ENV=production`

---

**Deploy now:** https://railway.app  
**Documentation:** https://docs.railway.app

