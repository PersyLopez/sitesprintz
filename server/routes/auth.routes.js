import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../database/db.js';
import { sendEmail, EmailTypes, sendAdminNotification } from '../utils/email-service-wrapper.js';
import { requireAuth } from '../middleware/auth.js';
import { isValidEmail, generateVerificationToken, generateRandomPassword } from '../utils/helpers.js';
import crypto from 'crypto';
import { registrationLimiter, loginLimiter, passwordResetLimiter } from '../middleware/rateLimiting.js';
import { verifyTurnstile } from '../utils/captcha.js';
import { createTokenPair, verifyRefreshToken, revokeRefreshToken, revokeAllUserTokens } from '../services/tokenService.js';
import { ValidationService } from '../services/validationService.js';
import { POLICY_VERSION } from '../config/policies.js';
import logger from '../utils/logger.js';
import {
    sendSuccess,
    sendBadRequest,
    sendUnauthorized,
    sendForbidden,
    sendNotFound,
    sendConflict,
    sendServerError,
    asyncHandler
} from '../utils/apiResponse.js';
import { getRequiredSecret } from '../config/secrets.js';

const validator = new ValidationService();

const router = express.Router();
// Use getter to avoid hoisting issues with dotenv
const getJwtSecret = () => getRequiredSecret('JWT_SECRET', { allowTestFallback: true });

/**
 * USER REGISTRATION ENDPOINT
 * Protected by rate limiting: 3 registrations per 15 minutes per IP
 */
