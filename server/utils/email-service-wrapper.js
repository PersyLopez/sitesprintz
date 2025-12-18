/**
 * Email Service Wrapper
 * 
 * This module exports the appropriate email service based on environment.
 * In test mode, it uses the mock service to avoid rate limits.
 */

let emailService;

if (process.env.NODE_ENV === 'test' || process.env.USE_MOCK_EMAIL === 'true') {
    console.log('📧 Using MOCK email service for tests');
    const mockModule = await import('../../tests/mocks/email-service-mock.js');
    emailService = mockModule.default;
} else {
    const realModule = await import('../../email-service.js');
    emailService = realModule;
}

export const sendEmail = emailService.sendEmail || emailService.default?.sendEmail;
export const EmailTypes = emailService.EmailTypes;
export const sendAdminNotification = emailService.sendAdminNotification;

export default emailService;
