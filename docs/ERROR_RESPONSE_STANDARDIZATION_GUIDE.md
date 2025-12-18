# Error Response Standardization Guide

## Overview

This guide explains how to standardize error responses across all API routes to ensure consistent error handling and better developer experience.

## Standard Response Format

All API responses should follow this format:

### Success Response
```javascript
{
  success: true,
  data: { ... },
  message?: "Optional success message"
}
```

### Error Response
```javascript
{
  success: false,
  error: "User-friendly error message",
  code?: "ERROR_CODE",  // For programmatic handling
  details?: { ... }      // Only in non-production
}
```

## Available Helpers

Import from `server/utils/apiResponse.js`:

```javascript
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendBadRequest,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendConflict,
  sendValidationError,
  sendServerError,
  sendServiceUnavailable,
  asyncHandler
} from '../utils/apiResponse.js';
```

## Helper Functions

### Success Responses

**`sendSuccess(res, data, message, statusCode)`**
- Default status: 200
- Use for: Successful GET/PUT/DELETE operations

```javascript
sendSuccess(res, { user: userData });
sendSuccess(res, { user: userData }, 'User retrieved successfully');
```

**`sendCreated(res, data, message)`**
- Status: 201
- Use for: Successful POST operations

```javascript
sendCreated(res, { id: newUser.id }, 'User created successfully');
```

### Error Responses

**`sendBadRequest(res, error, code, details)`**
- Status: 400
- Use for: Invalid input, validation errors

```javascript
sendBadRequest(res, 'Email is required', 'MISSING_EMAIL');
sendBadRequest(res, 'Invalid email format', 'INVALID_EMAIL', { field: 'email' });
```

**`sendUnauthorized(res, error, code)`**
- Status: 401
- Use for: Authentication required

```javascript
sendUnauthorized(res, 'Authentication required', 'UNAUTHORIZED');
```

**`sendForbidden(res, error, code)`**
- Status: 403
- Use for: Insufficient permissions

```javascript
sendForbidden(res, 'Access denied', 'FORBIDDEN');
```

**`sendNotFound(res, resource, code)`**
- Status: 404
- Use for: Resource not found

```javascript
sendNotFound(res, 'User', 'USER_NOT_FOUND');
```

**`sendConflict(res, error, code)`**
- Status: 409
- Use for: Resource conflicts (e.g., duplicate email)

```javascript
sendConflict(res, 'User already exists', 'USER_EXISTS');
```

**`sendValidationError(res, error, validationErrors)`**
- Status: 422
- Use for: Validation errors with details

```javascript
sendValidationError(res, 'Validation failed', {
  email: 'Invalid email format',
  password: 'Password too weak'
});
```

**`sendServerError(res, actualError, safeMessage)`**
- Status: 500
- Use for: Internal server errors
- Logs actual error, returns safe message

```javascript
sendServerError(res, error, 'An unexpected error occurred');
```

**`sendServiceUnavailable(res, error, code)`**
- Status: 503
- Use for: External service unavailable

```javascript
sendServiceUnavailable(res, 'Stripe not configured', 'STRIPE_NOT_CONFIGURED');
```

### Error Handling Wrapper

**`asyncHandler(fn)`**
- Wraps async route handlers
- Automatically catches errors and sends 500 response
- Prevents unhandled promise rejections

```javascript
router.get('/endpoint', asyncHandler(async (req, res) => {
  // Route logic - errors automatically caught
}));
```

## Migration Examples

### Before (Raw Responses)

```javascript
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    const user = await createUser(email, password);
    return res.status(201).json({ user });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create user' });
  }
});
```

### After (Standardized)

```javascript
router.post('/register', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return sendBadRequest(res, 'Email and password required', 'MISSING_CREDENTIALS');
  }
  
  const user = await createUser(email, password);
  return sendCreated(res, { user }, 'User created successfully');
}));
```

### Before (Multiple Error Cases)

```javascript
router.get('/user/:id', async (req, res) => {
  try {
    const user = await getUser(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Account suspended' });
    }
    
    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
});
```

### After (Standardized)

```javascript
router.get('/user/:id', asyncHandler(async (req, res) => {
  const user = await getUser(req.params.id);
  
  if (!user) {
    return sendNotFound(res, 'User', 'USER_NOT_FOUND');
  }
  
  if (user.status === 'suspended') {
    return sendForbidden(res, 'Account suspended', 'ACCOUNT_SUSPENDED');
  }
  
  return sendSuccess(res, { user });
}));
```

## Migration Checklist

For each route file:

- [ ] Import helpers from `apiResponse.js`
- [ ] Wrap async routes with `asyncHandler`
- [ ] Replace `res.status(400).json({ error: ... })` with `sendBadRequest`
- [ ] Replace `res.status(401).json({ error: ... })` with `sendUnauthorized`
- [ ] Replace `res.status(403).json({ error: ... })` with `sendForbidden`
- [ ] Replace `res.status(404).json({ error: ... })` with `sendNotFound`
- [ ] Replace `res.status(409).json({ error: ... })` with `sendConflict`
- [ ] Replace `res.status(500).json({ error: ... })` with `sendServerError`
- [ ] Replace `res.status(201).json({ ... })` with `sendCreated`
- [ ] Replace `res.json({ ... })` with `sendSuccess`
- [ ] Remove try-catch blocks (handled by `asyncHandler`)
- [ ] Test all endpoints

## Verification

Run the standardization checker:

```bash
node scripts/check-error-standardization.js
```

This will show which routes need work and what issues they have.

## Benefits

1. **Consistency**: All errors follow the same format
2. **Error Codes**: Programmatic error handling
3. **Automatic Logging**: Server errors are logged automatically
4. **Less Boilerplate**: No need for try-catch in every route
5. **Type Safety**: Easier to add TypeScript types later
6. **Better DX**: Frontend developers know what to expect

## Common Patterns

### Validation Errors

```javascript
if (!email) {
  return sendBadRequest(res, 'Email is required', 'MISSING_EMAIL');
}

if (!isValidEmail(email)) {
  return sendBadRequest(res, 'Invalid email format', 'INVALID_EMAIL');
}
```

### Resource Not Found

```javascript
const user = await getUser(id);
if (!user) {
  return sendNotFound(res, 'User', 'USER_NOT_FOUND');
}
```

### Authorization Checks

```javascript
if (user.role !== 'admin') {
  return sendForbidden(res, 'Admin access required', 'ADMIN_REQUIRED');
}
```

### External Service Errors

```javascript
if (!stripe) {
  return sendServiceUnavailable(res, 'Stripe not configured', 'STRIPE_NOT_CONFIGURED');
}
```

### Database Errors

```javascript
try {
  await prisma.users.create({ data });
} catch (error) {
  if (error.code === 'P2002') { // Unique constraint
    return sendConflict(res, 'User already exists', 'USER_EXISTS');
  }
  throw error; // Let asyncHandler catch other errors
}
```

## Notes

- Always use `asyncHandler` for async routes
- Remove try-catch blocks when using `asyncHandler`
- Use appropriate error codes for programmatic handling
- Keep error messages user-friendly
- Include details only in non-production environments

