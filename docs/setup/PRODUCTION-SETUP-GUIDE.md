# 🚀 Production Setup Guide

**Complete step-by-step guide for deploying SiteSprintz to production**

**Estimated Time:** 30-45 minutes  
**Prerequisites:** GitHub account, Railway account (or alternative hosting), domain name

---

## 📋 Table of Contents

- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Step 1: Repository Setup](#step-1-repository-setup)
- [Step 2: Environment Variables](#step-2-environment-variables)
- [Step 3: Database Setup](#step-3-database-setup)
- [Step 4: Stripe Configuration](#step-4-stripe-configuration)
- [Step 5: Email Service Setup](#step-5-email-service-setup)
- [Step 6: Google OAuth Setup (Optional)](#step-6-google-oauth-setup-optional)
- [Step 7: Deployment Platform Setup](#step-7-deployment-platform-setup)
- [Step 8: Domain Configuration](#step-8-domain-configuration)
- [Step 9: Post-Deployment Verification](#step-9-post-deployment-verification)
- [Step 10: Monitoring & Maintenance](#step-10-monitoring--maintenance)
- [Troubleshooting](#troubleshooting)
- [Quick Reference Links](#quick-reference-links)

---

## Pre-Deployment Checklist

Before starting, ensure you have:

- [ ] GitHub repository access ([sitesprintz](https://github.com/PersyLopez/sitesprintz))
- [ ] Railway account ([railway.app](https://railway.app)) or alternative hosting
- [ ] Domain name (e.g., `sitesprintz.com`)
- [ ] Stripe account ([dashboard.stripe.com](https://dashboard.stripe.com))
- [ ] Resend account ([resend.com](https://resend.com))
- [ ] Google Cloud Console access (for OAuth - optional)
- [ ] Admin email address ready
- [ ] Strong secrets generated (JWT_SECRET, ADMIN_TOKEN)

**Related Documentation:**
- [Quick Start Guide](./QUICK-START.md)
- [Railway Deployment](./RAILWAY-DEPLOY.md)
- [Integration Setup](./INTEGRATION-SETUP.md)
- [Git Workflow Best Practices](./GIT-WORKFLOW-BEST-PRACTICES.md)

---

## Step 1: Repository Setup

### 1.1 Verify Repository Access

- [ ] Clone repository: `git clone https://github.com/PersyLopez/sitesprintz.git`
- [ ] Verify you're on the correct branch: `git branch`
- [ ] Ensure `main` branch is up to date: `git checkout main && git pull origin main`

### 1.2 Review Deployment Files

Verify these files exist:

- [ ] `railway.json` - Railway deployment configuration
- [ ] `Procfile` - Process file for Heroku/Render compatibility
- [ ] `Dockerfile` - Docker container configuration
- [ ] `package.json` - Contains build and start scripts
- [ ] `prisma/schema.prisma` - Database schema

**File Locations:**
- Railway config: [`railway.json`](../../railway.json)
- Dockerfile: [`Dockerfile`](../../Dockerfile)
- Procfile: [`Procfile`](../../Procfile)

---

## Step 2: Environment Variables

### 2.1 Core Settings

Create a `.env` file or configure in your hosting platform:

```bash
# Core Configuration
NODE_ENV=production
PORT=3000
```

**Required Variables:**
- [ ] `NODE_ENV=production` - Sets production mode
- [ ] `PORT=3000` - Application port (Railway auto-sets, but good to specify)

### 2.2 Security Secrets

**Generate Strong Secrets:**

```bash
# Generate JWT Secret (32+ characters)
openssl rand -hex 32

# Generate Admin Token (32+ characters)
openssl rand -hex 32
```

**Required Variables:**
- [ ] `JWT_SECRET=<your-generated-secret>` - Minimum 32 characters
- [ ] `ADMIN_TOKEN=<your-generated-secret>` - Minimum 32 characters

**⚠️ Security Note:** Never commit secrets to Git. Use environment variables only.

### 2.3 URL Configuration

Set your production URLs:

```bash
# Production URLs
BASE_URL=https://sitesprintz.com
SITE_URL=https://sitesprintz.com
FRONTEND_URL=https://sitesprintz.com
CLIENT_URL=https://sitesprintz.com
```

**Required Variables:**
- [ ] `BASE_URL` - Base URL for API calls
- [ ] `SITE_URL` - Site URL (can be same as BASE_URL)
- [ ] `FRONTEND_URL` - Frontend URL
- [ ] `CLIENT_URL` - Client redirect URL (for OAuth)

**Related Documentation:**
- [Environment Variables Example](../../env.example)

---

## Step 3: Database Setup

### 3.1 Choose Database Provider

**Option A: Neon PostgreSQL (Recommended)**

- [ ] Sign up at [Neon](https://neon.tech)
- [ ] Create a new project
- [ ] Copy the connection string

**Option B: Railway PostgreSQL**

- [ ] Add PostgreSQL plugin in Railway dashboard
- [ ] Railway auto-generates `DATABASE_URL`

**Option C: Other PostgreSQL Provider**

- [ ] Create PostgreSQL database
- [ ] Get connection string

### 3.2 Configure Database URL

```bash
# Database Connection String
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
```

**Required Variables:**
- [ ] `DATABASE_URL` - PostgreSQL connection string with SSL

### 3.3 Run Database Migrations

**On Railway:** Migrations run automatically via `railway.json`

**Manual Migration:**
```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy
```

**Verification:**
- [ ] Database connection successful
- [ ] Migrations applied
- [ ] Tables created correctly

**Related Documentation:**
- [Prisma Schema](../../prisma/schema.prisma)
- [Railway Deployment](./RAILWAY-DEPLOY.md)

---

## Step 4: Stripe Configuration

### 4.1 Stripe Account Setup

- [ ] Create account at [Stripe Dashboard](https://dashboard.stripe.com)
- [ ] Complete business verification (for live mode)
- [ ] Review [Stripe Go-Live Checklist](../../docs/STRIPE_GO_LIVE_CHECKLIST.md)

### 4.2 Get API Keys

**For Testing (Test Mode):**
- [ ] Go to [Stripe API Keys](https://dashboard.stripe.com/test/apikeys)
- [ ] Copy Secret Key: `sk_test_...`
- [ ] Copy Publishable Key: `pk_test_...`

**For Production (Live Mode):**
- [ ] Switch to Live mode in Stripe Dashboard
- [ ] Go to [Stripe API Keys](https://dashboard.stripe.com/apikeys)
- [ ] Copy Secret Key: `sk_live_...`
- [ ] Copy Publishable Key: `pk_live_...`

### 4.3 Configure Webhooks

**Webhook Setup Steps:**

1. [ ] Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
2. [ ] Click "Add endpoint"
3. [ ] Enter endpoint URL: `https://sitesprintz.com/api/webhooks/stripe`
4. [ ] Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. [ ] Copy webhook signing secret: `whsec_...`

**Required Variables:**
- [ ] `STRIPE_SECRET_KEY=sk_live_...` or `sk_test_...`
- [ ] `STRIPE_PUBLISHABLE_KEY=pk_live_...` or `pk_test_...`
- [ ] `STRIPE_WEBHOOK_SECRET=whsec_...`

**⚠️ Important:** Webhook secret is different for test and live modes!

**Related Documentation:**
- [Stripe Go-Live Checklist](../../docs/STRIPE_GO_LIVE_CHECKLIST.md)
- [Integration Setup](./INTEGRATION-SETUP.md)

---

## Step 5: Email Service Setup

### 5.1 Resend Account Setup

- [ ] Sign up at [Resend](https://resend.com)
- [ ] Verify your domain (e.g., `sitesprintz.com`)
- [ ] Go to [API Keys](https://resend.com/api-keys)
- [ ] Create new API key: `re_...`

### 5.2 Domain Verification

**Domain Setup:**
- [ ] Add domain in Resend dashboard
- [ ] Add DNS records (SPF, DKIM, DMARC)
- [ ] Wait for verification (usually 5-10 minutes)
- [ ] Verify domain status shows "Verified"

### 5.3 Configure Email Variables

```bash
# Email Configuration
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@sitesprintz.com
FROM_NAME=SiteSprintz
ADMIN_EMAIL=your-admin@email.com
```

**Required Variables:**
- [ ] `RESEND_API_KEY` - Resend API key
- [ ] `FROM_EMAIL` - Verified sender email
- [ ] `FROM_NAME` - Sender display name
- [ ] `ADMIN_EMAIL` - Admin notification email

**Email Types Sent:**
- Welcome emails (registration)
- Password reset emails
- Order confirmations
- Site published notifications

**Related Documentation:**
- [Integration Setup](./INTEGRATION-SETUP.md)
- [Resend Documentation](https://resend.com/docs)

---

## Step 6: Google OAuth Setup (Optional)

### 6.1 Google Cloud Console Setup

- [ ] Go to [Google Cloud Console](https://console.cloud.google.com)
- [ ] Create a new project or select existing
- [ ] Enable "Google+ API" or "Google People API"
- [ ] Go to [Credentials](https://console.cloud.google.com/apis/credentials)

### 6.2 Create OAuth 2.0 Credentials

**OAuth Client Configuration:**

1. [ ] Click "Create Credentials" → "OAuth client ID"
2. [ ] Application type: "Web application"
3. [ ] Name: "SiteSprintz Production"
4. [ ] Authorized JavaScript origins:
   - `https://sitesprintz.com`
5. [ ] Authorized redirect URIs:
   - `https://sitesprintz.com/auth/google/callback`
6. [ ] Copy Client ID: `...apps.googleusercontent.com`
7. [ ] Copy Client Secret: `GOCSPX-...`

### 6.3 Configure OAuth Variables

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_CALLBACK_URL=https://sitesprintz.com/auth/google/callback
```

**Required Variables:**
- [ ] `GOOGLE_CLIENT_ID` - OAuth Client ID
- [ ] `GOOGLE_CLIENT_SECRET` - OAuth Client Secret
- [ ] `GOOGLE_CALLBACK_URL` - Must match redirect URI exactly

**Related Documentation:**
- [Google OAuth Setup Guide](https://developers.google.com/identity/protocols/oauth2)

---

## Step 7: Deployment Platform Setup

### 7.1 Railway Deployment (Recommended)

**Railway Setup Steps:**

1. [ ] Sign up at [Railway](https://railway.app)
2. [ ] Login with GitHub
3. [ ] Click "New Project"
4. [ ] Select "Deploy from GitHub repo"
5. [ ] Select `sitesprintz` repository
6. [ ] Railway auto-detects configuration

**Add PostgreSQL Database:**
- [ ] Click "New" → "Database" → "Add PostgreSQL"
- [ ] Railway auto-generates `DATABASE_URL`
- [ ] Copy `DATABASE_URL` for reference

**Configure Environment Variables:**
- [ ] Go to project → "Variables"
- [ ] Add all environment variables from Steps 2-6
- [ ] Verify all variables are set

**Deploy:**
- [ ] Railway automatically builds and deploys
- [ ] Monitor build logs
- [ ] Wait for deployment to complete
- [ ] Get deployment URL: `sitesprintz-production.up.railway.app`

**Railway Configuration:**
- [ ] Verify `railway.json` is detected
- [ ] Check build command: `npm install && npx prisma generate && npm run build`
- [ ] Check start command: `npx prisma migrate deploy && npm start`
- [ ] Verify health check: `/api/health`

**Related Documentation:**
- [Railway Deployment Guide](./RAILWAY-DEPLOY.md)
- [Railway Configuration](../../railway.json)

### 7.2 Alternative: Heroku/Render

**Heroku Setup:**
- [ ] Create Heroku app
- [ ] Add PostgreSQL addon
- [ ] Set config vars (environment variables)
- [ ] Deploy: `git push heroku main`
- [ ] Run migrations: `heroku run npx prisma migrate deploy`

**Render Setup:**
- [ ] Create new Web Service
- [ ] Connect GitHub repository
- [ ] Set build command: `npm install && npx prisma generate && npm run build`
- [ ] Set start command: `npx prisma migrate deploy && npm start`
- [ ] Add PostgreSQL database
- [ ] Configure environment variables

**Related Documentation:**
- [Production Setup](../../docs/PRODUCTION_SETUP.md)

### 7.3 Alternative: Docker Deployment

**Build Docker Image:**
```bash
docker build -t sitesprintz:latest .
```

**Run Container:**
```bash
docker run -d \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=... \
  -e JWT_SECRET=... \
  # ... add all other env vars
  sitesprintz:latest
```

**Related Documentation:**
- [Dockerfile](../../Dockerfile)

---

## Step 8: Domain Configuration

### 8.1 Add Custom Domain

**Railway:**
- [ ] Go to project → "Settings" → "Domains"
- [ ] Click "Add Domain"
- [ ] Enter domain: `sitesprintz.com`
- [ ] Railway provides DNS instructions

**Other Platforms:**
- [ ] Follow platform-specific domain setup
- [ ] Add domain in platform dashboard
- [ ] Configure DNS records

### 8.2 Configure DNS Records

**Required DNS Records:**

1. [ ] **A Record** (or CNAME):
   - Type: `A` or `CNAME`
   - Name: `@` (or root domain)
   - Value: Railway IP or CNAME (provided by Railway)

2. [ ] **CNAME Record** (for www):
   - Type: `CNAME`
   - Name: `www`
   - Value: Railway domain or root domain

3. [ ] **SSL Certificate:**
   - Railway auto-provisions SSL
   - Wait 5-10 minutes for SSL activation
   - Verify HTTPS works: `https://sitesprintz.com`

**DNS Verification:**
- [ ] Check DNS propagation: [whatsmydns.net](https://www.whatsmydns.net)
- [ ] Verify SSL certificate: [SSL Labs](https://www.ssllabs.com/ssltest/)
- [ ] Test HTTPS: `curl -I https://sitesprintz.com`

**Related Documentation:**
- [Railway Domains Documentation](https://docs.railway.app/guides/domains)

---

## Step 9: Post-Deployment Verification

### 9.1 Health Check Verification

**Test Health Endpoints:**

- [ ] Basic health: `curl https://sitesprintz.com/api/health`
- [ ] Database health: `curl https://sitesprintz.com/api/health/db`
- [ ] Full health check: `curl https://sitesprintz.com/api/health/full`
- [ ] Readiness probe: `curl https://sitesprintz.com/api/health/ready`
- [ ] Liveness probe: `curl https://sitesprintz.com/api/health/live`

**Expected Response:**
```json
{
  "status": "healthy",
  "checks": {
    "app": { "status": "ok" },
    "database": { "status": "ok", "latency_ms": < 100 },
    "stripe": { "status": "ok" },
    "email": { "status": "ok" }
  }
}
```

**Related Documentation:**
- [Health Check Endpoints](../../server/routes/health.js)

### 9.2 Functional Testing

**User Registration:**
- [ ] Visit `https://sitesprintz.com`
- [ ] Create test account
- [ ] Verify welcome email received
- [ ] Check email in `ADMIN_EMAIL` inbox

**Authentication:**
- [ ] Login with email/password
- [ ] Test password reset (if configured)
- [ ] Test Google OAuth (if configured)

**Payment Flow (Test Mode):**
- [ ] Navigate to subscription page
- [ ] Use test card: `4242 4242 4242 4242`
- [ ] Complete checkout
- [ ] Verify webhook received in Stripe dashboard
- [ ] Check subscription status in app

**Site Creation:**
- [ ] Create a new site
- [ ] Select template
- [ ] Customize content
- [ ] Publish site
- [ ] Verify site is accessible

**Related Documentation:**
- [Test Credentials](./TEST-CREDENTIALS.md)
- [Integration Setup](./INTEGRATION-SETUP.md)

### 9.3 Security Verification

**Security Checks:**
- [ ] HTTPS is enforced (no HTTP access)
- [ ] Security headers present (check with [SecurityHeaders.com](https://securityheaders.com))
- [ ] No sensitive data in response headers
- [ ] CORS configured correctly
- [ ] Rate limiting active (registration: 3 per 15 min, login: 5 per 15 min)
- [ ] Environment variables not exposed
- [ ] Bot protection measures in place

**Bot Protection Status:**
- ✅ **Rate Limiting:** Implemented (3 registrations per 15 min per IP)
- ⚠️ **CAPTCHA:** Recommended but not yet implemented (see [Bot Protection Analysis](../security/BOT-PROTECTION-ANALYSIS.md))
- ⚠️ **Email Verification:** Recommended but not yet implemented
- ⚠️ **IP Reputation:** Optional enhancement

**Related Documentation:**
- [Bot Protection Analysis](../security/BOT-PROTECTION-ANALYSIS.md) - Complete security analysis
- [Security Checklist](../stability/SECURITY-CHECKLIST.md) - Security verification

**Related Documentation:**
- [Security Checklist](../../docs/stability/SECURITY-CHECKLIST.md)
- [Security Assessment](../../docs/security/SECURITY-ASSESSMENT.md)

### 9.4 Performance Verification

**Performance Checks:**
- [ ] Page load time < 3 seconds
- [ ] API response time < 500ms
- [ ] Database queries optimized
- [ ] Static assets cached
- [ ] Images optimized

**Tools:**
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [GTmetrix](https://gtmetrix.com/)
- [WebPageTest](https://www.webpagetest.org/)

---

## Step 10: Monitoring & Maintenance

### 10.1 Set Up Monitoring

**Application Monitoring:**
- [ ] Set up Railway metrics/alerts
- [ ] Configure uptime monitoring (e.g., [UptimeRobot](https://uptimerobot.com))
- [ ] Set up error tracking (optional: Sentry)
- [ ] Monitor database performance

**Health Check Monitoring:**
- [ ] Set up automated health checks every 5 minutes
- [ ] Alert on `/api/health/full` returning non-200
- [ ] Monitor database latency (< 100ms target)

**Related Documentation:**
- [Production Readiness](../../docs/stability/PRODUCTION-READINESS.md)

### 10.2 Logging

**Log Management:**
- [ ] Review Railway logs regularly
- [ ] Set up log aggregation (optional)
- [ ] Monitor error rates
- [ ] Track user signups and activity

**Log Locations:**
- Railway: Project → Deployments → View Logs
- Application logs: Check `server.js` for Winston configuration

### 10.3 Backup Strategy

**Database Backups:**
- [ ] Enable automatic backups (Neon/Railway)
- [ ] Test restore procedure
- [ ] Document backup frequency
- [ ] Store backups securely

**Code Backups:**
- [ ] GitHub repository is backup
- [ ] Tag releases: `git tag v1.0.0`
- [ ] Document rollback procedure

### 10.4 Maintenance Tasks

**Regular Maintenance:**
- [ ] Update dependencies monthly: `npm audit` and `npm update`
- [ ] Review security advisories
- [ ] Monitor Stripe webhook logs
- [ ] Review error logs weekly
- [ ] Test backup restore quarterly

**Related Documentation:**
- [Production Readiness Checklist](../../docs/stability/PRODUCTION-READINESS.md)

---

## Troubleshooting

### Common Issues

**Build Fails:**
- [ ] Check Railway build logs
- [ ] Verify `package.json` scripts are correct
- [ ] Ensure Node.js version matches (check `package.json` engines)
- [ ] Verify Prisma generates correctly: `npx prisma generate`

**App Crashes on Start:**
- [ ] Check environment variables are all set
- [ ] Verify `DATABASE_URL` is correct
- [ ] Check `JWT_SECRET` is set and valid
- [ ] Review application logs for errors

**Database Connection Issues:**
- [ ] Verify `DATABASE_URL` format is correct
- [ ] Check database is accessible from Railway IP
- [ ] Verify SSL mode: `?sslmode=require`
- [ ] Test connection: `npx prisma db pull`

**Webhook Not Working:**
- [ ] Verify webhook URL in Stripe: `https://sitesprintz.com/api/webhooks/stripe`
- [ ] Check webhook secret matches environment variable
- [ ] Review Stripe webhook logs
- [ ] Verify webhook endpoint is accessible

**Email Not Sending:**
- [ ] Verify `RESEND_API_KEY` is correct
- [ ] Check domain is verified in Resend
- [ ] Review Resend dashboard for errors
- [ ] Check `FROM_EMAIL` matches verified domain

**SSL Certificate Issues:**
- [ ] Wait 10-15 minutes after adding domain
- [ ] Verify DNS records are correct
- [ ] Check Railway SSL status in dashboard
- [ ] Clear browser cache and try again

**Related Documentation:**
- [Railway Troubleshooting](https://docs.railway.app/guides/troubleshooting)
- [Production Setup Troubleshooting](../../docs/PRODUCTION_SETUP.md)

---

## Quick Reference Links

### Documentation
- [Quick Start Guide](./QUICK-START.md)
- [Railway Deployment](./RAILWAY-DEPLOY.md)
- [Integration Setup](./INTEGRATION-SETUP.md)
- [Git Workflow](./GIT-WORKFLOW-BEST-PRACTICES.md)
- [Production Setup](../../docs/PRODUCTION_SETUP.md)
- [Production Readiness](../../docs/stability/PRODUCTION-READINESS.md)
- [Security Checklist](../../docs/stability/SECURITY-CHECKLIST.md)

### External Services
- [Railway Dashboard](https://railway.app)
- [Stripe Dashboard](https://dashboard.stripe.com)
- [Resend Dashboard](https://resend.com)
- [Google Cloud Console](https://console.cloud.google.com)
- [Neon Dashboard](https://neon.tech)

### Health Checks
- Basic: `https://sitesprintz.com/api/health`
- Database: `https://sitesprintz.com/api/health/db`
- Full: `https://sitesprintz.com/api/health/full`
- Ready: `https://sitesprintz.com/api/health/ready`
- Live: `https://sitesprintz.com/api/health/live`

### Testing Tools
- [SSL Labs](https://www.ssllabs.com/ssltest/)
- [SecurityHeaders.com](https://securityheaders.com)
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [What's My DNS](https://www.whatsmydns.net)

---

## ✅ Completion Checklist

**Pre-Deployment:**
- [ ] All environment variables configured
- [ ] Database created and accessible
- [ ] Stripe account configured (test or live)
- [ ] Email service configured
- [ ] OAuth configured (if using)

**Deployment:**
- [ ] Application deployed successfully
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Health checks passing

**Post-Deployment:**
- [ ] All functional tests passing
- [ ] Payment flow working
- [ ] Email sending working
- [ ] Monitoring configured
- [ ] Backups enabled

**Production Ready:**
- [ ] Security verified
- [ ] Performance optimized
- [ ] Documentation updated
- [ ] Team trained on deployment process

---

**🎉 Congratulations! Your SiteSprintz application is now in production!**

**Need Help?**
- Review [Troubleshooting](#troubleshooting) section
- Check [Quick Reference Links](#quick-reference-links)
- Review detailed documentation in `docs/` directory

**Last Updated:** December 2024  
**Maintained By:** SiteSprintz Team