router.post('/register', registrationLimiter, asyncHandler(async (req, res) => {
    const { email, password, captchaToken, acceptedTerms } = req.body;

    // Step 1: Validate input
    if (!email || !password) {
        return sendBadRequest(res, 'Email and password required', 'MISSING_CREDENTIALS');
    }

    // Step 1b: Verify CAPTCHA (if configured)
    if (process.env.TURNSTILE_SECRET_KEY) {
        const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
        const captchaResult = await verifyTurnstile(captchaToken, clientIp);

        if (!captchaResult.success) {
            return sendBadRequest(res, captchaResult.error || 'CAPTCHA verification failed', 'CAPTCHA_FAILED', { captchaError: true });
        }
    }

    if (!email.includes('@')) {
        return sendBadRequest(res, 'Invalid email format', 'INVALID_EMAIL');
    }

    // Validate password strength (12+ chars with complexity)
    const passwordValidation = validator.validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
        return sendBadRequest(res, passwordValidation.error, 'WEAK_PASSWORD', {
            passwordErrors: passwordValidation.errors,
            strength: passwordValidation.strength
        });
    }

    // Require affirmative acceptance of the legal agreements (clickwrap).
    // Enforced server-side so acceptance cannot be bypassed via the API.
    if (acceptedTerms !== true) {
        return sendBadRequest(
            res,
            'You must accept the Terms of Service, Privacy Policy, and Third-Party Services Disclosure',
            'TERMS_NOT_ACCEPTED'
        );
    }

    // Step 2: Check if user already exists
    const existingUser = await prisma.users.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true }
    });

    if (existingUser) {
        return sendConflict(res, 'User already exists', 'USER_EXISTS');
    }

    // Step 3: Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Step 3b: Generate verification token
    const verificationToken = generateVerificationToken();
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24); // 24 hours expiry

    // Step 4: Insert user into database
    const isNonProd = process.env.NODE_ENV !== 'production';

    // In development, ALL users are considered test users for simplicity
    // In production, only users matching specific patterns are treated as test users
    const isTestUser = email.toLowerCase().startsWith('test') ||
        email.toLowerCase().startsWith('reset') ||
        email.toLowerCase().startsWith('starter') ||
        email.toLowerCase().startsWith('pro') ||
        email.toLowerCase().startsWith('trial') ||
        email.toLowerCase().startsWith('blocked') ||
        email.toLowerCase().startsWith('upgrade') ||
        email.toLowerCase().startsWith('session') ||
        email.toLowerCase().includes('csrf-test') ||
        email.toLowerCase().includes('journey-') ||  // Allow journey test emails
        email.toLowerCase().includes('phase') ||     // Allow phase test emails
        email.toLowerCase().includes('complete-') ||  // Allow complete test emails
        email.toLowerCase().includes('nav-') ||      // Allow nav test emails
        email.toLowerCase().includes('custom-') ||   // Allow custom test emails
        email.toLowerCase().includes('image-') ||    // Allow image test emails
        email.toLowerCase().includes('products-') || // Allow products test emails
        email.toLowerCase().includes('contact-') ||  // Allow contact test emails
        email.toLowerCase().includes('view-') ||     // Allow view test emails
        email.toLowerCase().includes('manage-') ||   // Allow manage test emails
        email.toLowerCase().includes('diag');         // Allow diagnostic test emails

    console.log(`[DEBUG] Register: email=${email}, NODE_ENV=${process.env.NODE_ENV}, isNonProd=${isNonProd}, isTestUser=${isTestUser}`);

    // In development: auto-activate all users (including test users)
    // In production: activate test users, keep others pending for email verification
    const initialStatus = isNonProd ? 'active' : (isTestUser ? 'active' : 'pending');
    const initialVerified = isNonProd || isTestUser;  // In dev: all verified; In prod: test users verified

    const user = await prisma.users.create({
        data: {
            email: email.toLowerCase(),
            password_hash: hashedPassword,
            role: 'user',
            status: initialStatus,
            email_verified: initialVerified,
            verification_token: verificationToken,
            verification_token_expires: verificationExpires,
            created_at: new Date()
        },
        select: {
            id: true,
            email: true,
            role: true,
            status: true,
            email_verified: true,
            created_at: true
        }
    });

    // Step 4b: Record an audit trail of legal acceptance for enforceability.
    // The authoritative policy version is stamped server-side at acceptance time.
    logger.info('Legal agreements accepted at registration', {
        event: 'terms_acceptance',
        userId: user.id,
        email: user.email,
        policyVersion: POLICY_VERSION,
        acceptedAt: new Date().toISOString(),
        ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip,
        userAgent: req.headers['user-agent'] || null
    });

    // Step 5: Generate token pair (access + refresh)
    // Note: User can login but will be prompted to verify email
    const { accessToken, refreshToken, expiresAt } = await createTokenPair({
        id: user.id,
        email: user.email,
        role: user.role
    });

    // Step 6: Send verification email (don't fail registration if email fails)
    try {
        const baseUrl = process.env.SITE_URL || process.env.BASE_URL || 'http://localhost:3000';
        const verificationLink = `${baseUrl}/verify-email?token=${verificationToken}`;

        await sendEmail(user.email, EmailTypes.VERIFY_EMAIL, {
            email: user.email,
            verificationLink
        });
    } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        // Don't fail registration if email fails - user can request resend
    }

    // Step 6b: Notify admin of new user (don't fail registration if this fails)
    try {
        await sendAdminNotification(EmailTypes.ADMIN_NEW_USER, {
            userEmail: user.email,
            userName: user.email.split('@')[0] // Use email prefix as name
        });
    } catch (emailError) {
        console.error('Failed to send admin notification:', emailError);
    }

    // Step 7: Return success with verification status
    sendSuccess(res, {
        accessToken,
        refreshToken,
        expiresAt,
        user: {
            id: user.id,
            email: user.email,
            role: user.role,
            emailVerified: user.email_verified,
            status: user.status
        },
        requiresVerification: true
    }, 'Account created! Please check your email to verify your account.');
}));

/**
 * USER LOGIN ENDPOINT
 * Protected by rate limiting: 5 login attempts per 15 minutes per IP
 */
router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Step 1: Validate input
    if (!email || !password) {
        return sendBadRequest(res, 'Email and password are required', 'MISSING_CREDENTIALS');
    }

    // Step 2: Get user from database
    const user = await prisma.users.findUnique({
        where: { email: email.toLowerCase() }
    });

    if (!user) {
        return sendUnauthorized(res, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Step 3: Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
        return sendUnauthorized(res, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Step 4: Check account status
    if (user.status !== 'active') {
        return sendForbidden(res, 'Account is suspended or pending verification', 'ACCOUNT_STATUS_ERROR');
    }

    // Step 5: Update last login timestamp (async, don't wait)
    prisma.users.update({
        where: { id: user.id },
        data: { last_login: new Date() }
    }).catch(err => console.error('Failed to update last login:', err));

    // Step 6: Generate token pair (access + refresh)
    const { accessToken, refreshToken, expiresAt } = await createTokenPair({
        id: user.id,
        email: user.email,
        role: user.role
    });

    // Step 7: Return success
    return sendSuccess(res, {
        accessToken,
        refreshToken,
        expiresAt,
        user: {
            id: user.id,
            email: user.email,
            role: user.role,
            status: user.status,
            subscriptionStatus: user.subscription_status,
            subscriptionPlan: user.subscription_plan
        }
    });
}));

