import express from 'express';

const router = express.Router();

/**
 * Terms of Service
 */
router.get('/terms', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terms of Service - SiteSprintz</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        h1 {
            color: #2563eb;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 10px;
        }
        h2 {
            color: #1e40af;
            margin-top: 30px;
        }
        .last-updated {
            color: #666;
            font-style: italic;
            margin-bottom: 30px;
        }
        .highlight {
            background-color: #fef3c7;
            padding: 15px;
            border-left: 4px solid #f59e0b;
            margin: 20px 0;
        }
        footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #666;
        }
    </style>
</head>
<body>
    <h1>Terms of Service</h1>
    <p class="last-updated">Last Updated: November 14, 2025</p>
    
    <div class="highlight">
        <strong>🚨 BETA NOTICE:</strong> SiteSprintz is currently in beta. While we strive for high availability and quality,
        the service is provided "AS-IS" with no uptime guarantee during this period. By using the service, you accept this risk.
    </div>

    <h2>1. Acceptance of Terms</h2>
    <p>
        By accessing and using SiteSprintz ("Service"), you accept and agree to be bound by the terms and provision of this agreement.
        If you do not agree to these Terms of Service, please do not use the Service.
    </p>

    <h2>2. Description of Service</h2>
    <p>
        SiteSprintz provides a website building platform that enables users to create, customize, and publish websites
        using our templates and tools. The Service includes hosting, templates, customization tools, and related features.
    </p>

    <h2>3. User Accounts</h2>
    <p>
        <strong>3.1 Registration:</strong> You must create an account to use certain features. You agree to provide accurate,
        current, and complete information during registration.
    </p>
    <p>
        <strong>3.2 Security:</strong> You are responsible for maintaining the confidentiality of your account credentials
        and for all activities that occur under your account.
    </p>
    <p>
        <strong>3.3 Account Termination:</strong> We reserve the right to suspend or terminate your account if you violate
        these Terms or engage in fraudulent or illegal activities.
    </p>

    <h2>4. Service Availability</h2>
    <p>
        <strong>4.1 Beta Period:</strong> During beta, we make no guarantees about service availability or uptime.
        We may experience downtime for maintenance, updates, or unforeseen technical issues.
    </p>
    <p>
        <strong>4.2 No Warranty:</strong> The Service is provided "AS-IS" without warranties of any kind, either express or implied,
        including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement.
    </p>

    <h2>5. User Content</h2>
    <p>
        <strong>5.1 Ownership:</strong> You retain all rights to content you create and publish using the Service ("User Content").
    </p>
    <p>
        <strong>5.2 License:</strong> By using the Service, you grant us a non-exclusive, worldwide, royalty-free license to
        host, store, and display your User Content solely for the purpose of providing the Service.
    </p>
    <p>
        <strong>5.3 Prohibited Content:</strong> You may not upload or publish content that:
    </p>
    <ul>
        <li>Violates any law or regulation</li>
        <li>Infringes intellectual property rights</li>
        <li>Contains malware, viruses, or malicious code</li>
        <li>Is defamatory, obscene, or harassing</li>
        <li>Promotes illegal activities</li>
    </ul>

    <h2>6. Payment Terms</h2>
    <p>
        <strong>6.1 Free Trial:</strong> We offer a 14-day free trial. No credit card is required during the trial period.
    </p>
    <p>
        <strong>6.2 Subscriptions:</strong> After the trial, continued use requires a paid subscription. You will be charged
        according to your chosen plan (Starter, Pro, or Premium).
    </p>
    <p>
        <strong>6.3 Billing:</strong> Subscriptions are billed monthly in advance. Payments are processed via Stripe.
    </p>
    <p>
        <strong>6.4 Cancellation:</strong> You may cancel your subscription at any time. Cancellation takes effect at the end
        of the current billing period. No refunds for partial months.
    </p>
    <p>
        <strong>6.5 Refunds:</strong> We offer a 30-day money-back guarantee for your first payment only. To request a refund,
        contact support@sitesprintz.com within 30 days of your first charge.
    </p>

    <h2>7. Limitation of Liability</h2>
    <p>
        <strong>7.1 No Liability for Damages:</strong> To the maximum extent permitted by law, SiteSprintz shall not be liable for
        any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data,
        use, goodwill, or other intangible losses.
    </p>
    <p>
        <strong>7.2 Maximum Liability:</strong> In no event shall our total liability exceed the amount you paid us in the
        12 months preceding the claim.
    </p>
    <p>
        <strong>7.3 Business Losses:</strong> We are not responsible for any business losses, including but not limited to
        lost revenue, lost sales, or lost customers resulting from service downtime or malfunctions.
    </p>

    <h2>8. Acceptable Use</h2>
    <p>You agree not to:</p>
    <ul>
        <li>Use the Service for any illegal purpose</li>
        <li>Attempt to gain unauthorized access to our systems</li>
        <li>Interfere with or disrupt the Service</li>
        <li>Upload malware or malicious code</li>
        <li>Violate any applicable laws or regulations</li>
        <li>Impersonate others or misrepresent your affiliation</li>
        <li>Scrape or harvest data from the Service</li>
        <li>Resell or redistribute the Service without permission</li>
    </ul>

    <h2>9. Intellectual Property</h2>
    <p>
        The Service, including its original content, features, and functionality, is owned by SiteSprintz and is protected by
        international copyright, trademark, patent, trade secret, and other intellectual property laws.
    </p>

    <h2>10. Privacy</h2>
    <p>
        Your use of the Service is also governed by our <a href="/legal/privacy">Privacy Policy</a>.
        Please review our Privacy Policy to understand our practices.
    </p>

    <h2>11. Modifications to Terms</h2>
    <p>
        We reserve the right to modify these Terms at any time. We will notify users of any material changes via email or
        through the Service. Your continued use of the Service after changes constitutes acceptance of the new Terms.
    </p>

    <h2>12. Dispute Resolution</h2>
    <p>
        <strong>12.1 Governing Law:</strong> These Terms shall be governed by the laws of the State of New Jersey, United States,
        without regard to its conflict of law provisions.
    </p>
    <p>
        <strong>12.2 Arbitration:</strong> Any disputes arising from these Terms or use of the Service shall be resolved through
        binding arbitration rather than in court, except that either party may seek injunctive relief in court.
    </p>

    <h2>13. Contact Information</h2>
    <p>
        For questions about these Terms, please contact us at:<br>
        Email: support@sitesprintz.com<br>
        Status Page: <a href="https://status.sitesprintz.com">status.sitesprintz.com</a>
    </p>

    <footer>
        <p>&copy; 2025 SiteSprintz. All rights reserved.</p>
        <p>
            <a href="/legal/privacy">Privacy Policy</a> |
            <a href="/legal/cookies">Cookie Policy</a> |
            <a href="/legal/refunds">Refund Policy</a>
        </p>
    </footer>
