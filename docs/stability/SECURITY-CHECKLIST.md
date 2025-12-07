# Security Checklist

> Reference guide from "Release It!" - Security as an ongoing process

## Overview

Security is not a feature you add at the end. Security is an ongoing process that must be baked into development, deployment, and operations.

**Key principle**: Security is a process, not a product.

---

## OWASP Top 10

### 1. Injection

**What it is**: Untrusted data sent to interpreter as part of command/query

**Examples**:

#### SQL Injection
```javascript
// ❌ VULNERABLE
const query = `SELECT * FROM users WHERE email = '${email}'`;
await db.query(query);

// ✅ SAFE: Parameterized queries
const query = 'SELECT * FROM users WHERE email = $1';
await db.query(query, [email]);
```

#### NoSQL Injection
```javascript
// ❌ VULNERABLE
await User.find({ username: req.body.username });
// Attack: { username: { $ne: null } } returns all users!

// ✅ SAFE: Validate and sanitize
const username = sanitizeString(req.body.username);
await User.find({ username });
```

#### OS Command Injection
```javascript
// ❌ VULNERABLE
exec(`convert ${userFilename} output.png`);
// Attack: filename = "test.jpg; rm -rf /"

// ✅ SAFE: Use libraries, not shell commands
sharp(userFilename).toFile('output.png');
```

**Prevention**:
- ✅ Use parameterized queries (prepared statements)
- ✅ Use ORM/query builders with escaping
- ✅ Validate and sanitize all input
- ✅ Avoid shell commands; use libraries
- ✅ Principle of least privilege (database user has minimal permissions)

---

### 2. Broken Authentication and Session Management

**What it is**: Flaws in authentication/session handling allowing attackers to compromise accounts

**Common issues**:

#### Weak Password Requirements
```javascript
// ❌ WEAK
const MIN_PASSWORD_LENGTH = 4;

// ✅ STRONG
const PASSWORD_REQUIREMENTS = {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true
};
```

#### Insecure Session Storage
```javascript
// ❌ VULNERABLE: Session token in URL
res.redirect(`/dashboard?token=${sessionToken}`);
// Token visible in browser history, logs, referer header

// ✅ SAFE: Session token in HttpOnly cookie
res.cookie('sessionId', sessionToken, {
    httpOnly: true,  // Can't be accessed by JavaScript
    secure: true,    // Only sent over HTTPS
    sameSite: 'strict'
});
```

#### No Session Timeout
```javascript
// ❌ VULNERABLE: Sessions never expire
sessions.set(sessionId, userData);

// ✅ SAFE: Sessions expire
sessions.set(sessionId, userData);
setTimeout(() => {
    sessions.delete(sessionId);
}, 30 * 60 * 1000);  // 30 minutes

// Or use Redis with TTL
await redis.setex(`session:${sessionId}`, 1800, JSON.stringify(userData));
```

#### Predictable Session IDs
```javascript
// ❌ VULNERABLE
const sessionId = `${userId}-${Date.now()}`;
// Attacker can guess other users' session IDs

// ✅ SAFE: Cryptographically random
const sessionId = crypto.randomBytes(32).toString('hex');
```

**Prevention**:
- ✅ Use strong password requirements
- ✅ Implement multi-factor authentication
- ✅ Use HTTPS for all authenticated pages
- ✅ Secure session cookies (HttpOnly, Secure, SameSite)
- ✅ Implement session timeout
- ✅ Regenerate session ID after login
- ✅ Use cryptographically random session IDs
- ✅ Log failed login attempts
- ✅ Implement account lockout after failed attempts

---

### 3. Cross-Site Scripting (XSS)

**What it is**: Attackers inject malicious scripts that execute in victims' browsers

**Types**:

#### Stored XSS
```javascript
// ❌ VULNERABLE: Display user input without escaping
app.get('/comments', async (req, res) => {
    const comments = await db.query('SELECT * FROM comments');
    res.send(`<div>${comments[0].text}</div>`);
    // If comment contains <script>alert('XSS')</script>, it executes!
});

// ✅ SAFE: Escape all output
import escape from 'escape-html';
res.send(`<div>${escape(comments[0].text)}</div>`);

// ✅ BETTER: Use templating engine with auto-escaping
res.render('comments', { comments });  // React, Vue, etc. auto-escape
```

