# 📚 DATABASE MIGRATION - COMPLETE DOCUMENTATION

**Last Updated:** November 1, 2025  
**Purpose:** Comprehensive guide to the database migration from JSON files to PostgreSQL

---

## 📖 **TABLE OF CONTENTS**

1. [Overview](#overview)
2. [Why We're Migrating](#why-migrating)
3. [Database Architecture](#architecture)
4. [Table Structure](#tables)
5. [Migration Scripts](#scripts)
6. [Authentication Flow](#auth-flow)
7. [Data Flow Diagrams](#data-flow)
8. [Common Operations](#operations)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 **OVERVIEW** {#overview}

### **What Are We Doing?**

We're moving data from **JSON files** to **PostgreSQL database**.

**Before:**
```
/users/user@email.com.json         → User data in files
/public/sites/site-id/site.json    → Site data in files
/public/sites/site-id/submissions.json → Form submissions in files
```

**After:**
```
PostgreSQL Database
├── users table         → All user data
├── sites table         → All site data
├── submissions table   → All form submissions
├── analytics_events    → New: Real analytics tracking
└── migration_log       → Track migration progress
```

### **What Changes for Users?**

**Nothing!** The website works exactly the same way. We're just changing **how** data is stored (not **what** is stored).

---

## 🤔 **WHY WE'RE MIGRATING** {#why-migrating}

### **Problems with JSON Files:**

| Problem | Impact | Example |
|---------|--------|---------|
| **Race Conditions** | Data loss | Two users edit site → one change lost |
| **Slow Performance** | Bad UX | Loading 1,000 sites takes 10 seconds |
| **No Real Analytics** | Can't grow | Can't track actual visits |
| **Limited Queries** | Can't search | Can't find "users who published this week" |
| **No Relationships** | Manual work | Hard to find "all sites by user X" |

### **Benefits of PostgreSQL:**

| Benefit | Impact | Example |
|---------|--------|---------|
| **ACID Transactions** | No data loss | Concurrent edits handled safely |
| **Fast Queries** | Great UX | 1,000 sites load in 50ms |
| **Real Analytics** | Business insights | Track actual page views |
| **Complex Queries** | Powerful | "Users who published this week" = instant |
| **Relationships** | Automatic | Foreign keys handle relationships |

---

## 🏗️ **DATABASE ARCHITECTURE** {#architecture}

### **Connection Setup**

```javascript
// database/db.js
import { Pool } from 'pg';

// Pool = Connection manager
// Maintains 1-20 active connections
// Reuses connections for performance
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for Neon
});

// Helper function: Run a query
export async function query(text, params) {
  const res = await pool.query(text, params);
  return res;
}

// Helper function: Transaction (all-or-nothing)
export async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');      // Start transaction
    const result = await callback(client);
    await client.query('COMMIT');     // Save changes
    return result;
  } catch (error) {
    await client.query('ROLLBACK');   // Undo changes
    throw error;
  } finally {
    client.release();                 // Return connection to pool
  }
}
```

**What This Means:**
- `Pool` = Like a parking lot for database connections
- `query()` = Send a SQL command, get results back
- `transaction()` = Multiple queries that all succeed or all fail together

---

## 📊 **TABLE STRUCTURE** {#tables}

### **1. USERS TABLE**

**Purpose:** Store user accounts, authentication, and subscription info

**Structure:**
```sql
CREATE TABLE users (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- Unique ID (auto-generated)
  email VARCHAR(255) UNIQUE NOT NULL,             -- Login email (must be unique)
  password_hash VARCHAR(255) NOT NULL,            -- Encrypted password (bcrypt)
  
  -- Authorization
  role VARCHAR(50) DEFAULT 'user',                -- 'user' or 'admin'
  status VARCHAR(50) DEFAULT 'active',            -- 'active', 'suspended', 'deleted'
  
  -- Stripe Integration
  stripe_customer_id VARCHAR(255) UNIQUE,         -- Stripe customer reference
  subscription_status VARCHAR(50),                -- 'active', 'canceled', etc.
  subscription_plan VARCHAR(50),                  -- 'starter', 'pro', 'premium'
  subscription_id VARCHAR(255),                   -- Stripe subscription ID
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  
  -- Migration Reference
  json_file_path VARCHAR(500)                     -- Original JSON file (for rollback)
);
```

**What Each Field Does:**

| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| `id` | UUID | Unique identifier | `550e8400-e29b-41d4-a716-446655440000` |
| `email` | VARCHAR | Login username | `user@example.com` |
| `password_hash` | VARCHAR | Encrypted password | `$2a$10$N9qo8uLO...` (bcrypt hash) |
| `role` | VARCHAR | Permission level | `user` (normal) or `admin` (full access) |
| `status` | VARCHAR | Account state | `active` (can login) or `suspended` (blocked) |
| `stripe_customer_id` | VARCHAR | Links to Stripe | `cus_ABC123DEF456` |
| `subscription_status` | VARCHAR | Payment state | `active` (paid) or `canceled` (expired) |
| `subscription_plan` | VARCHAR | Current tier | `starter` ($10), `pro` ($25) |
| `subscription_id` | VARCHAR | Stripe sub ID | `sub_XYZ789` |
| `created_at` | TIMESTAMP | When account made | `2025-11-01 08:00:00` |
| `updated_at` | TIMESTAMP | Last change | `2025-11-01 09:30:00` |
| `last_login` | TIMESTAMP | Last login time | `2025-11-01 09:30:00` |
| `json_file_path` | VARCHAR | Backup reference | `/users/user@example.com.json` |

**Indexes (Make queries fast):**
```sql
CREATE INDEX idx_users_email ON users(email);              -- Login: Find user by email (instant)
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);  -- Webhooks: Find by Stripe ID
CREATE INDEX idx_users_status ON users(status);            -- Admin: Filter by status
CREATE INDEX idx_users_created_at ON users(created_at DESC);  -- Reports: Sort by newest
```

**Triggers (Automatic actions):**
```sql
-- Automatically update 'updated_at' when user is modified
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Example Queries:**

```sql
-- Register new user
INSERT INTO users (email, password_hash, role, status)
VALUES ('user@example.com', '$2a$10$hashed...', 'user', 'active')
RETURNING id, email, role;

-- Login: Find user by email
SELECT * FROM users WHERE email = 'user@example.com';

-- Update last login
UPDATE users SET last_login = NOW() WHERE id = '550e8400-e29b...';

-- Find all active users
SELECT email, created_at FROM users WHERE status = 'active';

-- Find user by Stripe customer ID (for webhooks)
SELECT * FROM users WHERE stripe_customer_id = 'cus_ABC123';
```

---

### **2. SITES TABLE**

**Purpose:** Store all published websites and their data

**Structure:**
```sql
CREATE TABLE sites (
  -- Identity
  id VARCHAR(255) PRIMARY KEY,                    -- Site ID (subdomain)
  user_id UUID NOT NULL REFERENCES users(id),     -- Owner (foreign key)
  
  -- Site Info
  subdomain VARCHAR(255) UNIQUE NOT NULL,         -- URL: subdomain.sitesprintz.com
  template_id VARCHAR(100) NOT NULL,              -- Which template used
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft',             -- 'draft', 'published', 'expired'
  plan VARCHAR(50) DEFAULT 'free',                -- 'free', 'starter', 'pro', 'premium'
  
  -- Timestamps
  published_at TIMESTAMP WITH TIME ZONE,          -- When made live
  expires_at TIMESTAMP WITH TIME ZONE,            -- Free trial expiration
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Trial Management
  warning_2days_sent BOOLEAN DEFAULT false,       -- Sent "2 days left" email?
  warning_1day_sent BOOLEAN DEFAULT false,        -- Sent "1 day left" email?
  expiration_email_sent BOOLEAN DEFAULT false,    -- Sent "expired" email?
  
  -- Full Site Data (JSON)
  site_data JSONB NOT NULL,                       -- All site content (brand, hero, services, etc.)
  
  -- Migration Reference
  json_file_path VARCHAR(500)                     -- Original JSON file
);
```

**What Each Field Does:**

| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| `id` | VARCHAR | Unique site ID | `joes-pizza-abc123` |
| `user_id` | UUID | Who owns this site | `550e8400-e29b-41d4...` (links to users table) |
| `subdomain` | VARCHAR | Website URL | `joes-pizza` (becomes joes-pizza.sitesprintz.com) |
| `template_id` | VARCHAR | Template used | `restaurant`, `salon`, `gym` |
| `status` | VARCHAR | Current state | `draft` (building), `published` (live), `expired` (trial ended) |
| `plan` | VARCHAR | Subscription tier | `free` (trial), `starter` ($10), `pro` ($25) |
| `published_at` | TIMESTAMP | Go-live date | `2025-11-01 10:00:00` |
| `expires_at` | TIMESTAMP | Trial end date | `2025-11-08 10:00:00` (7 days later) |
| `created_at` | TIMESTAMP | First created | `2025-11-01 09:00:00` |
| `updated_at` | TIMESTAMP | Last modified | `2025-11-01 14:30:00` |
| `warning_2days_sent` | BOOLEAN | Email sent? | `true` = yes, `false` = no |
| `warning_1day_sent` | BOOLEAN | Email sent? | `true` = yes, `false` = no |
| `expiration_email_sent` | BOOLEAN | Email sent? | `true` = yes, `false` = no |
| `site_data` | JSONB | Full site content | `{"brand": {"name": "Joe's Pizza"}, "hero": {...}}` |
| `json_file_path` | VARCHAR | Backup reference | `/public/sites/joes-pizza-abc123/site.json` |

**JSONB (site_data) Structure:**
```json
{
  "brand": {
    "name": "Joe's Pizza",
    "logo": "logo.png"
  },
  "hero": {
    "title": "Best Pizza in Town",
    "subtitle": "Fresh ingredients, traditional recipes",
    "image": "hero.jpg"
  },
  "services": [
    {"name": "Margherita", "price": "$12"},
    {"name": "Pepperoni", "price": "$14"}
  ],
  "contact": {
    "email": "joe@pizza.com",
    "phone": "(555) 123-4567",
    "address": "123 Main St"
  }
}
```

**Indexes:**
```sql
CREATE INDEX idx_sites_user_id ON sites(user_id);        -- Find all sites by user
CREATE INDEX idx_sites_subdomain ON sites(subdomain);    -- Load site by URL
CREATE INDEX idx_sites_status ON sites(status);          -- Filter by status
CREATE INDEX idx_sites_plan ON sites(plan);              -- Filter by plan
CREATE INDEX idx_sites_expires_at ON sites(expires_at);  -- Find expiring trials
CREATE INDEX idx_sites_template_id ON sites(template_id); -- Popular templates
CREATE INDEX idx_sites_data ON sites USING GIN (site_data);  -- Search inside JSON
```

**Example Queries:**

```sql
-- Publish a site
INSERT INTO sites (id, user_id, subdomain, template_id, status, plan, published_at, expires_at, site_data)
VALUES (
  'joes-pizza-abc123',
  '550e8400-e29b...',
  'joes-pizza',
  'restaurant',
  'published',
  'free',
  NOW(),
  NOW() + INTERVAL '7 days',
  '{"brand": {"name": "Joe''s Pizza"}}'::jsonb
);

-- Load site by subdomain (for public viewing)
SELECT * FROM sites WHERE subdomain = 'joes-pizza' AND status = 'published';

-- Get all sites for a user (dashboard)
SELECT id, subdomain, template_id, status, plan, published_at, expires_at
FROM sites
WHERE user_id = '550e8400-e29b...'
ORDER BY created_at DESC;

-- Find sites expiring in 2 days (for email alerts)
SELECT s.*, u.email as owner_email
FROM sites s
JOIN users u ON s.user_id = u.id
WHERE s.status = 'published'
  AND s.plan = 'free'
  AND s.expires_at BETWEEN NOW() AND NOW() + INTERVAL '2 days'
  AND s.warning_2days_sent = false;

-- Update site content
UPDATE sites
SET site_data = '{"brand": {"name": "Joe''s NEW Pizza"}}'::jsonb,
    updated_at = NOW()
WHERE id = 'joes-pizza-abc123';

-- Search sites by business name (inside JSON)
SELECT id, subdomain, site_data->>'brand' as brand
FROM sites
WHERE site_data->'brand'->>'name' ILIKE '%pizza%';
```

---

### **3. SUBMISSIONS TABLE**

**Purpose:** Store contact form submissions from published sites

**Structure:**
```sql
CREATE TABLE submissions (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- Unique submission ID
  site_id VARCHAR(255) NOT NULL REFERENCES sites(id),  -- Which site (foreign key)
  
  -- Form Data
  name VARCHAR(255),                              -- Contact name
  email VARCHAR(255),                             -- Contact email
  phone VARCHAR(50),                              -- Contact phone
  message TEXT,                                   -- Their message
  form_type VARCHAR(100),                         -- 'contact', 'quote', 'booking', etc.
  
  -- Additional Data (JSON)
  custom_data JSONB,                              -- Extra fields (varies by form)
  
  -- Status
  status VARCHAR(50) DEFAULT 'unread',            -- 'unread', 'read', 'archived', 'spam'
  
  -- Metadata
  user_agent TEXT,                                -- Browser info
  ip_address VARCHAR(45),                         -- Visitor IP
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE                -- When marked as read
);
```

**What Each Field Does:**

| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| `id` | UUID | Unique submission ID | `123e4567-e89b-12d3-a456-426614174000` |
| `site_id` | VARCHAR | Which site | `joes-pizza-abc123` (links to sites table) |
| `name` | VARCHAR | Contact name | `John Smith` |
| `email` | VARCHAR | Contact email | `john@example.com` |
| `phone` | VARCHAR | Contact phone | `(555) 123-4567` |
| `message` | TEXT | Their message | `I'd like to order 5 pizzas...` |
| `form_type` | VARCHAR | Form purpose | `contact`, `quote`, `booking` |
| `custom_data` | JSONB | Extra fields | `{"pizzas": 5, "delivery_time": "6pm"}` |
| `status` | VARCHAR | Read status | `unread` (new), `read` (seen), `archived`, `spam` |
| `user_agent` | TEXT | Browser | `Mozilla/5.0 (Windows NT 10.0...)` |
| `ip_address` | VARCHAR | Visitor IP | `192.168.1.1` |
| `created_at` | TIMESTAMP | When submitted | `2025-11-01 15:30:00` |
| `read_at` | TIMESTAMP | When read | `2025-11-01 16:00:00` |

**Indexes:**
```sql
CREATE INDEX idx_submissions_site_id ON submissions(site_id);  -- Get all for a site
CREATE INDEX idx_submissions_status ON submissions(status);    -- Filter by status
CREATE INDEX idx_submissions_created_at ON submissions(created_at DESC);  -- Newest first
CREATE INDEX idx_submissions_email ON submissions(email);      -- Find by email
CREATE INDEX idx_submissions_message_search ON submissions     -- Full-text search
  USING GIN (to_tsvector('english', message));
```

**Example Queries:**

```sql
-- Save new submission
INSERT INTO submissions (site_id, name, email, phone, message, form_type, custom_data, ip_address, user_agent)
VALUES (
  'joes-pizza-abc123',
  'John Smith',
  'john@example.com',
  '(555) 123-4567',
  'I need 5 pizzas for a party',
  'contact',
  '{"pizzas": 5, "delivery_time": "6pm"}'::jsonb,
  '192.168.1.1',
  'Mozilla/5.0...'
)
RETURNING id;

-- Get all submissions for a site (dashboard)
SELECT * FROM submissions
WHERE site_id = 'joes-pizza-abc123'
ORDER BY created_at DESC;

-- Get unread submissions only
SELECT * FROM submissions
WHERE site_id = 'joes-pizza-abc123' AND status = 'unread'
ORDER BY created_at DESC;

-- Mark as read
UPDATE submissions
SET status = 'read', read_at = NOW()
WHERE id = '123e4567-e89b...';

-- Search messages for keyword
SELECT * FROM submissions
WHERE site_id = 'joes-pizza-abc123'
  AND to_tsvector('english', message) @@ to_tsquery('english', 'party');

-- Get submission count by site
SELECT site_id, COUNT(*) as total_submissions
FROM submissions
GROUP BY site_id;

-- Paginate submissions (25 per page)
SELECT * FROM submissions
WHERE site_id = 'joes-pizza-abc123'
ORDER BY created_at DESC
LIMIT 25 OFFSET 0;  -- Page 1: OFFSET 0, Page 2: OFFSET 25, etc.
```

---

### **4. ANALYTICS_EVENTS TABLE**

**Purpose:** Track real user behavior on published sites (NEW FEATURE!)

**Structure:**
```sql
CREATE TABLE analytics_events (
  -- Identity
  id BIGSERIAL PRIMARY KEY,                       -- Auto-incrementing ID
  site_id VARCHAR(255) REFERENCES sites(id),      -- Which site
  
  -- Event Info
  event_type VARCHAR(50) NOT NULL,                -- 'page_view', 'click', 'submit', 'conversion'
  page_path VARCHAR(500),                         -- Which page: '/menu', '/contact'
  referrer TEXT,                                  -- Where they came from
  
  -- User Context
  user_agent TEXT,                                -- Browser/device
  ip_address VARCHAR(45),                         -- Visitor IP
  session_id VARCHAR(255),                        -- Track user session
  
  -- Additional Data
  metadata JSONB,                                 -- Extra event data
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**What This Enables:**

**Before (JSON):**
```javascript
// Analytics were FAKE (random numbers)
const views = Math.floor(Math.random() * 1000);  // ❌ Not real!
```

**After (Database):**
```sql
-- Track real page views
INSERT INTO analytics_events (site_id, event_type, page_path)
VALUES ('joes-pizza-abc123', 'page_view', '/menu');

-- Get REAL analytics
SELECT COUNT(*) as total_views
FROM analytics_events
WHERE site_id = 'joes-pizza-abc123'
  AND event_type = 'page_view';
```

**Example Queries:**

```sql
-- Track page view
INSERT INTO analytics_events (site_id, event_type, page_path, ip_address, user_agent, session_id)
VALUES (
  'joes-pizza-abc123',
  'page_view',
  '/menu',
  '192.168.1.1',
  'Mozilla/5.0...',
  'session_abc123'
);

-- Get total views for a site
SELECT COUNT(*) as total_views
FROM analytics_events
WHERE site_id = 'joes-pizza-abc123' AND event_type = 'page_view';

-- Views in last 7 days
SELECT COUNT(*) as views_last_week
FROM analytics_events
WHERE site_id = 'joes-pizza-abc123'
  AND event_type = 'page_view'
  AND created_at > NOW() - INTERVAL '7 days';

-- Most popular pages
SELECT page_path, COUNT(*) as views
FROM analytics_events
WHERE site_id = 'joes-pizza-abc123' AND event_type = 'page_view'
GROUP BY page_path
ORDER BY views DESC
LIMIT 10;

-- Unique visitors (by IP)
SELECT COUNT(DISTINCT ip_address) as unique_visitors
FROM analytics_events
WHERE site_id = 'joes-pizza-abc123' AND event_type = 'page_view';

-- Views by day (chart data)
SELECT DATE(created_at) as date, COUNT(*) as views
FROM analytics_events
WHERE site_id = 'joes-pizza-abc123' AND event_type = 'page_view'
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 30;
```

---

### **5. MIGRATION_LOG TABLE**

**Purpose:** Track migration progress and errors (debugging tool)

**Structure:**
```sql
CREATE TABLE migration_log (
  id SERIAL PRIMARY KEY,                          -- Auto-incrementing ID
  migration_type VARCHAR(100) NOT NULL,           -- 'users', 'sites', 'submissions'
  source_path VARCHAR(500) NOT NULL,              -- Original JSON file path
  target_id VARCHAR(255),                         -- ID in destination table
  status VARCHAR(50) NOT NULL,                    -- 'success', 'failed', 'skipped'
  error_message TEXT,                             -- Error details (if failed)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Example:**
```sql
-- Log successful user migration
INSERT INTO migration_log (migration_type, source_path, target_id, status)
VALUES ('users', '/users/john@example.com.json', '550e8400-e29b...', 'success');

-- Log failed migration
INSERT INTO migration_log (migration_type, source_path, status, error_message)
VALUES ('sites', '/sites/broken-site/site.json', 'failed', 'Missing owner email');

-- Check migration summary
SELECT migration_type, status, COUNT(*) as count
FROM migration_log
GROUP BY migration_type, status
ORDER BY migration_type, status;
```

---

## 🔧 **MIGRATION SCRIPTS** {#scripts}

### **File: `database/db.js`**

**Purpose:** Database connection manager

**What it does:**
1. Creates a connection pool (parking lot for DB connections)
2. Provides helper functions for queries
3. Handles errors automatically
4. Manages transactions (all-or-nothing operations)

**Key Functions:**

```javascript
// 1. Execute a query
await query('SELECT * FROM users WHERE email = $1', ['user@example.com']);
// Returns: { rows: [...], rowCount: 1 }

// 2. Run a transaction
await transaction(async (client) => {
  // All these queries succeed together or fail together
  await client.query('INSERT INTO users...');
  await client.query('INSERT INTO sites...');
  await client.query('INSERT INTO migration_log...');
  // If any fail, ALL are rolled back (undone)
});

// 3. Test connection
await testConnection();
// Returns: true (connected) or false (failed)
```

---

### **File: `database/schema.sql`**

**Purpose:** Create all tables and indexes

**What it does:**
1. Creates 5 tables (users, sites, submissions, analytics_events, migration_log)
2. Adds indexes for fast queries
3. Sets up triggers for auto-updating timestamps
4. Defines foreign key relationships

**How to run:**
```bash
node database/run-schema.js
```

**What happens:**
```
🚀 Running database schema...
✅ Connected to database
✅ Schema executed successfully!

📊 Tables created:
  - analytics_events
  - migration_log
  - sites
  - submissions
  - users
```

---

### **File: `database/run-schema.js`**

**Purpose:** Execute the schema.sql file

**What it does:**
1. Connects to database
2. Reads schema.sql
3. Executes all SQL commands
4. Verifies tables were created
5. Shows success/error message

**Code Walkthrough:**
```javascript
import { Client } from 'pg';

async function runSchema() {
  // Step 1: Connect to database
  const client = new Client({
    connectionString: 'postgresql://...',
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  console.log('✅ Connected');
  
  // Step 2: Read SQL file
  const schema = await fs.readFile('schema.sql', 'utf-8');
  
  // Step 3: Execute SQL
  await client.query(schema);
  console.log('✅ Schema executed');
  
  // Step 4: Verify tables exist
  const result = await client.query(`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `);
  
  console.log('📊 Tables created:');
  result.rows.forEach(row => console.log(`  - ${row.tablename}`));
  
  await client.end();
}
```

---

### **File: `database/test-connection.js`**

**Purpose:** Verify database connection works

**What it does:**
1. Attempts to connect
2. Runs a simple query (`SELECT NOW()`)
3. Shows success or error

**When to use:**
- After initial setup
- When troubleshooting connection issues
- Before running migrations

**How to run:**
```bash
node database/test-connection.js
```

**Expected output:**
```
🔌 Attempting to connect...
✅ Connected!
✅ Query successful: { now: 2025-11-01T08:02:14.201Z }
```

---

## 🔐 **AUTHENTICATION FLOW** {#auth-flow}

### **Before (JSON Files):**

```
User registers:
1. Hash password with bcrypt
2. Create user object
3. Save to /users/email@example.com.json
4. Return JWT token

User logs in:
1. Read /users/email@example.com.json
2. Compare password with bcrypt
3. Return JWT token

Protected route:
1. Verify JWT token
2. Read user file to check status
3. Allow/deny access
```

### **After (Database):**

```
User registers:
1. Hash password with bcrypt
2. INSERT INTO users (email, password_hash, ...) VALUES (...)
3. Return JWT token

User logs in:
1. SELECT * FROM users WHERE email = '...'
2. Compare password with bcrypt
3. UPDATE users SET last_login = NOW() WHERE id = '...'
4. Return JWT token

Protected route:
1. Verify JWT token
2. SELECT * FROM users WHERE id = '...' (instant!)
3. Allow/deny access
```

**Key Differences:**
- 📁 **Before:** Read entire file from disk (slow)
- ⚡ **After:** Query indexed database (instant)
- 🔒 **Before:** Race conditions possible
- ✅ **After:** ACID guarantees (safe)

---

## 📊 **DATA FLOW DIAGRAMS** {#data-flow}

### **User Registration Flow:**

```
┌─────────────────────────────────────────────────────────┐
│ Frontend: /register.html                                 │
│ User fills form: email + password                        │
└──────────────────┬──────────────────────────────────────┘
                   │ POST /api/auth/register
                   ▼
┌─────────────────────────────────────────────────────────┐
│ Backend: server.js                                       │
│ 1. Validate email & password                             │
│ 2. Hash password with bcrypt                             │
│ 3. INSERT INTO users (...) RETURNING id                  │
│ 4. Generate JWT token                                    │
│ 5. Send welcome email                                    │
└──────────────────┬──────────────────────────────────────┘
                   │ Return: { token, user: {...} }
                   ▼
┌─────────────────────────────────────────────────────────┐
│ Frontend: Save token to localStorage                     │
│ Redirect to /dashboard.html                              │
└─────────────────────────────────────────────────────────┘
```

### **Site Publishing Flow:**

```
┌─────────────────────────────────────────────────────────┐
│ Frontend: /setup.html                                    │
│ User customizes site + clicks "Publish"                  │
└──────────────────┬──────────────────────────────────────┘
                   │ POST /api/publish
                   ▼
┌─────────────────────────────────────────────────────────┐
│ Backend: server.js                                       │
│ 1. Verify JWT token                                      │
│ 2. Generate subdomain                                    │
│ 3. Check plan (free/starter/pro)                         │
│ 4. If free: Set expires_at = NOW() + 7 days              │
│ 5. INSERT INTO sites (...)                               │
│ 6. Create HTML files in /sites/[subdomain]/              │
│ 7. Send confirmation email                               │
└──────────────────┬──────────────────────────────────────┘
                   │ Return: { subdomain, url, expiresAt }
                   ▼
┌─────────────────────────────────────────────────────────┐
│ Frontend: Show success + link to live site               │
│ Redirect to dashboard                                    │
└─────────────────────────────────────────────────────────┘
```

### **Contact Form Submission Flow:**

```
┌─────────────────────────────────────────────────────────┐
│ Visitor fills form on: joes-pizza.sitesprintz.com        │
│ Name: John, Email: john@example.com, Message: "..."      │
└──────────────────┬──────────────────────────────────────┘
                   │ POST /api/contact-form
                   ▼
┌─────────────────────────────────────────────────────────┐
│ Backend: server.js                                       │
│ 1. Validate email format                                 │
│ 2. Get site owner from sites table                       │
│ 3. INSERT INTO submissions (...)                         │
│ 4. Send email to site owner                              │
└──────────────────┬──────────────────────────────────────┘
                   │ Return: { success: true }
                   ▼
┌─────────────────────────────────────────────────────────┐
│ Frontend: Show "✅ Message sent!" confirmation           │
└─────────────────────────────────────────────────────────┘
```

### **Trial Expiration Check (Cron Job):**

```
┌─────────────────────────────────────────────────────────┐
│ Cron Job: Runs daily at 9 AM                             │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ Query: Find sites expiring in 2 days                     │
│ SELECT * FROM sites WHERE                                │
│   expires_at BETWEEN NOW() AND NOW() + INTERVAL '2 days' │
│   AND warning_2days_sent = false                         │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ For each site:                                           │
│ 1. Send "Trial expiring soon" email                      │
│ 2. UPDATE sites SET warning_2days_sent = true            │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ Query: Find expired sites                                │
│ SELECT * FROM sites WHERE                                │
│   expires_at < NOW() AND status = 'published'            │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ For each expired site:                                   │
│ 1. UPDATE sites SET status = 'expired'                   │
│ 2. Send "Trial expired" email                            │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ **COMMON OPERATIONS** {#operations}

### **How to: Add a New User**

```javascript
// Backend code
const hashedPassword = await bcrypt.hash(password, 10);

await db.query(`
  INSERT INTO users (email, password_hash, role, status)
  VALUES ($1, $2, 'user', 'active')
  RETURNING id, email
`, [email, hashedPassword]);
```

### **How to: Load a User's Sites**

```javascript
// Backend code
const result = await db.query(`
  SELECT id, subdomain, template_id, status, plan, published_at, expires_at
  FROM sites
  WHERE user_id = $1
  ORDER BY created_at DESC
`, [userId]);

const sites = result.rows;
```

### **How to: Check If Subdomain Exists**

```javascript
// Backend code
const result = await db.query(`
  SELECT id FROM sites WHERE subdomain = $1
`, [subdomain]);

const exists = result.rows.length > 0;
```

### **How to: Get Submission Count**

```javascript
// Backend code
const result = await db.query(`
  SELECT COUNT(*) as count
  FROM submissions
  WHERE site_id = $1 AND status = 'unread'
`, [siteId]);

const unreadCount = result.rows[0].count;
```

### **How to: Update Site Content**

```javascript
// Backend code
await db.query(`
  UPDATE sites
  SET site_data = $1, updated_at = NOW()
  WHERE id = $2 AND user_id = $3
`, [JSON.stringify(updatedSiteData), siteId, userId]);
```

---

## 🐛 **TROUBLESHOOTING** {#troubleshooting}

### **Problem: "password authentication failed"**

**Cause:** Wrong connection string or password

**Solution:**
1. Check `.env` file has correct `DATABASE_URL`
2. Copy connection string from Neon dashboard again
3. Make sure it includes `.c-3.` in the host
4. Test with: `node database/test-connection.js`

### **Problem: "relation does not exist"**

**Cause:** Tables not created yet

**Solution:**
```bash
node database/run-schema.js
```

### **Problem: "connect ECONNREFUSED"**

**Cause:** Database not reachable

**Solution:**
1. Check internet connection
2. Verify Neon database is running (check dashboard)
3. Test connection: `node database/test-connection.js`

### **Problem: "too many clients"**

**Cause:** Connection pool exhausted

**Solution:**
```javascript
// In db.js, make sure connections are released
await pool.end(); // Close pool when done
```

### **Problem: "column does not exist"**

**Cause:** Typo in column name or schema not up to date

**Solution:**
1. Check `database/schema.sql` for correct column names
2. Re-run schema: `node database/run-schema.js`
3. Verify table structure: `psql $DATABASE_URL -c "\d users"`

---

## 📚 **ADDITIONAL RESOURCES**

### **PostgreSQL Basics:**
- Official docs: https://www.postgresql.org/docs/
- Tutorial: https://www.postgresqltutorial.com/

### **node-postgres (pg) Library:**
- Docs: https://node-postgres.com/
- API reference: https://node-postgres.com/apis/pool

### **Neon Database:**
- Dashboard: https://console.neon.tech/
- Docs: https://neon.tech/docs/
- Status: https://status.neon.tech/

---

## 🎯 **SUMMARY**

**What we've built:**
- ✅ 5 tables for all data
- ✅ Indexes for fast queries
- ✅ Foreign keys for relationships
- ✅ Triggers for auto-updates
- ✅ Connection pool for performance
- ✅ Helper functions for queries
- ✅ Migration tracking system

**What's next:**
- Migrate users from JSON → Database
- Update authentication endpoints
- Migrate sites from JSON → Database
- Update site operations
- Test everything works!

---

**Questions? Check the troubleshooting section or ask!** 🚀

