/**
 * Google OAuth Authentication Module
 * Handles Google Sign In for SiteSprintz
 */

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const usersDir = path.join(__dirname, 'public', 'data', 'users');

// Ensure users directory exists
if (!fs.existsSync(usersDir)) {
  fs.mkdirSync(usersDir, { recursive: true });
}

/**
 * Configure Google OAuth Strategy
 */
export function configureGoogleAuth() {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback';

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.warn('⚠️ Google OAuth not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env');
    return false;
  }

  passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: GOOGLE_CALLBACK_URL,
    passReqToCallback: true
  },
  async function(req, accessToken, refreshToken, profile, done) {
    try {
      const email = profile.emails[0].value;
      const name = profile.displayName;
      const googleId = profile.id;
      const picture = profile.photos[0]?.value;

      // Check if user exists
      const userFilePath = path.join(usersDir, `${email.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
      let userData;

      if (fs.existsSync(userFilePath)) {
        // Existing user - load and update Google info
        userData = JSON.parse(fs.readFileSync(userFilePath, 'utf8'));
        
        // Update Google info if not already set
        if (!userData.googleId) {
          userData.googleId = googleId;
          userData.picture = picture;
          userData.lastLogin = new Date().toISOString();
          fs.writeFileSync(userFilePath, JSON.stringify(userData, null, 2));
        }
      } else {
        // New user - create account
        const userId = crypto.randomUUID();
        userData = {
          id: userId,
          email: email,
          name: name,
          googleId: googleId,
          picture: picture,
          role: 'user',
          plan: 'free',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          authProvider: 'google',
          emailVerified: true, // Google emails are verified
          sites: []
        };

        fs.writeFileSync(userFilePath, JSON.stringify(userData, null, 2));
        console.log(`✅ New user created via Google: ${email}`);
      }

      // Store plan if provided (for paid subscriptions)
      const plan = req.query.state; // Pass plan via state parameter
      if (plan && (plan === 'starter' || plan === 'pro')) {
        userData.pendingPlan = plan;
      }

      return done(null, userData);
    } catch (error) {
      console.error('Google OAuth error:', error);
      return done(error, null);
    }
  }));

  console.log('✅ Google OAuth configured');
  return true;
}

/**
 * Google OAuth Routes
 */
export function setupGoogleRoutes(app) {
  // Initiate Google OAuth
  app.get('/auth/google', (req, res, next) => {
    const plan = req.query.plan;
    const state = plan || 'free'; // Pass plan as state parameter
    
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      state: state
    })(req, res, next);
  });

  // Google OAuth callback
  app.get('/auth/google/callback',
    passport.authenticate('google', { 
      session: false,
      failureRedirect: '/register.html?error=oauth_failed' 
    }),
    (req, res) => {
      try {
        const user = req.user;

        // Generate JWT token
        const token = jwt.sign(
          { 
            userId: user.id, 
            email: user.email, 
            role: user.role 
          },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        // Check if user needs to be redirected to Stripe checkout
        if (user.pendingPlan && (user.pendingPlan === 'starter' || user.pendingPlan === 'pro')) {
          // Redirect to a page that will create Stripe checkout
          const redirectUrl = `/register-success.html?token=${token}&plan=${user.pendingPlan}`;
          res.redirect(redirectUrl);
        } else {
          // Free trial - redirect to dashboard
          const redirectUrl = `/register-success.html?token=${token}`;
          res.redirect(redirectUrl);
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        res.redirect('/register.html?error=auth_failed');
      }
    }
  );

  console.log('✅ Google OAuth routes configured');
}

/**
 * Helper function to get user by email
 */
export function getUserByEmail(email) {
  const userFilePath = path.join(usersDir, `${email.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
  if (fs.existsSync(userFilePath)) {
    return JSON.parse(fs.readFileSync(userFilePath, 'utf8'));
  }
  return null;
}

export default {
  configureGoogleAuth,
  setupGoogleRoutes,
  getUserByEmail
};


