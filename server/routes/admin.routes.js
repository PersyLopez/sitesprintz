import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth } from '../middleware/auth.js';
import { query as dbQuery } from '../../database/db.js';
import { sendEmail, EmailTypes } from '../../email-service.js';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const publicDir = path.join(__dirname, '../../public');
const usersDir = path.join(publicDir, 'users');

function getUserFilePath(email) {
  const sanitized = email.toLowerCase().replace(/[^a-z0-9@.]/g, '_');
  return path.join(usersDir, `${sanitized}.json`);
}

// GET /api/admin/users
router.get('/users', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await dbQuery(`
      SELECT id, email, role, status, created_at, last_login
      FROM users
      ORDER BY created_at DESC
    `);

    const users = result.rows.map(user => ({
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.created_at,
      lastLogin: user.last_login
    }));

    res.json({ users });
  } catch (error) {
    console.error('Error loading users:', error);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

// POST /api/admin/invite-user
router.post('/invite-user', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { email, role = 'user' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const existingUser = await dbQuery(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const tempPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const userResult = await dbQuery(`
      INSERT INTO users (email, password_hash, role, status, created_at)
      VALUES ($1, $2, $3, 'invited', NOW())
      RETURNING id, email, role
    `, [email.toLowerCase(), hashedPassword, role]);

    const user = userResult.rows[0];

    try {
      await sendEmail(email, EmailTypes.INVITATION, { email, tempPassword });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
    }

    res.json({
      message: 'User invitation sent successfully',
      email: user.email,
      userId: user.id
    });
  } catch (error) {
    console.error('Error creating user invitation:', error);
    res.status(500).json({ error: 'Failed to create user invitation' });
  }
});

// GET /api/admin/analytics
router.get('/analytics', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const usersResult = await dbQuery('SELECT COUNT(*) as count FROM users');
    const sitesResult = await dbQuery('SELECT COUNT(*) as count FROM sites WHERE status = $1', ['published']);
    const draftsResult = await dbQuery('SELECT COUNT(*) as count FROM sites WHERE status = $1', ['draft']);

    res.json({
      users: parseInt(usersResult.rows[0].count),
      publishedSites: parseInt(sitesResult.rows[0].count),
      drafts: parseInt(draftsResult.rows[0].count)
    });
  } catch (error) {
    console.error('Error loading admin analytics:', error);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

export default router;

