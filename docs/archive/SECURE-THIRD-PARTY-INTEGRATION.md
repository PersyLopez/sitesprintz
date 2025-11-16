# 🔒 Secure Third-Party Service Integration Guide

**Date:** November 14, 2025  
**Purpose:** Production-ready security for external services  
**Priority:** CRITICAL before public launch

---

## 🎯 Overview: Third-Party Services in SiteSprintz

### Services You're Using:
1. **ngrok** - Public tunneling (development/demo)
2. **PostgreSQL** - Database
3. **Stripe** - Payments
4. **Resend** - Email service
5. **Google OAuth** - Authentication (optional)

### Security Principle:
**🔐 Never expose credentials. Always use environment variables. Rotate keys regularly.**

---

## 1. 🌐 ngrok - Secure Public Access

### ⚠️ Current Risk Level: MEDIUM
**Why:** Exposes your local dev server to the internet

### ✅ Secure Setup

#### Step 1: Use ngrok Basic Auth (Free)
```bash
# Protect your tunnel with password
ngrok http 3000 --basic-auth="username:strong-password-here"
```

**Access:** `https://abc123.ngrok.io` (will prompt for username/password)

#### Step 2: Use Reserved Domains (Paid - $8/month)
```bash
# Get consistent subdomain
ngrok http 3000 --subdomain=sitesprintz
# URL: https://sitesprintz.ngrok.io (doesn't change)
```

**Benefits:**
- Consistent URL (no need to update CORS every time)
- Professional appearance
- Easier to whitelist

#### Step 3: IP Whitelisting (Paid)
```bash
# Only allow specific IPs
ngrok http 3000 --cidr-allow="1.2.3.4/32"
```

#### Step 4: Environment-Specific Configuration

**File:** `.env.development`
```env
# Development (local only)
BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
NGROK_ENABLED=false
```

**File:** `.env.demo` (for ngrok)
```env
# Demo/Testing with ngrok
BASE_URL=https://sitesprintz.ngrok.io
FRONTEND_URL=https://sitesprintz.ngrok.io
NGROK_ENABLED=true
NGROK_AUTH_TOKEN=your_ngrok_token_here  # From ngrok.com dashboard
```

#### Step 5: Secure ngrok Configuration

**File:** `ngrok.yml` (create in home directory: `~/.ngrok2/ngrok.yml`)
```yaml
version: "2"
authtoken: YOUR_NGROK_TOKEN_HERE

tunnels:
  sitesprintz-backend:
    proto: http
    addr: 3000
    # Add basic auth
    auth: "admin:CHANGE_THIS_PASSWORD"
    # Add custom domain (paid)
    # hostname: sitesprintz.ngrok.io
    
  sitesprintz-frontend:
    proto: http
    addr: 5173
    auth: "admin:CHANGE_THIS_PASSWORD"
```

**Start with:**
```bash
ngrok start sitesprintz-backend sitesprintz-frontend
```

---

## 2. 🗄️ PostgreSQL - Secure Database

### ⚠️ Current Risk Level: LOW (local only)
**Why:** Not exposed to internet (good!)

### ✅ Secure Setup

#### Step 1: Strong Password Authentication

```bash
# Set password for postgres user
psql -U postgres

# Inside psql:
ALTER USER postgres WITH PASSWORD 'STRONG_PASSWORD_HERE_USE_GENERATOR';
\q
```

#### Step 2: Update Connection String

**File:** `.env`
```env
# INSECURE (current):
DATABASE_URL=postgresql://postgres:@localhost:5432/sitesprintz

# SECURE:
DATABASE_URL=postgresql://postgres:YOUR_STRONG_PASSWORD@localhost:5432/sitesprintz
```

#### Step 3: Create Application-Specific User

```bash
psql -U postgres

# Inside psql:
-- Create dedicated user for app
CREATE USER sitesprintz_app WITH PASSWORD 'another_strong_password';

-- Grant only necessary permissions
GRANT CONNECT ON DATABASE sitesprintz TO sitesprintz_app;
\c sitesprintz
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sitesprintz_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sitesprintz_app;

-- Future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sitesprintz_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT USAGE, SELECT ON SEQUENCES TO sitesprintz_app;

\q
```

**Update `.env`:**
```env
DATABASE_URL=postgresql://sitesprintz_app:password_here@localhost:5432/sitesprintz
```

