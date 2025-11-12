/**
 * Google OAuth Authentication Module
 * Handles Google Sign In for SiteSprintz
 */

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import { query as dbQuery } from './database/db.js';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

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

  // Create strategy with dynamic callback URL
  const strategy = new GoogleStrategy({
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

      // Check if user exists in database
      let result = await dbQuery(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      let user;
      
      if (result.rows.length > 0) {
        // Existing user - update Google info if needed
        user = result.rows[0];
        
        if (!user.google_id) {
          await dbQuery(
            'UPDATE users SET google_id = $1, picture = $2, last_login = NOW() WHERE email = $3',
            [googleId, picture, email]
          );
          user.google_id = googleId;
          user.picture = picture;
        } else {
          // Just update last login
          await dbQuery(
            'UPDATE users SET last_login = NOW() WHERE email = $1',
            [email]
          );
        }
      } else {
        // New user - create account in database
        const userId = crypto.randomUUID();
        
        // Set trial expiration to 7 days from now
        const trialExpiration = new Date();
        trialExpiration.setDate(trialExpiration.getDate() + 7);
        
        result = await dbQuery(
          `INSERT INTO users (
            id, email, name, google_id, picture, role, status,
            subscription_status, subscription_plan, trial_expires_at,
            auth_provider, email_verified, created_at, last_login
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
          RETURNING *`,
          [
            userId,
            email,
            name,
            googleId,
            picture,
            'user',
            'active',
            'trial',
            'free',
            trialExpiration,
            'google',
            true
          ]
        );
        
        user = result.rows[0];
        console.log(`✅ New user created via Google: ${email}`);
      }

      // Parse state parameter for plan and intent
      const state = req.query.state || '';
      const stateParts = state.split(',');
      const plan = stateParts[0];
      const intentPart = stateParts.find(p => p.startsWith('intent:'));
      const intent = intentPart ? intentPart.split(':')[1] : null;

      // Store plan and intent temporarily (for redirect logic)
      if (plan && (plan === 'starter' || plan === 'pro')) {
        user.pendingPlan = plan;
      }
      
      if (intent) {
        user.pendingIntent = intent;
      }

      return done(null, user);
    } catch (error) {
      console.error('Google OAuth error:', error);
      return done(error, null);
    }
  });
  
  passport.use(strategy);
  
  console.log('✅ Google OAuth configured');
  console.log('📍 Callback URL:', GOOGLE_CALLBACK_URL);
  return true;
}

/**
 * Google OAuth Routes
 */
export function setupGoogleRoutes(app) {
  // Initiate Google OAuth
  app.get('/auth/google', (req, res, next) => {
    const plan = req.query.plan;
    const intent = req.query.intent;
    
    // Pass both plan and intent via state (comma-separated)
    let state = plan || 'free';
    if (intent) {
      state += `,intent:${intent}`;
    }
    
    console.log('🚀 Initiating Google OAuth...');
    console.log('Callback URL:', process.env.GOOGLE_CALLBACK_URL);
    
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      state: state,
      callbackURL: process.env.GOOGLE_CALLBACK_URL  // Explicitly use our callback URL
    })(req, res, next);
  });

  // Google OAuth callback
  app.get('/auth/google/callback', (req, res, next) => {
    console.log('🎯 CALLBACK HIT - Starting passport authentication...');
    passport.authenticate('google', { 
      session: false,
      failureRedirect: '/register.html?error=oauth_failed' 
    }, (err, user, info) => {
      console.log('🎯 Passport authenticate callback fired');
      console.log('Error:', err);
      console.log('User:', user ? user.email : 'NO USER');
      console.log('Info:', info);
      
      if (err) {
        console.error('❌ Passport authentication error:', err);
        return res.redirect('/register.html?error=auth_error');
      }
      
      if (!user) {
        console.error('❌ No user returned from passport');
        return res.redirect('/register.html?error=no_user');
      }
      
      req.user = user;
      next();
    })(req, res, next);
  }, (req, res) => {
      try {
        const user = req.user;
        
        console.log('🔥🔥🔥 OAUTH CALLBACK FIRED 🔥🔥🔥');
        console.log('User email:', user.email);
        console.log('User ID:', user.id);
        console.log('User role:', user.role);

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
        
        console.log('Token generated:', token.substring(0, 20) + '...');

        console.log('🔍 Checking redirect logic...');
        console.log('Pending intent:', user.pendingIntent);
        console.log('Pending plan:', user.pendingPlan);
        
        // Check if user came from publish flow
        if (user.pendingIntent === 'publish') {
          const redirectUrl = `/auto-publish.html?token=${token}`;
          console.log('✅ REDIRECTING TO:', redirectUrl);
          return res.redirect(redirectUrl);
        }
        // Check if user needs to be redirected to Stripe checkout
        else if (user.pendingPlan && (user.pendingPlan === 'starter' || user.pendingPlan === 'pro')) {
          const redirectUrl = `/register-success.html?token=${token}&plan=${user.pendingPlan}`;
          console.log('✅ REDIRECTING TO:', redirectUrl);
          return res.redirect(redirectUrl);
        } else {
          // Free trial - redirect directly to dashboard with token
          const redirectUrl = `/dashboard.html?token=${token}`;
          console.log('✅ REDIRECTING TO:', redirectUrl);
          console.log('🚀 User should now land on dashboard!');
          return res.redirect(redirectUrl);
        }
      } catch (error) {
        console.error('❌ OAuth callback error:', error);
        res.redirect('/register.html?error=auth_failed');
      }
    }
  );

  console.log('✅ Google OAuth routes configured');
}

export default {
  configureGoogleAuth,
  setupGoogleRoutes
};