</body>
</html>
  `);
});

/**
 * Privacy Policy
 */
router.get('/privacy', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policy - SiteSprintz</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
        h2 { color: #1e40af; margin-top: 30px; }
        .last-updated { color: #666; font-style: italic; margin-bottom: 30px; }
        .highlight {
            background-color: #dbeafe;
            padding: 15px;
            border-left: 4px solid #2563eb;
            margin: 20px 0;
        }
        footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #666;
        }
    </style>
</head>
<body>
    <h1>Privacy Policy</h1>
    <p class="last-updated">Last Updated: November 14, 2025</p>
    
    <div class="highlight">
        <strong>📋 Summary:</strong> We collect only what we need to provide the Service. We don't sell your data.
        You can request data deletion or export at any time.
    </div>

    <h2>1. Information We Collect</h2>
    
    <h3>1.1 Account Information</h3>
    <ul>
        <li><strong>Email address:</strong> For account creation, login, and communication</li>
        <li><strong>Password:</strong> Stored as a secure hash (we never see your actual password)</li>
        <li><strong>Google OAuth data:</strong> If you sign up with Google (Google ID, profile picture, email)</li>
        <li><strong>Payment information:</strong> Processed and stored by Stripe (we don't store credit card numbers)</li>
    </ul>

    <h3>1.2 Website Content</h3>
    <ul>
        <li><strong>Site data:</strong> All content you create on your websites (text, images, layouts)</li>
        <li><strong>Templates:</strong> Which templates you use</li>
        <li><strong>Published sites:</strong> URLs and published content</li>
    </ul>

    <h3>1.3 Form Submissions</h3>
    <ul>
        <li><strong>Visitor data:</strong> Name, email, phone, messages submitted through your contact forms</li>
        <li><strong>Metadata:</strong> IP address, browser information (user agent) for spam prevention</li>
    </ul>

    <h3>1.4 Analytics Data</h3>
    <ul>
        <li><strong>Page views:</strong> Which pages are visited on your sites</li>
        <li><strong>Visitor information:</strong> IP addresses, browser type, device type</li>
        <li><strong>Referrers:</strong> Where visitors come from</li>
        <li><strong>Session data:</strong> Anonymous session IDs for tracking visits</li>
    </ul>

    <h2>2. How We Use Your Information</h2>
    <ul>
        <li><strong>Provide the Service:</strong> To create, host, and display your websites</li>
        <li><strong>Authentication:</strong> To log you in and verify your identity</li>
        <li><strong>Payment Processing:</strong> To process subscriptions via Stripe</li>
        <li><strong>Customer Support:</strong> To respond to your questions and issues</li>
        <li><strong>Service Improvements:</strong> To understand how people use the Service and improve it</li>
        <li><strong>Communication:</strong> To send service updates, trial expiration warnings, and important notices</li>
        <li><strong>Security:</strong> To prevent fraud, abuse, and unauthorized access</li>
    </ul>

    <h2>3. Third-Party Services</h2>
    <p>We use trusted third-party services to provide the Service:</p>
    
    <ul>
        <li><strong>Stripe:</strong> Payment processing (<a href="https://stripe.com/privacy">Privacy Policy</a>)</li>
        <li><strong>Resend:</strong> Email delivery (<a href="https://resend.com/legal/privacy">Privacy Policy</a>)</li>
        <li><strong>Google OAuth:</strong> Optional login method (<a href="https://policies.google.com/privacy">Privacy Policy</a>)</li>
        <li><strong>Neon/PostgreSQL:</strong> Database hosting (data encrypted at rest)</li>
    </ul>
    
    <p><strong>We do not sell your data to third parties.</strong></p>

    <h2>4. Data Storage and Security</h2>
    <ul>
        <li><strong>Encryption:</strong> Data is encrypted in transit (HTTPS/TLS) and at rest</li>
        <li><strong>Password Security:</strong> Passwords are hashed with bcrypt (industry standard)</li>
        <li><strong>Access Control:</strong> Limited access to data (only authorized personnel)</li>
        <li><strong>Regular Backups:</strong> Daily automated backups for data recovery</li>
    </ul>

    <h2>5. Your Rights (GDPR/CCPA)</h2>
    
    <h3>5.1 Access Your Data</h3>
    <p>Click "Export My Data" in your dashboard to download all your data as JSON.</p>
    
    <h3>5.2 Delete Your Data</h3>
    <p>Click "Delete Account" in your dashboard to permanently delete all your data.</p>
    
    <h3>5.3 Correct Your Data</h3>
    <p>You can edit your account information and site content at any time through the dashboard.</p>
    
    <h3>5.4 Opt-Out of Marketing</h3>
    <p>Click "unsubscribe" in any marketing email or contact support@sitesprintz.com.</p>
    
    <h3>5.5 Do Not Sell My Personal Information (CCPA)</h3>
    <p><strong>We do not sell your personal information.</strong> Ever.</p>

    <h2>6. Cookies and Tracking</h2>
    <ul>
        <li><strong>Session Cookies:</strong> Required for login and authentication</li>
        <li><strong>Analytics Cookies:</strong> To understand how you use the Service (optional)</li>
    </ul>
    <p>See our <a href="/legal/cookies">Cookie Policy</a> for details.</p>

    <h2>7. Data Retention</h2>
    <ul>
        <li><strong>Active Accounts:</strong> Data retained as long as your account is active</li>
        <li><strong>Deleted Accounts:</strong> Data permanently deleted within 30 days</li>
        <li><strong>Backups:</strong> Backup copies deleted within 90 days of account deletion</li>
        <li><strong>Legal Requirements:</strong> Some data may be retained longer if required by law</li>
    </ul>

    <h2>8. Children's Privacy</h2>
    <p>
        The Service is not intended for children under 13. We do not knowingly collect data from children under 13.
        If you believe a child has provided us with data, please contact us at support@sitesprintz.com.
    </p>

    <h2>9. International Users</h2>
    <p>
        Your data is stored in the United States. By using the Service, you consent to the transfer of your data to
        the United States, which may have different data protection laws than your country.
    </p>

    <h2>10. Changes to Privacy Policy</h2>
    <p>
        We may update this Privacy Policy from time to time. We will notify you of material changes via email or
        through the Service. Continued use after changes constitutes acceptance.
    </p>

    <h2>11. Data Breach Notification</h2>
    <p>
        In the event of a data breach that may affect your personal information, we will notify you within 72 hours
        (as required by GDPR) and take immediate steps to secure the Service.
    </p>

    <h2>12. Contact Us</h2>
    <p>
        For privacy questions or to exercise your rights:<br>
        Email: privacy@sitesprintz.com<br>
        Support: support@sitesprintz.com
    </p>

    <footer>
        <p>&copy; 2025 SiteSprintz. All rights reserved.</p>
        <p>
            <a href="/legal/terms">Terms of Service</a> |
            <a href="/legal/cookies">Cookie Policy</a> |
            <a href="/legal/refunds">Refund Policy</a>
        </p>
    </footer>
</body>
</html>
  `);
});

