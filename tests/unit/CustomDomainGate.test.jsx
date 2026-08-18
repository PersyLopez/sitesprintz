import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import CustomDomainGate from '../../src/components/published/CustomDomainGate';

vi.mock('../../src/pages/PublishedSiteViewer', () => ({
  default: ({ forcedSubdomain }) => <div data-testid="forced-site">{forcedSubdomain}</div>,
}));

describe('CustomDomainGate', () => {
  const originalHostname = window.location.hostname;

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders children on the platform host', () => {
    render(
      <CustomDomainGate>
        <div data-testid="app-children">landing</div>
      </CustomDomainGate>
    );
    expect(screen.getByTestId('app-children')).toHaveTextContent('landing');
  });

  it('renders the published site when lookup returns a subdomain', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, subdomain: 'maria-stand', domain: 'my-shop.com' }),
    }));
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { hostname: 'my-shop.com' },
    });

    render(
      <CustomDomainGate>
        <div data-testid="app-children">landing</div>
      </CustomDomainGate>
    );

    expect(await screen.findByTestId('forced-site')).toHaveTextContent('maria-stand');
    expect(screen.queryByTestId('app-children')).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith('/api/domain/lookup?host=my-shop.com');
  });

  it('does not show marketing pages for an unknown customer domain', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, error: 'Site not found' }),
    }));
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { hostname: 'unknown-shop.com' },
    });

    render(
      <CustomDomainGate>
        <div data-testid="app-children">landing</div>
      </CustomDomainGate>
    );

    expect(await screen.findByTestId('custom-domain-unknown')).toBeInTheDocument();
    expect(screen.queryByTestId('app-children')).not.toBeInTheDocument();
  });
});
