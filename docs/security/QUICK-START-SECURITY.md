# 🚀 Quick Start: Security Implementation

**Goal**: Fix critical security vulnerabilities in 1-2 days  
**Audience**: Developers implementing security fixes  
**Prerequisites**: Read [SECURITY-ASSESSMENT.md](./SECURITY-ASSESSMENT.md) first

---

## 🔴 CRITICAL: Do These FIRST (Day 1)

These are **production blockers**. Cannot launch without them.

---

### 1. Fix CSRF Protection (2-4 hours) 🔥

**Problem**: Authentication endpoints bypass CSRF protection

**Current Code:**

```107:112:server/middleware/csrf.js
  // Temporarily skip CSRF validation for auth endpoints (until cookie-parser is properly configured)
  console.log('CSRF Check - Path:', req.path, 'Method:', method);
  if (req.path.startsWith('/api/auth/') || req.path.startsWith('/auth/')) {
    console.log('✅ Skipping CSRF for auth endpoint');
    return next();
  }
```

**Solution:**

#### Step 1: Install cookie-parser

```bash
npm install cookie-parser
```

#### Step 2: Configure in server.js

```javascript
// server.js (add near top, BEFORE bodyParser)
import cookieParser from 'cookie-parser';

app.use(cookieParser());  // MUST be before bodyParser
app.use(bodyParser.json());
```

#### Step 3: Remove CSRF bypass

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
  
  // ❌ REMOVE THESE LINES:
  // if (req.path.startsWith('/api/auth/')) {
  //   return next();
  // }
  
  // Continue with normal CSRF validation...
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
    const tokensMatch = storedToken && crypto.timingSafeEqual(
      Buffer.from(clientToken),
      Buffer.from(storedToken)
    );
    
    if (!tokensMatch) {
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

#### Step 4: Update frontend API client

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
    const method = options.method?.toUpperCase();
    
    // Fetch CSRF token for state-changing requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      await this.ensureCSRFToken();
      options.headers = {
        ...options.headers,
        'X-CSRF-Token': this.csrfToken
      };
    }

    options.credentials = 'include';  // Always send cookies
    
    const response = await fetch(endpoint, options);
    
    // If CSRF token invalid, refresh and retry
    if (response.status === 403) {
      const error = await response.json();
      if (error.code === 'CSRF_INVALID') {
        this.csrfToken = null;  // Clear cached token
        await this.ensureCSRFToken();
        
        // Retry with new token
        options.headers['X-CSRF-Token'] = this.csrfToken;
        return await fetch(endpoint, options);
      }
    }
    
    return response;
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, data, options = {}) {
    return this.request(endpoint, { 
      ...options, 
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json', ...options.headers }
    });
  }

  put(endpoint, data, options = {}) {
    return this.request(endpoint, { 
      ...options, 
      method: 'PUT',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json', ...options.headers }
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new APIClient();
```

#### Step 5: Test

```bash
# Start server
npm run dev:backend

# In another terminal, start frontend
npm run dev

# Test registration/login
# Should work without errors
# Check browser console - should see CSRF token being fetched
```

---

### 2. Fix XSS in Visual Editor (4-8 hours) 🔥

**Problem**: User-generated HTML is not sanitized, allowing XSS attacks

**Solution:**

#### Step 1: Install DOMPurify

```bash
npm install isomorphic-dompurify
```

#### Step 2: Create HTML sanitizer utility

```javascript
// server/utils/htmlSanitizer.js
import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize user-generated HTML to prevent XSS
 */
export function sanitizeUserHTML(html, options = {}) {
  if (!html || typeof html !== 'string') {
    return '';
  }

  const config = {
    // Allow only safe HTML tags
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'span', 'div', 'section', 'article', 'header', 'footer',
      'a', 'img', 'ul', 'ol', 'li',
      'strong', 'em', 'u', 'b', 'i',
      'table', 'tr', 'td', 'th', 'thead', 'tbody',
      'blockquote', 'pre', 'code',
      ...(options.additionalTags || [])
    ],
    
    // Allow only safe attributes
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title',
      'class', 'id',
      'width', 'height',
      'target', 'rel',
      'style'  // Sanitized separately
    ],
    
    // Only allow safe URLs (no javascript:)
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):)/i,
    
    // Explicitly forbid dangerous tags
    FORBID_TAGS: [
      'script', 'iframe', 'embed', 'object',
      'form', 'input', 'button', 'textarea',
      'link', 'style', 'meta'
    ],
    
    // Explicitly forbid event handlers
    FORBID_ATTR: [
      'onerror', 'onclick', 'onload', 'onmouseover',
      'onmouseout', 'onfocus', 'onblur', 'onchange',
      'onsubmit', 'onkeydown', 'onkeyup', 'onkeypress'
    ],
    
    // Don't allow data attributes (can be used for attacks)
    ALLOW_DATA_ATTR: false,
    
    // Remove content from script tags
    KEEP_CONTENT: false,
    
    // Return entire document or just body
    WHOLE_DOCUMENT: false,
    
    // Return a DOM tree
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false
  };

  // Sanitize HTML
  let sanitized = DOMPurify.sanitize(html, config);
  
  // Additional sanitization for style attributes
  if (sanitized.includes('style=')) {
    sanitized = sanitizeStyleAttribute(sanitized);
  }
  
  return sanitized;
}

