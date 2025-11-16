# 🎯 Neon Database Connection Setup

**You're using Neon.tech - Serverless PostgreSQL!**

---

## 📋 Get Your Connection String

### Option 1: From Neon Dashboard

1. Go to: https://console.neon.tech/
2. Click on your project
3. Click on "Connection Details" or "Dashboard"
4. Copy the **Connection String**

It should look like:
```
postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require
```

---

### Option 2: From Your Current psql Session

In your psql session, run:
```sql
\conninfo
```

This will show your connection details.

---

## 🔧 Update .env File

Once you have the connection string, update `.env`:

```bash
cd /Users/persylopez/sitesprintz
nano .env
```

Update this line:
```env
# Change from:
DATABASE_URL=postgresql://postgres:@localhost:5432/sitesprintz

# To (use your actual Neon connection string):
DATABASE_URL=postgresql://your_user:your_password@ep-xxx-xxx.us-east-2.aws.neon.tech/your_db?sslmode=require
```

**Important:** 
- Keep `?sslmode=require` at the end
- Replace with YOUR actual credentials from Neon dashboard

---

## ⚡ Quick Command (if you know the details)

If you have:
- Username: `neondb_owner` (or similar)
- Password: `YOUR_PASSWORD`
- Host: `ep-xxx-xxx.us-east-2.aws.neon.tech`
- Database: `neondb` (or similar)

Run:
```bash
cd /Users/persylopez/sitesprintz
cat > .env << 'EOF'
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
PORT=3000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-this
ADMIN_TOKEN=dev-token
BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
EOF
```

(Replace with your actual values!)

---

## 🚀 Then Restart Server

```bash
pkill -9 -f "node server.js"
node server.js > server.log 2>&1 &
```

---

## ✅ Test Registration

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

Should return: `{"success":true,"token":"..."}` ✅

---

## 📍 Where to Find Neon Credentials

### Method 1: Neon Dashboard
1. https://console.neon.tech/
2. Select your project
3. Copy "Connection string" from dashboard

### Method 2: Check your psql command
The command you used to connect probably had:
```bash
psql -h pg.neon.tech -U your_username -d your_database
```

Those are the values you need!

---

## 🔐 Security Note for Neon

Neon connection strings include:
- `sslmode=require` - Always use SSL
- Password in the string - Keep `.env` in `.gitignore`!
- Can be rotated from Neon dashboard

---

**Go to https://console.neon.tech/ and copy your connection string, then update `.env`!** 🚀

