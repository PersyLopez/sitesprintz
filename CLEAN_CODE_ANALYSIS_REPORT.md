# Clean Code Quality Analysis Report

**Generated**: 2025-01-XX  
**Files Analyzed**: 3  
**Analysis Framework**: Clean Code QA Agent Skill

---

## File: `server/services/bookingService.js`

### Summary
- **Total Lines**: 924
- **Total Functions**: 20 methods
- **Total Classes**: 1
- **Violations Found**: 3 (2 HIGH, 1 MEDIUM)

---

#### Violation 1: Long Function
**Type:** Long Function  
**Priority:** HIGH  
**Snippet:**
```355:493:server/services/bookingService.js
async calculateAvailableSlots(tenantId, serviceId, staffId, date, timezone = 'America/New_York') {
  // 138 lines of complex availability calculation logic
  // Multiple responsibilities: date parsing, rule fetching, appointment checking, slot generation
}
```

**Principle Broken:** Functions should be small and do one thing. This function violates SRP by handling date parsing, availability rule fetching, appointment conflict checking, and time slot generation all in one function.

**Refactor:**
```javascript
async calculateAvailableSlots(tenantId, serviceId, staffId, date, timezone = 'America/New_York') {
  const service = await this.getService(serviceId, tenantId);
  if (!service) throw new Error('Service not found');

  const staff = await this.getStaffMember(staffId, tenantId);
  if (!staff) throw new Error('Staff member not found');

  const dateInfo = this.parseDateForAvailability(date, timezone);
  const availabilityRules = await this.getAvailabilityRulesForDay(staffId, dateInfo.dayOfWeek);
  const existingAppointments = await this.getAppointmentsForDay(staffId, dateInfo.dayStart, dateInfo.dayEnd);
  
  return this.generateTimeSlots({
    service,
    staff,
    dateInfo,
    availabilityRules,
    existingAppointments,
    timezone
  });
}

// Extract helper methods:
parseDateForAvailability(date, timezone) { /* ... */ }
getAvailabilityRulesForDay(staffId, dayOfWeek) { /* ... */ }
getAppointmentsForDay(staffId, dayStart, dayEnd) { /* ... */ }
generateTimeSlots({ service, staff, dateInfo, availabilityRules, existingAppointments, timezone }) { /* ... */ }
```

**Suggested Technique:** Extract Function (multiple extractions)

---

#### Violation 2: Long Function
**Type:** Long Function  
**Priority:** HIGH  
**Snippet:**
```515:623:server/services/bookingService.js
async createAppointment(tenantId, appointmentData) {
  // 108 lines of appointment creation logic
  // Handles validation, conflict checking, code generation, transaction management, email sending
}
```

**Principle Broken:** Functions should be small and do one thing. This function handles validation, database transaction, conflict checking, confirmation code generation, and triggers email sending.

**Refactor:**
```javascript
async createAppointment(tenantId, appointmentData) {
  this.validateAppointmentData(appointmentData);
  
  const appointment = await prisma.$transaction(async (tx) => {
    const service = await this.getServiceForAppointment(tx, appointmentData.service_id, tenantId);
    const timeRange = this.calculateAppointmentTimeRange(appointmentData.start_time, service.duration_minutes, appointmentData.timezone);
    
    await this.checkForConflicts(tx, appointmentData.staff_id, timeRange);
    const confirmationCode = await this.generateUniqueConfirmationCode(tx);
    const status = this.determineAppointmentStatus(service);
    
    return await this.createAppointmentRecord(tx, {
      tenantId,
      appointmentData,
      service,
      timeRange,
      confirmationCode,
      status
    });
  });

  this.sendConfirmationEmailAsync(appointment);
  return appointment;
}

// Extract helper methods:
validateAppointmentData(appointmentData) { /* ... */ }
getServiceForAppointment(tx, serviceId, tenantId) { /* ... */ }
calculateAppointmentTimeRange(startTime, duration, timezone) { /* ... */ }
checkForConflicts(tx, staffId, timeRange) { /* ... */ }
generateUniqueConfirmationCode(tx) { /* ... */ }
determineAppointmentStatus(service) { /* ... */ }
createAppointmentRecord(tx, data) { /* ... */ }
sendConfirmationEmailAsync(appointment) { /* ... */ }
```