/**
 * Sanitize inline style attributes
 * Removes dangerous CSS like expression(), behavior(), etc.
 */
function sanitizeStyleAttribute(html) {
  // Remove dangerous CSS properties
  const dangerousPatterns = [
    /expression\s*\(/gi,
    /behavior\s*:/gi,
    /javascript\s*:/gi,
    /vbscript\s*:/gi,
    /import\s+/gi,
    /@import/gi,
    /url\s*\(\s*["']?javascript:/gi
  ];
  
  dangerousPatterns.forEach(pattern => {
    html = html.replace(pattern, '');
  });
  
  return html;
}

/**
 * Sanitize a complete site data object
 */
export function sanitizeSiteData(siteData) {
  if (!siteData || typeof siteData !== 'object') {
    return siteData;
  }

  // Create a deep copy
  const sanitized = JSON.parse(JSON.stringify(siteData));
  
  // Sanitize all sections
  if (Array.isArray(sanitized.sections)) {
    sanitized.sections = sanitized.sections.map(section => {
      // Sanitize HTML content
      if (section.content && typeof section.content === 'string') {
        section.content = sanitizeUserHTML(section.content);
      }
      
      // Sanitize HTML in subsections
      if (section.html) {
        section.html = sanitizeUserHTML(section.html);
      }
      
      // Sanitize nested content
      if (Array.isArray(section.items)) {
        section.items = section.items.map(item => {
          if (item.content) {
            item.content = sanitizeUserHTML(item.content);
          }
          if (item.description) {
            item.description = sanitizeUserHTML(item.description);
          }
          return item;
        });
      }
      
      return section;
    });
  }
  
  return sanitized;
}
```

#### Step 3: Apply to site creation/update routes

```javascript
// server/routes/sites.routes.js
import { sanitizeSiteData } from '../utils/htmlSanitizer.js';

// POST /api/sites
router.post('/', requireAuth, async (req, res) => {
  try {
    const { subdomain, templateId, siteData } = req.body;
    
    // Sanitize ALL user-generated HTML
    const sanitizedData = sanitizeSiteData(siteData);
    
    const site = await prisma.site.create({
      data: {
        userId: req.user.id,
        subdomain,
        templateId,
        data: sanitizedData  // Store sanitized data
      }
    });
    
    res.status(201).json(site);
  } catch (error) {
    console.error('Site creation error:', error);
    res.status(500).json({ error: 'Failed to create site' });
  }
});

// PUT /api/sites/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { siteData } = req.body;
    
    // Verify ownership
    const existingSite = await prisma.site.findUnique({
      where: { id: req.params.id }
    });
    
    if (!existingSite || existingSite.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Sanitize ALL user-generated HTML
    const sanitizedData = sanitizeSiteData(siteData);
    
    const site = await prisma.site.update({
      where: { id: req.params.id },
      data: { data: sanitizedData }
    });
    
    res.json(site);
  } catch (error) {
    console.error('Site update error:', error);
    res.status(500).json({ error: 'Failed to update site' });
  }
});
```

#### Step 4: Add CSP headers for generated sites

```javascript
// server.js
app.use('/sites/:subdomain', (req, res, next) => {
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://js.stripe.com https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://api.stripe.com",
    "frame-src https://js.stripe.com",
    "object-src 'none'",
    "base-uri 'self'"
  ].join('; '));
  
  next();
});
```

#### Step 5: Test

```bash
# Create a test site with XSS payload
curl -X POST http://localhost:3000/api/sites \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subdomain": "test-xss",
    "templateId": "restaurant",
    "siteData": {
      "sections": [{
        "type": "html",
        "content": "<div>Safe content</div><script>alert(\"XSS\")</script>"
      }]
    }
  }'

