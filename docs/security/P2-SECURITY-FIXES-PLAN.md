# 📋 P2 Security Fixes Implementation Plan

**Date:** December 2024  
**Priority:** P2 (Medium Priority)  
**Status:** 📋 **Planning Complete** - Ready for Implementation

---

## 🎯 Overview

This document outlines the implementation plan for all **P2 (Medium Priority)** security fixes:

1. **Strengthen Password Requirements** - Add complexity requirements
2. **File Upload Security Enhancements** - Magic bytes, EXIF stripping, dimension limits
3. **Session Management Improvements** - Refresh tokens, shorter expiry, revocation

---

## 📊 Priority & Impact

| Fix | Priority | Impact | Effort | Risk |
|-----|----------|--------|--------|------|
| Password Requirements | P2 | Medium | 2-3 hours | Low |
| File Upload Security | P2 | Medium | 4-6 hours | Low |
| Session Management | P2 | Medium | 6-8 hours | Medium |

**Total Estimated Effort:** 12-17 hours

---

## 1. 🔐 Strengthen Password Requirements

### **Current State:**
- Minimum length: 8 characters
- No complexity requirements
- Weak passwords like "password123" allowed

### **Target State:**
- Minimum length: 12 characters
- Require uppercase, lowercase, number, special character
- Password strength meter in UI
- Common password blacklist

### **Implementation Steps:**

#### **Step 1.1: Update Password Validation Service** (1 hour)

**File:** `server/services/validationService.js`

**Changes:**
```javascript
validatePasswordStrength(password) {
  const errors = [];
  
  // Length check
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }
  
  // Complexity checks
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Common password check
  const commonPasswords = ['password', 'password123', '12345678', 'qwerty', 'abc123'];
  const lowerPassword = password.toLowerCase();
  if (commonPasswords.some(common => lowerPassword.includes(common))) {
    errors.push('Password is too common. Please choose a more unique password');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    strength: this.calculatePasswordStrength(password)
  };
}

calculatePasswordStrength(password) {
  let strength = 0;
  
  // Length bonus
  if (password.length >= 12) strength += 1;
  if (password.length >= 16) strength += 1;
  if (password.length >= 20) strength += 1;
  
  // Complexity bonus
  if (/[a-z]/.test(password)) strength += 1;
  if (/[A-Z]/.test(password)) strength += 1;
  if (/[0-9]/.test(password)) strength += 1;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 1;
  
  // Deduct for common patterns
  if (/(.)\1{2,}/.test(password)) strength -= 1; // Repeated characters
  if (/123|abc|qwe/i.test(password)) strength -= 1; // Sequential patterns
  
  return Math.max(0, Math.min(5, strength)); // 0-5 scale
}
```

#### **Step 1.2: Update Registration Endpoint** (30 min)

**File:** `server/routes/auth.routes.js`

**Changes:**
```javascript
// Replace current password validation
const passwordValidation = validator.validatePasswordStrength(password);
if (!passwordValidation.isValid) {
  return res.status(400).json({ 
    error: 'Password does not meet requirements',
    passwordErrors: passwordValidation.errors,
    strength: passwordValidation.strength
  });
}
```

#### **Step 1.3: Update Password Reset Endpoint** (30 min)

**File:** `server/routes/auth.routes.js`

**Changes:**
```javascript
// In /reset-password endpoint
const passwordValidation = validator.validatePasswordStrength(newPassword);
if (!passwordValidation.isValid) {
  return res.status(400).json({ 
    error: 'Password does not meet requirements',
    passwordErrors: passwordValidation.errors
  });
}
```

#### **Step 1.4: Update Frontend Password Validation** (1 hour)

**Files:**
- `src/pages/Register.jsx`
- `src/pages/ResetPassword.jsx`
- `src/pages/ForgotPassword.jsx` (if applicable)

**Changes:**
- Add real-time password strength meter
- Show password requirements checklist
- Display validation errors from backend
- Disable submit until password meets requirements