**Suggested Technique:** Extract Function (multiple extractions)

---

#### Violation 3: SRP Violation
**Type:** SRP Violation  
**Priority:** HIGH  
**Snippet:**
```10:923:server/services/bookingService.js
class BookingService {
  // Methods indicate multiple responsibilities:
  // - Tenant management (getOrCreateTenant)
  // - Service management (createService, getServices, updateService, deleteService)
  // - Staff management (getOrCreateDefaultStaff, setAvailabilityRules, getAvailabilityRules)
  // - Availability calculation (calculateAvailableSlots)
  // - Appointment management (createAppointment, getAppointments, cancelAppointment)
  // - Email notifications (sendConfirmationEmail, sendCancellationEmail)
}
```

**Principle Broken:** Classes should have a single responsibility. This class handles tenant management, service management, staff management, availability calculation, appointment management, and email notifications.

**Refactor:**
```javascript
// Split into focused services:
class TenantService {
  async getOrCreateTenant(userId, siteId) { /* ... */ }
}

class ServiceManagementService {
  async createService(tenantId, serviceData) { /* ... */ }
  async getServices(tenantId, includeInactive) { /* ... */ }
  async updateService(serviceId, tenantId, serviceData) { /* ... */ }
  async deleteService(serviceId, tenantId) { /* ... */ }
}

class StaffManagementService {
  async getOrCreateDefaultStaff(tenantId) { /* ... */ }
  async setAvailabilityRules(staffId, tenantId, scheduleRules) { /* ... */ }
  async getAvailabilityRules(staffId) { /* ... */ }
}

class AvailabilityService {
  async calculateAvailableSlots(tenantId, serviceId, staffId, date, timezone) { /* ... */ }
}

class AppointmentService {
  async createAppointment(tenantId, appointmentData) { /* ... */ }
  async getAppointments(tenantId, filters) { /* ... */ }
  async cancelAppointment(identifier, tenantId, cancelData) { /* ... */ }
}

class AppointmentNotificationService {
  async sendConfirmationEmail(appointment) { /* ... */ }
  async sendCancellationEmail(appointment, reason, cancelled_by) { /* ... */ }
}
```

**Suggested Technique:** Extract Class (split into 6 focused services)

---

## File: `server/routes/auth.routes.js`

### Summary
- **Total Lines**: 778
- **Total Functions**: 12 route handlers
- **Total Classes**: 0
- **Violations Found**: 1 (MEDIUM)

---

#### Violation 1: File Too Large / Multiple Responsibilities
**Type:** Divergent Change  
**Priority:** MEDIUM  
**Snippet:**
```1:778:server/routes/auth.routes.js
// File contains multiple distinct responsibilities:
// - User registration (register, quick-register)
// - Authentication (login, verify, refresh, logout)
// - Email verification (verify-email, resend-verification)
// - Password management (forgot-password, reset-password, change-temp-password)
// - Magic link authentication (send-magic-link)
```

**Principle Broken:** A single module requiring changes for multiple different reasons. This file handles registration, authentication, email verification, password reset, and magic links - each could change independently.

**Refactor:**
```javascript
// Split into focused route files:
// server/routes/auth/registration.routes.js
router.post('/register', ...);
router.post('/quick-register', ...);

// server/routes/auth/login.routes.js
router.post('/login', ...);
router.post('/refresh', ...);
router.post('/logout', ...);
router.get('/verify', ...);
router.get('/me', ...);

// server/routes/auth/verification.routes.js
router.get('/verify-email', ...);
router.post('/resend-verification', ...);

// server/routes/auth/password.routes.js
router.post('/forgot-password', ...);
router.post('/reset-password', ...);
router.post('/change-temp-password', ...);

// server/routes/auth/magic-link.routes.js
router.post('/send-magic-link', ...);
```

