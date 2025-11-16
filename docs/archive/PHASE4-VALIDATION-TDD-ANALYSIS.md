# 🔐 Phase 4: Validation & Security - TDD Analysis

**Status:** RED Phase (Writing Tests First)  
**Date Started:** January 13, 2025  
**Expected Duration:** 3 days  
**Priority:** 🔥 HIGH (Security Critical)

---

## 🎯 Objective

Implement comprehensive input validation and sanitization across all endpoints using TDD, preventing:
- **XSS attacks** (Cross-Site Scripting)
- **SQL injection** (though using parameterized queries)
- **DoS attacks** (via size limits)
- **Data corruption** (via normalization)
- **Broken business logic** (via type validation)

---

## 🚨 Current Vulnerabilities

### 1. **Inconsistent Validation**
**Location:** `server/middleware/validation.js`
**Issues:**
- ✅ Schema-based validation EXISTS
- ❌ NOT applied to all endpoints
- ❌ No XSS sanitization
- ❌ No size limits (DoS vulnerability)
- ❌ Pattern validation is incomplete
- ❌ Deep object validation missing

### 2. **Direct User Input Usage**
**Locations:** Multiple routes
**Issues:**
- `req.body` used directly without sanitization
- `req.params` not validated (path traversal risk)
- `req.query` lacks type coercion
- JSON.parse() without size limits (DoS)

### 3. **Duplicate Validation Logic**
**Locations:** `sites.routes.js`, `drafts.routes.js`, `submissions.routes.js`
**Issues:**
- Email validation duplicated 3+ times
- Password generation duplicated
- String sanitization ad-hoc
- Inconsistent error messages

### 4. **Missing Validations**
- **Email:** No MX record check, disposable email detection
- **Subdomain:** No reserved word check, length limits weak
- **URLs:** No protocol validation
- **JSON:** No depth limit (DoS via deeply nested objects)
- **Files:** No MIME type validation
- **SQL:** Parameterized queries used ✅ but no secondary validation

---

## 📋 TDD Implementation Plan

### **RED Phase (Day 1):** Write Failing Tests

#### 1. **Unit Tests:** `tests/unit/validationService.test.js`
Test pure validation functions:
- ✅ Email validation (50+ edge cases)
- ✅ Subdomain validation (reserved words, length, format)
- ✅ Password strength (complexity rules)
- ✅ URL validation (protocols, domains)
- ✅ String sanitization (XSS prevention)
- ✅ Number validation (ranges, NaN, Infinity)
- ✅ Object validation (depth, size, keys)
- ✅ Array validation (length, element types)
- ✅ Date validation (formats, ranges)
- ✅ JSON validation (size, depth)

#### 2. **Integration Tests:** `tests/integration/validation-middleware.test.js`
Test middleware behavior:
- ✅ Request validation (body, query, params)
- ✅ Error responses (400 with details)
- ✅ Sanitization (XSS stripped)
- ✅ Size limits enforced
- ✅ Performance (validation fast)

#### 3. **Security Tests:** `tests/security/xss-prevention.test.js`
Test attack prevention:
- ✅ XSS payloads blocked
- ✅ SQL injection attempts sanitized
- ✅ Path traversal prevented
- ✅ DoS payloads rejected

**Estimated:** 80+ tests, ~1,200 lines

---

### **GREEN Phase (Day 2):** Implement ValidationService

#### 1. **Core ValidationService** (`server/services/validationService.js`)
```javascript
class ValidationService {
  // Email validation
  validateEmail(email, options = {})
  isDisposableEmail(email)
  
  // String validation
  sanitizeString(str, options = {})
  validateLength(str, min, max)
  
  // Subdomain validation
  validateSubdomain(subdomain)
  isReservedSubdomain(subdomain)
  
  // URL validation
  validateURL(url, allowedProtocols = ['http', 'https'])
  
  // Object validation
  validateObject(obj, schema, options = {})
  checkObjectDepth(obj, maxDepth = 10)
  
  // JSON validation
  safeJSONParse(str, maxSize = 1MB)
  
  // Password validation
  validatePasswordStrength(password)
  
  // General validators
  validateType(value, type)
  validateRange(num, min, max)
  validateEnum(value, allowed)
}
```

#### 2. **Sanitization Utilities**
```javascript
// XSS prevention
stripHTML(str)
escapeHTML(str)
removeScriptTags(str)

// SQL injection (secondary defense)
escapeSQL(str)

// Path traversal
sanitizePath(path)
```

#### 3. **Validation Middleware Enhancement**
```javascript
// Enhanced validate() middleware
validate({
  body: schema,
  sanitize: true,  // NEW: Auto-sanitize
  maxSize: 10000,  // NEW: Size limit
  strictMode: true // NEW: Fail on unknown fields
})
```

