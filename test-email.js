// Test script to verify Gmail configuration
const nodemailer = require('nodemailer');

async function testEmail() {
    console.log('🧪 Testing Gmail Configuration...\n');
    
    // Check environment variables
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const adminEmail = process.env.ADMIN_EMAIL;
    
    console.log('📧 Email Configuration:');
    console.log(`   EMAIL_USER: ${emailUser ? '✅ Set' : '❌ Missing'}`);
    console.log(`   EMAIL_PASS: ${emailPass ? '✅ Set' : '❌ Missing'}`);
    console.log(`   ADMIN_EMAIL: ${adminEmail ? '✅ Set' : '❌ Missing'}\n`);
    
    if (!emailUser || !emailPass) {
        console.log('❌ Missing email credentials!');
        console.log('Please set EMAIL_USER and EMAIL_PASS environment variables.');
        return;
    }
    
    try {
        // Create transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: emailUser,
                pass: emailPass
            }
        });
        
        console.log('🔧 Testing Gmail connection...');
        
        // Verify connection
        await transporter.verify();
        console.log('✅ Gmail connection successful!\n');
        
        // Send test email
        console.log('📤 Sending test email...');
        const testEmail = {
            from: emailUser,
            to: adminEmail || emailUser,
            subject: '🧪 Fix&Go Email Test',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #28a745;">✅ Email System Test Successful!</h2>
                    <p>This is a test email from the Fix&Go Mobile Tire Service system.</p>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>Configuration Details</h3>
                        <p><strong>From:</strong> ${emailUser}</p>
                        <p><strong>To:</strong> ${adminEmail || emailUser}</p>
                        <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
                    </div>
                    <p>If you received this email, your Gmail configuration is working correctly!</p>
                </div>
            `
        };
        
        const result = await transporter.sendMail(testEmail);
        console.log('✅ Test email sent successfully!');
        console.log(`   Message ID: ${result.messageId}`);
        console.log(`   Sent to: ${adminEmail || emailUser}\n`);
        
        console.log('🎉 Email system is ready for production!');
        
    } catch (error) {
        console.log('❌ Email test failed:');
        console.log(`   Error: ${error.message}\n`);
        
        if (error.message.includes('Invalid login')) {
            console.log('💡 Common fixes:');
            console.log('   1. Make sure 2-Factor Authentication is enabled');
            console.log('   2. Use App Password (not regular password)');
            console.log('   3. Check EMAIL_USER and EMAIL_PASS are correct');
        }
    }
}

// Run the test
testEmail();
