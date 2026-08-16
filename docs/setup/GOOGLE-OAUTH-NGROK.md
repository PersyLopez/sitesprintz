---
title: "ngrok + Google OAuth Authentication Setup Guide"
date: 2026-06-07
---

# ngrok + Google OAuth Authentication Setup Guide

Complete guide for testing Google OAuth authentication using ngrok for public URL tunneling.

## Overview

ngrok allows you to expose your local development server to the internet via a public URL. This is essential for testing OAuth providers like Google, which require valid public callback URLs.

**Why ngrok?**
- Google OAuth requires HTTPS public URLs
- Can't use `localhost` for OAuth redirects
- Perfect for testing before deploying to production
- Free tier includes 40 concurrent tunnels

## Prerequisites

### 1. ngrok Installation

Check if ngrok is installed:
```bash
which ngrok
```

If not installed:
```bash
brew install ngrok
```

Verify installation:
```bash
ngrok version
```

### 2. Google Cloud Project Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to APIs & Services → Credentials
5. Create OAuth 2.0 Client ID (Web application)
6. You'll get:
   - `GOOGLE_CLIENT_ID`: Your client ID
   - `GOOGLE_CLIENT_SECRET`: Your client secret

**Save these credentials** - you'll need them in `.env`

## Step-by-Step Setup

### Step 1: Start ngrok Tunnel

**Option A: Automatic Setup (Recommended)**

Use the provided setup script:
```bash
bash scripts/ngrok-auth-setup.sh
```

This script will:
- Start ngrok on port 3000
- Get your public URL
- Display configuration steps
- Show the ngrok web interface URL

**Option B: Manual Setup**

In a new terminal:
```bash
ngrok http 3000
```

Output:
```
ngrok                                       (Ctrl+C to quit)

Session Status                      online
Account                             you@example.com
Version                             3.x.x
Region                              us
Latency                             45ms
Web Interface                        http://127.0.0.1:4040

Forwarding                          https://abc123def456.ngrok.io -> http://localhost:3000

Connections                          ttl    opn    rt1    rt5    p50    p95
                                     1000   0      0.00   0.00   0.00   0.00
```

**Your public URL:** `https://abc123def456.ngrok.io`

### Step 2: Update Google Cloud Console

1. Go to [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials)
2. Click your OAuth 2.0 Client ID
3. Update **Authorized redirect URIs**:
   ```
   https://YOUR-NGROK-URL/auth/google/callback
   ```
   Example:
   ```
   https://abc123def456.ngrok.io/auth/google/callback
   ```

4. Update **Authorized JavaScript origins**:
   ```
   https://YOUR-NGROK-URL
   ```

5. Click **Save**

### Step 3: Update .env File

Update your `.env` with the ngrok URL and Google credentials:

```env
# ===== NGROK URLs =====
GOOGLE_CALLBACK_URL=https://YOUR-NGROK-URL/auth/google/callback
CLIENT_URL=https://YOUR-NGROK-URL

# ===== Google OAuth Credentials =====
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# ===== Other Configuration =====
JWT_SECRET=your-jwt-secret
NODE_ENV=development
```

**Replace with actual values:**
- `YOUR-NGROK-URL` → From ngrok output (e.g., `https://abc123def456.ngrok.io`)
- `your-client-id` → From Google Console
- `your-client-secret` → From Google Console

**Quick Update Command:**
```bash
NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | jq -r '.tunnels[0].public_url')
sed -i "" "s|GOOGLE_CALLBACK_URL=.*|GOOGLE_CALLBACK_URL=$NGROK_URL/auth/google/callback|g" .env
sed -i "" "s|CLIENT_URL=.*|CLIENT_URL=$NGROK_URL|g" .env
echo "✅ .env updated with ngrok URL: $NGROK_URL"
```

### Step 4: Start Your Application

Open 3 new terminals:

**Terminal A: Backend**
```bash
cd /Users/persylopez/sitesprintz
npm run dev:server
```

Expected output:
```
✅ Server running on http://localhost:3000
✅ Google OAuth configured
📍 Callback URL: https://YOUR-NGROK-URL/auth/google/callback
```