#### Step 4: Connection Pooling & Limits

**File:** `database/db.js` (update your existing file)
```javascript
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  
  // Security settings
  max: 20,                    // Max connections
  idleTimeoutMillis: 30000,   // Close idle connections
  connectionTimeoutMillis: 2000,
  
  // SSL for production (if using managed DB like RDS)
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true,
    ca: process.env.DB_SSL_CA  // Certificate
  } : false
});

// Test connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Database connected at:', res.rows[0].now);
  }
});

export const query = (text, params) => pool.query(text, params);
```

#### Step 5: Backup & Recovery

```bash
# Create backup script
cat > scripts/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="$HOME/sitesprintz-backups"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump -U postgres sitesprintz > "$BACKUP_DIR/sitesprintz_$TIMESTAMP.sql"
echo "✅ Backup created: $BACKUP_DIR/sitesprintz_$TIMESTAMP.sql"

# Keep only last 7 days
find "$BACKUP_DIR" -name "sitesprintz_*.sql" -mtime +7 -delete
EOF

chmod +x scripts/backup-db.sh

# Add to crontab for daily backups
# crontab -e
# Add: 0 2 * * * /path/to/scripts/backup-db.sh
```

---

## 3. 💳 Stripe - Secure Payment Processing

### ⚠️ Current Risk Level: HIGH
**Why:** Handles real money!

### ✅ Secure Setup

#### Step 1: Use Test Keys in Development

**File:** `.env.development`
```env
# Test keys (start with sk_test_ and pk_test_)
STRIPE_SECRET_KEY=sk_test_YOUR_TEST_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_TEST_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_TEST_WEBHOOK_SECRET
```

**File:** `.env.production` (NEVER commit this!)
```env
# Live keys (start with sk_live_ and pk_live_)
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_LIVE_WEBHOOK_SECRET
```

#### Step 2: Webhook Signature Verification

**File:** `server/routes/webhooks.routes.js` (already implemented!)
```javascript
// ✅ GOOD - Verify webhook signature
const sig = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  req.rawBody,
  sig,
  process.env.STRIPE_WEBHOOK_SECRET
);

// ❌ BAD - Never trust unverified webhooks
// const event = req.body;  // DON'T DO THIS!
```

#### Step 3: Webhook URL Security

**For ngrok (development):**
```bash
# 1. Start ngrok
ngrok http 3000

# 2. Get URL (e.g., https://abc123.ngrok.io)

# 3. Add to Stripe Dashboard:
# https://dashboard.stripe.com/test/webhooks
# Endpoint: https://abc123.ngrok.io/api/webhooks/stripe
# Events: checkout.session.completed, payment_intent.succeeded, etc.

# 4. Copy webhook secret and update .env
STRIPE_WEBHOOK_SECRET=whsec_abc123...
```

**For production:**
```bash
# Use your real domain
# Endpoint: https://yourdomain.com/api/webhooks/stripe
# ALWAYS use HTTPS!
```

#### Step 4: Idempotency Keys

**File:** `server/routes/payments.routes.js`
```javascript
// Prevent duplicate charges
const paymentIntent = await stripe.paymentIntents.create({
  amount: 2000,
  currency: 'usd',
  customer: customerId,
}, {
  idempotencyKey: `order_${orderId}_${timestamp}`  // ✅ Prevents duplicates
});
```

#### Step 5: Amount Validation

```javascript
// ✅ GOOD - Validate on server
router.post('/create-checkout', async (req, res) => {
  const { items } = req.body;
  
  // Calculate amount on server (NEVER trust client!)
  const calculatedTotal = items.reduce((sum, item) => {
    const product = await getProductFromDB(item.productId);
    return sum + (product.price * item.quantity);
  }, 0);
  
  // Create checkout with server-calculated amount
  const session = await stripe.checkout.sessions.create({
    line_items: [{
      price_data: {
        currency: 'usd',
        unit_amount: calculatedTotal,  // ✅ Server-calculated
        product_data: { name: 'Order' }
      },
      quantity: 1
    }],
    mode: 'payment',
  });
});

// ❌ BAD - Never trust client-side amounts
// const amount = req.body.amount;  // DON'T DO THIS!
```

---

## 4. 📧 Resend - Secure Email Service

