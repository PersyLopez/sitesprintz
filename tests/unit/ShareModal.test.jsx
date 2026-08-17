import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ShareModal from '@/components/ShareModal';

describe('ShareModal', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['png'], { type: 'image/png' }),
    });
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-share');
    global.URL.revokeObjectURL = vi.fn();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows WhatsApp, Instagram, TikTok, and Facebook controls', () => {
    render(<ShareModal subdomain="river-salon" onClose={() => {}} />);

    expect(screen.getByTestId('share-whatsapp')).toBeInTheDocument();
    expect(screen.getByTestId('share-instagram')).toBeInTheDocument();
    expect(screen.getByTestId('share-tiktok')).toBeInTheDocument();
    expect(screen.getByTestId('share-facebook')).toBeInTheDocument();
  });

  it('shows a QR download control', () => {
    render(<ShareModal subdomain="river-salon" onClose={() => {}} />);

    expect(screen.getByTestId('share-download-qr')).toBeInTheDocument();
  });

  it('uses the production site URL as the share target', () => {
    render(<ShareModal subdomain="river-salon" onClose={() => {}} />);

    expect(screen.getByDisplayValue('https://river-salon.sitesprintz.com')).toBeInTheDocument();
  });

  it('opens WhatsApp with encoded site URL and text', () => {
    render(<ShareModal subdomain="river-salon" onClose={() => {}} />);

    fireEvent.click(screen.getByTestId('share-whatsapp'));

    expect(window.open).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/wa\.me\/\?text=/),
      '_blank',
      expect.any(String)
    );
    const opened = decodeURIComponent(window.open.mock.calls[0][0]);
    expect(opened).toContain('https://river-salon.sitesprintz.com');
    expect(opened).toContain('Check out my site');
  });

  it('copies the site URL for Instagram and TikTok', async () => {
    render(<ShareModal subdomain="river-salon" onClose={() => {}} />);

    fireEvent.click(screen.getByTestId('share-instagram'));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'https://river-salon.sitesprintz.com'
      );
    });
    expect(screen.getByTestId('share-copy-hint')).toHaveTextContent(/Instagram/i);

    fireEvent.click(screen.getByTestId('share-tiktok'));
    await waitFor(() => {
      expect(screen.getByTestId('share-copy-hint')).toHaveTextContent(/TikTok/i);
    });
  });

  it('downloads a QR PNG from the share API', async () => {
    render(<ShareModal subdomain="river-salon" onClose={() => {}} />);

    fireEvent.click(screen.getByTestId('share-download-qr'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/share/river-salon/qr');
    });
  });
});
