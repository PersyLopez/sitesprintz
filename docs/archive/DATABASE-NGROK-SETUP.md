# 🚀 Database + Online Deployment Setup

**Date:** November 14, 2025  
**Goal:** Get PostgreSQL connected + Deploy online with ngrok

---

## 📋 Step 1: PostgreSQL Setup

### Check if PostgreSQL is Installed

Run these commands in your terminal:

```bash
# Check if psql exists
which psql

# Check if PostgreSQL is running
lsof -i:5432
```

### Option A: If PostgreSQL is Installed but Not Running

```bash
# Start PostgreSQL
brew services start postgresql@14

# OR for older versions:
brew services start postgresql

# OR manually:
pg_ctl -D /usr/local/var/postgres start
```

### Option B: If PostgreSQL is NOT Installed

```bash
# Install PostgreSQL
brew install postgresql@14

# Start the service
brew services start postgresql@14

# Create your user (if needed)
createuser -s postgres
```

### Verify PostgreSQL is Running

```bash
# Should show process on port 5432
lsof -i:5432

# Try to connect
psql -U postgres
```

---

## 📋 Step 2: Create Database & Run Migrations

```bash
# Create the database
createdb -U postgres sitesprintz

# Connect to verify
psql -U postgres -d sitesprintz

# Inside psql, check:
\dt  # List tables

# Exit psql
\q
```

### Run Migrations (if you have them)

```bash
cd /Users/persylopez/sitesprintz

# Check if migrations exist
ls database/migrations/

# Run migrations (if script exists)
npm run migrate
# OR
node database/migrations/run-migrations.js
```

---

## 📋 Step 3: Update Environment Variables

Create or update `.env` file:

```bash
cd /Users/persylopez/sitesprintz
nano .env
```

Add these (update with your actual values):

```env
# Database
DATABASE_URL=postgresql://postgres:@localhost:5432/sitesprintz

# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this

# Stripe (if you have keys)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (Resend)
RESEND_API_KEY=re_...

# Admin
ADMIN_TOKEN=your-admin-token

# Base URL (will update with ngrok)
BASE_URL=http://localhost:3000
```

---

## 📋 Step 4: Test Local Connection

```bash
# Restart server
cd /Users/persylopez/sitesprintz
pkill -9 -f "node server.js"
node server.js

# In another terminal, test registration
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Should return 200/201, not 500!
```

---

## 🌐 Step 5: Install and Configure ngrok

### Install ngrok

```bash
# Using Homebrew
brew install ngrok

# OR download from https://ngrok.com/download
```

### Setup ngrok Account (Free)

1. Go to https://ngrok.com/
2. Sign up (free account)
3. Get your authtoken from dashboard
4. Run: `ngrok config add-authtoken YOUR_TOKEN`

### Start ngrok Tunnel

```bash
# Tunnel backend (port 3000)
ngrok http 3000
```

**You'll see output like:**
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

**Copy that `https://abc123.ngrok.io` URL!**

---

## 📋 Step 6: Update CORS for ngrok

Update `server.js` to allow your ngrok domain:

```javascript
// Line ~137 in server.js
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://abc123.ngrok.io',  // ← Add your ngrok URL
    'https://*.ngrok.io'         // ← Allow all ngrok subdomains
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));
```

Restart server:
```bash
pkill -9 -f "node server.js"
node server.js
```

---

## 📋 Step 7: Deploy Frontend to ngrok (Optional)

### Option A: Serve React Production Build

```bash
# Build React app
npm run build

# Serve from Express (already configured)
# Just visit your ngrok URL: https://abc123.ngrok.io
```

### Option B: Tunnel Frontend Separately

```bash
# In terminal 1: Backend ngrok
ngrok http 3000 --subdomain=sitesprintz-api

# In terminal 2: Frontend ngrok
ngrok http 5173 --subdomain=sitesprintz-app

# Update React .env to use backend ngrok URL
echo "VITE_API_URL=https://sitesprintz-api.ngrok.io" > .env.local
```

---

## 📋 Step 8: Test Online Access

### Test Backend API

```bash
# Test from anywhere
curl https://abc123.ngrok.io/api/health
```

### Test Frontend

Visit in browser: `https://abc123.ngrok.io`

Try to register - should work! ✅

---

## 🎯 Complete Deployment Script

Create `scripts/deploy-ngrok.sh`:

```bash
#!/bin/bash

echo "🚀 Starting SiteSprintz with ngrok..."

# 1. Start PostgreSQL
echo "📦 Starting PostgreSQL..."
brew services start postgresql@14

# Wait for postgres
sleep 3

# 2. Build React app
echo "⚛️  Building React app..."
npm run build

# 3. Start backend server
echo "🖥️  Starting backend server..."
pkill -9 -f "node server.js"
node server.js > server.log 2>&1 &

# Wait for server
sleep 3

# 4. Start ngrok
echo "🌐 Starting ngrok tunnel..."
ngrok http 3000 --log=stdout > ngrok.log &

# Wait for ngrok
sleep 3

# 5. Get ngrok URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | head -1 | cut -d'"' -f4)

echo ""
echo "✅ SiteSprintz is now online!"
echo "🌐 Public URL: $NGROK_URL"
echo ""
echo "📊 Monitoring:"
echo "   - Server logs: tail -f server.log"
echo "   - Ngrok dashboard: http://localhost:4040"
echo ""
```

Make it executable:
```bash
chmod +x scripts/deploy-ngrok.sh
./scripts/deploy-ngrok.sh
```

---

## 📊 Monitoring & Debugging

### Check PostgreSQL Status
```bash
# Is it running?
lsof -i:5432

# View logs
tail -f /usr/local/var/postgres/server.log
```

### Check Backend Status
```bash
# Is it running?
lsof -i:3000

# View logs
tail -f server.log
```

### Check ngrok Status
```bash
# Visit ngrok dashboard
open http://localhost:4040

# Or check logs
tail -f ngrok.log
```

---

## 🔒 Security for Public Access

### Important Notes:

1. **CSRF is currently disabled** - Don't use for real users yet!
2. **Use HTTPS only** - ngrok provides this automatically
3. **Rate limiting** - ngrok free tier has limits
4. **Database** - Still local, not publicly accessible (good!)

### Before Real Users:

- [ ] Re-enable CSRF protection
- [ ] Install cookie-parser
- [ ] Add rate limiting
- [ ] Setup proper production database
- [ ] Configure proper environment variables
- [ ] Add monitoring/logging

---

## ✅ Success Checklist

After setup, you should be able to:

- [ ] PostgreSQL running locally (`lsof -i:5432` shows process)
- [ ] Backend server running (`lsof -i:3000` shows process)
- [ ] Local registration works (http://localhost:5173)
- [ ] ngrok tunnel active (shows public URL)
- [ ] Public access works (https://abc123.ngrok.io)
- [ ] Registration works from public URL ✅

---

## 🚀 Quick Start Commands

```bash
# Terminal 1: Start everything local
cd /Users/persylopez/sitesprintz
brew services start postgresql@14
node server.js

# Terminal 2: Start React (dev mode)
npm run dev

# Terminal 3: Start ngrok
ngrok http 3000

# Test local: http://localhost:5173
# Test public: https://YOUR-NGROK-URL.ngrok.io
```

---

**Let's start with Step 1: Getting PostgreSQL running!**

What would you like to do first:
1. Check if PostgreSQL is already installed?
2. Install PostgreSQL fresh?
3. Skip to ngrok setup (if DB is already working)?

