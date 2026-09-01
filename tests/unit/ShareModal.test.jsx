import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ShareModal from '@/components/ShareModal';

function spyAnchorClicks() {
  const clicks = [];
  const origCreate = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tag, options) => {
    const el = origCreate(tag, options);
    if (String(tag).toLowerCase() === 'a') {
      const origClick = el.click.bind(el);
      el.click = () => {
        clicks.push({ href: el.getAttribute('href'), download: el.download });
        origClick();
      };
    }
    return el;
  });
  return clicks;
}

describe('ShareModal', () => {
  const PUBLIC_SITE_URL = 'https://rightsitelight.com/view/river-salon';
  const LOCAL_VIEW_URL = 'http://localhost:3000/view/river-salon';

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

  it('uses the public live URL as the share target, not the API origin', () => {
    render(<ShareModal subdomain="river-salon" onClose={() => {}} />);

    expect(screen.getByDisplayValue(PUBLIC_SITE_URL)).toBeInTheDocument();
    expect(screen.queryByDisplayValue(LOCAL_VIEW_URL)).not.toBeInTheDocument();
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
    expect(opened).toContain(PUBLIC_SITE_URL);
    expect(opened).toContain('Check out my site');
  });

  it('copies the site URL for Instagram and TikTok', async () => {
    render(<ShareModal subdomain="river-salon" onClose={() => {}} />);

    fireEvent.click(screen.getByTestId('share-instagram'));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        PUBLIC_SITE_URL
      );
    });
    expect(screen.getByTestId('share-copy-hint')).toHaveTextContent(/Instagram/i);

    fireEvent.click(screen.getByTestId('share-tiktok'));
    await waitFor(() => {
      expect(screen.getByTestId('share-copy-hint')).toHaveTextContent(/TikTok/i);
    });
  });

  it('downloads a QR PNG from the share API', async () => {
    const downloads = spyAnchorClicks();
    render(<ShareModal subdomain="river-salon" onClose={() => {}} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/share/river-salon/qr');
    });
    await waitFor(() => {
      expect(screen.getByTestId('share-qr-preview')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('share-download-qr'));
    await waitFor(() => {
      expect(downloads.some((item) => item.download === 'river-salon-qr.png')).toBe(true);
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
    expect(screen.getByDisplayValue(PUBLIC_SITE_URL)).toBeInTheDocument();
  });

  it('downloads the print flyer from square or story, never social', async () => {
    const downloads = spyAnchorClicks();
    render(<ShareModal subdomain="river-salon" onClose={() => {}} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/share/river-salon/square');
    });
    await waitFor(() => {
      expect(screen.getByAltText('Print flyer preview')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('share-download-flyer'));
    await waitFor(() => {
      expect(downloads.some((item) => item.download === 'river-salon-flyer-square.png')).toBe(true);
    });
    expect(downloads.some((item) => item.download.includes('social'))).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Story 1080 by 1920' }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/share/river-salon/story');
    });
    await waitFor(() => {
      expect(screen.getByAltText('Print flyer preview')).toBeInTheDocument();
    });
    downloads.length = 0;
    fireEvent.click(screen.getByTestId('share-download-flyer'));
    await waitFor(() => {
      expect(downloads.some((item) => item.download === 'river-salon-flyer-story.png')).toBe(true);
    });
    expect(downloads.some((item) => item.download.includes('social'))).toBe(false);
  });

  it('does not wait for analytics before the flyer download click', async () => {
    let resolveTrack;
    const hungTrack = new Promise((resolve) => {
      resolveTrack = resolve;
    });
    global.fetch = vi.fn((url) => {
      if (String(url).includes('/api/analytics/conversion')) {
        return hungTrack;
      }
      return Promise.resolve({
        ok: true,
        blob: async () => new Blob(['png'], { type: 'image/png' }),
      });
    });
    const downloads = spyAnchorClicks();
    render(<ShareModal subdomain="river-salon" onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByAltText('Print flyer preview')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('share-download-flyer'));
    await waitFor(() => {
      expect(downloads.some((item) => item.download === 'river-salon-flyer-square.png')).toBe(true);
    });
    expect(typeof resolveTrack).toBe('function');
    resolveTrack({ ok: true, json: async () => ({ success: true }) });
  });

  it('opens this app /view/ for the owner visit, not the public share host', () => {
    render(<ShareModal subdomain="river-salon" onClose={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /View live share page/i }));

    expect(window.open).toHaveBeenCalledWith(`${LOCAL_VIEW_URL}?share=true`, '_blank');
  });
});