**Example:**
```jsx
const [passwordStrength, setPasswordStrength] = useState(0);
const [passwordErrors, setPasswordErrors] = useState([]);

const validatePassword = (password) => {
  const errors = [];
  let strength = 0;
  
  if (password.length >= 12) strength += 1;
  else errors.push('At least 12 characters');
  
  if (/[a-z]/.test(password)) strength += 1;
  else errors.push('Lowercase letter');
  
  if (/[A-Z]/.test(password)) strength += 1;
  else errors.push('Uppercase letter');
  
  if (/[0-9]/.test(password)) strength += 1;
  else errors.push('Number');
  
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 1;
  else errors.push('Special character');
  
  setPasswordStrength(strength);
  setPasswordErrors(errors);
  
  return strength === 5;
};
```

#### **Step 1.5: Update Tests** (30 min)

**Files:**
- `tests/unit/validationService.test.js`
- `tests/integration/api-auth.test.js`

**Add tests for:**
- Password length requirements
- Complexity requirements
- Common password rejection
- Password strength calculation

### **Dependencies:**
- None (uses existing ValidationService)

### **Testing Checklist:**
- [ ] Test password with < 12 chars → Should reject
- [ ] Test password without uppercase → Should reject
- [ ] Test password without lowercase → Should reject
- [ ] Test password without number → Should reject
- [ ] Test password without special char → Should reject
- [ ] Test common passwords → Should reject
- [ ] Test valid strong password → Should accept
- [ ] Test password strength meter in UI
- [ ] Test registration with weak password
- [ ] Test password reset with weak password

---

## 2. 📁 File Upload Security Enhancements

### **Current State:**
- File size limits (10MB)
- MIME type validation
- Extension whitelist
- Unique filename generation
- ❌ No magic bytes validation
- ❌ No EXIF data stripping
- ❌ No dimension limits

### **Target State:**
- ✅ Magic bytes validation (file-type library)
- ✅ EXIF data stripping (Sharp)
- ✅ Dimension limits (prevent decompression bombs)
- ✅ Pixel count limits
- ✅ Virus scanning (optional, future)

### **Implementation Steps:**

#### **Step 2.1: Install Dependencies** (5 min)

```bash
npm install file-type
# sharp already installed ✅
```

#### **Step 2.2: Create File Validator Utility** (2 hours)

**File:** `server/utils/fileValidator.js` (NEW)

**Implementation:**
```javascript
import fs from 'fs/promises';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import path from 'path';

/**
 * Validate uploaded file is actually an image
 * Checks magic bytes, not just extension/MIME type
 */
export async function validateImageFile(filePath) {
  try {
    // Read first 4100 bytes (enough for file-type detection)
    const buffer = await fs.readFile(filePath, { end: 4100 });
    
    // Check magic bytes
    const fileType = await fileTypeFromBuffer(buffer);
    
    if (!fileType) {
      throw new Error('Unable to determine file type');
    }
    
    // Whitelist of allowed image types
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!allowedTypes.includes(fileType.mime)) {
      throw new Error(`Invalid file type: ${fileType.mime}. Only JPEG, PNG, GIF, and WebP are allowed.`);
    }
    
    // Additional validation: try to parse as image
    try {
      const metadata = await sharp(filePath).metadata();
      
      // Check reasonable dimensions (prevent decompression bombs)
      const MAX_DIMENSION = 10000; // 10,000 pixels
      if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
        throw new Error(`Image dimensions too large. Maximum dimension is ${MAX_DIMENSION}px.`);
      }
      
      // Check pixel count (prevent massive images)
      const MAX_PIXELS = 100000000; // 100MP
      const pixelCount = metadata.width * metadata.height;
      if (pixelCount > MAX_PIXELS) {
        throw new Error(`Image too large. Maximum pixel count is ${MAX_PIXELS.toLocaleString()}.`);
      }
      
      return {
        valid: true,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: metadata.size
      };
      
    } catch (err) {
      throw new Error('Invalid image file: ' + err.message);
    }
    
  } catch (error) {
    throw new Error('File validation failed: ' + error.message);
  }
}

/**
 * Strip EXIF data from images (privacy + security)
 * Returns path to sanitized image
 */
export async function sanitizeImage(inputPath, outputPath) {
  try {
    await sharp(inputPath)
      .rotate() // Auto-rotate based on EXIF
      .withMetadata({ 
        exif: {}, // Strip EXIF
        icc: {},  // Strip ICC color profile
        iptc: {}, // Strip IPTC metadata
        xmp: {}  // Strip XMP metadata
      })
      .toFile(outputPath);
    
    return outputPath;
  } catch (error) {
    throw new Error('Image sanitization failed: ' + error.message);
  }
}

/**
 * Validate and sanitize uploaded image
 * Returns sanitized file path
 */
export async function processUploadedImage(filePath) {
  // Step 1: Validate file is actually an image
  await validateImageFile(filePath);
  
  // Step 2: Sanitize image (strip EXIF)
  const sanitizedPath = filePath + '.sanitized';
  await sanitizeImage(filePath, sanitizedPath);
  
  // Step 3: Replace original with sanitized
  await fs.unlink(filePath);
  await fs.rename(sanitizedPath, filePath);
  
  return filePath;
}
```