# Verify script tag was removed
# Check database - content should be: "<div>Safe content</div>"
```

---

### 3. Move JWT to HttpOnly Cookies (4-6 hours) 🔥

**Problem**: JWT tokens stored in localStorage are vulnerable to XSS

**Solution:**

#### Step 1: Update login endpoint

```javascript
// server.js (or server/routes/auth.routes.js)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate credentials
    const result = await dbQuery(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is suspended' });
    }
    
    // Generate JWT
    const token = jwt.sign({ 
      userId: user.id,
      email: user.email, 
      role: user.role
    }, JWT_SECRET, { expiresIn: '7d' });
    
    // ✅ Set JWT in httpOnly cookie (NOT accessible via JavaScript)
    res.cookie('authToken', token, {
      httpOnly: true,  // ← Prevents JavaScript access
      secure: process.env.NODE_ENV === 'production',  // HTTPS only in prod
      sameSite: 'strict',  // CSRF protection
      maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
    });
    
    // Return user data (but NOT the token)
    res.json({ 
      success: true, 
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        subscriptionStatus: user.subscription_status,
        subscriptionPlan: user.subscription_plan
      } 
    });
    
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to login' });
  }
});
```

#### Step 2: Update auth middleware

```javascript
// server/middleware/auth.js
export async function requireAuth(req, res, next) {
  // Try Authorization header first (for API clients, mobile apps, etc.)
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
    
    const result = await dbQuery(
      'SELECT id, email, role, status, subscription_status, subscription_plan FROM users WHERE id = $1',
      [decoded.userId || decoded.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const user = result.rows[0];
    
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is suspended' });
    }
    
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
    console.error('Auth middleware error:', err);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}
```

#### Step 3: Update frontend - Remove localStorage

```javascript
// src/context/AuthContext.jsx
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // No need to send token - it's in httpOnly cookie
      const response = await fetch('/api/auth/user', {
        credentials: 'include'  // ← Include cookies
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user || userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',  // ← Include cookies
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setUser(data.user);
        // ❌ NO MORE: localStorage.setItem('authToken', data.token)
      } else {
        throw new Error(data.error || 'Login failed');
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  };

  const register = async (email, password) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',  // ← Include cookies
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setUser(data.user);
        // ❌ NO MORE: localStorage.setItem('authToken', data.token)
      } else {
        throw new Error(data.error || 'Registration failed');
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      // ❌ NO MORE: localStorage.removeItem('authToken')
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    setUser,
    login,
    register,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

#### Step 4: Add logout endpoint

```javascript
// server.js (or server/routes/auth.routes.js)
app.post('/api/auth/logout', (req, res) => {
  // Clear the authToken cookie
  res.clearCookie('authToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  
  res.json({ success: true });
});
```

#### Step 5: Update ALL fetch calls

```javascript
// src/services/api.js - Update all methods
class APIClient {
  async request(endpoint, options = {}) {
    // Always include cookies
    options.credentials = 'include';
    
    // NO MORE: Authorization header with localStorage token
    // The cookie is sent automatically
    
    const response = await fetch(endpoint, options);
    return response;
  }
}
```

#### Step 6: Test

```bash
# Clear localStorage in browser
localStorage.clear();

# Try to login
# Should work and set cookie (check DevTools → Application → Cookies)

# Try to access protected endpoint
# Should work (cookie sent automatically)

# Try localStorage.getItem('authToken')
# Should return null (token not accessible to JS) ✅
```

---

### 4. Add Security Headers (1-2 hours)

**Problem**: Missing security headers

**Solution:**

```javascript
// server.js
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "https://js.stripe.com",
        "https://www.google.com/recaptcha/",
        "'unsafe-inline'"  // Minimize usage
      ],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'",
        "https://fonts.googleapis.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "blob:"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com"
      ],
      connectSrc: [
        "'self'",
        "https://api.stripe.com"
      ],
      frameSrc: [
        "https://js.stripe.com"
      ],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  hidePoweredBy: true,
  frameguard: { action: 'deny' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true
}));
```

---

## 🟠 HIGH PRIORITY: Do These Next (Day 2)

---

### 5. Add Ownership Verification (IDOR Prevention) (3-4 hours)

**Problem**: Users might access/modify other users' sites

**Solution:**

```javascript
// server/routes/sites.routes.js

// GET /api/sites/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const site = await prisma.site.findUnique({
      where: { id: req.params.id }
    });
    
    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    // ✅ Verify ownership
    if (site.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(site);
  } catch (error) {
    console.error('Site fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch site' });
  }
});

// PUT /api/sites/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    // ✅ Verify ownership BEFORE update
    const existingSite = await prisma.site.findUnique({
      where: { id: req.params.id }
    });
    
    if (!existingSite) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    if (existingSite.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Now safe to update
    const site = await prisma.site.update({
      where: { id: req.params.id },
      data: req.body
    });
    
    res.json(site);
  } catch (error) {
    console.error('Site update error:', error);
    res.status(500).json({ error: 'Failed to update site' });
  }
});

// DELETE /api/sites/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    // ✅ Verify ownership BEFORE delete
    const existingSite = await prisma.site.findUnique({
      where: { id: req.params.id }
    });
    
    if (!existingSite) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    if (existingSite.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await prisma.site.delete({
      where: { id: req.params.id }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Site delete error:', error);
    res.status(500).json({ error: 'Failed to delete site' });
  }
});
```

**Test:**

```bash
# Create site as User A
# Try to access/modify/delete as User B
# Should return 403 Forbidden
```

---

### 6. Enhanced Rate Limiting (2-3 hours)

**Problem**: Insufficient protection against brute force attacks

**Solution:**

```bash
# Install dependencies
npm install express-rate-limit rate-limit-redis redis
```

```javascript
// server/middleware/rateLimiting.js
import rateLimit from 'express-rate-limit';

// General API rate limit
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,  // 100 requests per 15 minutes
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// Strict rate limit for authentication
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,  // Only 5 login attempts per 15 minutes
  skipSuccessfulRequests: true,  // Don't count successful logins
  message: 'Too many login attempts, please try again later.'
});

// File upload rate limit
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 50,  // 50 uploads per hour
  message: 'Upload limit exceeded, please try again later.'
});
```

```javascript
// server.js - Apply rate limiters
import { apiLimiter, authLimiter, uploadLimiter } from './server/middleware/rateLimiting.js';

// Apply to routes
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/upload', uploadLimiter);
```

---

## ✅ Testing

### Manual Testing

```bash
# 1. Test CSRF Protection
curl -X POST http://localhost:3000/api/sites \
  -H "Content-Type: application/json" \
  -d '{"subdomain": "test"}'
# Should return 403 Forbidden (no CSRF token)

# 2. Test XSS Prevention
# Create site with <script> tag
# Verify it's removed in database

# 3. Test JWT in Cookie
# Login, check DevTools → Application → Cookies
# Verify authToken cookie is present and httpOnly

# 4. Test Ownership
# Create site as User A
# Try to access as User B
# Should return 403 Forbidden

# 5. Test Rate Limiting
# Make 6 login attempts rapidly
# 6th attempt should return 429 Too Many Requests
```

### Automated Testing

```bash
# Run tests
npm test

# Run security-specific tests
npm test -- tests/security/
```

---

## 📋 Checklist

### Day 1: Critical Fixes

- [ ] Install cookie-parser
- [ ] Remove CSRF bypass for auth endpoints
- [ ] Update frontend to fetch CSRF tokens
- [ ] Install isomorphic-dompurify
- [ ] Create htmlSanitizer utility
- [ ] Apply sanitization to site creation/update
- [ ] Add CSP headers for generated sites
- [ ] Move JWT to httpOnly cookies (server)
- [ ] Update frontend to remove localStorage
- [ ] Add logout endpoint
- [ ] Configure helmet security headers
- [ ] Test all changes manually
- [ ] Run automated tests

### Day 2: High Priority

- [ ] Add ownership verification to all site endpoints
- [ ] Install rate-limit dependencies
- [ ] Configure rate limiters
- [ ] Apply rate limiters to routes
- [ ] Test IDOR protection
- [ ] Test rate limiting
- [ ] Update documentation

---

## 🚀 Deployment

After completing all fixes:

```bash
# 1. Run full test suite
npm test

# 2. Check for dependency vulnerabilities
npm audit

# 3. Update environment variables
# Ensure strong JWT_SECRET in production

# 4. Deploy to staging first
git push staging main

# 5. Manual security testing on staging
# - Test authentication
# - Test CSRF protection
# - Test XSS prevention
# - Test rate limiting

# 6. Deploy to production
git push production main
```

---

## 🆘 Need Help?

- **Questions**: See [SECURITY-ASSESSMENT.md](./SECURITY-ASSESSMENT.md)
- **Issues**: Check server logs and browser console
- **Testing**: Run `npm test -- tests/security/`

---

**Estimated Time**: 1-2 days (12-16 hours)  
**Difficulty**: Medium  
**Priority**: CRITICAL (production blocker)