#### Reflected XSS
```javascript
// ❌ VULNERABLE
app.get('/search', (req, res) => {
    res.send(`You searched for: ${req.query.q}`);
    // URL: /search?q=<script>alert('XSS')</script>
});

// ✅ SAFE
app.get('/search', (req, res) => {
    res.send(`You searched for: ${escape(req.query.q)}`);
});
```

#### DOM-Based XSS
```javascript
// ❌ VULNERABLE: Using innerHTML with user data
const name = new URLSearchParams(location.search).get('name');
document.getElementById('greeting').innerHTML = `Hello ${name}`;

// ✅ SAFE: Use textContent
document.getElementById('greeting').textContent = `Hello ${name}`;
```

**Prevention**:
- ✅ Escape all user-generated content
- ✅ Use templating engines with auto-escaping
- ✅ Use `textContent` instead of `innerHTML`
- ✅ Content Security Policy (CSP) headers
- ✅ HTTPOnly cookies (prevent script access)
- ✅ Validate and sanitize input

**CSP Header**:
```javascript
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', 
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
    );
    next();
});
```

---

### 4. Broken Access Control

**What it is**: Users can access resources they shouldn't

**Examples**:

#### Insecure Direct Object Reference (IDOR)
```javascript
// ❌ VULNERABLE: No authorization check
app.get('/api/orders/:id', async (req, res) => {
    const order = await db.getOrder(req.params.id);
    res.json(order);
    // Any user can view any order by guessing IDs!
});

// ✅ SAFE: Verify ownership
app.get('/api/orders/:id', requireAuth, async (req, res) => {
    const order = await db.getOrder(req.params.id);
    
    if (order.userId !== req.user.id && !req.user.isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    
    res.json(order);
});
```

#### Missing Function Level Access Control
```javascript
// ❌ VULNERABLE: Admin function without authorization
app.delete('/api/users/:id', async (req, res) => {
    await db.deleteUser(req.params.id);
    res.json({ success: true });
    // Any user can delete any user!
});

// ✅ SAFE: Require admin role
app.delete('/api/users/:id', requireAdmin, async (req, res) => {
    await db.deleteUser(req.params.id);
    res.json({ success: true });
});
```

#### Predictable IDs
```javascript
// ❌ VULNERABLE: Sequential IDs
const userId = autoIncrement();  // 1, 2, 3, 4...
// Attacker can enumerate all users

// ✅ SAFE: UUIDs
const userId = crypto.randomUUID();  // f47ac10b-58cc-4372-a567-0e02b2c3d479
```

**Prevention**:
- ✅ Verify authorization on every request
- ✅ Use UUIDs instead of sequential IDs
- ✅ Implement role-based access control (RBAC)
- ✅ Deny by default, allow explicitly
- ✅ Log access to sensitive resources

---

### 5. Security Misconfiguration

**What it is**: Insecure default configurations, incomplete setups, verbose errors

**Examples**:

#### Exposing Stack Traces
```javascript
// ❌ VULNERABLE: Expose error details in production
app.use((err, req, res, next) => {
    res.status(500).json({ 
        error: err.message,
        stack: err.stack  // Exposes internal paths, libraries, etc.
    });
});

// ✅ SAFE: Generic errors in production
app.use((err, req, res, next) => {
    console.error(err);  // Log internally
    
    if (process.env.NODE_ENV === 'production') {
        res.status(500).json({ error: 'Internal server error' });
    } else {
        res.status(500).json({ error: err.message, stack: err.stack });
    }
});
```

#### Default Credentials
```javascript
// ❌ VULNERABLE: Default admin account
const DEFAULT_ADMIN = {
    username: 'admin',
    password: 'admin123'
};

// ✅ SAFE: Force password change on first use
const admin = await db.getUser('admin');
if (admin.mustChangePassword) {
    return res.redirect('/change-password');
}
```

#### Unnecessary Features Enabled
```javascript
// ❌ VULNERABLE: Debug endpoints in production
if (process.env.NODE_ENV !== 'production') {
    app.get('/debug', (req, res) => {
        res.json({ env: process.env, sessions: Array.from(sessions.entries()) });
    });
}
```

#### Missing Security Headers
```javascript
// ✅ Use Helmet.js for security headers
import helmet from 'helmet';

app.use(helmet());
// Sets:
// - X-Frame-Options: DENY (prevent clickjacking)
// - X-Content-Type-Options: nosniff
// - Strict-Transport-Security: max-age=...
// - And more
```