**Suggested Technique:** Extract Class / Split Module

---

## File: `server/utils/helpers.js`

### Summary
- **Total Lines**: 47
- **Total Functions**: 6
- **Total Classes**: 0
- **Violations Found**: 0

**Status:** ✅ This code adheres to the Boy Scout Rule.

All functions are:
- Small and focused (< 20 lines each)
- Single responsibility
- Well-named and intention-revealing
- No side effects (pure utility functions)

---

## Overall Summary

### Violations by Priority

| Priority | Count | Files Affected |
|----------|-------|----------------|
| HIGH     | 3     | 2              |
| MEDIUM   | 1     | 1              |
| LOW      | 0     | 0              |

### Violations by Type

| Type | Count | Priority |
|------|-------|----------|
| Long Function | 2 | HIGH |
| SRP Violation | 1 | HIGH |
| Divergent Change | 1 | MEDIUM |

### Recommendations

1. **Immediate (HIGH Priority)**:
   - Extract helper methods from `calculateAvailableSlots()` in `bookingService.js`
   - Extract helper methods from `createAppointment()` in `bookingService.js`
   - Split `BookingService` class into focused service classes

2. **Follow-up (MEDIUM Priority)**:
   - Split `auth.routes.js` into focused route modules by responsibility

3. **Code Quality**:
   - `helpers.js` is well-structured and can serve as a reference for other utility files

### Refactoring Sequence

1. Start with `calculateAvailableSlots()` - extract date parsing and slot generation
2. Refactor `createAppointment()` - extract validation and conflict checking
3. Split `BookingService` - extract TenantService, ServiceManagementService, etc.
4. Split `auth.routes.js` - organize by authentication concern

---

---

## File: `server/middleware/auth.js`

### Summary
- **Total Lines**: 175
- **Total Functions**: 2 middleware functions
- **Total Classes**: 0
- **Violations Found**: 3 (2 HIGH, 1 MEDIUM)

---

#### Violation 1: Long Function
**Type:** Long Function  
**Priority:** HIGH  
**Snippet:**
```14:80:server/middleware/auth.js
export async function requireAdmin(req, res, next) {
  // 66 lines of authentication and authorization logic
  // Handles token extraction, verification, user lookup, status checking, role checking
}
```

**Principle Broken:** Functions should be small and do one thing. This function handles token extraction, JWT verification, database lookup, status checking, and role authorization all in one function.

**Refactor:**
```javascript
export async function requireAdmin(req, res, next) {
  try {
    const user = await authenticateUser(req);
    if (!user) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    authorizeAdmin(user, res);
    attachUserToRequest(req, user);
    next();
  } catch (err) {
    handleAuthError(err, res);
  }
}

// Extract helper functions:
async function authenticateUser(req) { /* token extraction + verification + DB lookup */ }
function authorizeAdmin(user, res) { /* status + role checking */ }
function attachUserToRequest(req, user) { /* attach user object */ }
function handleAuthError(err, res) { /* error handling */ }
```

**Suggested Technique:** Extract Function (multiple extractions)

---

#### Violation 2: Long Function
**Type:** Long Function  
**Priority:** HIGH  
**Snippet:**
```95:168:server/middleware/auth.js
export async function requireAuth(req, res, next) {
  // 73 lines of authentication logic
  // Similar structure to requireAdmin but with email verification check
}
```

**Principle Broken:** Functions should be small and do one thing. This function is nearly identical to `requireAdmin` with slight variations, indicating code duplication.

