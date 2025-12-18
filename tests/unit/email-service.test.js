
import { describe, it, expect, beforeEach, vi } from 'vitest';
// Remove static import of sendEmail to allow module reset
import { EmailTypes } from '../../email-service.js';

// Mock Resend
vi.mock('resend', () => {
    // Use a proper function so it can be called with 'new'
    const ResendMock = vi.fn(function () {
        this.emails = {
            send: vi.fn()
        };
    });
    return { Resend: ResendMock };
});

describe('Email Service', () => {
    let mockSend;
    let sendEmail;

    beforeEach(async () => {
        vi.clearAllMocks();
        vi.resetModules();
        process.env.RESEND_API_KEY = 'test_api_key';

        // access the mock
        const { Resend } = await import('resend');
        // Ensure we can spy on the instance created by the implementation
        // But since the implementation creates its own instance locally, we rely on the mock class return

        // We need to capture the instance created inside the module, OR validly mock the class such that ANY instance has the spy.
        // The previous mock definition was creating a new object on every call, which is fine, but we need to grab the *spy* from it?
        // Actually, simpler: mock the prototype or just reuse a shared spy for simplicity in verification.

        // Shared spy strategy:
        const mockSendFn = vi.fn();
        Resend.mockImplementation(function () {
            return {
                emails: { send: mockSendFn }
            };
        });
        mockSend = mockSendFn;

        // Dynamically import the service under test to ensure fresh state (and lazy init triggers)
        const module = await import('../../email-service.js');
        sendEmail = module.sendEmail;
    });

    it('should skip Resend init if API key missing', async () => {
        delete process.env.RESEND_API_KEY;
        // We need to re-import again because beforeEach already imported it with API_KEY set
        vi.resetModules();
        const { sendEmail: freshSend } = await import('../../email-service.js');

        // It should warn and return error or handles gracefully
        const result = await freshSend('to@test.com', 'welcome', {});
        // Implementation logs warning and returns error object
        expect(result.success).toBe(false);
        expect(result.error).toBe('Email service not configured');
    });

    it('should send welcome email successfully', async () => {
        // Setup success response
        mockSend.mockResolvedValue({ data: { id: 'email_123' }, error: null });

        const result = await sendEmail('test@example.com', EmailTypes.WELCOME, { email: 'test@example.com' });

        expect(result.success).toBe(true);
        expect(result.messageId).toBe('email_123');
        expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
            to: ['test@example.com'],
            subject: expect.stringContaining('Welcome'),
            from: expect.any(String)
        }));
    });

    it('should handle API errors gracefully', async () => {
        mockSend.mockResolvedValue({ data: null, error: { message: 'API Error' } });

        const result = await sendEmail('test@example.com', EmailTypes.WELCOME, { email: 'test@example.com' });

        expect(result.success).toBe(false);
        expect(result.error).toBe('API Error');
    });

    it('should fail for unknown template', async () => {
        const result = await sendEmail('test@example.com', 'UNKNOWN_TEMPLATE', {});
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/Unknown email template/);
    });
});
