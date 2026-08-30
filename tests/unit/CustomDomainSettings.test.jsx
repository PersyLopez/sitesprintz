import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustomDomainSettings from '../../src/components/dashboard/CustomDomainSettings';

vi.mock('../../src/hooks/useToast', () => ({
  useToast: () => ({ showSuccess: vi.fn() }),
}));

vi.mock('../../src/components/common/Modal', () => ({
  Modal: ({ isOpen, children, title }) => (isOpen ? <div role="dialog" aria-label={title}>{children}</div> : null),
}));

vi.mock('../../src/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

import api from '../../src/services/api';

describe('CustomDomainSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ hasDomain: false });
  });

  it('shows the connect form on starter without a growth wall', async () => {
    render(<CustomDomainSettings subdomain="maria-stand" />);
    expect(await screen.findByTestId('custom-domain-settings')).toBeInTheDocument();
    expect(screen.getByTestId('custom-domain-input')).toBeInTheDocument();
    expect(screen.queryByText(/growth plan required/i)).not.toBeInTheDocument();
    expect(screen.getByText(/available on every plan/i)).toBeInTheDocument();
  });

  it('saves a domain and shows DNS instructions from the API payload', async () => {
    api.post.mockResolvedValue({
      hasDomain: true,
      domain: 'my-shop.com',
      status: 'pending',
      message: 'Custom domain added successfully',
      instructions: {
        cname: { host: 'www', value: 'maria-stand.rightsitelight.com' },
        aRecord: { host: '@', value: '1.2.3.4' },
        note: 'Add both records.',
      },
    });
    render(<CustomDomainSettings subdomain="maria-stand" />);
    await screen.findByTestId('custom-domain-input');
    await userEvent.type(screen.getByTestId('custom-domain-input'), 'my-shop.com');
    await userEvent.click(screen.getByTestId('custom-domain-add'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/sites/maria-stand/domain', { domain: 'my-shop.com' });
    });
    expect(await screen.findByTestId('custom-domain-status')).toBeInTheDocument();
    expect(screen.getByText('my-shop.com')).toBeInTheDocument();
    expect(screen.getByTestId('custom-domain-dns')).toHaveTextContent('maria-stand.rightsitelight.com');
  });

  it('shows existing domain status from GET without wrapping data.data', async () => {
    api.get.mockResolvedValue({
      hasDomain: true,
      domain: 'bakery.test',
      status: 'verified',
      verified: true,
      instructions: {
        cname: { host: 'www', value: 'bakery.rightsitelight.com' },
        aRecord: { host: '@', value: '9.9.9.9' },
      },
    });
    render(<CustomDomainSettings subdomain="bakery" />);
    expect(await screen.findByTestId('custom-domain-status-value')).toHaveTextContent('verified');
    expect(screen.queryByTestId('custom-domain-input')).not.toBeInTheDocument();
  });

  it('verifies DNS and shows the verified status', async () => {
    api.get.mockResolvedValue({
      hasDomain: true,
      domain: 'bakery.test',
      status: 'pending',
      verified: false,
      instructions: {
        cname: { host: 'www', value: 'bakery.rightsitelight.com' },
        aRecord: { host: '@', value: '9.9.9.9' },
      },
    });
    api.post.mockResolvedValue({
      verified: true,
      status: 'verified',
      domain: 'bakery.test',
      cnameVerified: true,
    });
    render(<CustomDomainSettings subdomain="bakery" />);
    await userEvent.click(await screen.findByTestId('custom-domain-verify'));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/sites/bakery/domain/verify', {});
    });
    expect(await screen.findByTestId('custom-domain-status-value')).toHaveTextContent('verified');
    expect(screen.getByTestId('custom-domain-success')).toHaveTextContent(/verified/i);
  });

  it('removes a connected domain after confirm', async () => {
    api.get.mockResolvedValue({
      hasDomain: true,
      domain: 'bakery.test',
      status: 'pending',
      instructions: {
        cname: { host: 'www', value: 'bakery.rightsitelight.com' },
        aRecord: { host: '@', value: '9.9.9.9' },
      },
    });
    api.delete.mockResolvedValue({ hasDomain: false, success: true });
    render(<CustomDomainSettings subdomain="bakery" />);
    await userEvent.click(await screen.findByTestId('custom-domain-remove'));
    await userEvent.click(await screen.findByTestId('custom-domain-remove-confirm'));
    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/api/sites/bakery/domain');
    });
    expect(await screen.findByTestId('custom-domain-input')).toBeInTheDocument();
  });
});