### ⚠️ Current Risk Level: MEDIUM
**Why:** Can be used for spam if compromised

### ✅ Secure Setup

#### Step 1: API Key Management

**File:** `.env`
```env
RESEND_API_KEY=re_YOUR_API_KEY_HERE
```

**Get key from:** https://resend.com/api-keys

#### Step 2: Rate Limiting

**File:** `email-service.js`
```javascript
import { Resend } from 'resend';
import rateLimit from 'express-rate-limit';

const resend = new Resend(process.env.RESEND_API_KEY);

// Rate limit email sends
const emailRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 emails per window
  message: 'Too many emails sent from this IP'
});

// Validate email addresses
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function sendEmail(to, subject, html) {
  // Validate recipient
  if (!isValidEmail(to)) {
    throw new Error('Invalid email address');
  }
  
  // Sanitize subject (prevent header injection)
  const cleanSubject = subject.replace(/[\r\n]/g, '');
  
  try {
    const result = await resend.emails.send({
      from: 'SiteSprintz <noreply@sitesprintz.com>',  // ✅ Use verified domain
      to: to,
      subject: cleanSubject,
      html: html,
      // Add headers for tracking
      headers: {
        'X-Entity-Ref-ID': generateUniqueId()
      }
    });
    
    return result;
  } catch (error) {
    // Log but don't expose API errors to users
    console.error('Email send failed:', error.message);
    throw new Error('Failed to send email');
  }
}
```

#### Step 3: Email Template Security

```javascript
// ✅ GOOD - Use templates, don't embed user input
const welcomeEmail = `
  <h1>Welcome to SiteSprintz!</h1>
  <p>Thank you for joining us.</p>
  <a href="${sanitizeUrl(verificationLink)}">Verify Email</a>
`;

// ❌ BAD - Never embed unsanitized user input
// const email = `<h1>${req.body.userInput}</h1>`;  // XSS risk!
```

---

## 5. 🔐 Google OAuth - Secure Authentication

### ✅ Secure Setup

#### Step 1: OAuth Credentials

**File:** `.env`
```env
# Google OAuth
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# For production:
# GOOGLE_CALLBACK_URL=https://yourdomain.com/auth/google/callback
```

#### Step 2: Restrict Callback URLs

**In Google Cloud Console:**
1. Go to: https://console.cloud.google.com/apis/credentials
2. Edit OAuth 2.0 Client ID
3. **Authorized redirect URIs:**
   ```
   http://localhost:3000/auth/google/callback  (dev)
   https://yourdomain.com/auth/google/callback  (prod)
   ```
4. **Authorized JavaScript origins:**
   ```
   http://localhost:5173  (dev)
   https://yourdomain.com  (prod)
   ```

#### Step 3: State Parameter (CSRF Protection)

```javascript
// ✅ Already implemented in auth-google.js
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
  passReqToCallback: true,
  state: true  // ✅ CSRF protection
}));
```

---

## 6. 🔒 Environment Variables - Master Security

### ✅ Secure Management

#### Step 1: Never Commit `.env` Files

**File:** `.gitignore` (verify these are included)
```
# Environment variables
.env
.env.local
.env.development
.env.production
.env.*.local

# Sensitive files
*.pem
*.key
*.cert
config/production.js
secrets/
```

#### Step 2: Use `.env.example` Template

**File:** `.env.example` (commit this!)
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/dbname

# Server
PORT=3000
NODE_ENV=development
JWT_SECRET=change-this-in-production

# Stripe (get from dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend (get from resend.com)
RESEND_API_KEY=re_...

# Google OAuth (get from console.cloud.google.com)
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# ngrok (get from ngrok.com)
NGROK_AUTH_TOKEN=...
```

#### Step 3: Environment-Specific Files

```bash
# Development
cp .env.example .env.development
# Edit with test/development credentials

# Production
cp .env.example .env.production
# Edit with REAL credentials
# NEVER commit this file!
```

#### Step 4: Load Environment Based on NODE_ENV

**File:** `server.js` (add at top)
```javascript
import dotenv from 'dotenv';
import path from 'path';

// Load environment-specific file
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : '.env.development';

dotenv.config({ path: path.resolve(process.cwd(), envFile) });

// Validate required variables
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'STRIPE_SECRET_KEY',
  'RESEND_API_KEY'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}
