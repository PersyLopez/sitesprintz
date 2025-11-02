import dotenv from 'dotenv';
import { sendAdminNotification, EmailTypes } from './email-service.js';

dotenv.config();

console.log('\n═══════════════════════════════════════════════════');
console.log('  📧 TESTING ADMIN NOTIFICATIONS');
console.log('═══════════════════════════════════════════════════\n');

const adminEmail = process.env.ADMIN_EMAIL;
console.log(`Admin Email: ${adminEmail || '❌ NOT SET'}\n`);

if (!adminEmail) {
  console.log('❌ ADMIN_EMAIL not configured in .env');
  console.log('   Please add: ADMIN_EMAIL=your-email@example.com');
  process.exit(1);
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 1: New User Signup Notification');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const result = await sendAdminNotification(EmailTypes.ADMIN_NEW_USER, {
      userEmail: 'testuser@example.com',
      userName: 'Test User'
    });
    if (result.success) {
      console.log(`✅ PASSED - New user notification sent`);
      console.log(`   Message ID: ${result.messageId}\n`);
      passed++;
    } else {
      console.log(`❌ FAILED - ${result.error}\n`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ FAILED - ${error.message}\n`);
    failed++;
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 2: Site Published Notification');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const result = await sendAdminNotification(EmailTypes.ADMIN_SITE_PUBLISHED, {
      siteName: 'Test Restaurant',
      siteTemplate: 'restaurant',
      userName: 'Test User',
      userEmail: 'testuser@example.com',
      siteId: 'test-restaurant-123',
      plan: 'pro'
    });
    if (result.success) {
      console.log(`✅ PASSED - Site published notification sent`);
      console.log(`   Message ID: ${result.messageId}\n`);
      passed++;
    } else {
      console.log(`❌ FAILED - ${result.error}\n`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ FAILED - ${error.message}\n`);
    failed++;
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 3: Pro Upgrade Notification');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const result = await sendAdminNotification(EmailTypes.ADMIN_PRO_UPGRADE, {
      userName: 'Test User',
      userEmail: 'testuser@example.com',
      siteName: 'Test Restaurant',
      siteId: 'test-restaurant-123'
    });
    if (result.success) {
      console.log(`✅ PASSED - Pro upgrade notification sent`);
      console.log(`   Message ID: ${result.messageId}\n`);
      passed++;
    } else {
      console.log(`❌ FAILED - ${result.error}\n`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ FAILED - ${error.message}\n`);
    failed++;
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════\n');
  console.log(`✅ Passed: ${passed}/3`);
  console.log(`❌ Failed: ${failed}/3\n`);

  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED!\n');
    console.log(`📬 Check your inbox at: ${adminEmail}`);
    console.log('   You should have received 3 admin notification emails:\n');
    console.log('   1. 👤 New User Signup - testuser@example.com');
    console.log('   2. ✅ Site Published - Test Restaurant');
    console.log('   3. 💎 Pro Upgrade - Test Restaurant by Test User\n');
    console.log('✅ Your admin notification system is fully operational!');
  } else {
    console.log('⚠️ Some tests failed. Please review the errors above.');
  }
  
  console.log('\n═══════════════════════════════════════════════════\n');
}

runTests();