**Prevention**:
- ✅ Remove default accounts
- ✅ Disable debug features in production
- ✅ Keep software updated
- ✅ Use security headers
- ✅ Minimize error information disclosure
- ✅ Regular security audits

---

### 6. Sensitive Data Exposure

**What it is**: Failing to protect sensitive data (passwords, credit cards, PII)

**Examples**:

#### Storing Passwords in Plain Text
```javascript
// ❌ NEVER
await db.query('INSERT INTO users (email, password) VALUES (?, ?)', 
    [email, password]);

// ✅ ALWAYS hash passwords
import bcrypt from 'bcryptjs';
const hashedPassword = await bcrypt.hash(password, 12);
await db.query('INSERT INTO users (email, password_hash) VALUES (?, ?)', 
    [email, hashedPassword]);
```

#### Logging Sensitive Data
```javascript
// ❌ VULNERABLE
console.log('User login:', { email, password, creditCard });

// ✅ SAFE
console.log('User login:', { email, userId });
```

#### Transmitting Over HTTP
```javascript
// ❌ VULNERABLE: HTTP for sensitive data
// http://example.com/api/login

// ✅ SAFE: HTTPS only
app.use((req, res, next) => {
    if (!req.secure && process.env.NODE_ENV === 'production') {
        return res.redirect('https://' + req.headers.host + req.url);
    }
    next();
});
```

#### Weak Encryption
```javascript
// ❌ WEAK: MD5, SHA1 are broken
const hash = crypto.createHash('md5').update(password).digest('hex');

// ✅ STRONG: bcrypt, Argon2
import bcrypt from 'bcryptjs';
const hash = await bcrypt.hash(password, 12);  // 12 rounds
```

**Prevention**:
- ✅ Hash passwords with bcrypt/Argon2
- ✅ Use HTTPS everywhere
- ✅ Encrypt sensitive data at rest
- ✅ Don't log sensitive data
- ✅ Implement data retention policies
- ✅ Use strong encryption (AES-256, not DES/MD5)
- ✅ Comply with regulations (GDPR, CCPA, HIPAA)

---

### 7. Insufficient Attack Protection

**What it is**: Applications don't detect, prevent, or respond to attacks

**Examples**:

#### No Rate Limiting
```javascript
// ❌ VULNERABLE: No protection against brute force
app.post('/login', async (req, res) => {
    const user = await db.getUserByEmail(req.body.email);
    if (user && await bcrypt.compare(req.body.password, user.passwordHash)) {
        // Login successful
    }
    // Attacker can try millions of passwords
});

// ✅ SAFE: Rate limiting
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 5,  // 5 attempts
    message: 'Too many login attempts, try again later'
});

app.post('/login', loginLimiter, async (req, res) => {
    // Login logic
});
```

#### No Attack Detection
```javascript
// ✅ Log suspicious activity
app.post('/login', async (req, res) => {
    const user = await db.getUserByEmail(req.body.email);
    
    if (!user || !await bcrypt.compare(req.body.password, user.passwordHash)) {
        // Log failed attempt
        await logFailedLogin({
            email: req.body.email,
            ip: req.ip,
            timestamp: new Date()
        });
        
        // Alert on multiple failures
        const recentFailures = await getRecentFailedLogins(req.body.email);
        if (recentFailures.length > 10) {
            await alertSecurity(`Brute force attack on ${req.body.email}`);
        }
    }
});
```

**Prevention**:
- ✅ Implement rate limiting
- ✅ Log authentication attempts
- ✅ Alert on suspicious patterns
- ✅ CAPTCHA for repeated failures
- ✅ Account lockout after failed attempts
- ✅ Monitor for automated tools (User-Agent, behavior)

---

### 8. Cross-Site Request Forgery (CSRF)

**What it is**: Attacker tricks user into executing unwanted actions

**Example attack**:
```html
<!-- Attacker's malicious site -->
<img src="https://bank.com/transfer?to=attacker&amount=1000">
<!-- If user is logged into bank.com, request succeeds! -->
```

**Prevention**:
```javascript
// ✅ CSRF tokens
import csrf from 'csurf';

app.use(csrf({ cookie: true }));

// Render form with token
app.get('/transfer', (req, res) => {
    res.render('transfer', { csrfToken: req.csrfToken() });
});

// Verify token on submission
app.post('/transfer', (req, res) => {
    // Token automatically verified by middleware
    // Will reject if token missing/invalid
});
```

