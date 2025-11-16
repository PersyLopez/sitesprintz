# ✅ Architecture Clarification + CORS Fix

**Date:** November 14, 2025

---

## 🏗️ **Current Architecture**

### Development Mode:
- **Port 5173** - React frontend (Vite dev server) **← MAIN APP**
- **Port 3000** - Node/Express backend (API server)

### Production Mode:
- **Port 3000** - Node/Express serves BOTH React (from `/dist`) AND API

---

## 🔧 CORS Configuration Explained

### Why We Need Both Ports in CORS:

```javascript
origin: ['http://localhost:5173', 'http://localhost:3000']
```

**Port 5173** (React dev server):
- Main frontend during development
- Makes API calls to port 3000
- **Needs CORS permission** to access API

**Port 3000** (Node backend):
- API server (always)
- Also serves published customer sites (`/sites/*`)
- **Needs CORS permission** for legacy HTML pages that might make API calls

---

## 📊 Request Flow

### Development (What you're using now):
```
User Browser
    ↓
http://localhost:5173 (React App - Vite)
    ↓
API calls to → http://localhost:3000/api/* (Node Backend)
    ↓
PostgreSQL Database
```

**CORS needed:** React (5173) → Backend (3000) ✅

### Production (When deployed):
```
User Browser
    ↓
http://localhost:3000 (Node serves React from /dist + API)
    ↓
PostgreSQL Database
```

**No CORS needed** (same origin), but config still works ✅

---

## ✅ Why The Fix Works

The CORS configuration allows:
1. **React dev server (5173)** to call backend (3000) ← Main use case
2. **Backend server (3000)** to serve pages that might call its own API
3. **Published sites** (`/sites/*`) to make API calls if needed

All three scenarios are covered! 🎉

---

## 🎯 What You Should See Now

### ✅ Working:
- React app on http://localhost:5173
- Registration form sends request to http://localhost:3000/api/auth/register
- CORS allows the request
- User gets registered
- Login works

### ❌ If still broken, check:
```bash
# 1. Is backend running?
lsof -i:3000

# 2. Is React running?
lsof -i:5173

# 3. Check server logs
tail -f server.log

# 4. Check browser console
# Open DevTools → Console
# Try to register
# Share any new errors
```

---

## 📝 Notes

- **Legacy `public/index.html` is deprecated** - not used anymore
- **React app on 5173 is the main interface** ✅
- **Port 3000 backend serves API** (and will serve React in production)
- **CORS fix allows 5173 → 3000 communication** ✅

---

The fix I applied is **correct for your architecture**! Try registering now at http://localhost:5173 🚀