/**
 * Cookie Policy
 */
router.get('/cookies', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cookie Policy - SiteSprintz</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
        h2 { color: #1e40af; margin-top: 30px; }
        .last-updated { color: #666; font-style: italic; margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
        th { background-color: #f3f4f6; font-weight: 600; }
        footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #666;
        }
    </style>
</head>
<body>
    <h1>Cookie Policy</h1>
    <p class="last-updated">Last Updated: November 14, 2025</p>
    
    <h2>What Are Cookies?</h2>
    <p>
        Cookies are small text files stored on your device when you visit a website. They help websites remember information
        about your visit, making your experience more convenient and the Service more useful.
    </p>

    <h2>Cookies We Use</h2>
    <table>
        <tr>
            <th>Cookie Name</th>
            <th>Purpose</th>
            <th>Type</th>
            <th>Duration</th>
        </tr>
        <tr>
            <td>connect.sid</td>
            <td>Session authentication (keeps you logged in)</td>
            <td>Essential</td>
            <td>7 days</td>
        </tr>
        <tr>
            <td>jwt</td>
            <td>Authentication token</td>
            <td>Essential</td>
            <td>24 hours</td>
        </tr>
        <tr>
            <td>csrf_token</td>
            <td>Security (prevents CSRF attacks)</td>
            <td>Essential</td>
            <td>Session</td>
        </tr>
    </table>

    <h2>Cookie Categories</h2>
    
    <h3>Essential Cookies (Required)</h3>
    <p>
        These cookies are necessary for the Service to function. They enable core functionality like authentication,
        security, and basic operations. You cannot opt out of these cookies.
    </p>

    <h3>Analytics Cookies (Optional)</h3>
    <p>
        We may use analytics cookies in the future to understand how visitors use the Service. These would be optional
        and you could opt out. Currently, we do not use third-party analytics cookies.
    </p>

    <h2>How to Control Cookies</h2>
    
    <h3>Browser Settings</h3>
    <p>Most browsers allow you to:</p>
    <ul>
        <li>View and delete cookies</li>
        <li>Block third-party cookies</li>
        <li>Block all cookies (will prevent login)</li>
        <li>Clear cookies when you close the browser</li>
    </ul>

    <h3>Browser Instructions</h3>
    <ul>
        <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies and other site data</li>
        <li><strong>Firefox:</strong> Options → Privacy & Security → Cookies and Site Data</li>
        <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
        <li><strong>Edge:</strong> Settings → Cookies and site permissions</li>
    </ul>

    <p><strong>Note:</strong> Blocking essential cookies will prevent you from logging in and using the Service.</p>

    <h2>Do Not Track</h2>
    <p>
        Some browsers include a "Do Not Track" feature. We respect this signal and will not track you for marketing
        purposes if this is enabled.
    </p>

    <h2>Updates to This Policy</h2>
    <p>
        We may update this Cookie Policy to reflect changes in our practices or for legal reasons. Check this page
        periodically for updates.
    </p>

    <h2>Contact Us</h2>
    <p>
        Questions about our use of cookies?<br>
        Email: support@sitesprintz.com
    </p>

    <footer>
        <p>&copy; 2025 SiteSprintz. All rights reserved.</p>
        <p>
            <a href="/legal/terms">Terms of Service</a> |
            <a href="/legal/privacy">Privacy Policy</a> |
            <a href="/legal/refunds">Refund Policy</a>
        </p>
    </footer>
</body>
</html>
  `);
});

/**
 * Refund Policy
 */
router.get('/refunds', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Refund & Cancellation Policy - SiteSprintz</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
        h2 { color: #1e40af; margin-top: 30px; }
        .last-updated { color: #666; font-style: italic; margin-bottom: 30px; }
        .highlight {
            background-color: #d1fae5;
            padding: 15px;
            border-left: 4px solid #10b981;
            margin: 20px 0;
        }
        footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #666;
        }
    </style>
</head>
<body>
    <h1>Refund & Cancellation Policy</h1>
    <p class="last-updated">Last Updated: November 14, 2025</p>
    
    <div class="highlight">
        <strong>✅ 30-Day Money-Back Guarantee:</strong> Try SiteSprintz risk-free. If you're not satisfied within
        your first 30 days, we'll refund your first payment, no questions asked.
    </div>

    <h2>1. Free Trial</h2>
    <ul>
        <li><strong>Duration:</strong> 14 days</li>
        <li><strong>Features:</strong> Full access to Starter tier features</li>
        <li><strong>No Credit Card Required:</strong> Start for free, add payment later</li>
        <li><strong>Trial Expiration:</strong> Sites become view-only after trial ends (can reactivate by subscribing)</li>
    </ul>

    <h2>2. Subscriptions</h2>
    <ul>
        <li><strong>Billing:</strong> Monthly, charged on the same day each month</li>
        <li><strong>Plans:</strong> Starter ($15/mo), Pro ($45/mo), Premium ($100/mo)</li>
        <li><strong>Auto-Renewal:</strong> Subscriptions renew automatically unless canceled</li>
        <li><strong>Currency:</strong> All prices in USD</li>
    </ul>

    <h2>3. Refund Policy</h2>
    
    <h3>3.1 First Payment (30-Day Money-Back)</h3>
    <p>
        <strong>We offer a 30-day money-back guarantee on your first payment.</strong>
    </p>
    <ul>
        <li>Request a refund within 30 days of your first charge</li>
        <li>Full refund, no questions asked</li>
        <li>Refunds processed within 5-7 business days</li>
        <li>To request: Email support@sitesprintz.com with subject "Refund Request"</li>
    </ul>

    <h3>3.2 Subsequent Payments</h3>
    <p>
        Payments after the first month are <strong>non-refundable</strong>, but you can cancel anytime to avoid future charges.
    </p>

    <h3>3.3 Partial Month Refunds</h3>
    <p>
        We do not offer pro-rated refunds for partial months. When you cancel, you retain access until the end of
        your current billing period.
    </p>

    <h2>4. Cancellation Policy</h2>
    
    <h3>4.1 How to Cancel</h3>
    <p><strong>Option 1:</strong> Self-service (Dashboard → Settings → Billing → Cancel Subscription)</p>
    <p><strong>Option 2:</strong> Email support@sitesprintz.com with subject "Cancel Subscription"</p>

    <h3>4.2 When Cancellation Takes Effect</h3>
    <ul>
        <li>Cancellation takes effect at the end of your current billing period</li>
        <li>You retain full access until that date</li>
        <li>No additional charges after cancellation</li>
        <li>Example: Cancel on Jan 15, subscription ends Jan 31 (if that's your billing date)</li>
    </ul>

    <h3>4.3 After Cancellation</h3>
    <ul>
        <li>Your sites will become view-only (can't edit)</li>
        <li>Published sites remain accessible for 30 days</li>
        <li>After 30 days, unpaid sites will be unpublished</li>
        <li>You can reactivate anytime by subscribing again</li>
    </ul>

    <h2>5. Upgrades and Downgrades</h2>
    
    <h3>5.1 Upgrading (Starter → Pro → Premium)</h3>
    <ul>
        <li>Takes effect immediately</li>
        <li>Pro-rated credit applied for unused time on lower plan</li>
        <li>Charged the difference immediately</li>
        <li>Next billing date remains the same</li>
    </ul>

    <h3>5.2 Downgrading (Premium → Pro → Starter)</h3>
    <ul>
        <li>Takes effect at the end of current billing period</li>
        <li>No pro-rated refund for unused premium features</li>
        <li>Features downgraded to new plan level</li>
        <li>You keep access to premium features until billing period ends</li>
    </ul>

    <h2>6. Failed Payments</h2>
    
    <h3>6.1 Payment Failures</h3>
    <ul>
        <li>If payment fails, we'll retry 3 times over 7 days</li>
        <li>You'll receive email notifications before each retry</li>
        <li>Update payment method in Dashboard → Settings → Billing</li>
    </ul>

    <h3>6.2 After Failed Payments</h3>
    <ul>
        <li>If all retries fail, subscription is canceled</li>
        <li>Sites become view-only immediately</li>
        <li>Published sites remain live for 7 days (grace period)</li>
        <li>After 7 days, sites are unpublished</li>
    </ul>

    <h2>7. Disputes and Chargebacks</h2>
    <p>
        <strong>Please contact us before filing a dispute or chargeback.</strong> We're happy to resolve any issues directly.
    </p>
    <ul>
        <li>Chargebacks may result in immediate account suspension</li>
        <li>We reserve the right to dispute invalid chargebacks</li>
        <li>Contact: support@sitesprintz.com</li>
    </ul>

    <h2>8. Account Deletion</h2>
    <ul>
        <li>You can delete your account at any time: Dashboard → Settings → Delete Account</li>
        <li>Deleting your account:
            <ul>
                <li>Cancels active subscriptions (no refund for current period)</li>
                <li>Permanently deletes all your data (sites, content, submissions)</li>
                <li>Cannot be undone</li>
            </ul>
        </li>
        <li>For GDPR data deletion: support@sitesprintz.com</li>
    </ul>

    <h2>9. Service Termination</h2>
    <p>
        We reserve the right to suspend or terminate your account if you:
    </p>
    <ul>
        <li>Violate our Terms of Service</li>
        <li>Engage in fraudulent activity</li>
        <li>Upload illegal or harmful content</li>
        <li>Abuse the Service or our support team</li>
    </ul>
    <p>
        In case of termination for violations, no refunds will be issued.
    </p>

    <h2>10. Price Changes</h2>
    <ul>
        <li>We may change our pricing at any time</li>
        <li>Existing customers: Prices locked in (grandfathered)</li>
        <li>You keep your current price as long as you remain subscribed</li>
        <li>If you cancel and later re-subscribe, new pricing applies</li>
    </ul>

    <h2>11. Contact Us</h2>
    <p>
        Questions about billing, refunds, or cancellations?<br>
        Email: support@sitesprintz.com<br>
        Response time: Within 24 hours (usually faster)
    </p>

    <footer>
        <p>&copy; 2025 SiteSprintz. All rights reserved.</p>
        <p>
            <a href="/legal/terms">Terms of Service</a> |
            <a href="/legal/privacy">Privacy Policy</a> |
            <a href="/legal/cookies">Cookie Policy</a>
        </p>
    </footer>
</body>
</html>
  `);
});

export default router;

