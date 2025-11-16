# ✅ Create Tables in Neon Database

**Database is connected!** ✅  
**But tables don't exist yet!** ❌

---

## 🎯 Run These Commands in Your psql Session

Copy and paste these into your **psql** session (the one connected to Neon):

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  status VARCHAR(50) DEFAULT 'active',
  subscription_status VARCHAR(50),
  subscription_plan VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- Sites table  
CREATE TABLE IF NOT EXISTS sites (
  id VARCHAR(255) PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  subdomain VARCHAR(255) UNIQUE NOT NULL,
  template_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'draft',
  plan VARCHAR(50) DEFAULT 'free',
  published_at TIMESTAMP,
  expires_at TIMESTAMP,
  site_data JSONB,
  json_file_path TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id SERIAL PRIMARY KEY,
  site_id VARCHAR(255) REFERENCES sites(id),
  form_type VARCHAR(100),
  data JSONB,
  status VARCHAR(50) DEFAULT 'unread',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pricing table
CREATE TABLE IF NOT EXISTS pricing (
  id SERIAL PRIMARY KEY,
  tier VARCHAR(50) UNIQUE NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  features JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default pricing
INSERT INTO pricing (tier, price, features) VALUES
  ('starter', 15.00, '["Custom domain", "Email support", "13+ templates"]'),
  ('pro', 45.00, '["Everything in Starter", "Stripe Connect", "Booking widgets"]'),
  ('premium', 100.00, '["Everything in Pro", "Priority support", "White-label"]')
ON CONFLICT (tier) DO NOTHING;
```

---

## ✅ Verify Tables Were Created

```sql
\dt
```

Should show:
- users
- sites
- submissions
- pricing

---

## 🚀 Then Test Registration

Go to: **http://localhost:5173/register**

Or test with curl:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Should return:** `{"success":true,"token":"...","user":{...}}` ✅

---

**Run the CREATE TABLE commands in your psql session now!** 🎯

