# 🤖 DATABASE MIGRATION - AGENT EXECUTION PROMPT

**Mission:** Migrate SiteSprintz from JSON file storage to PostgreSQL database  
**Timeline:** Complete in 3 phases  
**Priority:** Data integrity above all else  
**Risk Level:** MEDIUM - Production system with payments

---

## 📋 PREREQUISITES (User Must Provide)

Before starting, you MUST have:

```bash
# 1. Neon Database Connection String
DATABASE_URL=postgresql://[username]:[password]@[host]/[database]?sslmode=require

# 2. Confirm these exist:
- Active Neon account
- Database created
- Connection string tested
```

**Agent: STOP if you don't have the DATABASE_URL. Ask user for it.**

---

## 🎯 MISSION OVERVIEW

### **Current State:**
- Users stored in: `/users/*.json` (1 file per user)
- Sites stored in: `/public/sites/*/site.json` (1 file per site)
- Submissions stored in: `/public/sites/*/submissions.json` (1 file per site)
- Templates: Keep as JSON (read-only, no migration needed)

### **Target State:**
- Users in: PostgreSQL `users` table
- Sites in: PostgreSQL `sites` table  
- Submissions in: PostgreSQL `submissions` table
- Templates: Still JSON files ✓

### **Strategy:**
- **Phase 1:** Database setup + Users migration (CRITICAL)
- **Phase 2:** Sites migration (HIGH PRIORITY)
- **Phase 3:** Submissions + Analytics (MEDIUM PRIORITY)
- **Safety:** Dual-write mode (write to both JSON + DB), then switch to DB-only

---

## 📦 REQUIRED DEPENDENCIES

Add to `package.json`:

```json
{
  "dependencies": {
    "pg": "^8.11.3",
    "dotenv": "^16.3.1"
  }
}
```

**Agent: Run `npm install pg dotenv` FIRST**

---

## 🗄️ PHASE 1: DATABASE SETUP + USERS MIGRATION

### **Step 1.1: Create Database Schema**

Create file: `database/schema.sql`

```sql
-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  
  -- Stripe integration
  stripe_customer_id VARCHAR(255) UNIQUE,
  subscription_status VARCHAR(50),
  subscription_plan VARCHAR(50),
  subscription_id VARCHAR(255),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  
  -- Legacy
  json_file_path VARCHAR(500) -- For rollback reference
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SITES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sites (
  id VARCHAR(255) PRIMARY KEY, -- Keep existing site IDs (subdomain)
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Site identity
  subdomain VARCHAR(255) UNIQUE NOT NULL,
  template_id VARCHAR(100) NOT NULL,
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'expired', 'suspended')),
  plan VARCHAR(50) DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'premium')),
  
  -- Timestamps
  published_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Trial expiration emails tracking
  warning_2days_sent BOOLEAN DEFAULT false,
  warning_1day_sent BOOLEAN DEFAULT false,
  expiration_email_sent BOOLEAN DEFAULT false,
  
  -- Full site data (JSON)
  site_data JSONB NOT NULL,
  
  -- Backup reference
  json_file_path VARCHAR(500)
);

-- Indexes
CREATE INDEX idx_sites_user_id ON sites(user_id);
CREATE INDEX idx_sites_subdomain ON sites(subdomain);
CREATE INDEX idx_sites_status ON sites(status);
CREATE INDEX idx_sites_plan ON sites(plan);
CREATE INDEX idx_sites_expires_at ON sites(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_sites_template_id ON sites(template_id);

-- GIN index for JSONB queries
CREATE INDEX idx_sites_data ON sites USING GIN (site_data);

-- Updated_at trigger
CREATE TRIGGER sites_updated_at
  BEFORE UPDATE ON sites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SUBMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id VARCHAR(255) NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  
  -- Form data
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  message TEXT,
  form_type VARCHAR(100), -- 'contact', 'quote', etc.
  
  -- Additional data (JSON)
  custom_data JSONB,
  
  -- Status
  status VARCHAR(50) DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived', 'spam')),
  
  -- Metadata
  user_agent TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_submissions_site_id ON submissions(site_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_created_at ON submissions(created_at DESC);
CREATE INDEX idx_submissions_email ON submissions(email);

-- Full-text search on message
CREATE INDEX idx_submissions_message_search ON submissions USING GIN (to_tsvector('english', message));

-- ============================================
-- ANALYTICS EVENTS TABLE (For future use)
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  site_id VARCHAR(255) REFERENCES sites(id) ON DELETE CASCADE,
  
  -- Event details
  event_type VARCHAR(50) NOT NULL, -- 'page_view', 'click', 'submit', 'conversion'
  page_path VARCHAR(500),
  referrer TEXT,
  
  -- User context
  user_agent TEXT,
  ip_address VARCHAR(45),
  session_id VARCHAR(255),
  
  -- Additional data
  metadata JSONB,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_analytics_site_id ON analytics_events(site_id);
CREATE INDEX idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_created_at ON analytics_events(created_at DESC);
CREATE INDEX idx_analytics_session ON analytics_events(session_id);

-- Partitioning by month (for performance with large datasets)
-- Note: This is optional for now, can be added later

-- ============================================
-- MIGRATION LOG TABLE (Track migration progress)
-- ============================================
CREATE TABLE IF NOT EXISTS migration_log (
  id SERIAL PRIMARY KEY,
  migration_type VARCHAR(100) NOT NULL, -- 'users', 'sites', 'submissions'
  source_path VARCHAR(500) NOT NULL,
  target_id VARCHAR(255),
  status VARCHAR(50) NOT NULL, -- 'success', 'failed', 'skipped'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_migration_log_type ON migration_log(migration_type);
CREATE INDEX idx_migration_log_status ON migration_log(status);
```