#### **Step 2.3: Update Upload Routes** (1 hour)

**File:** `server/routes/uploads.routes.js`

**Changes:**
```javascript
import { processUploadedImage } from '../utils/fileValidator.js';
import fs from 'fs/promises';

router.post('/', requireAdmin, async (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    try {
      // Validate and sanitize image
      await processUploadedImage(req.file.path);
      
      res.json({ 
        success: true, 
        url: `/uploads/${req.file.filename}`,
        filename: req.file.filename
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

#### **Step 2.4: Update Content API Upload** (1 hour)

**File:** `server/routes/content.routes.js`

**Find:** Content upload endpoint (if exists)

**Apply same validation and sanitization**

#### **Step 2.5: Add Tests** (1 hour)

**File:** `tests/integration/api-uploads.test.js`

**Add tests for:**
- Magic bytes validation
- EXIF stripping
- Dimension limits
- Pixel count limits
- Invalid file type rejection

### **Dependencies:**
- `file-type` (new)
- `sharp` (already installed)

### **Testing Checklist:**
- [ ] Upload valid JPEG → Should succeed
- [ ] Upload valid PNG → Should succeed
- [ ] Upload valid GIF → Should succeed
- [ ] Upload valid WebP → Should succeed
- [ ] Upload PHP file renamed to .jpg → Should reject
- [ ] Upload image with EXIF data → Should strip EXIF
- [ ] Upload image > 10,000px dimension → Should reject
- [ ] Upload image > 100MP pixels → Should reject
- [ ] Upload polyglot file → Should reject
- [ ] Verify EXIF data removed from saved images

---

## 3. 🔄 Session Management Improvements

### **Current State:**
- JWT tokens with 7-day expiry
- No refresh token mechanism
- No token revocation
- Long-lived sessions

### **Target State:**
- ✅ Short access tokens (15 minutes)
- ✅ Refresh tokens (7 days)
- ✅ Token revocation list
- ✅ Automatic token refresh in frontend

### **Implementation Steps:**

#### **Step 3.1: Update Database Schema** (30 min)

**File:** `prisma/schema.prisma`

**Add:**
```prisma
model refresh_tokens {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id         String   @db.Uuid
  token           String   @unique @db.VarChar(255)
  expires_at      DateTime @db.Timestamp(6)
  revoked         Boolean  @default(false)
  revoked_at      DateTime? @db.Timestamp(6)
  created_at      DateTime @default(now()) @db.Timestamp(6)
  last_used_at    DateTime? @db.Timestamp(6)
  
  users           users    @relation(fields: [user_id], references: [id], onDelete: Cascade)
  
  @@index([user_id])
  @@index([token])
  @@index([expires_at])
}

model users {
  // ... existing fields
  refresh_tokens  refresh_tokens[]
}
```

#### **Step 3.2: Create Token Service** (2 hours)

**File:** `server/services/tokenService.js` (NEW)

**Implementation:**
```javascript
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../database/db.js';

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || ACCESS_TOKEN_SECRET + '-refresh';
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Generate access token (short-lived)
 */
export function generateAccessToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
      type: 'access'
    },
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

/**
 * Generate refresh token (long-lived)
 */
export function generateRefreshToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create token pair (access + refresh)
 */
