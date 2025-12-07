import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../../database/db.js';
import { sendEmail, EmailTypes, sendAdminNotification } from '../utils/email-service-wrapper.js';
import { requireAuth } from '../middleware/auth.js';
import { isValidEmail, generateRandomPassword, getUserFilePath } from '../utils/helpers.js';

const router = express.Router();
// Use getter to avoid hoisting issues with dotenv
const getJwtSecret = () => process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const publicDir = path.join(process.cwd(), 'public');
const usersDir = path.join(publicDir, 'users');

// Ensure users directory exists
fs.mkdir(usersDir, { recursive: true }).catch(() => { });

/**
 * USER REGISTRATION ENDPOINT
 */
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Step 1: Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        if (!email.includes('@')) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
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

        // Step 4: Insert user into database
        const user = await prisma.users.create({
            data: {
                email: email.toLowerCase(),
                password_hash: hashedPassword,
                role: 'user',
                status: 'active',
                created_at: new Date()
            },
            select: {
                id: true,
                email: true,
                role: true,
                status: true,
                created_at: true
            }
        });

        // Step 5: Generate JWT token (valid for 7 days)
        const token = jwt.sign(
            {
                userId: user.id,
                id: user.id, // For compatibility
                email: user.email,
                role: user.role
            },
            getJwtSecret(),
            { expiresIn: '7d' }
        );

        // Step 6: Send welcome email (don't fail registration if email fails)
        try {
            await sendEmail(user.email, EmailTypes.WELCOME, { email: user.email });
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
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

        // Step 7: Return success
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            }
        });

    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

/**
 * USER LOGIN ENDPOINT
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Step 1: Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Step 2: Get user from database
        const user = await prisma.users.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Step 3: Verify password
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Step 4: Check account status
        if (user.status !== 'active') {
            return res.status(403).json({ error: 'Account is suspended' });
        }

        // Step 5: Update last login timestamp (async, don't wait)
        prisma.users.update({
            where: { id: user.id },
            data: { last_login: new Date() }
        }).catch(err => console.error('Failed to update last login:', err));

        // Step 6: Generate JWT token (valid for 7 days)
        const token = jwt.sign({
            userId: user.id,
            id: user.id, // For compatibility
            email: user.email,
            role: user.role
        }, getJwtSecret(), { expiresIn: '7d' });

        // Step 7: Return success
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                status: user.status,
                subscriptionStatus: user.subscription_status,
                subscriptionPlan: user.subscription_plan
            }
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Failed to login' });
    }
});

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

        // Generate token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            getJwtSecret(),
            { expiresIn: '7d' }
        );

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
            token,
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

router.post('/logout', (req, res) => {
    // JWT is stateless, so logout is handled client-side
    res.json({ success: true, message: 'Logged out successfully' });
});

// Password reset endpoints
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Check if user exists
        const userPath = getUserFilePath(email);

        if (!(await fs.access(userPath).then(() => true).catch(() => false))) {
            // Don't reveal if user exists or not for security
            return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
        }

        // Generate reset token (in production, use crypto.randomBytes)
        const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const resetExpires = new Date(Date.now() + 3600000); // 1 hour

        // Load user data
        const userData = JSON.parse(await fs.readFile(userPath, 'utf-8'));
        userData.resetToken = resetToken;
        userData.resetExpires = resetExpires.toISOString();

        // Save updated user data
        await fs.writeFile(userPath, JSON.stringify(userData, null, 2));

        // Send password reset email
        await sendEmail(email, EmailTypes.PASSWORD_RESET, { email, resetToken });

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

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Find user with this reset token
        const userFiles = await fs.readdir(usersDir);
        let userFile = null;
        let userData = null;

        for (const file of userFiles) {
            if (!file.endsWith('.json')) continue;
            const filePath = path.join(usersDir, file);
            const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));

            if (data.resetToken === token) {
                userFile = filePath;
                userData = data;
                break;
            }
        }

        if (!userData) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        // Check if token expired
        if (new Date(userData.resetExpires) < new Date()) {
            return res.status(400).json({ error: 'Reset token has expired' });
        }

        // Update password
        userData.password = await bcrypt.hash(newPassword, 10);
        userData.resetToken = undefined;
        userData.resetExpires = undefined;
        userData.passwordChangedAt = new Date().toISOString();

        await fs.writeFile(userFile, JSON.stringify(userData, null, 2));

        res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// Force password change on first login
router.post('/change-temp-password', requireAuth, async (req, res) => {
    try {
        const { newPassword } = req.body;

        if (!newPassword) {
            return res.status(400).json({ error: 'New password is required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        // Load user data
        const userPath = getUserFilePath(req.user.email);
        const userData = JSON.parse(await fs.readFile(userPath, 'utf-8'));

        // Check if user is using temporary password
        if (userData.status !== 'invited' && !userData.tempPassword) {
            return res.status(400).json({ error: 'No temporary password to change' });
        }

        // Update password and status
        userData.password = await bcrypt.hash(newPassword, 10);
        userData.status = 'active';
        userData.tempPassword = undefined;
        userData.tempPasswordExpires = undefined;
        userData.passwordChangedAt = new Date().toISOString();

        // Save updated user data
        await fs.writeFile(userPath, JSON.stringify(userData, null, 2));

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Error changing temporary password:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

export default router;