```html
<!-- Form includes CSRF token -->
<form method="POST" action="/transfer">
    <input type="hidden" name="_csrf" value="{{csrfToken}}">
    <input name="to">
    <input name="amount">
    <button>Transfer</button>
</form>
```

**SameSite Cookies**:
```javascript
res.cookie('sessionId', sessionToken, {
    sameSite: 'strict'  // Cookie not sent on cross-site requests
});
```

**Prevention**:
- ✅ Use CSRF tokens
- ✅ SameSite cookie attribute
- ✅ Verify Origin/Referer headers
- ✅ Require re-authentication for sensitive actions

---

### 9. Using Components with Known Vulnerabilities

**What it is**: Using outdated libraries with security flaws

**Example**:
```json
{
  "dependencies": {
    "express": "3.0.0"  // ❌ Ancient version with vulnerabilities
  }
}
```

**Prevention**:

#### Regular Dependency Audits
```bash
# npm
npm audit
npm audit fix

# yarn
yarn audit
```

#### Automated Scanning in CI/CD
```yaml
# .gitlab-ci.yml
security_scan:
  script:
    - npm audit --audit-level=high
    # Fail if high/critical vulnerabilities found
```

#### Dependabot / Renovate Bot
- Automated pull requests for dependency updates
- Security vulnerability alerts

#### Keep Updated
```bash
# Check for outdated packages
npm outdated

# Update all to latest
npm update

# Major version updates
npm install express@latest
```

**Prevention**:
- ✅ Run `npm audit` regularly
- ✅ Keep dependencies updated
- ✅ Use automated tools (Dependabot, Snyk)
- ✅ Monitor security advisories
- ✅ Remove unused dependencies
- ✅ Fail builds on high-severity vulnerabilities

---

### 10. Underprotected APIs

**What it is**: APIs without proper authentication, authorization, or rate limiting

**Examples**:

#### No Authentication
```javascript
// ❌ VULNERABLE: Public API without auth
app.get('/api/users', async (req, res) => {
    const users = await db.getAllUsers();
    res.json(users);  // Anyone can view all users!
});

// ✅ SAFE: Require authentication
app.get('/api/users', requireAuth, requireAdmin, async (req, res) => {
    const users = await db.getAllUsers();
    res.json(users);
});
```

#### Excessive Data Exposure
```javascript
// ❌ VULNERABLE: Exposing internal fields
app.get('/api/users/:id', async (req, res) => {
    const user = await db.getUser(req.params.id);
    res.json(user);  // Includes passwordHash, internal IDs, etc.
});

// ✅ SAFE: Return only necessary fields
app.get('/api/users/:id', async (req, res) => {
    const user = await db.getUser(req.params.id);
    res.json({
        id: user.id,
        name: user.name,
        email: user.email
        // Exclude: passwordHash, createdAt, etc.
    });
});
```

#### No Rate Limiting
```javascript
// ✅ Rate limit all APIs
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
    windowMs: 60 * 1000,  // 1 minute
    max: 100  // 100 requests per minute
});

app.use('/api/', apiLimiter);
```

**Prevention**:
- ✅ Require authentication for all APIs
- ✅ Implement authorization checks
- ✅ Rate limiting per user/IP
- ✅ Input validation
- ✅ Return minimal data
- ✅ Use HTTPS
- ✅ API versioning
- ✅ Monitor for abuse

---

## Principle of Least Privilege

**Definition**: Give users/processes only the minimum permissions needed

### Application Level

```javascript
// ❌ BAD: Run as root
USER root
CMD ["node", "server.js"]

// ✅ GOOD: Run as non-root user
RUN addgroup -g 1001 -S app && adduser -S -u 1001 -s /sbin/nologin app
USER app
CMD ["node", "server.js"]
```

### Database Level

```sql
-- ❌ BAD: Application uses superuser
CREATE USER app_user WITH SUPERUSER PASSWORD 'password';

-- ✅ GOOD: Limited permissions
CREATE USER app_user WITH PASSWORD 'password';
GRANT SELECT, INSERT, UPDATE ON users TO app_user;
GRANT SELECT, INSERT, UPDATE ON orders TO app_user;
-- No DELETE, no DROP, no CREATE
```

### File System Level