export async function createTokenPair(user) {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  
  const expiresAt = new Date();
  expiresAt.setTime(expiresAt.getTime() + REFRESH_TOKEN_EXPIRY);
  
  // Store refresh token in database
  await prisma.refresh_tokens.create({
    data: {
      user_id: user.id,
      token: refreshToken,
      expires_at: expiresAt
    }
  });
  
  return {
    accessToken,
    refreshToken,
    expiresAt
  };
}

/**
 * Verify refresh token
 */
export async function verifyRefreshToken(token) {
  // Check if token exists and is valid
  const refreshToken = await prisma.refresh_tokens.findUnique({
    where: { token },
    include: { users: true }
  });
  
  if (!refreshToken) {
    throw new Error('Invalid refresh token');
  }
  
  if (refreshToken.revoked) {
    throw new Error('Refresh token has been revoked');
  }
  
  if (new Date(refreshToken.expires_at) < new Date()) {
    throw new Error('Refresh token has expired');
  }
  
  // Update last used timestamp
  await prisma.refresh_tokens.update({
    where: { id: refreshToken.id },
    data: { last_used_at: new Date() }
  });
  
  return refreshToken.users;
}

/**
 * Revoke refresh token
 */
export async function revokeRefreshToken(token) {
  await prisma.refresh_tokens.updateMany({
    where: { token },
    data: {
      revoked: true,
      revoked_at: new Date()
    }
  });
}

/**
 * Revoke all refresh tokens for a user
 */
export async function revokeAllUserTokens(userId) {
  await prisma.refresh_tokens.updateMany({
    where: {
      user_id: userId,
      revoked: false
    },
    data: {
      revoked: true,
      revoked_at: new Date()
    }
  });
}

/**
 * Clean up expired tokens (run periodically)
 */
export async function cleanupExpiredTokens() {
  const deleted = await prisma.refresh_tokens.deleteMany({
    where: {
      expires_at: {
        lt: new Date()
      }
    }
  });
  
  return deleted.count;
}
```

#### **Step 3.3: Update Auth Routes** (2 hours)

**File:** `server/routes/auth.routes.js`

**Changes:**

**Login:**
```javascript
import { createTokenPair } from '../services/tokenService.js';

router.post('/login', loginLimiter, async (req, res) => {
  // ... existing validation ...
  
  // Generate token pair
  const { accessToken, refreshToken, expiresAt } = await createTokenPair(user);
  
  res.json({
    success: true,
    accessToken,
    refreshToken,
    expiresAt,
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    }
  });
});
```

**New Refresh Endpoint:**
```javascript
import { verifyRefreshToken, createTokenPair, revokeRefreshToken } from '../services/tokenService.js';

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }
    
    // Verify refresh token
    const user = await verifyRefreshToken(refreshToken);
    
    // Generate new access token
    const accessToken = generateAccessToken(user);
    
    res.json({
      success: true,
      accessToken
    });
    
  } catch (error) {
    return res.status(401).json({ error: error.message });
  }
});
```

**New Logout Endpoint:**
```javascript
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }
    
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to logout' });
  }
});
```

#### **Step 3.4: Update Frontend Auth Service** (2 hours)

**File:** `src/services/auth.js`

**Changes:**
```javascript
// Store tokens
localStorage.setItem('accessToken', data.accessToken);
localStorage.setItem('refreshToken', data.refreshToken);

// Auto-refresh token before expiry
let refreshTimer = null;

function scheduleTokenRefresh(expiresIn) {
  // Refresh 1 minute before expiry
  const refreshTime = (expiresIn - 60) * 1000;
  
  refreshTimer = setTimeout(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('accessToken', data.accessToken);
        scheduleTokenRefresh(15 * 60); // 15 minutes
      } else {
        // Refresh failed, logout user
        logout();
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
    }
  }, refreshTime);
}

// Intercept API calls to refresh token on 401
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  let response = await originalFetch(...args);
  
  if (response.status === 401) {
    // Try to refresh token
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      const refreshResponse = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        localStorage.setItem('accessToken', data.accessToken);
        
        // Retry original request
        const newHeaders = { ...args[1]?.headers };
        newHeaders['Authorization'] = `Bearer ${data.accessToken}`;
        args[1] = { ...args[1], headers: newHeaders };
        response = await originalFetch(...args);
      } else {
        // Refresh failed, logout
        logout();
      }
    }
  }
  
  return response;
};
```

#### **Step 3.5: Add Token Cleanup Job** (30 min)

**File:** `server/jobs/tokenCleanup.js` (NEW)

**Implementation:**
```javascript
import cron from 'node-cron';
import { cleanupExpiredTokens } from '../services/tokenService.js';