**Terminal B: Frontend**
```bash
cd /Users/persylopez/sitesprintz
npm run dev:client
```

Expected output:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

**Terminal C: ngrok Web Interface (Optional)**
```bash
open http://127.0.0.1:4040
```

### Step 5: Test Google Authentication

1. **Open registration page:**
   ```
   https://YOUR-NGROK-URL/register.html
   ```
   Example:
   ```
   https://abc123def456.ngrok.io/register.html
   ```

2. **Click "Sign in with Google"**

3. **Complete Google authentication:**
   - Select your Google account
   - Grant permissions
   - You'll be redirected back to your app

4. **Check backend logs:**
   ```
   ✅ Google OAuth configured
   🚀 Initiating Google OAuth...
   🎯 CALLBACK HIT - Starting passport authentication...
   🎯 Passport authenticate callback fired
   🔥🔥🔥 OAUTH CALLBACK FIRED 🔥🔥🔥
   User email: your-email@gmail.com
   ✅ REDIRECTING TO: [success page]
   ```

5. **Verify in database:**
   - New user created in `users` table
   - `auth_provider` = 'google'
   - `google_id` populated
   - `email_verified` = true

## Monitoring & Debugging

### ngrok Web Interface

Access: `http://127.0.0.1:4040`

**Features:**
- View all HTTP requests in real-time
- Inspect request/response headers
- View response bodies
- Replay requests for testing
- Monitor tunnels and connections

### Backend Logs

Watch backend logs for OAuth flow:
```
🚀 Initiating Google OAuth...
🎯 CALLBACK HIT - Starting passport authentication...
🔥🔥🔥 OAUTH CALLBACK FIRED 🔥🔥🔥
```

### Common Log Lines

| Log | Meaning |
|-----|---------|
| `✅ Google OAuth configured` | Credentials loaded correctly |
| `📍 Callback URL: ...` | Callback URL being used |
| `🚀 Initiating Google OAuth...` | User clicked "Sign in with Google" |
| `🎯 CALLBACK HIT` | Google redirected back to you |
| `User email: ...` | OAuth succeeded, user data received |
| `✅ REDIRECTING TO:` | Successful redirect after auth |

## Troubleshooting

### Issue: "Redirect URI mismatch"

**Symptom:** Google shows error "The redirect_uri parameter of the request does not match the registered redirect_uri values."

**Solution:**
1. Check ngrok URL is public: `https://abc123def456.ngrok.io`
2. Verify in `.env`: `GOOGLE_CALLBACK_URL=https://abc123def456.ngrok.io/auth/google/callback`
3. Verify in Google Console: Authorized redirect URIs includes the exact URL
4. **Case-sensitive!** URLs must match exactly

**Debug:**
```bash
# Check your .env
grep GOOGLE_CALLBACK_URL .env

# Check ngrok URL
curl -s http://127.0.0.1:4040/api/tunnels | jq '.tunnels[0].public_url'

# Check Google Console manually
# Go to https://console.cloud.google.com/apis/credentials
```

### Issue: "Invalid client"

**Symptom:** Error during OAuth: "invalid_client"

**Solution:**
1. Verify `GOOGLE_CLIENT_ID` is correct (ends with `.apps.googleusercontent.com`)
2. Verify `GOOGLE_CLIENT_SECRET` is not expired or revoked
3. Check in Google Console that credentials still exist
4. Try regenerating credentials if needed

**Debug:**
```bash
# Check credentials in .env
grep GOOGLE_CLIENT_ID .env
grep GOOGLE_CLIENT_SECRET .env

# Verify backend loaded them
# Look for: "✅ Google OAuth configured"
```

### Issue: ngrok URL not accessible

**Symptom:** Can't reach `https://YOUR-NGROK-URL`

**Solutions:**
1. **Check ngrok is running:**
   ```bash
   ps aux | grep ngrok
   ```

2. **Check ngrok status is "online":**
   - Run `ngrok http 3000`
   - Look for green "online" status

