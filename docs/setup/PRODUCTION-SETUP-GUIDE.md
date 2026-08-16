# Production Setup Guide

Step-by-step guide for deploying SiteSprintz to production.

**Estimated time:** 30-45 minutes  
**Prerequisites:** GitHub access, a hosting platform (Railway, Render, Heroku, or Docker), a domain name, and accounts for Stripe and Resend.

Last updated: 15 August 2026

## Table of contents

1. [Pre-deployment checklist](#pre-deployment-checklist)
2. [Repository setup](#step-1-repository-setup)
3. [Environment variables](#step-2-environment-variables)
4. [Database setup](#step-3-database-setup)
5. [Stripe configuration](#step-4-stripe-configuration)
6. [Email service setup](#step-5-email-service-setup)
7. [Google OAuth setup (optional)](#step-6-google-oauth-setup-optional)
8. [Deployment platform setup](#step-7-deployment-platform-setup)
9. [Domain configuration](#step-8-domain-configuration)
10. [Post-deployment verification](#step-9-post-deployment-verification)
11. [Monitoring and maintenance](#step-10-monitoring-and-maintenance)
12. [Troubleshooting](#troubleshooting)
13. [Quick reference links](#quick-reference-links)
14. [Completion checklist](#completion-checklist)

## Pre-deployment checklist

Before starting, make sure you have:

- [ ] GitHub repository access and a local clone
- [ ] Hosting platform account (Railway, Render, Heroku, or Docker runtime)
- [ ] Domain name and DNS access
- [ ] Stripe account with live keys available
- [ ] Resend account with a verified sender domain
- [ ] Google Cloud Console access (only if using Google OAuth)
- [ ] Strong secrets generated for `JWT_SECRET`, `ADMIN_TOKEN`, `ENCRYPTION_KEY`, and any session secret
- [ ] `.env.production` created from `.env.production.example`

## Step 1: Repository setup

1. Clone the repository:

```bash
git clone https://github.com/PersyLopez/sitesprintz.git
cd sitesprintz
git checkout production-readiness/audit-remediation  # or your release branch
```

2. Confirm the deployment files are present:

- `Dockerfile`
- `package.json`
- `prisma/schema.prisma`
- `railway.json` (if deploying to Railway)

## Step 2: Environment variables

Create a `.env.production` file from `.env.production.example` and fill in every required value. The application runs `server/config/validateEnv.js` on production startup and will exit if any critical variable is missing or invalid.

### Core application

- `NODE_ENV=production`
- `PORT=3000`

### Security (required)

- `JWT_SECRET` — strong random string, 32+ bytes. Generate: `openssl rand -hex 32`
- `ADMIN_TOKEN` — strong random string, not the default `dev-token`
- `ENCRYPTION_KEY` — 32-byte key for payment processor token encryption (hex or base64)
- `REFRESH_TOKEN_SECRET` — strong random string used for refresh tokens

### Database

- `DATABASE_URL` — PostgreSQL connection string with SSL, e.g. `postgresql://user:password@host:5432/dbname?sslmode=require`

### Stripe (live mode required for production)

Production deployments must use live Stripe keys. The validation script specifically checks that `STRIPE_SECRET_KEY` starts with `sk_live_`.

- `STRIPE_SECRET_KEY=sk_live_...`
- `STRIPE_PUBLISHABLE_KEY=pk_live_...`
- `STRIPE_WEBHOOK_SECRET=whsec_...` (live webhook signing secret)
- `STRIPE_PRICE_GROWTH` — live price ID for the Growth plan
- `STRIPE_PRICE_STARTER` — recommended live price ID for the Starter plan

For staging or local development, test keys (`sk_test_...`) can be used, but do not set `NODE_ENV=production` with test keys.

### Email

- `RESEND_API_KEY` — recommended for transactional email
- `RESEND_FROM_EMAIL` — verified sender address with Resend
- `FROM_EMAIL` and `FROM_NAME` — fallback sender values
- `ADMIN_EMAIL` — address for admin notifications

### Google OAuth (optional)

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL` — must match the authorized redirect URI exactly and must not use an ngrok URL in production

### Infrastructure

- `SERVER_IP` — production server IP, used in custom-domain DNS instructions
- `SITE_URL` / `CLIENT_URL` — production URLs

## Step 3: Database setup

1. Create a PostgreSQL database (Neon, Railway PostgreSQL, or another provider).
2. Set `DATABASE_URL`.
3. Generate the Prisma client and run migrations:

```bash
npx prisma generate
npx prisma migrate deploy
```

Railway can run migrations automatically via the `start` command if configured.

## Step 4: Stripe configuration

1. In the Stripe Dashboard, switch to live mode.
2. Copy the live secret key (`sk_live_...`) and publishable key (`pk_live_...`).
3. Create a live webhook endpoint at `https://yourdomain.com/api/webhooks/stripe`.
4. Listen for these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the webhook signing secret (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`.
6. Create live products and price IDs for the Starter and Growth plans, then set `STRIPE_PRICE_GROWTH` (required) and `STRIPE_PRICE_STARTER` (recommended).

## Step 5: Email service setup

1. Sign up at Resend and verify your domain.
2. Create an API key and set `RESEND_API_KEY`.
3. Set `RESEND_FROM_EMAIL` to a verified sender address.
4. Set `ADMIN_EMAIL` for admin notifications.

## Step 6: Google OAuth setup (optional)

1. Create or select a project in Google Cloud Console.
2. Enable the Google People API.
3. Create OAuth 2.0 web credentials:
   - Authorized JavaScript origin: `https://yourdomain.com`
   - Authorized redirect URI: `https://yourdomain.com/auth/google/callback`
4. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_CALLBACK_URL`.

## Step 7: Deployment platform setup

### Railway (recommended)

1. Create a new project and deploy from the GitHub repository.
2. Add a PostgreSQL database; Railway creates `DATABASE_URL`.
3. Add all environment variables from `.env.production`.
4. Verify the build command includes `npm install && npx prisma generate && npm run build`.
5. Verify the start command includes `npx prisma migrate deploy && npm start`.
6. Confirm the health check endpoint `/api/health` returns 200.

### Render or Heroku

- Connect the GitHub repository.
- Set the build command to `npm install && npx prisma generate && npm run build`.
- Set the start command to `npx prisma migrate deploy && npm start`.
- Add a PostgreSQL database and configure the environment variables.

### Docker

```bash
docker build -t sitesprintz:latest .
docker run -d -p 3000:3000 --env-file .env.production sitesprintz:latest
```

## Step 8: Domain configuration

1. Add the custom domain in your platform dashboard.
2. Configure DNS:
   - A record: root domain pointing to the platform IP
   - CNAME: `www` pointing to the platform domain
3. Wait for SSL provisioning (usually 5-10 minutes).
4. Verify HTTPS with `curl -I https://yourdomain.com`.

## Step 9: Post-deployment verification

### Health checks

```bash
curl https://yourdomain.com/api/health
curl https://yourdomain.com/api/health/db
curl https://yourdomain.com/api/health/full
```

Expected response includes `status: "healthy"` with `app`, `database`, `stripe`, and `email` checks.

### Functional checks

- [ ] Register a test account and receive a welcome email.
- [ ] Log in with email and password.
- [ ] Create a site, select a template, customize, and publish.
- [ ] Verify the published site is reachable.
- [ ] Complete a payment flow. Use real cards only in production; use a staging environment for test cards.

### Security checks

- [ ] HTTPS is enforced.
- [ ] Security headers are present.
- [ ] CORS is configured.
- [ ] Rate limiting is active (registration: 3 per 15 minutes; login: 5 per 15 minutes).
- [ ] No secrets are exposed in responses or client bundles.

### Performance checks

- [ ] Page load time under 3 seconds.
- [ ] API response time under 500 ms.
- [ ] Static assets are cached and images are optimized.

## Step 10: Monitoring and maintenance

- Configure uptime monitoring for `/api/health/full`.
- Set database latency alerts.
- Review application logs weekly.
- Enable automatic database backups and test restore procedures quarterly.
- Update dependencies monthly and review security advisories.

## Troubleshooting

### Build fails

- Check the platform build logs.
- Verify `package.json` scripts and Node version.
- Run `npx prisma generate` locally to confirm Prisma client builds.

### App crashes on start

- Check that all required environment variables are set.
- Verify `DATABASE_URL` and `JWT_SECRET` are valid.
- Run the app locally with `NODE_ENV=production` to reproduce validation errors.

### Database connection issues

- Confirm the connection string format and SSL mode.
- Test with `npx prisma db pull`.

### Webhook not working

- Verify the webhook URL is `https://yourdomain.com/api/webhooks/stripe`.
- Confirm the signing secret matches `STRIPE_WEBHOOK_SECRET`.
- Check the Stripe webhook logs.

### Email not sending

- Verify `RESEND_API_KEY` and `RESEND_FROM_EMAIL`.
- Confirm the domain is verified in Resend.
- Check `FROM_EMAIL` matches the verified domain.

### SSL certificate issues

- Wait 10-15 minutes after adding the domain.
- Verify DNS records.
- Clear the browser cache.

## Quick reference links

- [Quick Start](./QUICK-START.md)
- [Railway Deployment](./RAILWAY-DEPLOY.md)
- [Integration Setup](./INTEGRATION-SETUP.md)
- [Google OAuth Setup](./GOOGLE-OAUTH-NGROK.md)
- [Webhook Implementation](./WEBHOOK-IMPLEMENTATION.md)
- [Production Readiness](../stability/PRODUCTION-READINESS.md)
- [Security Checklist](../stability/SECURITY-CHECKLIST.md)

## Completion checklist

- [ ] All required environment variables are set and validated.
- [ ] Database is created and migrations are applied.
- [ ] Stripe live account is configured with live keys, webhook, and price IDs.
- [ ] Email service is configured with a verified domain.
- [ ] Application is deployed and the custom domain resolves with HTTPS.
- [ ] Health checks pass.
- [ ] Core functional flows (registration, site creation, publish) are verified.
- [ ] Monitoring and backups are enabled.
- [ ] Security verification is complete.