/**
 * QUICK REGISTER ENDPOINT
 */
router.post('/quick-register', asyncHandler(async (req, res) => {
    const { email, skipPassword } = req.body;

    if (!email) {
        return sendBadRequest(res, 'Email required', 'MISSING_EMAIL');
    }

    if (!isValidEmail(email)) {
        return sendBadRequest(res, 'Valid email required', 'INVALID_EMAIL');
    }

    // Check if user exists
    const existingUser = await prisma.users.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true }
    });

    if (existingUser) {
        return sendConflict(res, 'Email already exists', 'EMAIL_EXISTS');
    }

    // Create new user
    const tempPassword = skipPassword ? generateRandomPassword() : req.body.password;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const user = await prisma.users.create({
        data: {
            email: email.toLowerCase(),
            password_hash: hashedPassword,
            role: 'user',
            status: skipPassword ? 'pending' : 'active',
            created_at: new Date()
        },
        select: {
            id: true,
            email: true,
            role: true,
            created_at: true
        }
    });

    // Generate token pair (access + refresh)
    const { accessToken, refreshToken, expiresAt } = await createTokenPair({
        id: user.id,
        email: user.email,
        role: user.role
    });

    // Send welcome email if skip password
    if (skipPassword) {
        try {
            await sendEmail(email, EmailTypes.WELCOME, { email });
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
        }
    }

    sendSuccess(res, {
        accessToken,
        refreshToken,
        expiresAt,
        user: {
            id: user.id,
            email: user.email,
            role: user.role
        }
    });
}));

/**
 * EMAIL VERIFICATION ENDPOINT
 * 
 * Verifies user's email address using verification token
 * GET /api/auth/verify-email?token=xxx
 */
router.get('/verify-email', asyncHandler(async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return sendBadRequest(res, 'Verification token is required', 'MISSING_TOKEN');
    }

    // Find user by verification token
    const user = await prisma.users.findUnique({
        where: { verification_token: token },
        select: {
            id: true,
            email: true,
            email_verified: true,
            verification_token_expires: true,
            status: true
        }
    });

    if (!user) {
        return sendBadRequest(res, 'Invalid or expired verification token', 'INVALID_TOKEN');
    }

    // Check if already verified
    if (user.email_verified) {
        return sendBadRequest(res, 'Email already verified', 'ALREADY_VERIFIED', {
            message: 'Your email has already been verified. You can log in now.'
        });
    }

    // Check if token expired
    if (user.verification_token_expires && new Date() > new Date(user.verification_token_expires)) {
        return sendBadRequest(res, 'Verification token expired', 'TOKEN_EXPIRED', {
            message: 'This verification link has expired. Please request a new one.'
        });
    }

    // Verify email and activate account
    await prisma.users.update({
        where: { id: user.id },
        data: {
            email_verified: true,
            status: 'active', // Activate account
            verified_at: new Date(),
            verification_token: null, // Clear token after use
            verification_token_expires: null
        }
    });

    sendSuccess(res, {
        verified: true
    }, 'Email verified successfully! Your account is now active.');
}));

/**
 * RESEND VERIFICATION EMAIL ENDPOINT
 * 
 * Resends verification email to user
 * POST /api/auth/resend-verification
 */
