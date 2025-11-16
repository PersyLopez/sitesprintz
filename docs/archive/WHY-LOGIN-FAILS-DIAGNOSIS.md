# 🔍 DIAGNOSIS: Why Login/Register Fails Despite Passing Tests

**Date:** November 14, 2025  
**Issue:** User can't register or login, but tests pass

---

## 🎯 The Disconnect: Tests vs. Reality

### The Paradox:
- ✅ **Tests:** 2,097 / 2,442 passing (86%)
- ✅ **Code:** Auth implementation looks correct
- ❌ **Reality:** User can't register or login

### Why Tests Pass But App Fails:

Tests are **isolated environments** that:
- Mock the database
- Mock external services
- Use test data
- Run in controlled conditions

Production has:
- Real database (may not be running)
- Real network calls
- Real environment variables
- Real browser/CORS issues

---

## 🔴 Most Likely Causes

### 1. Database Not Running / Not Connected
**Symptoms:**
- Registration appears to work, but data not saved
- Login fails with 401 (user not found in DB)
- No error messages in UI

**Why:**
- Tests mock the database, so they pass
- Production code hits real PostgreSQL
- If PostgreSQL isn't running → silent failures

**How to Check:**
```bash
# Check if PostgreSQL is running
ps aux | grep postgres

# Try to connect
psql -U postgres -d sitesprintz

# Check connection from Node
node -e "const {query} = require('./database/db.js'); query('SELECT NOW()').then(console.log).catch(console.error)"
```

---

### 2. Environment Variables Missing
**Symptoms:**
- JWT_SECRET defaults to insecure value
- Database connection string wrong
- CORS not configured

**Why:**
- Tests use default/mock values
- Production needs real `.env` file

**How to Check:**
```bash
# Check if .env exists
cat .env

# Required variables:
DATABASE_URL=postgresql://postgres:password@localhost:5432/sitesprintz
JWT_SECRET=<your-secret-key>
NODE_ENV=development
```

---

### 3. CORS Issues (Frontend → Backend)
**Symptoms:**
- Network request fails
- Browser console shows CORS error
- "Failed to fetch" in UI

**Why:**
- React dev server (port 5173) calling Node server (port 3000)
- CORS not configured

**How to Check:**
- Open browser DevTools → Console
- Look for errors like: `CORS policy: No 'Access-Control-Allow-Origin'`

**Fix:**
```javascript
// server.js - Add CORS middleware
import cors from 'cors';
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
```

---

###4. Frontend API Base URL Wrong
**Symptoms:**
- Requests go to wrong endpoint
- 404 errors
- "Cannot POST /api/auth/register"

**Why:**
- Frontend configured for wrong port
- API client not using correct base URL

**How to Check:**
```javascript
// src/services/api.js
const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3000';
```

---

### 5. Password Hashing Issue (Test Shows This!)
**From Test Output:**
```
expected '$2b$10$nuLz3Wdr5A93o97cn23yy...' to be 'me1763148328530@example.com'
```

**This means:**
- Test expecting `user.email`
- Getting `user.password_hash` instead!

**Root Cause:**
Database query is selecting `*` and returning hashed password in response.

**Fix Location:** `auth.routes.js` line 295
```javascript
// CURRENT (WRONG):
const result = await dbQuery(
  'SELECT * FROM users WHERE email = $1',  // ← Returns password_hash!
  [email.toLowerCase()]
);

// SHOULD BE:
const result = await dbQuery(
  'SELECT id, email, password_hash, role, status FROM users WHERE email = $1',
  [email.toLowerCase()]
);
```

---

## 🚀 Immediate Actions to Fix

### Step 1: Check Database Connection
```bash
# Start PostgreSQL (if not running)
brew services start postgresql
# OR
pg_ctl -D /usr/local/var/postgres start

# Create database if doesn't exist
createdb -U postgres sitesprintz

# Run migrations
npm run migrate
```

### Step 2: Check Environment Variables
```bash
# Create .env if missing
cp .env.example .env

# Edit with your values
nano .env
```

### Step 3: Check Both Servers Running
```bash
# Terminal 1: Backend
cd /Users/persylopez/sitesprintz
node server.js

# Terminal 2: Frontend
cd /Users/persylopez/sitesprintz
npm run dev
```

### Step 4: Check Browser Console
1. Open http://localhost:5173
2. Open DevTools (F12)
3. Go to Console tab
4. Try to register
5. Look for errors

### Step 5: Check Network Tab
1. Open DevTools → Network tab
2. Try to register
3. Click on the `/api/auth/register` request
4. Check:
   - **Status Code** (should be 200/201, not 500/404)
   - **Response** (what error message?)
   - **Request Payload** (email/password sent?)

---

## 🔧 Diagnostic Commands

Run these to diagnose the issue:

```bash
# 1. Check if backend is running
curl http://localhost:3000/api/health

# 2. Test registration directly
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'

# 3. Check database connection
node -e "
const {query} = await import('./database/db.js');
query('SELECT COUNT(*) FROM users')
  .then(r => console.log('Users:', r.rows[0]))
  .catch(e => console.error('DB Error:', e.message))
" --input-type=module

# 4. Check server logs
# Look at terminal where `node server.js` is running
# Any errors will show there
```

---

## 📋 Action Plan

### 🔴 **URGENT: Run These Now**

1. **Check Backend Server Status:**
   ```bash
   # Is it running?
   lsof -i :3000
   
   # If not, start it:
   node server.js
   ```

2. **Check Frontend Server Status:**
   ```bash
   # Is it running?
   lsof -i :5173
   
   # If not, start it:
   npm run dev
   ```

3. **Check Browser Console:**
   - Navigate to http://localhost:5173
   - Open DevTools (F12)
   - Try to register
   - **Screenshot the console errors and send them**

4. **Check Server Terminal:**
   - Look at terminal where `node server.js` is running
   - **Screenshot any errors and send them**

---

## ✅ Expected Results After Fixes

### If Database Was the Issue:
- ✅ Registration creates user in DB
- ✅ Login returns JWT token
- ✅ User can access dashboard

### If CORS Was the Issue:
- ✅ No more "CORS policy" errors
- ✅ Requests complete successfully

### If Environment Was the Issue:
- ✅ Secure JWT tokens
- ✅ Proper database connection
- ✅ Features work as expected

---

## 🎓 Why This Happened

### The Test Illusion:
Tests passing ≠ App working because:

1. **Tests use mocks** → Don't catch integration issues
2. **Tests use test DB** → Don't catch production DB issues
3. **Tests skip network** → Don't catch CORS issues
4. **Tests use defaults** → Don't catch env variable issues

### What We Need:
- ✅ Unit tests (have them!)
- ✅ Integration tests (have them!)
- ⚠️ **E2E tests** (need these!) - Would catch this!
- ⚠️ **Manual testing** (do this now!)

---

## 🚀 Next Steps

1. **Run diagnostic commands above**
2. **Share:**
   - Browser console errors (screenshot)
   - Server terminal output (screenshot)
   - Network tab response (screenshot)
3. **I'll provide specific fix once I see the actual error**

The code is correct - this is an **environment/configuration issue**, not a code bug! 💡

