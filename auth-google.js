/**
 * Google OAuth Authentication Module
 * Handles Google Sign In for SiteSprintz
 */

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import bcrypt from 'bcryptjs';
import { prisma } from './database/db.js';
import crypto from 'crypto';
import { createGoogleOAuthState, consumeGoogleOAuthState } from './server/services/auth/googleOAuthState.js';
import { createTokenPair } from './server/services/tokenService.js';
import { setAuthCookies } from './server/utils/authCookies.js';
import { betaAllowsPublicSignups } from './server/config/betaMode.js';
import { paidPlanFromQuery } from './src/config/tiers.js';

/**
 * Unusable hash so Google-only users satisfy required users.password_hash.
 * Same idea as the test-mode Google mock in server.js; bcrypt so /login compare stays valid.
 * @returns {Promise<string>}
 */
export async function unusableGooglePasswordHash() {
  return bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
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

  // Create strategy with dynamic callback URL
  const strategy = new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: GOOGLE_CALLBACK_URL,
    passReqToCallback: true
  },
    async function (req, accessToken, refreshToken, profile, done) {
      try {
        const email = profile.emails[0].value;
        const name = profile.displayName;
        const googleId = profile.id;
        const picture = profile.photos[0]?.value;

        // Check if user exists in database
        let user = await prisma.users.findUnique({
          where: { email }
        });

        if (user) {
          // Existing user - update Google info if needed
          if (!user.google_id) {
            user = await prisma.users.update({
              where: { email },
              data: {
                google_id: googleId,
                picture: picture,
                last_login: new Date()
              }
            });
          } else {
            // Just update last login
            user = await prisma.users.update({
              where: { email },
              data: {
                last_login: new Date()
              }
            });
          }
        } else {
          if (!betaAllowsPublicSignups()) {
            return done(null, false, { code: 'BETA_INVITE_ONLY' });
          }

          // New user - create account in database
          const userId = crypto.randomUUID();

          // Set trial expiration to 7 days from now
          const trialExpiration = new Date();
          trialExpiration.setDate(trialExpiration.getDate() + 7);

          user = await prisma.users.create({
            data: {
              id: userId,
              email: email,
              name: name,
              google_id: googleId,
              picture: picture,
              password_hash: await unusableGooglePasswordHash(),
              role: 'user',
              status: 'active',
              subscription_status: 'trial',
              subscription_plan: 'free',
              trial_expires_at: trialExpiration,
              auth_provider: 'google',
              email_verified: true,
              created_at: new Date(),
              last_login: new Date()
            }
          });

          console.log(`✅ New user created via Google: ${email}`);
        }

        const { plan, intent } = await consumeGoogleOAuthState(req.query.state);
        const paid = paidPlanFromQuery(plan);
        if (paid) {
          user.pendingPlan = paid;
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
  const clientUrl = () => process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173';

  // Initiate Google OAuth
  app.get('/auth/google', async (req, res, next) => {
    const state = await createGoogleOAuthState({
      plan: req.query.plan,
      intent: req.query.intent
    });

    console.log('🚀 Initiating Google OAuth...');
    console.log('Callback URL:', process.env.GOOGLE_CALLBACK_URL);

    passport.authenticate('google', {
      scope: ['profile', 'email'],
      state,
      callbackURL: process.env.GOOGLE_CALLBACK_URL
    })(req, res, next);
  });

  // Google OAuth callback
  app.get('/auth/google/callback', (req, res, next) => {
    console.log('🎯 CALLBACK HIT - Starting passport authentication...');

    if (req.query.error) {
      const error = String(req.query.error);
      console.error('❌ Google returned an error:', error);
      return res.redirect(`${clientUrl()}/login?error=${encodeURIComponent(error)}`);
    }

    if (!req.query.code) {
      console.error('❌ Google callback missing authorization code');
      return res.redirect(`${clientUrl()}/login?error=oauth_failed`);
    }

    passport.authenticate('google', {
      session: false,
      failureRedirect: `${clientUrl()}/login?error=oauth_failed`
    }, (err, user, info) => {
      console.log('🎯 Passport authenticate callback fired');
      console.log('Error:', err);
      console.log('User:', user ? user.email : 'NO USER');
      console.log('Info:', info);

      if (err) {
        console.error('❌ Passport authentication error:', err);
        return res.redirect(`${clientUrl()}/login?error=auth_error`);
      }

      if (!user) {
        if (info?.code === 'BETA_INVITE_ONLY') {
          return res.redirect(`${clientUrl()}/register?error=beta_invite_only`);
        }
        console.error('❌ No user returned from passport');
        return res.redirect(`${clientUrl()}/login?error=no_user`);
      }

      req.user = user;
      next();
    })(req, res, next);
  }, async (req, res) => {
    try {
      const user = req.user;

      const { accessToken, refreshToken } = await createTokenPair({
        id: user.id,
        email: user.email,
        role: user.role
      });
      setAuthCookies(res, { accessToken, refreshToken });

      const frontend = clientUrl();

      if (user.pendingIntent === 'publish') {
        return res.redirect(`${frontend}/oauth/callback?token=${accessToken}&intent=publish`);
      }

      if (paidPlanFromQuery(user.pendingPlan)) {
        return res.redirect(`${frontend}/oauth/callback?token=${accessToken}&plan=${user.pendingPlan}`);
      }

      return res.redirect(`${frontend}/oauth/callback?token=${accessToken}`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect(`${clientUrl()}/login?error=auth_failed`);
    }
  }
  );

  console.log('✅ Google OAuth routes configured');
}

export default {
  configureGoogleAuth,
  setupGoogleRoutes
};


