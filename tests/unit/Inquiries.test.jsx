import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Inquiries from '../../src/pages/Inquiries';
import { inquiryKindLabel, contactLeadPhrase, contactLeadSubject } from '../../src/utils/inquiryKind.js';

vi.mock('../../src/context/SiteWorkspaceContext', () => ({
  useSiteWorkspace: () => ({
    embedded: true,
    site: { subdomain: 'oak-barber' },
    refreshUnreadMessages: vi.fn(),
  }),
}));

vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => ({ loading: false }),
}));

vi.mock('../../src/hooks/useToast', () => ({
  useToast: () => ({ showError: vi.fn() }),
}));

vi.mock('../../src/services/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({
      submissions: [
        {
          id: '1',
          name: 'Ada',
          email: 'ada@example.com',
          message: 'Do you serve 07030?',
          type: 'zip-check',
          status: 'unread',
          submittedAt: '2026-10-20T12:00:00.000Z',
        },
        {
          id: '2',
          name: 'Bea',
          email: 'bea@example.com',
          message: 'Hello',
          type: 'contact',
          status: 'read',
          submittedAt: '2026-10-20T12:00:00.000Z',
        },
      ],
    }),
  },
}));

describe('inquiry kind label', () => {
  it('names a shop tool and leaves a plain contact unlabeled', () => {
    expect(inquiryKindLabel('zip-check')).toBe('ZIP check');
    expect(inquiryKindLabel('package-quote')).toBe('Package quote');
    expect(inquiryKindLabel('diagnostic-quote')).toBe('Estimate');
    expect(inquiryKindLabel('contact')).toBe('');
    expect(inquiryKindLabel('')).toBe('');
    expect(inquiryKindLabel('service-request')).toBe('service request');
    expect(contactLeadSubject('zip-check', 'Oak Barber')).toBe('New ZIP check - Oak Barber');
    expect(contactLeadSubject('contact', 'Oak Barber')).toBe('New Contact Form Submission - Oak Barber');
    expect(contactLeadSubject('quote', 'Oak Barber')).toBe('New Quote Request Submission - Oak Barber');
    expect(contactLeadSubject('<b>', 'Oak Barber')).toBe('New Contact Form Submission - Oak Barber');
    expect(contactLeadPhrase('diagnostic-quote')).toBe('Estimate');
    expect(contactLeadPhrase('contact')).toBe('contact form submission');
  });

  it('shows the kind on the message row', async () => {
    render(<Inquiries />);
    expect(await screen.findByText('ZIP check')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByTestId('site-inquiry-kind')).toHaveLength(1);
    });
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
