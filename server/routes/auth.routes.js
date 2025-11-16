import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../database/db.js';
import { sendEmail, EmailTypes, sendAdminNotification } from '../../email-service.js';
import { requireAuth } from '../middleware/auth.js';
import { 
  trackFailedLogin, 
  isAccountLocked, 
  clearFailedAttempts, 
  getRemainingAttempts 
} from '../utils/loginAttempts.js';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const publicDir = path.join(__dirname, '../../public');
const usersDir = path.join(publicDir, 'users');

// Helper functions
function getUserFilePath(email) {
  const sanitized = email.toLowerCase().replace(/[^a-z0-9@.]/g, '_');
  return path.join(usersDir, `${sanitized}.json`);
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function generateRandomPassword(length = 16) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    if (!email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    const existingUser = await prisma.users.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.users.create({
      data: {
        email: email.toLowerCase(),
        password_hash: hashedPassword,
        role: 'user',
        status: 'active',
        created_at: new Date()
      }
    });
    
    const token = jwt.sign(
      { 
        userId: user.id,
        id: user.id,
        email: user.email,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    try {
      await sendEmail(user.email, EmailTypes.WELCOME, { email: user.email });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }
    
    try {
      await sendAdminNotification(EmailTypes.ADMIN_NEW_USER, {
        userEmail: user.email,
        userName: user.email.split('@')[0]
      });
    } catch (emailError) {
      console.error('Failed to send admin notification:', emailError);
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
    
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// POST /api/auth/quick-register
router.post('/quick-register', async (req, res) => {
  try {
    const { email, skipPassword } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }
    
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email required' });
    }
    
    const existingUser = await prisma.users.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    const tempPassword = skipPassword ? generateRandomPassword() : req.body.password;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    
    const user = await prisma.users.create({
      data: {
        email: email.toLowerCase(),
        password_hash: hashedPassword,
        role: 'user',
        status: skipPassword ? 'pending' : 'active',
        created_at: new Date()
      }
    });
    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
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

// GET /api/auth/verify
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

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    
    res.json({
      success: true,
      user: {
        id: user.id,
        userId: user.userId,
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

// POST /api/auth/send-magic-link
router.post('/send-magic-link', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email required' });
    }
    
    const user = await prisma.users.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, role: true }
    });
    
    if (!user) {
      return res.json({ success: true, message: 'If an account exists, a login link has been sent' });
    }
    
    const token = jwt.sign(
      { 
        userId: user.id,
        id: user.id,
        email: user.email,
        role: user.role,
        magicLink: true
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    
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

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    // Check if account is locked due to too many failed attempts
    const lockStatus = isAccountLocked(email, clientIP);
    if (lockStatus && lockStatus.locked) {
      return res.status(429).json({ 
        error: 'Account temporarily locked', 
        message: `Too many failed login attempts. Please try again in ${lockStatus.remainingMinutes} minute(s).`,
        remainingMinutes: lockStatus.remainingMinutes,
        code: 'ACCOUNT_LOCKED'
      });
    }
    
    const user = await prisma.users.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    if (!user) {
      // Track failed login attempt (user not found)
      trackFailedLogin(email, clientIP);
      const remaining = getRemainingAttempts(email, clientIP);
      
      return res.status(401).json({ 
        error: 'Invalid credentials',
        remainingAttempts: remaining
      });
    }
    
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      // Track failed login attempt (wrong password)
      trackFailedLogin(email, clientIP);
      const remaining = getRemainingAttempts(email, clientIP);
      
      return res.status(401).json({ 
        error: 'Invalid credentials',
        remainingAttempts: remaining
      });
    }
    
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is suspended' });
    }
    
    // Successful login - clear any failed attempts
    clearFailedAttempts(email, clientIP);
    
    // Update last login (fire and forget)
    prisma.users.update({
      where: { id: user.id },
      data: { last_login: new Date() }
    }).catch(err => console.error('Failed to update last login:', err));
    
    const token = jwt.sign({ 
      userId: user.id,
      id: user.id,
      email: user.email, 
      role: user.role
    }, JWT_SECRET, { expiresIn: '7d' });
    
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

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const userPath = getUserFilePath(email);
    
    if (!(await fs.access(userPath).then(() => true).catch(() => false))) {
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }
    
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const resetExpires = new Date(Date.now() + 3600000);
    
    const userData = JSON.parse(await fs.readFile(userPath, 'utf-8'));
    userData.resetToken = resetToken;
    userData.resetExpires = resetExpires.toISOString();
    
    await fs.writeFile(userPath, JSON.stringify(userData, null, 2));
    
    await sendEmail(email, EmailTypes.PASSWORD_RESET, { email, resetToken });
    
    res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error) {
    console.error('Error processing password reset:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
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
    
    if (new Date(userData.resetExpires) < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }
    
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

// POST /api/auth/change-temp-password
router.post('/change-temp-password', requireAuth, async (req, res) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    const userPath = getUserFilePath(req.user.email);
    const userData = JSON.parse(await fs.readFile(userPath, 'utf-8'));
    
    if (userData.status !== 'invited' && !userData.tempPassword) {
      return res.status(400).json({ error: 'No temporary password to change' });
    }
    
    userData.password = await bcrypt.hash(newPassword, 10);
    userData.status = 'active';
    userData.tempPassword = undefined;
    userData.tempPasswordExpires = undefined;
    userData.passwordChangedAt = new Date().toISOString();
    
    await fs.writeFile(userPath, JSON.stringify(userData, null, 2));
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing temporary password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;