**Refactor:**
```javascript
export async function requireAuth(req, res, next) {
  try {
    const user = await authenticateUser(req);
    if (!user) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    checkUserStatus(user, res);
    checkEmailVerification(user, res);
    attachUserToRequest(req, user);
    next();
  } catch (err) {
    handleAuthError(err, res);
  }
}

// Reuse shared helper functions from requireAdmin refactoring
```

**Suggested Technique:** Extract Function + Parameterize Function (to eliminate duplication with requireAdmin)

---

#### Violation 3: Duplicated Code
**Type:** Duplicated Code  
**Priority:** MEDIUM  
**Snippet:**
```14:80:server/middleware/auth.js
// requireAdmin function
// Lines 14-80: Token extraction, JWT verification, DB lookup, status check, role check

// requireAuth function  
// Lines 95-168: Nearly identical logic with minor variations
```

**Principle Broken:** Code blocks are >70% similar. Both functions share token extraction, JWT verification, database lookup, and status checking logic.

**Refactor:**
```javascript
// Extract common authentication logic
async function authenticateAndLoadUser(req) {
  const token = extractToken(req);
  if (!token) throw new Error('No token provided');
  
  const decoded = jwt.verify(token, getJwtSecret());
  const user = await prisma.users.findUnique({
    where: { id: decoded.userId || decoded.id },
    select: { /* ... */ }
  });
  
  if (!user) throw new Error('User not found');
  if (user.status !== 'active') throw new Error('Account is suspended');
  
  return user;
}

// Use in both functions
export async function requireAuth(req, res, next) {
  try {
    const user = await authenticateAndLoadUser(req);
    checkEmailVerification(user, res);
    attachUserToRequest(req, user);
    next();
  } catch (err) {
    handleAuthError(err, res);
  }
}

export async function requireAdmin(req, res, next) {
  try {
    const user = await authenticateAndLoadUser(req);
    authorizeAdmin(user, res);
    attachUserToRequest(req, user);
    next();
  } catch (err) {
    handleAuthError(err, res);
  }
}
```

**Suggested Technique:** Extract Function + Parameterize Function

---

## File: `server/services/emailService.js`

### Summary
- **Total Lines**: 531
- **Total Functions**: 12 methods
- **Total Classes**: 1
- **Violations Found**: 3 (2 HIGH, 1 MEDIUM)

---

#### Violation 1: Long Function
**Type:** Long Function  
**Priority:** HIGH  
**Snippet:**
```98:243:server/services/emailService.js
initializeTemplates() {
  // 144 lines of inline HTML template strings
  // Contains multiple email templates with embedded HTML
}
```

**Principle Broken:** Functions should be small and do one thing. This function contains 144 lines of HTML template strings, making it difficult to maintain and test.

**Refactor:**
```javascript
initializeTemplates() {
  return {
    welcome: (data) => this.renderWelcomeTemplate(data),
    orderReceived: (data) => this.renderOrderReceivedTemplate(data),
    contactFormSubmission: (data) => this.renderContactFormTemplate(data),
    trialExpiring: (data) => this.renderTrialExpiringTemplate(data),
    subscriptionCreated: (data) => this.renderSubscriptionTemplate(data)
  };
}

// Extract each template to separate method
renderWelcomeTemplate(data) {
  return {
    subject: 'Welcome to SiteSprintz! 🎉',
    html: this.generateWelcomeHTML(data),
    provider: 'smtp'
  };
}

// Or better: Move templates to separate files
// templates/welcome.html, templates/orderReceived.html, etc.
```

**Suggested Technique:** Extract Function (extract each template) OR Move Function (to separate template files)

---

#### Violation 2: Long Function
**Type:** Long Function  
**Priority:** HIGH  
**Snippet:**
```307:389:server/services/emailService.js
async sendWithRetry(options, attempt = 1) {
  // 82 lines of retry logic with exponential backoff
  // Handles template rendering, provider selection, sending, error handling, retries, fallback
}
```

