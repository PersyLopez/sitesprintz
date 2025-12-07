# 🔑 SiteSprintz Test Credentials

**Created:** November 16, 2025

---

## Test User Accounts

### Admin User
```
Email:    admin@sitesprintz.com
Password: AdminPassword123!
Role:     admin
Status:   active
```

### Regular User
```
Email:    testuser@sitesprintz.com
Password: TestPassword123!
Role:     user
Status:   active
```

### Additional Test Users (if needed)
Create more users by visiting: http://localhost:5173/register

---

## Test Payment Card (Stripe)

```
Card Number:  4242 4242 4242 4242
Expiry:       Any future date (e.g., 12/25)
CVV:          Any 3 digits (e.g., 123)
ZIP:          Any 5 digits (e.g., 12345)
```

---

## API Endpoints for Testing

### Authentication
- POST `/api/auth/register` - Create new user
- POST `/api/auth/login` - Login
- POST `/api/auth/logout` - Logout
- GET `/api/auth/me` - Get current user
- POST `/api/auth/forgot-password` - Request password reset
- POST `/api/auth/reset-password` - Reset password

### Health Check
- GET `/health/live` - Check if server is alive
- GET `/health/ready` - Check if server is ready
- GET `/health/db` - Check database connection

---

## Quick Test Commands

### Test Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"testuser@sitesprintz.com",
    "password":"TestPassword123!"
  }'
```

### Test Registration
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"newuser@example.com",
    "password":"Password123!"
  }'
```

### Check Server Health
```bash
curl http://localhost:3000/health/live
```

---

## URLs

| Service | URL |
|---------|-----|
| React App (Local) | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| Ngrok (Public) | https://tenurial-subemarginate-fay.ngrok-free.dev |
| Ngrok Dashboard | http://localhost:4040 |

---

## Manual Testing Steps

### 1. Test Login
1. Go to: http://localhost:5173/login
2. Enter credentials:
   - Email: `testuser@sitesprintz.com`
   - Password: `TestPassword123!`
3. Click "Login"
4. ✅ Should redirect to dashboard

### 2. Test Registration
1. Go to: http://localhost:5173/register
2. Create new account with your email
3. ✅ Should create account and redirect to dashboard

### 3. Test Dashboard
1. After login, you should see:
   - Welcome message
   - "Create New Site" button
   - Empty state (no sites yet)

### 4. Create First Site
1. Click "Create New Site"
2. Browse templates
3. Select a template (e.g., Restaurant - Casual)
4. Fill in business information
5. Customize content
6. Publish site

---

## Troubleshooting

### "Unauthorized" Error
- This means invalid credentials
- Make sure you're using: `testuser@sitesprintz.com` / `TestPassword123!`
- Or create a new account via `/register`

### Backend Not Responding
```bash
# Check if backend is running
ps aux | grep "node server.js"

# Restart backend if needed
pkill -f "node server.js"
cd /Users/persylopez/sitesprintz && node server.js > server.log 2>&1 &

# Check logs
tail -f /Users/persylopez/sitesprintz/server.log
```

### React App Not Loading
```bash
# Check if React app is running
lsof -ti:5173

# Restart React app if needed
pkill -f "vite"
cd /Users/persylopez/sitesprintz && npm run dev > vite.log 2>&1 &
```

---

## Token for Authenticated Requests

After login, you'll receive a JWT token. To make authenticated API requests:

```bash
# Login first to get token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@sitesprintz.com","password":"TestPassword123!"}' \
  | jq -r '.token')

# Use token in subsequent requests
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/auth/me
```

---

**Ready to Test!** 🚀

Use these credentials to login and start testing the application.

