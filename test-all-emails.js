import dotenv from 'dotenv';
import { sendEmail, EmailTypes } from './email-service.js';

dotenv.config();

// CONFIGURATION
const TEST_EMAIL = 'persylopez9@gmail.com'; // ⚠️ CHANGE THIS TO YOUR EMAIL!

console.log('');
console.log('═══════════════════════════════════════════════════');
console.log('  📧 TESTING ALL EMAIL OPERATIONS');
console.log('═══════════════════════════════════════════════════');
console.log('');
console.log('Configuration:');
console.log(`  Resend API Key: ${process.env.RESEND_API_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`  From Email: ${process.env.FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'Not set'}`);
console.log(`  Test Email: ${TEST_EMAIL}`);
console.log('');

if (!process.env.RESEND_API_KEY) {
  console.log('❌ ERROR: RESEND_API_KEY not found in .env');
  console.log('💡 Add this line to your .env file:');
  console.log('   RESEND_API_KEY=re_QiNLZF3A_CXhzokn7pcaRgrviaqdnt1q2');
  process.exit(1);
}

if (TEST_EMAIL === 'YOUR_EMAIL@example.com') {
  console.log('❌ ERROR: Please update TEST_EMAIL in this file!');
  console.log('💡 Change line 6 to your actual email address.');
  process.exit(1);
}

console.log('Starting tests...');
console.log('');

async function runTests() {
  let passed = 0;
  let failed = 0;

  // Test 1: Welcome Email
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 1: Welcome Email (New User Signup)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const result = await sendEmail(TEST_EMAIL, 'welcome', {
      email: TEST_EMAIL
    });
    if (result.success) {
      console.log('✅ PASSED - Welcome email sent');
      console.log(`   Message ID: ${result.messageId}`);
      passed++;
    } else {
      console.log('❌ FAILED - ' + result.error);
      failed++;
    }
  } catch (error) {
    console.log('❌ FAILED - ' + error.message);
    failed++;
  }
  console.log('');
  await sleep(1000);

  // Test 2: Password Reset Email
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 2: Password Reset Email');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const result = await sendEmail(TEST_EMAIL, 'passwordReset', {
      email: TEST_EMAIL,
      resetToken: 'test-token-12345'
    });
    if (result.success) {
      console.log('✅ PASSED - Password reset email sent');
      console.log(`   Message ID: ${result.messageId}`);
      passed++;
    } else {
      console.log('❌ FAILED - ' + result.error);
      failed++;
    }
  } catch (error) {
    console.log('❌ FAILED - ' + error.message);
    failed++;
  }
  console.log('');
  await sleep(1000);

  // Test 3: Site Published Email
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 3: Site Published Notification');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const result = await sendEmail(TEST_EMAIL, 'sitePublished', {
      email: TEST_EMAIL,
      siteName: 'Test Restaurant',
      siteUrl: 'https://sitesprintz.com/sites/test-restaurant'
    });
    if (result.success) {
      console.log('✅ PASSED - Site published email sent');
      console.log(`   Message ID: ${result.messageId}`);
      passed++;
    } else {
      console.log('❌ FAILED - ' + result.error);
      failed++;
    }
  } catch (error) {
    console.log('❌ FAILED - ' + error.message);
    failed++;
  }
  console.log('');
  await sleep(1000);

  // Test 4: Order Confirmation (Customer Receipt)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 4: Order Confirmation (Customer Receipt)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const result = await sendEmail(TEST_EMAIL, 'orderConfirmation', {
      customerName: 'Test Customer',
      orderId: 'ORD-001',
      items: [
        { name: 'Margherita Pizza', quantity: 2, price: 12.99 },
        { name: 'Caesar Salad', quantity: 1, price: 8.99 }
      ],
      total: 34.97,
      currency: 'usd',
      businessName: 'Mario\'s Pizza'
    });
    if (result.success) {
      console.log('✅ PASSED - Order confirmation sent');
      console.log(`   Message ID: ${result.messageId}`);
      passed++;
    } else {
      console.log('❌ FAILED - ' + result.error);
      failed++;
    }
  } catch (error) {
    console.log('❌ FAILED - ' + error.message);
    failed++;
  }
  console.log('');
  await sleep(1000);

  // Test 5: New Order Alert (Business Owner)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 5: New Order Alert (Business Owner)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const result = await sendEmail(TEST_EMAIL, 'newOrderAlert', {
      businessName: 'Mario\'s Pizza',
      orderId: 'ORD-002',
      customerName: 'John Smith',
      customerEmail: 'john@example.com',
      customerPhone: '(555) 123-4567',
      items: [
        { name: 'Pepperoni Pizza', quantity: 1, price: 14.99 },
        { name: 'Garlic Bread', quantity: 1, price: 5.99 }
      ],
      total: 20.98,
      currency: 'usd',
      siteId: 'test-restaurant'
    });
    if (result.success) {
      console.log('✅ PASSED - Order alert sent');
      console.log(`   Message ID: ${result.messageId}`);
      passed++;
    } else {
      console.log('❌ FAILED - ' + result.error);
      failed++;
    }
  } catch (error) {
    console.log('❌ FAILED - ' + error.message);
    failed++;
  }
  console.log('');
  await sleep(1000);

  // Test 6: Contact Form Submission
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 6: Contact Form Submission');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const result = await sendEmail(TEST_EMAIL, 'contactFormSubmission', {
      businessName: 'Mario\'s Pizza',
      submitterName: 'Jane Doe',
      submitterEmail: 'jane@example.com',
      submitterPhone: '(555) 987-6543',
      message: 'Hi! I would like to know your opening hours. Thank you!',
      type: 'contact',
      siteUrl: 'https://sitesprintz.com/sites/test-restaurant',
      submissionTime: new Date().toLocaleString()
    });
    if (result.success) {
      console.log('✅ PASSED - Contact form email sent');
      console.log(`   Message ID: ${result.messageId}`);
      passed++;
    } else {
      console.log('❌ FAILED - ' + result.error);
      failed++;
    }
  } catch (error) {
    console.log('❌ FAILED - ' + error.message);
    failed++;
  }
  console.log('');

  // Summary
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  console.log(`✅ Passed: ${passed}/6`);
  console.log(`❌ Failed: ${failed}/6`);
  console.log('');

  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('');
    console.log('📬 Check your inbox at:', TEST_EMAIL);
    console.log('   You should have received 6 test emails.');
    console.log('');
    console.log('✅ Your email system is fully operational!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Check your inbox (and spam folder)');
    console.log('2. Verify all 6 emails arrived');
    console.log('3. Place a real test order to confirm end-to-end flow');
    console.log('');
  } else {
    console.log('⚠️  SOME TESTS FAILED');
    console.log('');
    console.log('Troubleshooting:');
    console.log('1. Check RESEND_API_KEY in .env is correct');
    console.log('2. Verify DNS records are active in Resend dashboard');
    console.log('3. Check FROM_EMAIL matches your verified domain');
    console.log('4. Review error messages above');
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════');
  console.log('');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

runTests().catch(error => {
  console.error('');
  console.error('❌ FATAL ERROR:', error);
  console.error('');
  process.exit(1);
});