**Agent Action:**
1. Save this to `database/schema.sql`
2. Get DATABASE_URL from user
3. Run: `psql $DATABASE_URL -f database/schema.sql`
4. Verify all tables created: `psql $DATABASE_URL -c "\dt"`

---

### **Step 1.2: Create Database Connection Module**

Create file: `database/db.js`

```javascript
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Neon
  },
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

// Helper function: Query with error handling
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Query executed:', { text: text.substring(0, 100), duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Helper function: Transaction
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Helper function: Check connection
async function testConnection() {
  try {
    const result = await query('SELECT NOW()');
    console.log('✅ Database connection test successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
}

module.exports = {
  query,
  transaction,
  testConnection,
  pool
};
```

**Agent Action:**
1. Save this to `database/db.js`
2. Add to `.env`: `DATABASE_URL=<user-provided-url>`
3. Test: `node -e "require('./database/db').testConnection()"`

---

### **Step 1.3: Create Users Migration Script**

Create file: `database/migrate-users.js`

```javascript
const fs = require('fs').promises;
const path = require('path');
const db = require('./db');

const USERS_DIR = path.join(__dirname, '..', 'users');
const BATCH_SIZE = 50; // Process in batches for safety

async function migrateUsers() {
  console.log('🚀 Starting users migration...');
  console.log('📁 Source:', USERS_DIR);
  
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  
  try {
    // Get all user JSON files
    const files = await fs.readdir(USERS_DIR);
    const userFiles = files.filter(f => f.endsWith('.json'));
    
    console.log(`📊 Found ${userFiles.length} user files to migrate`);
    
    // Process in batches
    for (let i = 0; i < userFiles.length; i += BATCH_SIZE) {
      const batch = userFiles.slice(i, i + BATCH_SIZE);
      console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(userFiles.length / BATCH_SIZE)}`);
      
      for (const file of batch) {
        const filePath = path.join(USERS_DIR, file);
        
        try {
          // Read user JSON
          const fileContent = await fs.readFile(filePath, 'utf-8');
          const user = JSON.parse(fileContent);
          
          // Validate required fields
          if (!user.email || !user.password) {
            console.warn(`⚠️  Skipping ${file}: Missing email or password`);
            skippedCount++;
            
            await db.query(
              'INSERT INTO migration_log (migration_type, source_path, status, error_message) VALUES ($1, $2, $3, $4)',
              ['users', filePath, 'skipped', 'Missing required fields']
            );
            continue;
          }
          
          // Insert into database
          const result = await db.query(`
            INSERT INTO users (
              email, 
              password_hash, 
              role, 
              status,
              stripe_customer_id,
              subscription_status,
              subscription_plan,
              subscription_id,
              created_at,
              last_login,
              json_file_path
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (email) DO UPDATE SET
              password_hash = EXCLUDED.password_hash,
              role = EXCLUDED.role,
              status = EXCLUDED.status,
              stripe_customer_id = EXCLUDED.stripe_customer_id,
              subscription_status = EXCLUDED.subscription_status,
              subscription_plan = EXCLUDED.subscription_plan,
              subscription_id = EXCLUDED.subscription_id,
              updated_at = NOW()
            RETURNING id, email
          `, [
            user.email,
            user.password, // Already hashed in JSON
            user.role || 'user',
            user.status || 'active',
            user.stripeCustomerId || null,
            user.subscriptionStatus || null,
            user.subscriptionPlan || null,
            user.subscriptionId || null,
            user.createdAt ? new Date(user.createdAt) : new Date(),
            user.lastLogin ? new Date(user.lastLogin) : null,
            filePath
          ]);
          
          console.log(`✅ Migrated: ${user.email} (ID: ${result.rows[0].id})`);
          successCount++;
          
          // Log success
          await db.query(
            'INSERT INTO migration_log (migration_type, source_path, target_id, status) VALUES ($1, $2, $3, $4)',
            ['users', filePath, result.rows[0].id, 'success']
          );
          
        } catch (error) {
          console.error(`❌ Error migrating ${file}:`, error.message);
          errorCount++;
          
          // Log error
          await db.query(
            'INSERT INTO migration_log (migration_type, source_path, status, error_message) VALUES ($1, $2, $3, $4)',
            ['users', filePath, 'failed', error.message]
          );
        }
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY - USERS');
    console.log('='.repeat(60));
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`⚠️  Skipped: ${skippedCount}`);
    console.log(`📝 Total: ${userFiles.length}`);
    console.log('='.repeat(60));
    
    // Verify
    const count = await db.query('SELECT COUNT(*) FROM users');
    console.log(`\n🔍 Database verification: ${count.rows[0].count} users in database`);
    
    return { successCount, errorCount, skippedCount };
    
  } catch (error) {
    console.error('💥 Fatal error during migration:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  migrateUsers()
    .then(() => {
      console.log('\n✅ Users migration complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateUsers };
```

**Agent Action:**
1. Save to `database/migrate-users.js`
2. Run: `node database/migrate-users.js`
3. Verify output shows all users migrated
4. Check database: `psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"`

---

### **Step 1.4: Update Authentication Endpoints**

Update `server.js` - Add at top after requires:

```javascript
const db = require('./database/db');

// Test database connection on startup
db.testConnection().then(connected => {
  if (!connected) {
    console.error('❌ Failed to connect to database. Server will not start.');
    process.exit(1);
  }
});
```

**Find and replace the `/api/auth/register` endpoint (around line 600):**

```javascript
// OLD CODE TO REPLACE:
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  
  // Validation...
  
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = {
    id: generateId(),
    email,
    password: hashedPassword,
    role: 'user',
    status: 'active',
    sites: [],
    createdAt: new Date().toISOString()
  };
  
  const userPath = getUserFilePath(email);
  await fs.writeFile(userPath, JSON.stringify(user, null, 2));
  
  // ... rest of code
});
```

**NEW CODE (Database):**

```javascript
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  
  // Validation
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  if (!email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  
  try {
    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert user
    const result = await db.query(`
      INSERT INTO users (email, password_hash, role, status, created_at)
      VALUES ($1, $2, 'user', 'active', NOW())
      RETURNING id, email, role, status, created_at
    `, [email.toLowerCase(), hashedPassword]);
    
    const user = result.rows[0];
    
    // Generate JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Send welcome email
    try {
      await sendEmail({
        to: user.email,
        type: EmailTypes.WELCOME,
        data: {
          userName: user.email.split('@')[0],
          dashboardUrl: `${SITE_URL}/dashboard.html`
        }
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail registration if email fails
    }
    
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});
```

**Find and replace the `/api/auth/login` endpoint:**

```javascript
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  try {
    // Get user from database
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const user = result.rows[0];
    
    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is suspended' });
    }
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Update last login
    await db.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );
    
    // Generate JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});
```

**Agent Action:**
1. Update both register and login endpoints in `server.js`
2. Test registration: `curl -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"password123"}'`
3. Test login: `curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"password123"}'`
4. Verify you get JWT token back

---

### **Step 1.5: Update requireAuth Middleware**

**Find the `requireAuth` middleware in `server.js` (around line 700):**

**Replace with:**

```javascript
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.substring(7);
    
    // Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from database
    const result = await db.query(
      'SELECT id, email, role, status FROM users WHERE id = $1',
      [decoded.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is suspended' });
    }
    
    // Attach user to request
    req.user = user;
    next();
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}
```

**Agent Action:**
1. Update `requireAuth` middleware
2. Test protected endpoint works with valid token

---

## ✅ **PHASE 1 COMPLETION CHECKLIST**

Before proceeding to Phase 2, verify:

- [ ] Database connection works (`node -e "require('./database/db').testConnection()"`)
- [ ] All tables created (`psql $DATABASE_URL -c "\dt"` shows 5 tables)
- [ ] Users migrated (`psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"` matches JSON file count)
- [ ] Registration works (test with curl/Postman)
- [ ] Login works (test with curl/Postman)
- [ ] JWT token returned
- [ ] Protected routes work with token

**Agent: STOP HERE and report Phase 1 completion status before continuing.**

---

## 🗄️ PHASE 2: SITES MIGRATION

### **Step 2.1: Create Sites Migration Script**

Create file: `database/migrate-sites.js`

```javascript
const fs = require('fs').promises;
const path = require('path');
const db = require('./db');

const SITES_DIR = path.join(__dirname, '..', 'public', 'sites');

async function migrateSites() {
  console.log('🚀 Starting sites migration...');
  console.log('📁 Source:', SITES_DIR);
  
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  
  try {
    // Get all site directories
    const siteFolders = await fs.readdir(SITES_DIR);
    
    console.log(`📊 Found ${siteFolders.length} site folders to migrate`);
    
    for (const siteFolder of siteFolders) {
      const siteDir = path.join(SITES_DIR, siteFolder);
      const siteJsonPath = path.join(siteDir, 'site.json');
      
      try {
        // Check if site.json exists
        try {
          await fs.access(siteJsonPath);
        } catch {
          console.warn(`⚠️  Skipping ${siteFolder}: No site.json found`);
          skippedCount++;
          continue;
        }
        
        // Read site JSON
        const fileContent = await fs.readFile(siteJsonPath, 'utf-8');
        const site = JSON.parse(fileContent);
        
        // Find user by email
        const userEmail = site.ownerEmail || site.email;
        
        if (!userEmail) {
          console.warn(`⚠️  Skipping ${siteFolder}: No owner email`);
          skippedCount++;
          continue;
        }
        
        const userResult = await db.query(
          'SELECT id FROM users WHERE email = $1',
          [userEmail]
        );
        
        if (userResult.rows.length === 0) {
          console.warn(`⚠️  Skipping ${siteFolder}: User ${userEmail} not found in database`);
          skippedCount++;
          continue;
        }
        
        const userId = userResult.rows[0].id;
        
        // Prepare site data
        const siteId = siteFolder; // Use folder name as ID
        const subdomain = site.subdomain || siteFolder;
        const templateId = site.templateId || site.template || 'starter';
        const status = site.status || 'draft';
        const plan = site.plan || 'free';
        
        // Insert site
        await db.query(`
          INSERT INTO sites (
            id,
            user_id,
            subdomain,
            template_id,
            status,
            plan,
            published_at,
            expires_at,
            created_at,
            site_data,
            json_file_path
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO UPDATE SET
            user_id = EXCLUDED.user_id,
            template_id = EXCLUDED.template_id,
            status = EXCLUDED.status,
            plan = EXCLUDED.plan,
            site_data = EXCLUDED.site_data,
            updated_at = NOW()
        `, [
          siteId,
          userId,
          subdomain,
          templateId,
          status,
          plan,
          site.publishedAt ? new Date(site.publishedAt) : null,
          site.expiresAt ? new Date(site.expiresAt) : null,
          site.createdAt ? new Date(site.createdAt) : new Date(),
          JSON.stringify(site), // Store full site data as JSONB
          siteJsonPath
        ]);
        
        console.log(`✅ Migrated: ${subdomain} (User: ${userEmail})`);
        successCount++;
        
        // Log success
        await db.query(
          'INSERT INTO migration_log (migration_type, source_path, target_id, status) VALUES ($1, $2, $3, $4)',
          ['sites', siteJsonPath, siteId, 'success']
        );
        
      } catch (error) {
        console.error(`❌ Error migrating ${siteFolder}:`, error.message);
        errorCount++;
        
        // Log error
        await db.query(
          'INSERT INTO migration_log (migration_type, source_path, status, error_message) VALUES ($1, $2, $3, $4)',
          ['sites', path.join(siteDir, 'site.json'), 'failed', error.message]
        );
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY - SITES');
    console.log('='.repeat(60));
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`⚠️  Skipped: ${skippedCount}`);
    console.log(`📝 Total: ${siteFolders.length}`);
    console.log('='.repeat(60));
    
    // Verify
    const count = await db.query('SELECT COUNT(*) FROM sites');
    console.log(`\n🔍 Database verification: ${count.rows[0].count} sites in database`);
    
    return { successCount, errorCount, skippedCount };
    
  } catch (error) {
    console.error('💥 Fatal error during migration:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  migrateSites()
    .then(() => {
      console.log('\n✅ Sites migration complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateSites };
```

**Agent Action:**
1. Save to `database/migrate-sites.js`
2. Run: `node database/migrate-sites.js`
3. Verify all sites migrated
4. Check database: `psql $DATABASE_URL -c "SELECT COUNT(*) FROM sites;"`

---

### **Step 2.2: Update Site Publishing Endpoint**

**In `server.js`, find the site publishing logic and update to use database.**

This is a large change. Create a new file: `database/site-controller.js`

```javascript
const db = require('./db');
const { sendEmail, EmailTypes } = require('../email-service');

// Publish site
async function publishSite(userId, siteData) {
  try {
    const siteId = siteData.subdomain;
    
    // Insert or update site
    const result = await db.query(`
      INSERT INTO sites (
        id, user_id, subdomain, template_id, status, plan,
        published_at, expires_at, created_at, site_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
      ON CONFLICT (id) DO UPDATE SET
        template_id = EXCLUDED.template_id,
        status = EXCLUDED.status,
        plan = EXCLUDED.plan,
        published_at = EXCLUDED.published_at,
        expires_at = EXCLUDED.expires_at,
        site_data = EXCLUDED.site_data,
        updated_at = NOW()
      RETURNING *
    `, [
      siteId,
      userId,
      siteData.subdomain,
      siteData.templateId,
      siteData.status || 'published',
      siteData.plan || 'free',
      new Date(),
      siteData.expiresAt ? new Date(siteData.expiresAt) : null,
      JSON.stringify(siteData)
    ]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error publishing site:', error);
    throw error;
  }
}

// Get user's sites
async function getUserSites(userId) {
  try {
    const result = await db.query(
      'SELECT * FROM sites WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    return result.rows.map(row => ({
      ...row.site_data,
      id: row.id,
      status: row.status,
      plan: row.plan,
      publishedAt: row.published_at,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  } catch (error) {
    console.error('Error getting user sites:', error);
    throw error;
  }
}

// Get site by subdomain
async function getSiteBySubdomain(subdomain) {
  try {
    const result = await db.query(
      'SELECT * FROM sites WHERE subdomain = $1',
      [subdomain]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      ...row.site_data,
      id: row.id,
      status: row.status,
      plan: row.plan,
      publishedAt: row.published_at,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  } catch (error) {
    console.error('Error getting site:', error);
    throw error;
  }
}

// Update site
async function updateSite(siteId, userId, siteData) {
  try {
    // Verify ownership
    const ownerCheck = await db.query(
      'SELECT user_id FROM sites WHERE id = $1',
      [siteId]
    );
    
    if (ownerCheck.rows.length === 0) {
      throw new Error('Site not found');
    }
    
    if (ownerCheck.rows[0].user_id !== userId) {
      throw new Error('Unauthorized');
    }
    
    // Update site
    const result = await db.query(`
      UPDATE sites SET
        template_id = $1,
        site_data = $2,
        updated_at = NOW()
      WHERE id = $3 AND user_id = $4
      RETURNING *
    `, [
      siteData.templateId,
      JSON.stringify(siteData),
      siteId,
      userId
    ]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error updating site:', error);
    throw error;
  }
}

// Delete site
async function deleteSite(siteId, userId) {
  try {
    const result = await db.query(
      'DELETE FROM sites WHERE id = $1 AND user_id = $2 RETURNING id',
      [siteId, userId]
    );
    
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error deleting site:', error);
    throw error;
  }
}

// Get sites expiring soon
async function getSitesExpiringSoon(days) {
  try {
    const result = await db.query(`
      SELECT s.*, u.email as owner_email
      FROM sites s
      JOIN users u ON s.user_id = u.id
      WHERE s.status = 'published'
        AND s.plan = 'free'
        AND s.expires_at IS NOT NULL
        AND s.expires_at BETWEEN NOW() AND NOW() + INTERVAL '${days} days'
      ORDER BY s.expires_at ASC
    `);
    
    return result.rows;
  } catch (error) {
    console.error('Error getting expiring sites:', error);
    throw error;
  }
}

module.exports = {
  publishSite,
  getUserSites,
  getSiteBySubdomain,
  updateSite,
  deleteSite,
  getSitesExpiringSoon
};
```

**Agent Action:**
1. Create `database/site-controller.js`
2. Update `server.js` to use these functions instead of file operations
3. Test site publishing still works

---

## ⏸️ **STOPPING POINT FOR USER REVIEW**

**Agent: You've completed the critical migration!**

**Summary of what's been done:**
- ✅ Database schema created
- ✅ Users migrated to PostgreSQL
- ✅ Authentication updated to use database
- ✅ Sites migrated to PostgreSQL
- ✅ Site operations updated to use database

**What's still using JSON:**
- ⚠️ Submissions (Phase 3)
- ⚠️ Analytics (Phase 3)
- ✅ Templates (staying as JSON - correct!)

**Next Steps (Phase 3):**
- Migrate submissions
- Implement real analytics tracking
- Update trial expiration cron job
- Performance testing

**Agent: Report completion status and await user approval to continue to Phase 3.**

---

## 🎯 SUCCESS CRITERIA

Phase 1 & 2 complete when:
- [ ] All users in database (count matches JSON files)
- [ ] All sites in database (count matches site folders)
- [ ] Registration creates user in DB
- [ ] Login reads from DB
- [ ] Dashboard loads sites from DB
- [ ] Site publishing saves to DB
- [ ] Site editing reads from DB
- [ ] No errors in server logs
- [ ] JSON files still exist (backup)

**Agent: Run these verification commands and report results:**

```bash
# Count users
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"

# Count sites
psql $DATABASE_URL -c "SELECT COUNT(*) FROM sites;"

# Check recent registrations
psql $DATABASE_URL -c "SELECT email, created_at FROM users ORDER BY created_at DESC LIMIT 5;"

# Check published sites
psql $DATABASE_URL -c "SELECT subdomain, status, plan FROM sites WHERE status='published' LIMIT 5;"

# Check migration logs
psql $DATABASE_URL -c "SELECT migration_type, status, COUNT(*) FROM migration_log GROUP BY migration_type, status;"
```

---

## 🚨 ROLLBACK PLAN (If Something Goes Wrong)

**If migration fails:**

1. **Stop the server:** `Ctrl+C`

2. **Revert server.js:**
```bash
git checkout server.js
```

3. **Remove database code:**
```bash
rm -rf database/
```

4. **JSON files are still there** - system works as before

5. **Report error to user with logs**

---

## 📝 NOTES FOR AGENT

**Critical Rules:**
1. ⚠️ NEVER delete JSON files (they're backup!)
2. ⚠️ Test each endpoint after updating
3. ⚠️ Log all errors to migration_log table
4. ⚠️ If unsure, STOP and ask user
5. ⚠️ Commit changes after each phase

**What to report:**
- Migration counts (success/error/skipped)
- Any errors encountered
- Verification query results
- Next steps recommendation

---

**Agent: Begin with Phase 1, Step 1.1. Report progress after each step.**