**Estimated:** ~500 lines of service code

---

### **REFACTOR Phase (Day 3):** Apply to All Endpoints

#### 1. **Refactor Existing Routes**
- `auth.routes.js` - email, password
- `sites.routes.js` - subdomain, siteData
- `submissions.routes.js` - contact forms
- `drafts.routes.js` - draft data
- `uploads.routes.js` - filename validation

#### 2. **Remove Duplicate Code**
- Remove inline validation logic
- Remove duplicate sanitization
- Centralize error messages

#### 3. **Add Missing Validation**
- Query parameters (all routes)
- URL parameters (IDs, slugs)
- File uploads (MIME types)

#### 4. **Performance Optimization**
- Memoize common validations
- Lazy load large validators
- Cache compiled regexes

**Estimated:** 15+ files modified

---

## 🧪 Test Coverage Goals

| Area | Target Coverage | Current | Gap |
|------|-----------------|---------|-----|
| **Validation Service** | 100% | 0% | NEW |
| **Sanitization** | 100% | 0% | NEW |
| **Middleware** | 100% | ~60% | +40% |
| **Route Validation** | 90% | ~40% | +50% |

**Overall Phase 4 Goal:** 95%+ test coverage for all validation

---

## 🚀 Success Criteria

### **Functional:**
- ✅ All XSS payloads blocked
- ✅ All endpoints have input validation
- ✅ Consistent error messages
- ✅ No duplicate validation code
- ✅ Size limits prevent DoS

### **Non-Functional:**
- ✅ Validation adds <5ms latency
- ✅ Clear error messages for users
- ✅ Developers can easily add new validators
- ✅ Validation is testable (pure functions)

### **Security:**
- ✅ OWASP Top 10 mitigations in place
- ✅ Security audit passes
- ✅ Penetration test passes
- ✅ No known CVEs in dependencies

---

## 🔥 High-Risk Areas

### 1. **Contact Form Submissions** (Critical)
**Risk:** XSS, spam, DoS  
**Current:** Basic sanitization  
**Needed:** Comprehensive validation + rate limiting

### 2. **Site Data Updates** (High)
**Risk:** Data corruption, XSS in stored content  
**Current:** Minimal validation  
**Needed:** Deep object validation + sanitization

### 3. **Subdomain Creation** (High)
**Risk:** Subdomain hijacking, reserved words  
**Current:** Pattern validation only  
**Needed:** Blacklist + availability check

### 4. **File Uploads** (Medium)
**Risk:** Malicious files, path traversal  
**Current:** File type check  
**Needed:** MIME validation + virus scan (future)

---

## 🛠️ Implementation Details

### **Key Dependencies:**
- `validator` (email, URL validation)
- `dompurify` (XSS sanitization)
- `ajv` (JSON schema validation)

### **Performance Considerations:**
- Memoize email domain checks (cache 1 hour)
- Compile regex patterns once
- Use streaming for large JSON parsing
- Early return on validation failures

### **Error Handling:**
```javascript
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "email",
      "message": "Email format is invalid",
      "value": "not-an-email",
      "rule": "email"
    }
  ]
}
```

---

## 📊 Expected Outcomes

### **Security Improvements:**
- ✅ **100% XSS prevention** (all user input sanitized)
- ✅ **Zero injection vulnerabilities** (secondary defense)
- ✅ **DoS mitigation** (size limits enforced)
- ✅ **Input normalization** (data consistency)

### **Code Quality:**
- ✅ **DRY** (validation logic centralized)
- ✅ **Testable** (pure functions, dependency injection)
- ✅ **Maintainable** (clear schemas, docs)
- ✅ **Reusable** (validation service used everywhere)

### **Developer Experience:**
- ✅ **Easy to add validation** (just define schema)
- ✅ **Clear error messages** (tell users what's wrong)
- ✅ **Self-documenting** (tests show expected behavior)
- ✅ **Fast** (validation doesn't slow down app)

---

## 🎯 Phase 4 Milestones

- [ ] **Milestone 1:** 80+ validation tests written (RED)
- [ ] **Milestone 2:** ValidationService implemented (GREEN)
- [ ] **Milestone 3:** All routes refactored (REFACTOR)
- [ ] **Milestone 4:** Security audit passes
- [ ] **Milestone 5:** Documentation complete

---

## 🔄 Next Steps (Starting Now)

1. **Write validation service unit tests** (~50 tests)
2. **Write middleware integration tests** (~20 tests)
3. **Write security/XSS tests** (~10 tests)
4. **Run tests (all should FAIL - RED phase)**
5. **Document test results**

---

**Status:** Ready to begin RED phase! 🚦

Let's write some failing tests! 🧪