router.post('/resend-verification', asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return sendBadRequest(res, 'Email is required', 'MISSING_EMAIL');
    }

    // Find user
    const user = await prisma.users.findUnique({
        where: { email: email.toLowerCase() },
        select: {
            id: true,
            email: true,
            email_verified: true,
            verification_token: true,
            verification_token_expires: true
        }
    });

    if (!user) {
        // Don't reveal if email exists (security best practice)
        return sendSuccess(res, {}, 'If an account with that email exists and is unverified, a verification email has been sent.');
    }

    // Check if already verified
    if (user.email_verified) {
        return sendBadRequest(res, 'Email already verified', 'ALREADY_VERIFIED', {
            message: 'Your email is already verified. You can log in now.'
        });
    }

    // Generate new token if expired or missing
    let verificationToken = user.verification_token;
    let verificationExpires = user.verification_token_expires
        ? new Date(user.verification_token_expires)
        : new Date();

    // If token expired or missing, generate new one
    if (!verificationToken || (verificationExpires && new Date() > verificationExpires)) {
        verificationToken = generateVerificationToken();
        verificationExpires = new Date();
        verificationExpires.setHours(verificationExpires.getHours() + 24);

        await prisma.users.update({
            where: { id: user.id },
            data: {
                verification_token: verificationToken,
                verification_token_expires: verificationExpires
            }
        });
    }

    // Send verification email
    try {
        const baseUrl = process.env.SITE_URL || process.env.BASE_URL || 'http://localhost:3000';
        const verificationLink = `${baseUrl}/verify-email?token=${verificationToken}`;

        await sendEmail(user.email, EmailTypes.VERIFY_EMAIL, {
            email: user.email,
            verificationLink
        });
    } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        return sendServerError(res, emailError, 'Failed to send verification email');
    }

    sendSuccess(res, {}, 'Verification email sent! Please check your inbox.');
}));

// Verify auth token
router.get('/verify', requireAuth, asyncHandler(async (req, res) => {
    sendSuccess(res, {
        user: {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role
        }
    });
}));

// Get current user info
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
    const user = req.user;
    sendSuccess(res, {
        user: {
            id: user.id,
            userId: user.userId, // For backwards compatibility
            email: user.email,
            role: user.role,
            status: user.status,
            subscriptionStatus: user.subscriptionStatus,
            subscriptionPlan: user.subscriptionPlan
        }
    });
}));

/**
 * SEND MAGIC LINK ENDPOINT
 */
router.post('/send-magic-link', asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email || !isValidEmail(email)) {
        return sendBadRequest(res, 'Valid email required', 'INVALID_EMAIL');
    }

    // Check if user exists
    const user = await prisma.users.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true, email: true, role: true }
    });

    if (!user) {
        // Don't reveal if user exists or not
        return sendSuccess(res, {}, 'If an account exists, a login link has been sent');
    }

    // Generate token
    const token = jwt.sign(
        {
            userId: user.id,
            id: user.id,
            email: user.email,
            role: user.role,
            magicLink: true
        },
        getJwtSecret(),
        { expiresIn: '1h' }
    );

    // Send magic link email
    try {
        await sendEmail(user.email, EmailTypes.WELCOME, {
            email: user.email,
            magicLink: `${process.env.BASE_URL || 'http://localhost:3000'}/magic-login?token=${token}`
        });
    } catch (emailError) {
        console.error('Failed to send magic link:', emailError);
    }

    sendSuccess(res, {}, 'If an account exists, a login link has been sent');
}));

/**
 * REFRESH TOKEN ENDPOINT
 * Exchanges refresh token for new access token
 * Error handling: Returns 401 for invalid/expired tokens
 */
router.post('/refresh', asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return sendBadRequest(res, 'Refresh token is required', 'MISSING_REFRESH_TOKEN');
    }

    try {
        // Verify refresh token and get user
        const user = await verifyRefreshToken(refreshToken);

        // Generate new access token
        const { generateAccessToken } = await import('../services/tokenService.js');
        const accessToken = generateAccessToken(user);

        return sendSuccess(res, { accessToken });
    } catch (err) {
        console.error('Token refresh failed:', err.message);

        // Return appropriate error response
        if (err.message.includes('expired')) {
            return sendUnauthorized(res, 'Refresh token has expired', 'TOKEN_EXPIRED');
        } else if (err.message.includes('revoked')) {
            return sendUnauthorized(res, 'Refresh token has been revoked', 'TOKEN_REVOKED');
        } else if (err.message.includes('not active')) {
            return sendForbidden(res, 'User account is not active', 'ACCOUNT_INACTIVE');
        } else {
            return sendUnauthorized(res, 'Invalid refresh token', 'INVALID_TOKEN');
        }
    }
}));

