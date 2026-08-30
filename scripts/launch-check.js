#!/usr/bin/env node
/**
 * Pre-launch verification script
 * Run: npm run launch:check
 * Exits 1 on blocking issues, 0 when ready (or warnings only)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const errors = [];
const warnings = [];
const passed = [];

function check(name, ok, message, severity = 'error') {
  if (ok) {
    passed.push(name);
    return;
  }
  if (severity === 'warning') {
    warnings.push(`${name}: ${message}`);
  } else {
    errors.push(`${name}: ${message}`);
  }
}

function fileExists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(root, relPath), 'utf8'));
}

// --- File structure ---
check('dist build', fileExists('dist/index.html'), 'Run npm run build:prod before deploy');
check('prisma schema', fileExists('prisma/schema.prisma'), 'Missing prisma/schema.prisma');
check('railway.json', fileExists('railway.json'), 'Missing railway.json deploy config');
check('Dockerfile', fileExists('Dockerfile'), 'Missing Dockerfile');
check('Procfile', fileExists('Procfile'), 'Missing Procfile');

// --- Package scripts ---
const pkg = readJson('package.json');
check('start script', typeof pkg.scripts?.start === 'string', 'Missing npm start script');
check('build:prod script', typeof pkg.scripts?.['build:prod'] === 'string', 'Missing build:prod script');
check('db:migrate script', typeof pkg.scripts?.['db:migrate'] === 'string', 'Missing db:migrate script');

// --- Prisma models required for commerce/booking ---
const schema = fs.readFileSync(path.join(root, 'prisma/schema.prisma'), 'utf8');
check('orders model', schema.includes('model orders'), 'orders model missing from schema');
check('order_items model', schema.includes('model order_items'), 'order_items model missing from schema');
check('webhook_events model', schema.includes('model webhook_events'), 'webhook_events model missing from schema');
check('plan_features model', schema.includes('model plan_features'), 'plan_features model missing from schema');
check('appointments model', schema.includes('model appointments'), 'appointments model missing from schema');

// --- Health endpoint alignment (Railway) ---
const railway = fileExists('railway.json') ? readJson('railway.json') : {};
const healthPath = railway.deploy?.healthcheck?.path || railway.healthcheck?.path;
check(
  'railway health path',
  healthPath === '/api/health',
  `Expected /api/health, got ${healthPath || 'none'}`,
  healthPath ? 'error' : 'warning'
);

const serverJs = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
check(
  'api health route',
  serverJs.includes("app.use('/api/health'"),
  'server.js must mount health routes at /api/health'
);

// --- Webhook pipeline ---
const webhooks = fs.readFileSync(path.join(root, 'server/routes/webhooks.routes.js'), 'utf8');
check(
  'webhook processor',
  webhooks.includes('WebhookProcessor'),
  'Webhooks must route through WebhookProcessor'
);

// --- Admin API routes ---
const adminRoutes = fs.readFileSync(path.join(root, 'server/routes/admin.routes.js'), 'utf8');
check(
  'admin status route',
  adminRoutes.includes("'/users/:userId/status'"),
  'PATCH /admin/users/:userId/status route missing'
);
check(
  'admin role route',
  adminRoutes.includes("'/users/:userId/role'"),
  'PATCH /admin/users/:userId/role route missing'
);
check(
  'admin resend-invite route',
  adminRoutes.includes("'/users/:userId/resend-invite'"),
  'POST /admin/users/:userId/resend-invite route missing'
);
check(
  'admin reset-password route',
  adminRoutes.includes("'/users/:userId/reset-password'"),
  'POST /admin/users/:userId/reset-password route missing'
);

// --- Order state machine ---
const orderStateMachine = fileExists('server/services/orderStateMachine.js');
check(
  'order state machine',
  orderStateMachine,
  'server/services/orderStateMachine.js not found - required for order status validation'
);

// --- Booking availability ---
const bookingService = fs.readFileSync(path.join(root, 'server/services/bookingService.js'), 'utf8');
check(
  'AvailabilityServiceV2',
  bookingService.includes('AvailabilityServiceV2'),
  'Booking service must use AvailabilityServiceV2 for timezone support'
);

// --- Environment (production only) ---
const env = process.env;
const isProd = env.NODE_ENV === 'production';

if (isProd) {
  check('JWT_SECRET', env.JWT_SECRET && env.JWT_SECRET !== 'dev-secret-key-change-in-production', 'Set a strong JWT_SECRET');
  check('ADMIN_TOKEN', env.ADMIN_TOKEN && env.ADMIN_TOKEN !== 'dev-token', 'Set a strong ADMIN_TOKEN');
  check('ENCRYPTION_KEY', env.ENCRYPTION_KEY && env.ENCRYPTION_KEY.length >= 32, 'Set ENCRYPTION_KEY (32+ chars)');
  check('DATABASE_URL', !!env.DATABASE_URL, 'Set DATABASE_URL');
  check('STRIPE_SECRET_KEY', env.STRIPE_SECRET_KEY?.startsWith('sk_live_'), 'Use live Stripe key (sk_live_)');
  check('STRIPE_WEBHOOK_SECRET', !!env.STRIPE_WEBHOOK_SECRET, 'Set STRIPE_WEBHOOK_SECRET');
  check('STRIPE_PRICE_GROWTH', !!env.STRIPE_PRICE_GROWTH, 'Set STRIPE_PRICE_GROWTH');
  check(
    'STRIPE_PRICE_STARTER',
    !!env.STRIPE_PRICE_STARTER,
    'Set STRIPE_PRICE_STARTER',
    'warning'
  );
  check(
    'STRIPE_PRICE_GROWTH_MANAGED',
    !!env.STRIPE_PRICE_GROWTH_MANAGED,
    'Set STRIPE_PRICE_GROWTH_MANAGED',
    'warning'
  );
} else {
  check('DATABASE_URL', !!env.DATABASE_URL, 'DATABASE_URL not set (required for runtime)', 'warning');
  check('JWT_SECRET', !!env.JWT_SECRET, 'JWT_SECRET not set in .env', 'warning');
}

if (!env.RESEND_API_KEY && !env.SMTP_USER) {
  warnings.push('Email: No RESEND_API_KEY or SMTP_USER — transactional email may not work');
}

// --- Report ---
console.log('\n🚀 SiteSprintz Launch Check\n');
console.log(`✅ Passed: ${passed.length}`);
if (warnings.length) {
  console.log(`⚠️  Warnings: ${warnings.length}`);
  warnings.forEach((w, i) => console.log(`   ${i + 1}. ${w}`));
}
if (errors.length) {
  console.log(`❌ Blocking: ${errors.length}`);
  errors.forEach((e, i) => console.log(`   ${i + 1}. ${e}`));
  console.log('\nFix blocking issues before production deploy.\n');
  process.exit(1);
}

console.log('\n✅ Launch check passed' + (warnings.length ? ' (with warnings)' : '') + '.\n');
process.exit(0);
