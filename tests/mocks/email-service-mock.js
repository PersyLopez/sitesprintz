/**
 * Mock Email Service for Tests
 * 
 * This mock replaces the real email service during tests to:
 * - Avoid hitting rate limits
 * - Speed up tests
 * - Avoid sending real emails
 */

export class MockEmailService {
    constructor() {
        this.sentEmails = [];
        this.sendEmail = this.sendEmail.bind(this);
        this.sendWelcomeEmail = this.sendWelcomeEmail.bind(this);
        this.sendPasswordResetEmail = this.sendPasswordResetEmail.bind(this);
        this.sendContactFormEmail = this.sendContactFormEmail.bind(this);
        this.sendBookingConfirmation = this.sendBookingConfirmation.bind(this);
        this.getLastEmail = this.getLastEmail.bind(this);
        this.sendAdminNotification = this.sendAdminNotification.bind(this);
    }

    async sendEmail({ to, subject, html, text }) {
        console.log(`[MOCK EMAIL] To: ${to}, Subject: ${subject}`);

        this.sentEmails.push({
            to,
            subject,
            html,
            text,
            timestamp: new Date()
        });

        return {
            success: true,
            messageId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };
    }

    async sendWelcomeEmail(email, name) {
        return this.sendEmail({
            to: email,
            subject: 'Welcome to SiteSprintz',
            html: `<p>Welcome ${name}!</p>`,
            text: `Welcome ${name}!`
        });
    }

    async sendPasswordResetEmail(email, resetToken) {
        return this.sendEmail({
            to: email,
            subject: 'Password Reset Request',
            html: `<p>Reset token: ${resetToken}</p>`,
            text: `Reset token: ${resetToken}`
        });
    }

    async sendContactFormEmail(formData) {
        return this.sendEmail({
            to: 'admin@example.com',
            subject: `Contact Form: ${formData.subject || 'New Message'}`,
            html: `<p>From: ${formData.email}</p><p>${formData.message}</p>`,
            text: `From: ${formData.email}\n\n${formData.message}`
        });
    }

    async sendBookingConfirmation(booking) {
        return this.sendEmail({
            to: booking.customerEmail,
            subject: 'Booking Confirmation',
            html: `<p>Your booking is confirmed for ${booking.date}</p>`,
            text: `Your booking is confirmed for ${booking.date}`
        });
    }

    getSentEmails() {
        return this.sentEmails;
    }

    clearSentEmails() {
        this.sentEmails = [];
    }

    getLastEmail() {
        return this.sentEmails[this.sentEmails.length - 1];
    }

    async sendAdminNotification(templateName, templateData = {}) {
        console.log(`[MOCK ADMIN EMAIL] Template: ${templateName}`, templateData);
        return this.sendEmail({
            to: 'admin@example.com',
            subject: `[Admin] ${templateName}`,
            html: JSON.stringify(templateData),
            text: JSON.stringify(templateData)
        });
    }
}

const mockService = new MockEmailService();

// Available email types (copied from email-service.js)
mockService.EmailTypes = {
    WELCOME: 'welcome',
    INVITATION: 'invitation',
    PASSWORD_RESET: 'passwordReset',
    SITE_PUBLISHED: 'sitePublished',
    SITE_UPDATED: 'siteUpdated',
    TRIAL_EXPIRING_SOON: 'trialExpiringSoon',
    TRIAL_EXPIRED: 'trialExpired',
    CONTACT_FORM_SUBMISSION: 'contactFormSubmission',
    ORDER_CONFIRMATION: 'orderConfirmation',
    NEW_ORDER_ALERT: 'newOrderAlert',
    // Admin notifications
    ADMIN_NEW_USER: 'adminNewUser',
    ADMIN_NEW_SITE: 'adminNewSite',
    ADMIN_SITE_PUBLISHED: 'adminSitePublished',
    ADMIN_PRO_UPGRADE: 'adminProUpgrade'
};

export default mockService;