// Run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  try {
    const deleted = await cleanupExpiredTokens();
    console.log(`🧹 Cleaned up ${deleted} expired refresh tokens`);
  } catch (error) {
    console.error('Token cleanup error:', error);
  }
});
```

**Add to `server.js`:**
```javascript
import './server/jobs/tokenCleanup.js';
```

#### **Step 3.6: Update Tests** (1 hour)

**Files:**
- `tests/integration/api-auth.test.js`
- `tests/unit/tokenService.test.js` (NEW)

**Add tests for:**
- Token pair generation
- Refresh token verification
- Token revocation
- Expired token cleanup
- Auto-refresh in frontend

### **Dependencies:**
- None (uses existing JWT, crypto, Prisma)

### **Testing Checklist:**
- [ ] Login returns access + refresh tokens
- [ ] Access token expires after 15 minutes
- [ ] Refresh token works to get new access token
- [ ] Refresh token expires after 7 days
- [ ] Revoked refresh token cannot be used
- [ ] Logout revokes refresh token
- [ ] Frontend auto-refreshes token before expiry
- [ ] API calls auto-retry with new token on 401
- [ ] Expired tokens cleaned up daily

---

## 📅 Implementation Timeline

### **Week 1: Password Requirements**
- Day 1: Update ValidationService + Backend endpoints
- Day 2: Update Frontend + Tests
- Day 3: Testing & Documentation

### **Week 2: File Upload Security**
- Day 1: Create file validator utility
- Day 2: Update upload routes
- Day 3: Testing & Documentation

### **Week 3: Session Management**
- Day 1: Database schema + Token service
- Day 2: Update auth routes
- Day 3: Update frontend + Tests
- Day 4: Testing & Documentation

**Total:** 3 weeks

---

## 🧪 Testing Strategy

### **Unit Tests:**
- Password validation logic
- File validation logic
- Token service functions

### **Integration Tests:**
- Registration with strong/weak passwords
- File upload with various file types
- Token refresh flow
- Token revocation flow

### **E2E Tests:**
- Complete registration flow
- Complete file upload flow
- Complete login → refresh → logout flow

---

## 📝 Migration Checklist

### **Password Requirements:**
- [ ] Update ValidationService
- [ ] Update registration endpoint
- [ ] Update password reset endpoint
- [ ] Update frontend forms
- [ ] Add password strength meter
- [ ] Update tests
- [ ] Update documentation

### **File Upload Security:**
- [ ] Install file-type dependency
- [ ] Create fileValidator utility
- [ ] Update upload routes
- [ ] Update content API routes
- [ ] Add tests
- [ ] Update documentation

### **Session Management:**
- [ ] Create database migration
- [ ] Create tokenService
- [ ] Update auth routes
- [ ] Update frontend auth service
- [ ] Add token cleanup job
- [ ] Add tests
- [ ] Update documentation

---

## ⚠️ Risks & Mitigation

### **Password Requirements:**
- **Risk:** Users may find new requirements too strict
- **Mitigation:** Clear error messages, password strength meter, helpful hints

### **File Upload Security:**
- **Risk:** May reject some valid images
- **Mitigation:** Test with various image formats, provide clear error messages

### **Session Management:**
- **Risk:** Breaking change for existing sessions
- **Mitigation:** 
  - Support both old and new token formats during transition
  - Migrate existing tokens on first use
  - Clear migration path

---

## 📚 Related Documentation

- [Security Gaps Analysis](./SECURITY-GAPS-ANALYSIS.md) - Original analysis
- [Security Fixes Implemented](./SECURITY-FIXES-IMPLEMENTED.md) - P0/P1 fixes
- [Bot Protection Analysis](./BOT-PROTECTION-ANALYSIS.md) - Account security

---

**Last Updated:** December 2024  
**Status:** 📋 **Ready for Implementation**






