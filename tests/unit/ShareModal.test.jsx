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

  it('shows a QR download control and inline QR preview', async () => {
    render(<ShareModal subdomain="river-salon" onClose={() => {}} />);

    expect(screen.getByTestId('share-download-qr')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('share-qr-preview')).toBeInTheDocument();
    });
  });

  it('shows card preview when generated', async () => {
    render(<ShareModal subdomain="river-salon" onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByTestId('share-card-preview')).toBeInTheDocument();
      expect(screen.getByAltText('Share card preview')).toBeInTheDocument();
    });
    expect(document.querySelector('.share-preview-frame--og')).toBeTruthy();
    expect(document.querySelector('.share-preview-frame--flyer')).toBeTruthy();
  });

  it('uses the production site URL as the share target', () => {
    render(<ShareModal subdomain="river-salon" onClose={() => {}} />);

    expect(screen.getByDisplayValue('http://localhost:3000/view/river-salon')).toBeInTheDocument();
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
    expect(opened).toContain('http://localhost:3000/view/river-salon');
    expect(opened).toContain('Check out my site');
  });

  it('copies the site URL for Instagram and TikTok', async () => {
    render(<ShareModal subdomain="river-salon" onClose={() => {}} />);

    fireEvent.click(screen.getByTestId('share-instagram'));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'http://localhost:3000/view/river-salon'
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

  it('labels two jobs: social media and print flyer', () => {
    render(<ShareModal subdomain="river-salon" onClose={() => {}} />);

    expect(screen.getByTestId('share-job-social')).toHaveTextContent('Social media');
    expect(screen.getByTestId('share-job-social-goal')).toHaveTextContent(
      /photo of your shop and tap through/i
    );
    expect(screen.getByTestId('share-job-print')).toHaveTextContent('Print flyer');
    expect(screen.getByTestId('share-job-print-goal')).toHaveTextContent(/Tape this up or hand it out/i);
  });

  it('previews social cards from /social and hides the view URL on the QR caption', async () => {
    render(<ShareModal subdomain="river-salon" onClose={() => {}} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/share/river-salon/social');
    });
    expect(screen.getByTestId('share-qr-block')).not.toHaveTextContent('/view/river-salon');
    expect(screen.getByDisplayValue('http://localhost:3000/view/river-salon')).toBeInTheDocument();
  });

  it('downloads the print flyer from square or story, never social', async () => {
    render(<ShareModal subdomain="river-salon" onClose={() => {}} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/share/river-salon/square');
    });
    global.fetch.mockClear();

    fireEvent.click(screen.getByTestId('share-download-flyer'));
    await waitFor(() => {
      const urls = global.fetch.mock.calls.map((call) => call[0]);
      expect(urls).toContain('/api/share/river-salon/square');
      expect(urls).not.toContain('/api/share/river-salon/social');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Story 1080 by 1920' }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/share/river-salon/story');
    });
    global.fetch.mockClear();
    fireEvent.click(screen.getByTestId('share-download-flyer'));
    await waitFor(() => {
      const urls = global.fetch.mock.calls.map((call) => call[0]);
      expect(urls).toContain('/api/share/river-salon/story');
      expect(urls).not.toContain('/api/share/river-salon/social');
    });
  });
});
