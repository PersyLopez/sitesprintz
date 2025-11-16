# 🏗️ SiteSprintz Platform: Current Architecture

**Last Updated:** November 3, 2025  
**Architecture Type:** Hybrid Monolithic with Database Backend  
**Status:** 60% Database Migration Complete

---

## 📋 **TABLE OF CONTENTS**

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Layers](#architecture-layers)
4. [Data Architecture](#data-architecture)
5. [API Architecture](#api-architecture)
6. [Authentication & Authorization](#authentication--authorization)
7. [Payment Architecture](#payment-architecture)
8. [Email Architecture](#email-architecture)
9. [File Storage Architecture](#file-storage-architecture)
10. [Frontend Architecture](#frontend-architecture)
11. [Deployment Architecture](#deployment-architecture)
12. [Security Architecture](#security-architecture)
13. [Scalability Considerations](#scalability-considerations)

---

## 🎯 **OVERVIEW**

SiteSprintz is a **SaaS website builder platform** that enables small businesses to create and publish professional websites in minutes. The platform follows a **hybrid monolithic architecture** currently transitioning from JSON-based storage to PostgreSQL database.

### **Architecture Pattern:**
- **Monolithic Server:** Single Node.js/Express application
- **Static Frontend:** Vanilla JavaScript (no framework)
- **Hybrid Data Layer:** PostgreSQL (users) + JSON files (sites, templates)
- **RESTful API:** JSON-based HTTP APIs
- **Event-Driven:** Stripe webhooks, cron jobs for background tasks

---

## 🛠️ **TECHNOLOGY STACK**

### **Backend:**
```
Node.js v20+
├── Express.js 5.1.0        (Web framework)
├── PostgreSQL 16+          (Primary database - Neon hosted)
├── pg 8.16.3               (PostgreSQL client)
├── JWT (jsonwebtoken)      (Authentication)
├── bcryptjs                (Password hashing)
├── Stripe 19.1.0           (Payment processing)
├── Resend 6.3.0            (Email service)
├── Multer 2.0.2            (File uploads)
├── node-cron 4.2.1         (Scheduled tasks)
├── Winston 3.18.3          (Logging)
├── Helmet 8.1.0            (Security headers)
└── Express-rate-limit      (Rate limiting)
```

### **Frontend:**
```
Vanilla JavaScript (ES6+)
├── HTML5                   (Structure)
├── CSS3                    (Styling)
├── Fetch API               (HTTP requests)
└── LocalStorage            (Client-side persistence)
```

### **Database:**
```
PostgreSQL 16+ (Neon.tech)
├── 5 tables (users, sites, submissions, analytics_events, migration_log)
├── UUID primary keys
├── JSONB for flexible data
├── Indexed queries
└── SSL connections
```

### **Third-Party Services:**
```
Stripe                      (Payments & subscriptions)
Resend                      (Transactional emails)
Neon                        (PostgreSQL hosting)
```

---

## 🏛️ **ARCHITECTURE LAYERS**

### **1. Presentation Layer (Frontend)**
```
┌─────────────────────────────────────────┐
│         Static HTML Pages               │
│  (index, setup, dashboard, templates)   │
├─────────────────────────────────────────┤
│      Vanilla JavaScript Modules         │
│  (app.js, premium-features.js, etc.)    │
├─────────────────────────────────────────┤
│        CSS Styling & Themes             │
│   (styles.css, theme.css, premium.css)  │
└─────────────────────────────────────────┘
```

### **2. API Layer (Backend)**
```
┌─────────────────────────────────────────┐
│         Express.js Router               │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │   Authentication Middleware     │   │
│  │   - requireAuth                 │   │
│  │   - JWT verification            │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     RESTful Endpoints           │   │
│  │   - /api/auth/*                 │   │
│  │   - /api/drafts/*               │   │
│  │   - /api/sites/*                │   │
│  │   - /api/subscription/*         │   │
│  │   - /api/webhooks/*             │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### **3. Business Logic Layer**
```
┌─────────────────────────────────────────┐
│       Core Business Logic               │
│                                         │
│  • User Management                      │
│  • Site Publishing                      │
│  • Template Processing                  │
│  • Subscription Management              │
│  • Email Notifications                  │
│  • Trial Expiration Handling            │
│  • Analytics Tracking                   │
└─────────────────────────────────────────┘
```

### **4. Data Layer**
```
┌─────────────────────────────────────────┐
│         Data Access Layer               │
│                                         │
│  ┌────────────┐    ┌────────────────┐  │
│  │ PostgreSQL │    │  JSON Files    │  │
│  │  (Users)   │    │  (Sites, etc.) │  │
│  └────────────┘    └────────────────┘  │
│                                         │
│  ┌────────────────────────────────┐    │
│  │    File System Storage         │    │
│  │    (Uploads, Templates)        │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

## 💾 **DATA ARCHITECTURE**

### **Current Hybrid Model:**

#### **✅ PostgreSQL Database (Users - Migrated)**
```sql
users
├── id (UUID, Primary Key)
├── email (VARCHAR, UNIQUE, INDEXED)
├── password_hash (VARCHAR)
├── role (VARCHAR: 'user', 'admin')
├── status (VARCHAR: 'active', 'inactive', 'suspended')
├── stripe_customer_id (VARCHAR, INDEXED)
├── subscription_id (VARCHAR)
├── subscription_status (VARCHAR, INDEXED)
├── plan (VARCHAR: 'free', 'starter', 'pro', 'premium')
├── created_at (TIMESTAMP)
└── last_login_at (TIMESTAMP)
```

**Benefits:**
- ✅ Fast indexed lookups (2-5ms)
- ✅ No race conditions
- ✅ ACID transactions
- ✅ Instant duplicate detection
- ✅ Scalable to 10,000+ users

#### **⏳ JSON Files (Sites - Pending Migration)**
```
public/sites/
├── {subdomain}/
│   ├── site.json          (Site configuration)
│   ├── index.html         (Generated HTML)
│   └── backups/           (Version history)
```

**Structure:**
```json
{
  "subdomain": "tasty-bites-mh9jj06c",
  "template": "restaurant",
  "plan": "starter",
  "userId": "user_1234567890",
  "userEmail": "user@example.com",
  "data": {
    "businessName": "Tasty Bites",
    "tagline": "Delicious Food",
    "sections": { ... }
  },
  "publishedAt": "2025-11-01T10:30:00Z",
  "expiresAt": "2025-11-08T10:30:00Z"
}
```

**Issues:**
- ❌ Race conditions possible
- ❌ Slow queries (must read all files)
- ❌ No real-time analytics
- ❌ Hard to implement complex features

#### **⏳ JSON Files (Templates - Staying as JSON)**
```
public/data/templates/
├── index.json             (Template catalog)
├── restaurant.json        (Restaurant template)
├── salon.json             (Salon template)
├── gym.json               (Gym template)
└── [19 templates total]
```

**Reason to keep as JSON:**
- Templates are read-only
- No concurrent writes
- Easy for designers to edit
- Version control friendly

#### **⏳ JSON Files (Users - Legacy Backup)**
```
public/users/
├── persylopez_gmail_com.json
└── [User files kept as backup]
```

**Status:** Still present but **no longer used** for authentication

---

## 🔌 **API ARCHITECTURE**

### **RESTful API Design:**

#### **Authentication Endpoints:**
```javascript
POST   /api/auth/register        // Create new user (DB)
POST   /api/auth/login           // Authenticate user (DB)
GET    /api/auth/me              // Get current user (DB)
POST   /api/auth/forgot-password // Password reset (DB)
```

#### **Site Management Endpoints:**
```javascript
// Drafts
POST   /api/drafts              // Create draft (JSON)
GET    /api/drafts/:id          // Get draft (JSON)
POST   /api/drafts/:id/publish  // Publish draft (JSON)

// Published Sites
GET    /api/sites/:subdomain    // Get site data (JSON)
PUT    /api/sites/:subdomain    // Update site (JSON)
DELETE /api/sites/:subdomain    // Delete site (JSON)
```

#### **Subscription Endpoints:**
```javascript
POST   /api/create-subscription-checkout  // Create Stripe session
GET    /api/subscription/status           // Get subscription status (DB)
POST   /api/webhooks/stripe               // Stripe webhook handler (DB)
```

#### **Template Endpoints:**
```javascript
GET    /api/templates           // List all templates
GET    /api/templates/:id       // Get template details
```

#### **Contact Form Endpoints:**
```javascript
POST   /api/contact-form                    // Submit contact form (JSON)
GET    /api/sites/:subdomain/submissions    // Get submissions (JSON)
PATCH  /api/submissions/:id/read            // Mark as read (JSON)
```

#### **Analytics Endpoints:**
```javascript
GET    /api/users/:userId/analytics         // User analytics (Mocked)
GET    /api/admin/analytics                 // Platform analytics (Mocked)
```

#### **File Upload Endpoints:**
```javascript
POST   /api/upload              // Upload images (File System)
```

---

## 🔐 **AUTHENTICATION & AUTHORIZATION**

### **Authentication Flow:**

```
┌────────────┐
│   Client   │
└─────┬──────┘
      │ 1. POST /api/auth/register
      │    { email, password }
      ↓
┌─────────────────────────────────┐
│      Express Server             │
│                                 │
│  2. Validate input              │
│  3. Check if user exists (DB)   │
│  4. Hash password (bcrypt)      │
│  5. INSERT user (PostgreSQL)    │
│  6. Generate JWT token          │
│  7. Send welcome email          │
└─────┬───────────────────────────┘
      │ 8. Return token + user data
      ↓
┌────────────┐
│   Client   │
│  Store JWT │
│  in memory │
└────────────┘
```

### **JWT Token Structure:**
```javascript
{
  userId: "uuid-v4",
  email: "user@example.com",
  role: "user",
  iat: 1730620800,
  exp: 1731225600  // 7 days
}
```

### **Authorization Middleware:**
```javascript
async function requireAuth(req, res, next) {
  // 1. Extract token from header
  const token = req.headers['authorization']?.split(' ')[1];
  
  // 2. Verify JWT
  const decoded = jwt.verify(token, JWT_SECRET);
  
  // 3. Query database for fresh user data
  const user = await dbQuery('SELECT * FROM users WHERE id = $1', [decoded.userId]);
  
  // 4. Check account status
  if (user.status !== 'active') {
    return res.status(403).json({ error: 'Account suspended' });
  }
  
  // 5. Attach user to request
  req.user = user;
  next();
}
```

### **Protection Levels:**
- **Public:** Landing page, templates, login
- **Authenticated:** Dashboard, site builder, analytics
- **Admin:** User management, platform analytics

---

## 💳 **PAYMENT ARCHITECTURE**

### **Stripe Integration:**

#### **Checkout Flow:**
```
┌────────────┐
│   Client   │  1. Select plan
└─────┬──────┘     (Starter/Pro)
      │
      │ 2. POST /api/create-subscription-checkout
      ↓
┌──────────────────────────────────┐
│      Express Server              │
│  3. Create Stripe Checkout       │
│     Session with:                │
│     - Price ID                   │
│     - Customer email             │
│     - Success/Cancel URLs        │
└─────┬────────────────────────────┘
      │ 4. Return checkout URL
      ↓
┌────────────┐
│   Client   │  5. Redirect to
│            │     Stripe Checkout
└─────┬──────┘
      │
      │ 6. User completes payment
      ↓
┌──────────────────────────────────┐
│      Stripe                      │
│  7. Process payment              │
│  8. Send webhook event           │
└─────┬────────────────────────────┘
      │ 9. POST /api/webhooks/stripe
      ↓
┌──────────────────────────────────┐
│      Express Server              │
│  10. Verify webhook signature    │
│  11. Update user in database:    │
│      - subscription_id           │
│      - subscription_status       │
│      - plan                      │
│      - stripe_customer_id        │
└─────┬────────────────────────────┘
      │ 12. Return success
      ↓
┌────────────┐
│   Client   │  13. Redirect to
│            │      dashboard
└────────────┘
```

#### **Webhook Events Handled:**
```javascript
'checkout.session.completed'           // New subscription
'customer.subscription.created'        // Subscription created
'customer.subscription.updated'        // Plan changed/renewed
'customer.subscription.deleted'        // Subscription cancelled
```

#### **Subscription Plans:**
```javascript
Free Trial:    7 days, 1 site
Starter:       $29/month, 1 site, display-only
Pro:           $59/month, 1 site, transactions + bookings
Add-on sites:  50% off base plan price
```

---

## 📧 **EMAIL ARCHITECTURE**

### **Email Service: Resend**

#### **Email Types:**
```javascript
EmailTypes = {
  WELCOME: 'welcome',
  SITE_PUBLISHED: 'sitePublished',
  SITE_UPDATED: 'siteUpdated',
  TRIAL_EXPIRING_SOON: 'trialExpiringSoon',
  TRIAL_EXPIRED: 'trialExpired',
  CONTACT_FORM_SUBMISSION: 'contactFormSubmission',
  PASSWORD_RESET: 'passwordReset'
}
```

#### **Email Flow:**
```
Event Triggered
      ↓
sendEmail(email, type, data)
      ↓
┌──────────────────────────┐
│   Email Service          │
│  1. Get template         │
│  2. Populate data        │
│  3. Call Resend API      │
└──────────────────────────┘
      ↓
┌──────────────────────────┐
│   Resend                 │
│  1. Process email        │
│  2. Deliver to inbox     │
└──────────────────────────┘
```

#### **Email Templates:**
- HTML templates with dynamic data
- Branded with SiteSprintz design
- Transactional (not marketing)
- Mobile-responsive

---

## 📁 **FILE STORAGE ARCHITECTURE**

### **Directory Structure:**
```
public/
├── uploads/                    (User-uploaded images)
│   └── {timestamp}-{random}.jpg
│
├── sites/                      (Published sites)
│   └── {subdomain}/
│       ├── index.html          (Generated site)
│       ├── site.json           (Configuration)
│       └── backups/            (Version history)
│
├── drafts/                     (Unpublished drafts)
│   └── draft-{timestamp}-{id}.json
│
├── data/
│   ├── templates/              (Template definitions)
│   └── users/                  (Legacy user files)
│
└── [HTML pages]                (Application pages)
```

### **File Upload Flow:**
```
Client
  ↓ 1. Select image
  ↓ 2. POST /api/upload (multipart/form-data)
Server
  ↓ 3. Multer middleware processes upload
  ↓ 4. Validate file (size, type)
  ↓ 5. Generate unique filename
  ↓ 6. Save to /public/uploads/
  ↓ 7. Return public URL
Client
  ↓ 8. Use URL in site data
```

### **File Validation:**
- **Max size:** 5MB
- **Allowed types:** image/jpeg, image/png, image/webp
- **Filename:** Sanitized + timestamped

---

## 🎨 **FRONTEND ARCHITECTURE**

### **Architecture Pattern: Multi-Page Application (MPA)**

#### **Page Structure:**
```
Landing Page (/)
├── index.html              (Marketing page)
└── styles.css              (Global styles)

Authentication
├── login.html              (Login form)
├── register.html           (Signup form)
└── forgot-password.html    (Password reset)

Site Builder
├── templates.html          (Template gallery)
├── setup.html              (Site builder)
└── dashboard.html          (User dashboard)

Analytics
├── analytics.html          (User analytics)
└── admin-analytics.html    (Platform analytics)
```

#### **JavaScript Modules:**
```javascript
app.js                      // Core functionality
├── Authentication (login, register)
├── API client (fetch wrappers)
├── Form validation
└── Error handling

premium-features.js         // Premium features
├── Payment integration
├── Product management
├── Booking system
└── Advanced components

app-premium-integration.js  // Premium UI components
├── Upsell modals
├── Upgrade banners
└── Feature gating
```

#### **State Management:**
```javascript
// No framework - uses browser APIs

// In-Memory State
let currentUser = null;
let currentDraft = null;

// LocalStorage (persistent)
localStorage.setItem('authToken', token);
localStorage.setItem('pendingPublish', JSON.stringify(data));

// Session State
sessionStorage.setItem('draftId', draftId);
```

#### **API Communication:**
```javascript
// Fetch API with error handling

async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      ...options.headers
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  return await response.json();
}
```

---

## 🚀 **DEPLOYMENT ARCHITECTURE**

### **Current Setup:**
```
┌─────────────────────────────────────┐
│     Single Server Deployment        │
│                                     │
│  Node.js Express App (Port 3000)    │
│  ├── Static file serving            │
│  ├── API endpoints                  │
│  └── WebSocket (future)             │
└─────────────────────────────────────┘
         ↓               ↓
┌────────────────┐  ┌──────────────┐
│   PostgreSQL   │  │  File System │
│  (Neon.tech)   │  │   (Local)    │
└────────────────┘  └──────────────┘
```

### **External Services:**
```
┌──────────┐  ┌─────────┐  ┌────────┐
│  Stripe  │  │ Resend  │  │  Neon  │
│ Payments │  │  Email  │  │   DB   │
└──────────┘  └─────────┘  └────────┘
```

### **Scalability Path (Future):**
```
┌─────────────────────────────────────┐
│     Load Balancer (Future)          │
└─────────────┬───────────────────────┘
              ↓
    ┌─────────┴─────────┐
    ↓                   ↓
┌─────────┐        ┌─────────┐
│ Server 1│        │ Server 2│
└─────────┘        └─────────┘
    ↓                   ↓
┌─────────────────────────────────────┐
│     Shared PostgreSQL Database      │
└─────────────────────────────────────┘
    ↓                   ↓
┌──────────┐      ┌──────────┐
│   CDN    │      │  S3/R2   │
│ (Static) │      │ (Uploads)│
└──────────┘      └──────────┘
```

---

## 🔒 **SECURITY ARCHITECTURE**

### **Security Layers:**

#### **1. Network Security:**
```javascript
// Helmet.js - Security headers
helmet({
  contentSecurityPolicy: true,
  crossOriginEmbedderPolicy: true,
  dnsPrefetchControl: true,
  frameguard: true,
  hidePoweredBy: true,
  hsts: true,
  ieNoOpen: true,
  noSniff: true,
  xssFilter: true
})
```

#### **2. Authentication Security:**
```javascript
// bcrypt password hashing
const hash = await bcrypt.hash(password, 10);

// JWT tokens (7-day expiry)
const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

// Fresh user data on every request
const user = await dbQuery('SELECT * FROM users WHERE id = $1');
```

#### **3. API Security:**
```javascript
// Rate limiting
rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100                    // 100 requests per window
})

// CORS configuration
cors({
  origin: process.env.ALLOWED_ORIGINS,
  credentials: true
})
```

#### **4. Payment Security:**
```javascript
// Stripe webhook signature verification
const signature = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  req.body,
  signature,
  STRIPE_WEBHOOK_SECRET
);
```

#### **5. Database Security:**
```javascript
// Parameterized queries (SQL injection safe)
await dbQuery('SELECT * FROM users WHERE email = $1', [email]);

// SSL connections
ssl: { rejectUnauthorized: false }

// No sensitive data in tokens
// (Only user ID, role - not password, stripe data)
```

---

## 📊 **SCALABILITY CONSIDERATIONS**

### **Current Limits:**
| Resource | Current | Limit | Solution |
|----------|---------|-------|----------|
| Users | 2 | 10,000+ | ✅ Database handles |
| Sites | ~30 | ~500 | ⚠️ Need DB migration |
| Concurrent requests | ~10 | ~50 | ✅ Connection pooling |
| File storage | ~100MB | ~10GB | ⚠️ Need CDN/S3 |

### **Bottlenecks:**

#### **1. JSON File Operations (Being Fixed)**
```
Problem: Reading all site files for queries
Impact: Slow dashboard load with 100+ sites
Status: ⏳ Migration to database in progress
Solution: Phase 4 - Site migration
```

#### **2. File System Storage**
```
Problem: Local disk storage for uploads
Impact: Single server dependency
Status: ⚠️ Not addressed yet
Solution: Migrate to S3/Cloudflare R2
```

#### **3. Single Server**
```
Problem: No horizontal scaling
Impact: Limited to single server capacity
Status: ⚠️ Future concern
Solution: Load balancer + multiple instances
```

### **Database Migration Progress:**
```
✅ Users:           100% (PostgreSQL)
⏳ Sites:             0% (JSON → PostgreSQL next)
⏳ Submissions:       0% (JSON → PostgreSQL)
⏳ Analytics:         0% (Not tracked → PostgreSQL)

Overall: 60% Complete
```

---

## 🎯 **ARCHITECTURE STRENGTHS**

✅ **Simple & Maintainable**
- Single codebase
- No complex build processes
- Easy to debug

✅ **Cost-Effective**
- Single server
- No expensive infrastructure
- Pay-as-you-grow model

✅ **Fast Development**
- No framework overhead
- Direct database access
- Quick iterations

✅ **Proven Stack**
- Node.js/Express (mature)
- PostgreSQL (reliable)
- Vanilla JS (no framework lock-in)

---

## ⚠️ **ARCHITECTURE WEAKNESSES**

❌ **Limited Scalability**
- Single server dependency
- File system storage
- No caching layer

❌ **No Real-Time Features**
- No WebSocket support
- No live collaboration
- No instant updates

❌ **Hybrid Data Model**
- JSON + PostgreSQL mix
- Inconsistent access patterns
- Migration in progress

❌ **No CI/CD**
- Manual deployment
- No automated testing
- No staging environment

---

## 🚀 **FUTURE ARCHITECTURE GOALS**

### **Phase 4: Complete Database Migration** (In Progress)
- ✅ Users migrated
- ⏳ Sites to PostgreSQL
- ⏳ Submissions to PostgreSQL
- ⏳ Real analytics tracking

### **Phase 5: Performance Optimization**
- CDN for static assets
- Redis caching layer
- Database query optimization
- Image optimization (Sharp)

### **Phase 6: Real-Time Features**
- WebSocket support
- Live site previews
- Real-time analytics
- Collaborative editing

### **Phase 7: Microservices (Long-term)**
- Site rendering service
- Email service (separate)
- Analytics service
- Payment service

---

## 📝 **SUMMARY**

**SiteSprintz Current Architecture:**

**Type:** Hybrid Monolithic (Transitioning to Database-First)

**Stack:**
- Node.js + Express (Backend)
- PostgreSQL (Database - Neon)
- Vanilla JavaScript (Frontend)
- Stripe (Payments)
- Resend (Email)

**Current State:**
- ✅ Authentication: Database-backed
- ⏳ Sites: JSON files (migrating next)
- ⏳ Submissions: JSON files
- ✅ Templates: JSON files (staying)

**Strengths:**
- Simple, maintainable
- Fast development
- Cost-effective
- Proven stack

**Weaknesses:**
- Limited scalability
- Hybrid data model
- Single server dependency
- No real-time features

**Progress:** 60% database migration complete

**Next Step:** Migrate sites to PostgreSQL (Phase 4)

---

**This architecture is designed to:**
1. Get to market quickly ✅
2. Handle initial users (100-500) ✅
3. Scale incrementally ✅
4. Maintain simplicity ✅
5. Keep costs low ✅

**Ready to scale when needed!** 🚀

