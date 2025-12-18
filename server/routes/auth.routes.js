import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../database/db.js';
import { sendEmail, EmailTypes, sendAdminNotification } from '../utils/email-service-wrapper.js';
import { requireAuth } from '../middleware/auth.js';
import { isValidEmail, generateVerificationToken } from '../utils/helpers.js';
import crypto from 'crypto';
import { registrationLimiter, loginLimiter, passwordResetLimiter } from '../middleware/rateLimiting.js';
import { verifyTurnstile } from '../utils/captcha.js';
import { createTokenPair, verifyRefreshToken, revokeRefreshToken, revokeAllUserTokens } from '../services/tokenService.js';
import { ValidationService } from '../services/validationService.js';
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
import { validateEmail, generateSecurePassword } from '../utils/validators.js';

const validator = new ValidationService();

const router = express.Router();
// Use getter to avoid hoisting issues with dotenv
const getJwtSecret = () => process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * USER REGISTRATION ENDPOINT
 * Protected by rate limiting: 3 registrations per 15 minutes per IP
 */
router.post('/register', registrationLimiter, async (req, res) => {
    try {
        const { email, password, captchaToken } = req.body;

        // Step 1: Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Step 1b: Verify CAPTCHA (if configured)
        if (process.env.TURNSTILE_SECRET_KEY) {
            const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
            const captchaResult = await verifyTurnstile(captchaToken, clientIp);
            
            if (!captchaResult.success) {
                return res.status(400).json({ 
                    error: captchaResult.error || 'CAPTCHA verification failed',
                    captchaError: true 
                });
            }
        }

        if (!email.includes('@')) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Validate password strength (12+ chars with complexity)
        const passwordValidation = validator.validatePasswordStrength(password);
        if (!passwordValidation.isValid) {
            return res.status(400).json({ 
                error: passwordValidation.error,
                passwordErrors: passwordValidation.errors,
                strength: passwordValidation.strength
            });
        }

        // Step 2: Check if user already exists
        const existingUser = await prisma.users.findUnique({
            where: { email: email.toLowerCase() },
            select: { id: true }
        });

        if (existingUser) {
            return res.status(409).json({ error: 'User already exists' });
        }

        // Step 3: Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Step 3b: Generate verification token
        const verificationToken = generateVerificationToken();
        const verificationExpires = new Date();
        verificationExpires.setHours(verificationExpires.getHours() + 24); // 24 hours expiry

        // Step 4: Insert user into database with pending status
        const user = await prisma.users.create({
            data: {
                email: email.toLowerCase(),
                password_hash: hashedPassword,
                role: 'user',
                status: 'pending', // Account starts as pending until email verified
                email_verified: false,
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
        res.json({
            success: true,
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
            requiresVerification: true,
            message: 'Account created! Please check your email to verify your account.'
        });

    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

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
        return sendForbidden(res, 'Account is suspended', 'ACCOUNT_SUSPENDED');
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
router.post('/quick-register', async (req, res) => {
    try {
        const { email, skipPassword } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email required' });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({ error: 'Valid email required' });
        }

        // Check if user exists
        const existingUser = await prisma.users.findUnique({
            where: { email: email.toLowerCase() },
            select: { id: true }
        });

        if (existingUser) {
            return res.status(400).json({ error: 'Email already exists' });
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
    } catch (error) {
        console.error('Quick register error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

/**
 * EMAIL VERIFICATION ENDPOINT
 * 
 * Verifies user's email address using verification token
 * GET /api/auth/verify-email?token=xxx
 */
router.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ error: 'Verification token is required' });
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
            return res.status(400).json({ error: 'Invalid or expired verification token' });
        }

        // Check if already verified
        if (user.email_verified) {
            return res.status(400).json({ 
                error: 'Email already verified',
                message: 'Your email has already been verified. You can log in now.'
            });
        }

        // Check if token expired
        if (user.verification_token_expires && new Date() > new Date(user.verification_token_expires)) {
            return res.status(400).json({ 
                error: 'Verification token expired',
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

        res.json({
            success: true,
            message: 'Email verified successfully! Your account is now active.',
            verified: true
        });

    } catch (err) {
        console.error('Email verification error:', err);
        res.status(500).json({ error: 'Failed to verify email' });
    }
});

/**
 * RESEND VERIFICATION EMAIL ENDPOINT
 * 
 * Resends verification email to user
 * POST /api/auth/resend-verification
 */
router.post('/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
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
            return res.json({
                success: true,
                message: 'If an account with that email exists and is unverified, a verification email has been sent.'
            });
        }

        // Check if already verified
        if (user.email_verified) {
            return res.status(400).json({ 
                error: 'Email already verified',
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
            return res.status(500).json({ error: 'Failed to send verification email' });
        }

        res.json({
            success: true,
            message: 'Verification email sent! Please check your inbox.'
        });

    } catch (err) {
        console.error('Resend verification error:', err);
        res.status(500).json({ error: 'Failed to resend verification email' });
    }
});

// Verify auth token
router.get('/verify', requireAuth, async (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role
        }
    });
});

// Get current user info
router.get('/me', requireAuth, async (req, res) => {
    try {
        const user = req.user;
        res.json({
            success: true,
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
    } catch (err) {
        console.error('Get user error:', err);
        res.status(500).json({ error: 'Failed to get user data' });
    }
});

/**
 * SEND MAGIC LINK ENDPOINT
 */
router.post('/send-magic-link', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !isValidEmail(email)) {
            return res.status(400).json({ error: 'Valid email required' });
        }

        // Check if user exists
        const user = await prisma.users.findUnique({
            where: { email: email.toLowerCase() },
            select: { id: true, email: true, role: true }
        });

        if (!user) {
            // Don't reveal if user exists or not
            return res.json({ success: true, message: 'If an account exists, a login link has been sent' });
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

        res.json({ success: true, message: 'If an account exists, a login link has been sent' });

    } catch (err) {
        console.error('Magic link error:', err);
        res.status(500).json({ error: 'Failed to send magic link' });
    }
});

/**
 * REFRESH TOKEN ENDPOINT
 * Exchanges refresh token for new access token
 */
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token is required' });
        }

        // Verify refresh token and get user
        const user = await verifyRefreshToken(refreshToken);

        // Generate new access token
        const { generateAccessToken } = await import('../services/tokenService.js');
        const accessToken = generateAccessToken(user);

        res.json({
            success: true,
            accessToken
        });

    } catch (error) {
        console.error('Token refresh error:', error);
        return res.status(401).json({ 
            error: error.message || 'Invalid or expired refresh token' 
        });
    }
});

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
router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Check if user exists in database
        const user = await prisma.users.findUnique({
            where: { email: email.toLowerCase() },
            select: { id: true, email: true }
        });

        // Don't reveal if user exists or not for security
        if (!user) {
            return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
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

        res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    } catch (error) {
        console.error('Error processing password reset:', error);
        res.status(500).json({ error: 'Failed to process password reset request' });
    }
});

// Password reset with token endpoint
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password required' });
        }

        // Validate password strength (12+ chars with complexity)
        const passwordValidation = validator.validatePasswordStrength(newPassword);
        if (!passwordValidation.isValid) {
            return res.status(400).json({ 
                error: passwordValidation.error,
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
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        // Check if token expired
        if (!user.password_reset_expires || new Date(user.password_reset_expires) < new Date()) {
            return res.status(400).json({ error: 'Reset token has expired' });
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

        res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// Force password change on first login (for users with temporary passwords)
router.post('/change-temp-password', requireAuth, async (req, res) => {
    try {
        const { newPassword } = req.body;

        if (!newPassword) {
            return res.status(400).json({ error: 'New password is required' });
        }

        // Validate password strength (12+ chars with complexity)
        const passwordValidation = validator.validatePasswordStrength(newPassword);
        if (!passwordValidation.isValid) {
            return res.status(400).json({ 
                error: passwordValidation.error,
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
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if user is using temporary password
        if (user.status !== 'invited' && !user.temp_password) {
            return res.status(400).json({ error: 'No temporary password to change' });
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

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Error changing temporary password:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

export default router;
