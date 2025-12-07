# Production Setup Guide 🚀

Congratulations on reaching the Beta Launch! To run SiteSprintz in a production environment, you need to configure the following environment variables.

## 1. Environment Variables
Create or update your production `.env` file (or set these in your hosting provider's dashboard, e.g., Railway/Heroku/Vercel).

### Core Settings
```bash
NODE_ENV=production
PORT=3000
SITE_URL=https://your-production-domain.com
```

### Database
```bash
# Production PostgreSQL Connection String
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
```

### Security (Required)
```bash
# Generate a strong random string (e.g., `openssl rand -hex 32`)
JWT_SECRET=your-super-secret-production-key-here
ADMIN_TOKEN=your-secure-admin-token
```

### Google Authentication (OAuth)
To enable "Sign in with Google":
1.  Go to [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a project & enable "Google+ API" or "Google People API".
3.  Create OAuth 2.0 Credentials:
    *   **Authorized JavaScript Origins**: `https://your-production-domain.com`
    *   **Authorized Redirect URIs**: `https://your-production-domain.com/auth/google/callback`

```bash
GOOGLE_CLIENT_ID=12345...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
# Must match the Redirect URI set in Google Console above
GOOGLE_CALLBACK_URL=https://your-production-domain.com/auth/google/callback
# Where to send users after login (usually your frontend/dashboard URL)
CLIENT_URL=https://your-production-domain.com
```

### Email Service (Resend)
To send real emails instead of mock console logs, you must set these:
```bash
# Get this from https://resend.com/api-keys
RESEND_API_KEY=re_123456789...
# Verified sender domain
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### Stripe (Payments)
**⚠️ CRITICAL**: See [Stripe Go-Live Checklist](STRIPE_GO_LIVE_CHECKLIST.md) before setting these!
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
# REQUIRED: You MUST generate a NEW webhook secret for your Live endpoint
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 2. Start Command
If running on a VPS or container:
```bash
# 1. Build frontend assets
npm run build

# 2. Start the server
npm start
```

## 3. "Dry Run" Testing (Recommended)
Before deploying to the cloud, you can test "Production Mode" locally on your machine just by setting `NODE_ENV`.

1.  Create a `.env.production.local` file with real keys (but keep Stripe in Test Mode if you want to test safe flows).
2.  Run:
    ```bash
    npm run build
    NODE_ENV=production npm start
    ```
3.  Access `http://localhost:3000`. You should see the fully built assets (no Vite dev server) and real emails sending (if Resend key is set).

## 5. Deployment Strategies ☁️

### Option A: Railway (Recommended)
This repo is pre-configured for [Railway](https://railway.app/).
1.  **New Project**: Select "Deploy from GitHub repo".
2.  **Add Database**: Add a PostgreSQL plugin.
3.  **Variables**: Add your `.env` keys (Railway injects `DATABASE_URL` automatically).
4.  **Success**: Railway detects `railway.json` and automatically runs `npm install`, `prisma generate`, `npm run build`, and `prisma migrate deploy` before starting.

### Option B: Heroku / Render
This repo includes a `Procfile` (`web: npm start`).
1.  **Build Command**: Ensure your host runs `npm run build` during deployment.
2.  **Start Command**: `npm start`
3.  **Database**: You MUST run migrations manually or via a post-deploy script: `npx prisma migrate deploy`.

### Option C: VPS / Manual / Local Run
Use this for DigitalOcean, EC2, or **testing properly on your own laptop**.
1.  **Install**: `npm install` (or `git clone` first if on server)
2.  **Build**: `npm run build`
3.  **Migrate**: `npx prisma migrate deploy`
4.  **Start**: `NODE_ENV=production npm start`
    *   *Result*: App runs on port 3000. This is the **exact** same way it runs in the cloud.
