/**
 * Environment variable validation for production deployments
 * Fails fast if critical configuration is missing or invalid
 */

import { isBetaMode, stripeKeyMode } from './betaMode.js';

/**
 * @param {NodeJS.ProcessEnv} env
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function collectEnvIssues(env = process.env) {
  const errors = [];
  const warnings = [];

  if (env.NODE_ENV !== 'production') {
    return { errors, warnings };
  }

  const beta = isBetaMode(env);

  if (!env.JWT_SECRET || env.JWT_SECRET === 'dev-secret-key-change-in-production') {
    errors.push('JWT_SECRET is missing or using default dev value. Generate a strong 32+ byte random string.');
  }

  if (!env.ADMIN_TOKEN || env.ADMIN_TOKEN === 'dev-token') {
    errors.push('ADMIN_TOKEN is missing or using default "dev-token". Generate a strong random value.');
  }

  if (!env.ENCRYPTION_KEY || env.ENCRYPTION_KEY.length < 32) {
    errors.push('ENCRYPTION_KEY is missing or too short. Must be at least 32 bytes (base64 or hex encoded).');
  }

  if (!env.DATABASE_URL) {
    errors.push('DATABASE_URL is missing. Set your production database connection string.');
  }

  const stripeMode = stripeKeyMode(env.STRIPE_SECRET_KEY);
  if (beta) {
    if (stripeMode === 'missing' || stripeMode === 'invalid') {
      errors.push('STRIPE_SECRET_KEY is missing or invalid. Use sk_test_ (beta) or sk_live_ key.');
    } else if (stripeMode === 'live') {
      warnings.push('STRIPE_SECRET_KEY is a live key during closed beta. sk_test_ keys are recommended.');
    }

    if (!env.STRIPE_WEBHOOK_SECRET) {
      warnings.push('STRIPE_WEBHOOK_SECRET is missing. Webhook verification will not work until configured.');
    }

    if (!env.STRIPE_PRICE_GROWTH) {
      warnings.push('STRIPE_PRICE_GROWTH is missing. Growth plan checkout may not work.');
    }

    if (!env.STRIPE_PRICE_STARTER) {
      warnings.push('STRIPE_PRICE_STARTER is missing. Starter plan checkout may not work.');
    }

    if (!env.STRIPE_PRICE_GROWTH_MANAGED) {
      warnings.push('STRIPE_PRICE_GROWTH_MANAGED is missing. Growth Managed checkout uses inline price_data until set.');
    }

    if (env.GOOGLE_CALLBACK_URL) {
      if (env.GOOGLE_CALLBACK_URL.includes('ngrok') || !env.GOOGLE_CALLBACK_URL.startsWith('https://')) {
        errors.push('GOOGLE_CALLBACK_URL must be an HTTPS production URL (ngrok tunnels are not allowed).');
      }
    } else {
      warnings.push('GOOGLE_CALLBACK_URL is not set. Google OAuth sign-in will not work.');
    }
  } else {
    if (stripeMode !== 'live') {
      errors.push('STRIPE_SECRET_KEY is missing or not a live key (must start with sk_live_). Ensure you are using live Stripe credentials.');
    }

    if (!env.STRIPE_WEBHOOK_SECRET) {
      errors.push('STRIPE_WEBHOOK_SECRET is missing. Create a webhook endpoint in Stripe Dashboard and set this value.');
    }

    if (!env.STRIPE_PRICE_GROWTH) {
      errors.push('STRIPE_PRICE_GROWTH is missing. Set the live price ID for the Growth plan (e.g., price_2B3C4D...). Find this in your Stripe Dashboard.');
    }

    if (!env.STRIPE_PRICE_STARTER) {
      warnings.push('STRIPE_PRICE_STARTER is missing. Recommended for Starter plan checkout.');
    }

    if (!env.STRIPE_PRICE_GROWTH_MANAGED) {
      warnings.push('STRIPE_PRICE_GROWTH_MANAGED is missing. Recommended for Growth Managed checkout.');
    }

    if (!env.GOOGLE_CALLBACK_URL || env.GOOGLE_CALLBACK_URL.includes('ngrok')) {
      errors.push('GOOGLE_CALLBACK_URL is missing or still using ngrok tunnel. Set it to your production URL (e.g., https://sitesprintz.com/auth/google/callback).');
    }
  }

  if (!env.SERVER_IP) {
    warnings.push('SERVER_IP is not set. Custom domain DNS instructions may not display correctly. Set to your production server IP.');
  }

  if (!env.RESEND_API_KEY) {
    warnings.push('RESEND_API_KEY is not set. Email notifications will not work. Set up Resend or another email provider.');
  }

  if (!env.RESEND_FROM_EMAIL) {
    warnings.push('RESEND_FROM_EMAIL is not set. Set to a verified sender email for Resend.');
  }

  return { errors, warnings };
}

function validateEnv() {
  const env = process.env;
  const { errors, warnings } = collectEnvIssues(env);

  if (errors.length > 0 || warnings.length > 0) {
    console.error('\n❌ ENVIRONMENT CONFIGURATION ISSUES:\n');

    if (errors.length > 0) {
      console.error('🚨 BLOCKING ERRORS (must fix before launch):\n');
      errors.forEach((err, idx) => {
        console.error(`  ${idx + 1}. ${err}\n`);
      });
    }

    if (warnings.length > 0) {
      console.warn('\n⚠️  WARNINGS (recommended to address):\n');
      warnings.forEach((warn, idx) => {
        console.warn(`  ${idx + 1}. ${warn}\n`);
      });
    }

    if (env.NODE_ENV === 'production' && errors.length > 0) {
      console.error('\n❌ Production startup blocked due to missing critical configuration.\n');
      console.error('Fix the above errors and try again.\n');
      process.exit(1);
    }
  }
}

function logBootSummary() {
  const env = process.env;
  const beta = isBetaMode(env);

  console.log('\n🚀 BOOT SUMMARY:\n');
  console.log('Environment Configuration:');
  console.log(`  NODE_ENV:                ${env.NODE_ENV || 'development'}`);
  console.log(`  BETA_MODE:               ${beta ? 'enabled' : 'disabled'}`);
  console.log(`  JWT_SECRET:              ${env.JWT_SECRET ? '✓ Set' : '✗ Missing'}`);
  console.log(`  ADMIN_TOKEN:             ${env.ADMIN_TOKEN ? '✓ Set' : '✗ Missing'}`);
  console.log(`  ENCRYPTION_KEY:          ${env.ENCRYPTION_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log(`  DATABASE_URL:            ${env.DATABASE_URL ? '✓ Set' : '✗ Missing'}`);

  console.log('\nPayment Processing:');
  const mode = stripeKeyMode(env.STRIPE_SECRET_KEY);
  const stripeLabel = mode === 'live' ? 'LIVE' : mode === 'test' ? 'TEST' : 'NOT CONFIGURED';
  console.log(`  Stripe Mode:             ${stripeLabel}`);
  console.log(`  STRIPE_SECRET_KEY:       ${env.STRIPE_SECRET_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log(`  STRIPE_WEBHOOK_SECRET:   ${env.STRIPE_WEBHOOK_SECRET ? '✓ Set' : '✗ Missing'}`);
  console.log(`  STRIPE_PRICE_STARTER:    ${env.STRIPE_PRICE_STARTER ? '✓ Set' : '✗ Missing'}`);
  console.log(`  STRIPE_PRICE_GROWTH:     ${env.STRIPE_PRICE_GROWTH ? '✓ Set' : '✗ Missing'}`);
  console.log(`  STRIPE_PRICE_GROWTH_MANAGED: ${env.STRIPE_PRICE_GROWTH_MANAGED ? '✓ Set' : '✗ Missing'}`);

  console.log('\nAuthentication & Authorization:');
  console.log(`  GOOGLE_CALLBACK_URL:     ${env.GOOGLE_CALLBACK_URL ? '✓ Set' : '✗ Missing'}`);

  console.log('\nEmail & Communications:');
  console.log(`  RESEND_API_KEY:          ${env.RESEND_API_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log(`  RESEND_FROM_EMAIL:       ${env.RESEND_FROM_EMAIL ? '✓ Set' : '✗ Missing'}`);

  console.log('\n');
}

export {
  validateEnv,
  logBootSummary
};