```

---

## 7. 🔐 Secrets Management (Production)

### For Production Deployment:

#### Option 1: Environment Variables (Vercel/Netlify)
```bash
# Set in dashboard
STRIPE_SECRET_KEY=sk_live_...
DATABASE_URL=postgres://...
```

#### Option 2: AWS Secrets Manager
```javascript
import { SecretsManager } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManager({ region: 'us-east-1' });

async function getSecret(secretName) {
  const response = await client.getSecretValue({ SecretId: secretName });
  return JSON.parse(response.SecretString);
}

// Usage
const secrets = await getSecret('sitesprintz/production');
process.env.STRIPE_SECRET_KEY = secrets.stripeSecretKey;
```

#### Option 3: HashiCorp Vault
```bash
# Store secrets
vault kv put secret/sitesprintz \
  stripe_secret=sk_live_... \
  database_url=postgres://...

# Retrieve in app
vault kv get -field=stripe_secret secret/sitesprintz
```

---

## 8. 📋 Security Checklist

### Before Public Launch:

#### Authentication & Authorization:
- [ ] JWT secrets are strong (32+ random characters)
- [ ] Passwords are hashed with bcrypt (10+ rounds)
- [ ] CSRF protection enabled (install cookie-parser!)
- [ ] Rate limiting on login/register endpoints
- [ ] Account lockout after failed attempts (already done ✅)

#### API Security:
- [ ] All API routes use HTTPS in production
- [ ] CORS properly configured (specific origins)
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (using parameterized queries ✅)
- [ ] XSS prevention (sanitize user input)

#### Third-Party Services:
- [ ] All API keys in environment variables
- [ ] Test keys used in development
- [ ] Live keys used only in production
- [ ] Webhook signatures verified (Stripe ✅)
- [ ] Rate limiting on email sends

#### Database:
- [ ] Strong password set for database user
- [ ] Application-specific DB user (not postgres superuser)
- [ ] Regular backups configured
- [ ] SSL enabled for production database connections

#### Infrastructure:
- [ ] ngrok protected with auth (if used)
- [ ] Production uses real domain (not ngrok)
- [ ] Environment variables properly loaded
- [ ] Secrets never committed to git
- [ ] `.env` in `.gitignore`

---

## 9. 🚨 Incident Response Plan

### If Credentials are Compromised:

1. **Immediate Actions:**
   ```bash
   # Rotate ALL keys immediately
   # 1. Stripe: dashboard.stripe.com/apikeys
   # 2. Database: ALTER USER ... PASSWORD '...';
   # 3. JWT: Change JWT_SECRET in .env
   # 4. Resend: resend.com/api-keys
   # 5. Google OAuth: console.cloud.google.com
   ```

2. **Revoke Sessions:**
   ```sql
   -- Clear all active sessions
   DELETE FROM sessions;
   
   -- Force all users to re-login
   UPDATE users SET last_password_change = NOW();
   ```

3. **Audit Logs:**
   ```bash
   # Check for suspicious activity
   tail -1000 server.log | grep -i "error\|unauthorized\|failed"
   
   # Check database for unusual activity
   psql -U postgres -d sitesprintz
   SELECT * FROM users ORDER BY created_at DESC LIMIT 100;
   ```

4. **Notify Users:**
   ```javascript
   // Send security notification
   await sendEmail(user.email, 'Security Alert', 
     'Your password has been reset as a precaution...'
   );
   ```

---

## 10. ✅ Quick Start: Secure Setup

```bash
# 1. Copy environment template
cp .env.example .env.development

# 2. Generate strong secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy this to JWT_SECRET in .env.development

# 3. Set database password
psql -U postgres
ALTER USER postgres WITH PASSWORD 'GENERATED_PASSWORD_HERE';
\q

# 4. Update .env.development with all credentials

# 5. Verify .gitignore includes .env files
grep ".env" .gitignore

# 6. Start with secure config
NODE_ENV=development node server.js
```

---

## 📚 Additional Resources

- **Stripe Security:** https://stripe.com/docs/security
- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **ngrok Security:** https://ngrok.com/docs/secure-tunnels
- **PostgreSQL Security:** https://www.postgresql.org/docs/current/auth-methods.html

---

**Ready to implement? Start with Step 1 (PostgreSQL) and we'll go through each service securely!** 🔒