**Principle Broken:** Functions should be small and do one thing. This function handles template rendering, provider selection, sending, error handling, retry logic, and fallback mechanisms.

**Refactor:**
```javascript
async sendWithRetry(options, attempt = 1) {
  try {
    const renderedEmail = this.renderTemplate(options);
    const provider = this.selectProvider(options, renderedEmail);
    const result = await this.sendViaProvider(provider, renderedEmail, options);
    return this.createSuccessResult(result, provider, attempt);
  } catch (error) {
    return await this.handleSendError(error, options, attempt);
  }
}

// Extract helper methods:
renderTemplate(options) { /* ... */ }
selectProvider(options, renderedEmail) { /* ... */ }
createSuccessResult(result, provider, attempt) { /* ... */ }
async handleSendError(error, options, attempt) { /* retry logic + fallback */ }
```

**Suggested Technique:** Extract Function (multiple extractions)

---

#### Violation 3: SRP Violation
**Type:** SRP Violation  
**Priority:** MEDIUM  
**Snippet:**
```24:521:server/services/emailService.js
class EmailService {
  // Methods indicate multiple responsibilities:
  // - Template management (initializeTemplates, renderTemplate)
  // - Provider management (initializeResend, initializeNodemailer, sendViaProvider)
  // - Retry logic (sendWithRetry, queueEmail)
  // - Email sending (sendEmail, sendViaResend, sendViaSMTP)
  // - Convenience methods (sendOrderEmail, sendContactFormEmail, sendTrialEmail)
}
```

**Principle Broken:** Classes should have a single responsibility. This class handles template management, provider management, retry logic, queue management, and email sending.

**Refactor:**
```javascript
// Split into focused classes:
class EmailTemplateService {
  initializeTemplates() { /* ... */ }
  renderTemplate(templateName, data) { /* ... */ }
}

class EmailProviderService {
  initializeResend() { /* ... */ }
  initializeNodemailer() { /* ... */ }
  sendViaProvider(provider, emailData) { /* ... */ }
}

class EmailRetryService {
  async sendWithRetry(options, attempt) { /* ... */ }
  calculateRetryDelay(attempt) { /* ... */ }
}

class EmailService {
  constructor() {
    this.templateService = new EmailTemplateService();
    this.providerService = new EmailProviderService();
    this.retryService = new EmailRetryService();
  }
  
  async sendEmail(options) { /* orchestrate using services */ }
}
```

**Suggested Technique:** Extract Class (split into 4 focused services)

---

## File: `src/services/api.js`

### Summary
- **Total Lines**: 191
- **Total Functions**: 6 methods
- **Total Classes**: 1
- **Violations Found**: 2 (1 HIGH, 1 MEDIUM)

---

#### Violation 1: Long Function
**Type:** Long Function  
**Priority:** HIGH  
**Snippet:**
```24:111:server/services/api.js
async request(endpoint, options = {}) {
  // 87 lines of HTTP request logic
  // Handles URL construction, token extraction, header setup, retry logic, error handling, response parsing
}
```

**Principle Broken:** Functions should be small and do one thing. This function handles URL construction, query parameters, token extraction, header setup, retry logic, error handling, and response parsing.

**Refactor:**
```javascript
async request(endpoint, options = {}) {
  const url = this.buildRequestUrl(endpoint, options);
  const headers = this.buildHeaders(options);
  
  return await this.executeWithRetry(url, { ...options, headers });
}

// Extract helper methods:
buildRequestUrl(endpoint, options) { /* URL + query params */ }
buildHeaders(options) { /* token + CSRF + content-type */ }
async executeWithRetry(url, options) { /* retry logic + error handling */ }
parseResponse(response) { /* JSON/text parsing */ }
handleAuthError(response) { /* 401 handling */ }
```

**Suggested Technique:** Extract Function (multiple extractions)

---