```javascript
// ❌ BAD: World-writable
fs.chmodSync('/app/uploads', 0o777);

// ✅ GOOD: Owner read/write only
fs.chmodSync('/app/uploads', 0o700);
```

### API Keys / Service Accounts

```javascript
// ❌ BAD: Admin API key for everything
const adminKey = 'sk_live_full_access';

// ✅ GOOD: Restricted API keys per purpose
const readOnlyKey = 'sk_live_read_only';
const writeKey = 'sk_live_write_orders';
```

---

## Security as Ongoing Process

### 1. Secure Development Lifecycle

**Requirements phase**:
- Identify sensitive data
- Define security requirements
- Threat modeling

**Design phase**:
- Security architecture review
- Identify attack surfaces
- Plan mitigations

**Implementation phase**:
- Secure coding standards
- Code reviews with security focus
- Static analysis tools

**Testing phase**:
- Security testing (DAST)
- Penetration testing
- Vulnerability scanning

**Deployment phase**:
- Secure configuration
- Security hardening
- Access control

**Operations phase**:
- Monitoring for attacks
- Incident response
- Regular patching

### 2. Regular Security Activities

**Daily**:
- Monitor security alerts
- Review access logs
- Check for failed login attempts

**Weekly**:
- Dependency vulnerability scan
- Review new security advisories
- Update critical patches

**Monthly**:
- Full security scan
- Access control review
- Incident response drill

**Quarterly**:
- Penetration testing
- Security training
- Policy review

**Annually**:
- External security audit
- Disaster recovery test
- Compliance audit

### 3. Security Culture

**Education**:
- Security training for all developers
- Regular security workshops
- Share security incidents (blameless)

**Accountability**:
- Security champions on each team
- Security in code review checklists
- Security metrics in dashboards

**Automation**:
- Security scanning in CI/CD
- Automated dependency updates
- Automated secrets scanning

---

## Quick Security Checklist

### Code
- [ ] All user input validated
- [ ] All output escaped
- [ ] Parameterized queries (no string concatenation)
- [ ] Passwords hashed with bcrypt/Argon2
- [ ] CSRF protection enabled
- [ ] Security headers configured
- [ ] Error messages don't expose internals
- [ ] Secrets in environment variables (not code)

### APIs
- [ ] Authentication required
- [ ] Authorization checked on every request
- [ ] Rate limiting enabled
- [ ] Input validation
- [ ] HTTPS only
- [ ] Minimal data in responses

### Infrastructure
- [ ] HTTPS everywhere
- [ ] TLS 1.2+ only
- [ ] Strong cipher suites
- [ ] Security groups/firewall rules restrictive
- [ ] Principle of least privilege
- [ ] Regular patching/updates
- [ ] Logs monitored

### Data
- [ ] Sensitive data encrypted at rest
- [ ] Sensitive data encrypted in transit
- [ ] Data retention policy
- [ ] Backup encryption
- [ ] Access logging

### Operations
- [ ] Security monitoring
- [ ] Incident response plan
- [ ] Regular security testing
- [ ] Dependency scanning
- [ ] Security training

---

## Tools

### Static Analysis
- **ESLint Security Plugin**: Catch common JavaScript vulnerabilities
- **Bandit** (Python): Security linter
- **Brakeman** (Ruby): Rails security scanner

### Dependency Scanning
- **npm audit / yarn audit**: Built-in
- **Snyk**: Commercial, comprehensive
- **Dependabot**: Automated updates

### Dynamic Analysis
- **OWASP ZAP**: Web application scanner
- **Burp Suite**: Penetration testing
- **Nmap**: Network scanning

### Secrets Scanning
- **git-secrets**: Prevent committing secrets
- **TruffleHog**: Find secrets in git history
- **GitGuardian**: Real-time secret detection

---

## Resources

- **OWASP**: https://owasp.org
- **OWASP Top 10**: https://owasp.org/www-project-top-ten
- **OWASP Cheat Sheets**: https://cheatsheetseries.owasp.org
- **CWE Top 25**: https://cwe.mitre.org/top25
- **NIST Cybersecurity Framework**: https://www.nist.gov/cyberframework

---

## Next Steps

- Review [ANTIPATTERNS.md](./ANTIPATTERNS.md) for operational security concerns
- See [PRODUCTION-READINESS.md](./PRODUCTION-READINESS.md) for deployment security
- Study [CHAOS-ENGINEERING.md](./CHAOS-ENGINEERING.md) to test security under stress