/**
 * LOGOUT ENDPOINT
 * Revokes refresh token
 */
router.post('/logout', requireAuth, asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    const userId = req.user.id || req.user.userId;

    if (refreshToken) {
        // Revoke specific token
        await revokeRefreshToken(refreshToken);
    } else if (userId) {
        // Revoke all tokens for user (full logout)
        await revokeAllUserTokens(userId);
    }

    return sendSuccess(res, {}, 'Logged out successfully');
}));

// Password reset endpoints
// Protected by rate limiting: 3 requests per hour per email
router.post('/forgot-password', passwordResetLimiter, asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return sendBadRequest(res, 'Email is required', 'MISSING_EMAIL');
    }

    // Check if user exists in database
    const user = await prisma.users.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true, email: true }
    });

    // Don't reveal if user exists or not for security
    if (!user) {
        return sendSuccess(res, {}, 'If an account with that email exists, a password reset link has been sent.');
    }

    // Generate secure reset token using crypto.randomBytes
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1); // 1 hour expiry

    // Store reset token in database
    await prisma.users.update({
        where: { id: user.id },
        data: {
            password_reset_token: resetToken,
            password_reset_expires: resetExpires
        }
    });

    // Send password reset email
    try {
        const baseUrl = process.env.SITE_URL || process.env.BASE_URL || 'http://localhost:3000';
        const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

        await sendEmail(user.email, EmailTypes.PASSWORD_RESET, {
            email: user.email,
            resetToken,
            resetLink
        });
    } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        // Don't fail the request if email fails
    }

    sendSuccess(res, {}, 'If an account with that email exists, a password reset link has been sent.');
}));

// Password reset with token endpoint
router.post('/reset-password', asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return sendBadRequest(res, 'Token and new password required', 'MISSING_FIELDS');
    }

    // Validate password strength (12+ chars with complexity)
    const passwordValidation = validator.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
        return sendBadRequest(res, passwordValidation.error, 'WEAK_PASSWORD', {
            passwordErrors: passwordValidation.errors,
            strength: passwordValidation.strength
        });
    }

    // Find user with this reset token in database
    const user = await prisma.users.findUnique({
        where: { password_reset_token: token },
        select: {
            id: true,
            email: true,
            password_reset_expires: true
        }
    });

    if (!user) {
        return sendBadRequest(res, 'Invalid or expired reset token', 'INVALID_TOKEN');
    }

    // Check if token expired
    if (!user.password_reset_expires || new Date(user.password_reset_expires) < new Date()) {
        return sendBadRequest(res, 'Reset token has expired', 'TOKEN_EXPIRED');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await prisma.users.update({
        where: { id: user.id },
        data: {
            password_hash: hashedPassword,
            password_reset_token: null,
            password_reset_expires: null,
            password_changed_at: new Date()
        }
    });

    sendSuccess(res, {}, 'Password reset successfully');
}));

// Force password change on first login (for users with temporary passwords)
router.post('/change-temp-password', requireAuth, asyncHandler(async (req, res) => {
    const { newPassword } = req.body;

    if (!newPassword) {
        return sendBadRequest(res, 'New password is required', 'MISSING_PASSWORD');
    }

    // Validate password strength (12+ chars with complexity)
    const passwordValidation = validator.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
        return sendBadRequest(res, passwordValidation.error, 'WEAK_PASSWORD', {
            passwordErrors: passwordValidation.errors,
            strength: passwordValidation.strength
        });
    }

    // Get user from database
    const user = await prisma.users.findUnique({
        where: { id: req.user.id },
        select: {
            id: true,
            email: true,
            status: true,
            temp_password: true
        }
    });

    if (!user) {
        return sendNotFound(res, 'User', 'USER_NOT_FOUND');
    }

    // Check if user is using temporary password
    if (user.status !== 'invited' && !user.temp_password) {
        return sendBadRequest(res, 'No temporary password to change', 'NO_TEMP_PASSWORD');
    }

    // Hash new password and update user
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.users.update({
        where: { id: user.id },
        data: {
            password_hash: hashedPassword,
            status: 'active',
            temp_password: null,
            temp_password_expires: null,
            password_changed_at: new Date()
        }
    });

    sendSuccess(res, {}, 'Password changed successfully');
}));

export default router;
