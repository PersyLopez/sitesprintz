import dotenv from 'dotenv';
import { sendEmail } from './email-service-smtp.js';

dotenv.config();

async function testEmail() {
  console.log('');
  console.log('🧪 Testing Outlook Email Configuration...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  
  // Check configuration
  console.log('📋 Configuration:');
  console.log(`   SMTP Host: ${process.env.SMTP_HOST || '(not set)'}`);
  console.log(`   SMTP Port: ${process.env.SMTP_PORT || '(not set)'}`);
  console.log(`   SMTP User: ${process.env.SMTP_USER || '(not set)'}`);
  console.log(`   SMTP Pass: ${process.env.SMTP_PASS ? '****** (set)' : '(not set)'}`);
  console.log(`   From Email: ${process.env.FROM_EMAIL || '(not set)'}`);
  console.log(`   From Name: ${process.env.FROM_NAME || 'SiteSprintz'}`);
  console.log('');
  
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('❌ Error: SMTP_USER and SMTP_PASS must be set in .env file');
    console.log('');
    console.log('💡 Add these to your .env file:');
    console.log('   SMTP_HOST=smtp-mail.outlook.com');
    console.log('   SMTP_PORT=587');
    console.log('   SMTP_SECURE=false');
    console.log('   SMTP_USER=your-email@outlook.com');
    console.log('   SMTP_PASS=your-app-password');
    console.log('   FROM_EMAIL=your-email@outlook.com');
    console.log('   FROM_NAME=SiteSprintz');
    console.log('');
    process.exit(1);
  }
  
  // Ask for test email
  const testEmailAddress = process.argv[2] || process.env.SMTP_USER;
  
  console.log(`📧 Sending test email to: ${testEmailAddress}`);
  console.log('');
  
  // Test 1: Welcome Email
  console.log('Test 1: Sending welcome email...');
  const result1 = await sendEmail(
    testEmailAddress,
    'welcome',
    { email: testEmailAddress }
  );
  
  if (result1.success) {
    console.log('✅ Welcome email sent successfully!');
  } else {
    console.log('❌ Welcome email failed:', result1.error);
  }
  console.log('');
  
  // Wait a second
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 2: Order Confirmation
  console.log('Test 2: Sending order confirmation email...');
  const result2 = await sendEmail(
    testEmailAddress,
    'orderConfirmation',
    {
      customerName: 'Test Customer',
      orderId: 'TEST-001',
      items: [
        { name: 'Test Pizza', quantity: 2, price: 12.99 },
        { name: 'Test Salad', quantity: 1, price: 8.99 }
      ],
      total: 34.97,
      currency: 'usd',
      businessName: 'Test Restaurant'
    }
  );
  
  if (result2.success) {
    console.log('✅ Order confirmation sent successfully!');
  } else {
    console.log('❌ Order confirmation failed:', result2.error);
  }
  console.log('');
  
  // Wait a second
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 3: New Order Alert
  console.log('Test 3: Sending new order alert email...');
  const result3 = await sendEmail(
    testEmailAddress,
    'newOrderAlert',
    {
      businessName: 'Test Restaurant',
      orderId: 'TEST-002',
      customerName: 'John Smith',
      customerEmail: 'john@example.com',
      customerPhone: '+1 (555) 123-4567',
      items: [
        { name: 'Margherita Pizza', quantity: 1, price: 14.99 },
        { name: 'Caesar Salad', quantity: 1, price: 9.99 }
      ],
      total: 24.98,
      currency: 'usd',
      siteId: 'test-site'
    }
  );
  
  if (result3.success) {
    console.log('✅ New order alert sent successfully!');
  } else {
    console.log('❌ New order alert failed:', result3.error);
  }
  console.log('');
  
  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Test Summary:');
  console.log('');
  
  const allSuccess = result1.success && result2.success && result3.success;
  
  if (allSuccess) {
    console.log('✅ All tests passed!');
    console.log('');
    console.log('📬 Check your inbox at:', testEmailAddress);
    console.log('   (Check spam folder if you don\'t see the emails)');
    console.log('');
    console.log('🎉 Your Outlook email is configured correctly!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Update server.js to use email-service-smtp.js');
    console.log('2. Restart your server');
    console.log('3. Place a test order to verify real emails work');
  } else {
    console.log('❌ Some tests failed. Common issues:');
    console.log('');
    console.log('1. Wrong password:');
    console.log('   → Use App Password, not regular password');
    console.log('   → Create at: https://account.microsoft.com/security');
    console.log('');
    console.log('2. 2FA/MFA enabled:');
    console.log('   → App Password is required');
    console.log('   → Regular password won\'t work');
    console.log('');
    console.log('3. Port blocked:');
    console.log('   → Try port 25 instead of 587');
    console.log('   → Check firewall settings');
    console.log('');
    console.log('4. Wrong SMTP host:');
    console.log('   → Outlook.com: smtp-mail.outlook.com');
    console.log('   → Microsoft 365: smtp.office365.com');
  }
  console.log('');
}

testEmail().catch(error => {
  console.error('');
  console.error('❌ Test failed with error:');
  console.error(error);
  console.error('');
  process.exit(1);
});