#### Violation 2: Duplicated Code
**Type:** Duplicated Code  
**Priority:** MEDIUM  
**Snippet:**
```24:111:server/services/api.js
// request method: Lines 33-50 (token extraction + header setup)
// upload method: Lines 140-153 (nearly identical token extraction + header setup)
```

**Principle Broken:** Code blocks are >70% similar. Both `request` and `upload` methods have identical token extraction and header setup logic.

**Refactor:**
```javascript
buildHeaders(options) {
  const token = this.getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (this.csrfToken) {
    headers['x-csrf-token'] = this.csrfToken;
  }
  
  return headers;
}

getAuthToken() {
  return localStorage.getItem('accessToken') || localStorage.getItem('authToken');
}

// Use in both request and upload methods
async request(endpoint, options = {}) {
  const headers = this.buildHeaders(options);
  // ... rest of logic
}

async upload(endpoint, formData, options = {}) {
  const headers = this.buildHeaders(options);
  delete headers['Content-Type']; // Remove for multipart
  // ... rest of logic
}
```

**Suggested Technique:** Extract Function

---

## File: `server/utils/errorHandling.js`

### Summary
- **Total Lines**: 273
- **Total Functions**: Multiple utility functions
- **Total Classes**: 0
- **Violations Found**: 0

**Status:** ✅ This code adheres to the Boy Scout Rule.

All functions are:
- Small and focused (< 30 lines each)
- Single responsibility
- Well-named and intention-revealing
- Properly organized in logical groups
- No side effects (pure utility functions)

---

## Updated Overall Summary

### Violations by Priority

| Priority | Count | Files Affected |
|----------|-------|----------------|
| HIGH     | 8     | 4              |
| MEDIUM   | 4     | 3              |
| LOW      | 0     | 0              |

### Violations by Type

| Type | Count | Priority |
|------|-------|----------|
| Long Function | 6 | HIGH |
| SRP Violation | 2 | HIGH/MEDIUM |
| Duplicated Code | 3 | MEDIUM |
| Divergent Change | 1 | MEDIUM |

### Files Analyzed

1. ✅ `server/utils/helpers.js` - Clean (0 violations)
2. ✅ `server/utils/errorHandling.js` - Clean (0 violations)
3. ⚠️ `server/services/bookingService.js` - 3 violations
4. ⚠️ `server/routes/auth.routes.js` - 1 violation
5. ⚠️ `server/middleware/auth.js` - 3 violations
6. ⚠️ `server/services/emailService.js` - 3 violations
7. ⚠️ `src/services/api.js` - 2 violations

### Recommendations

1. **Immediate (HIGH Priority)**:
   - Extract helper methods from all long functions (>50 lines)
   - Split `BookingService` class into focused service classes
   - Split `EmailService` class into template, provider, and retry services
   - Refactor `requireAuth` and `requireAdmin` to eliminate duplication

2. **Follow-up (MEDIUM Priority)**:
   - Split `auth.routes.js` into focused route modules
   - Extract common authentication logic from middleware
   - Extract header building logic from API client

3. **Code Quality**:
   - `helpers.js` and `errorHandling.js` are well-structured and can serve as references

### Refactoring Sequence

1. **Phase 1**: Extract helper methods from long functions
   - Start with `calculateAvailableSlots()` and `createAppointment()`
   - Refactor `sendWithRetry()` and `initializeTemplates()`
   - Extract logic from `request()` method

2. **Phase 2**: Eliminate code duplication
   - Extract common auth logic from middleware
   - Extract header building from API client

3. **Phase 3**: Split large classes
   - Split `BookingService` into 6 focused services
   - Split `EmailService` into 4 focused services

4. **Phase 4**: Organize routes
   - Split `auth.routes.js` by responsibility

---

**Analysis Complete**  
*Generated using Clean Code QA Agent Skill*  
*Total Files Analyzed: 7*  
*Total Violations: 12 (8 HIGH, 4 MEDIUM)*