3. **Verify forwarding is correct:**
   - Should say: `Forwarding https://... -> http://localhost:3000`

4. **Check backend is running:**
   ```bash
   curl http://localhost:3000
   ```

### Issue: "Can't reach backend" from ngrok URL

**Symptom:** Frontend can't connect to backend through ngrok

**Solution 1: CORS Configuration**
```javascript
// In server setup
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
```

**Solution 2: Single ngrok tunnel**
- If using one ngrok URL for both frontend and backend
- Frontend sends requests to same `GOOGLE_CALLBACK_URL` domain
- Make sure CORS allows it

**Solution 3: Separate ngrok tunnels**
```bash
# Terminal 1: Backend
ngrok http 3000

# Terminal 2: Frontend
ngrok http 5173

# Then update .env with both URLs
GOOGLE_CALLBACK_URL=https://BACKEND-URL/auth/google/callback
CLIENT_URL=https://FRONTEND-URL
```

## Important Notes

### ngrok URLs are Temporary

⚠️ **Every time you restart ngrok, you get a new URL**

When you stop and restart ngrok:
```bash
# Old URL: https://abc123def456.ngrok.io
# Stop ngrok (Ctrl+C)
# Restart ngrok (ngrok http 3000)
# New URL: https://xyz789abc123.ngrok.io  ← Different!
```

**You must then:**
1. Update Google Console Authorized URIs
2. Update `.env`
3. Restart your app

### Persistent Domains (Paid Feature)

If you're doing frequent testing, consider ngrok's paid tier for static domains:
```bash
ngrok http 3000 --domain=your-static-domain.ngrok.io
```

This keeps the same URL across sessions.

### Security Considerations

- ✅ ngrok URLs are HTTPS (encrypted)
- ✅ Only you can access your URL (unless shared)
- ⚠️ Don't commit `.env` with real credentials to git
- ⚠️ Use `.env` with `git ignore` to keep secrets local

### Best Practices

1. **One ngrok session per dev session**
   - Start ngrok once
   - Keep it running
   - Don't restart unless needed

2. **Keep .env updated**
   - Update when ngrok URL changes
   - Or use environment variables

3. **Monitor ngrok dashboard**
   - http://127.0.0.1:4040
   - Watch requests in real-time
   - Debug issues by inspecting traffic

4. **Keep logs visible**
   - Terminal A: Backend logs
   - Terminal B: Frontend logs
   - Terminal C: ngrok dashboard (optional)

## Reference Commands

```bash
# Start ngrok on port 3000
ngrok http 3000

# Get current ngrok URL (while running)
curl -s http://127.0.0.1:4040/api/tunnels | jq '.tunnels[0].public_url'

# View all tunnels
ngrok tunnels list

# Stop ngrok
Ctrl+C

# Use setup script
bash scripts/ngrok-auth-setup.sh

# Test backend directly
curl http://localhost:3000

# Check if port is in use
lsof -i :3000
```

## Next Steps

After confirming Google OAuth works through ngrok:

1. **Deploy to staging:** Test with real domain
2. **Configure production:** Update Google Console for production URL
3. **SSL certificate:** Ensure production uses valid SSL
4. **Security headers:** Add proper CORS, CSP headers

## Support

For issues:
1. Check ngrok dashboard: http://127.0.0.1:4040
2. Check backend logs for OAuth flow
3. Verify Google Console configuration
4. Review this guide's troubleshooting section

---

## Related Documentation

| Topic | Doc |
|-------|-----|
| Local setup | [QUICK-START.md](./QUICK-START.md) |
| Integrations | [INTEGRATION-SETUP.md](./INTEGRATION-SETUP.md) |
| Site creation | [../verification/SITE_CREATION_PROCESS_VERIFICATION.md](../verification/SITE_CREATION_PROCESS_VERIFICATION.md) |

**Doc index**: [../README.md](../README.md)  
**Maintaining docs**: Update this file when OAuth setup changes — [../governance/AGENT_DOCUMENTATION_GUIDE.md](../governance/AGENT_DOCUMENTATION_GUIDE.md)

**Last updated**: June 2026
