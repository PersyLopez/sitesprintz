/**
 * Tests for PreviewFrame.jsx — TDD red-green cycles
 *
 * Seams tested (component behavior):
 *   1. Renders without crash when siteData is empty
 *   2. Renders without crash when siteData has sections
 *   3. Uses layoutRenderer composePage() to get sections and tokens
 *   4. Falls back to inline HTML rendering if composePage() throws
 *   5. Uses tokens for colors when available
 *   6. Has data-testid="preview-frame" on main container
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PreviewFrame from '../../src/components/setup/PreviewFrame';

// Mock useSite hook
let mockSiteData = null;
let mockPreviewKey = 'test-key-1';
vi.mock('../../src/hooks/useSite', () => ({
  useSite: () => ({
    siteData: mockSiteData,
    previewKey: mockPreviewKey,
  }),
}));

// Mock layoutRenderer composePage
const mockComposePage = vi.fn();
vi.mock('../../src/utils/layoutRenderer', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    composePage: (...args) => mockComposePage(...args),
  };
});

// Mock sectionHtmlBridge
const mockRenderSectionToHtml = vi.fn(
  (section, _tokens) => `<div class="mock-${section.type}">Mock HTML for ${section.type}</div>`
);
vi.mock('../../src/utils/sectionHtmlBridge', () => ({
  renderSectionToHtml: (...args) => mockRenderSectionToHtml(...args),
}));

// Mock CSS import
vi.mock('../../src/components/setup/PreviewFrame.css', () => ({}));

describe('PreviewFrame', () => {
  beforeEach(() => {
    mockSiteData = null;
    mockPreviewKey = 'test-key-1';
    mockComposePage.mockReset();
    mockRenderSectionToHtml.mockClear();
    mockComposePage.mockReturnValue({
      layout: 'atelier',
      character: 'refined',
      level: 'solo',
      tokens: {
        theme: {
          bg: '#0c0c0e',
          text: '#f4f2ee',
          accent: '#c2683a',
          muted: '#8a8a8f',
          surface: '#141417',
          hairline: 'rgba(244,242,238,.10)',
        },
      },
      features: {},
      sections: [
        {
          type: 'hero',
          content: { title: 'Welcome', subtitle: 'Sub' },
          settings: {},
          accent: '#c2683a',
        },
      ],
      paymentMethods: [],
    });
  });

  it('renders without crash when siteData is null', () => {
    mockSiteData = null;
    const { container } = render(<PreviewFrame />);
    expect(container.querySelector('[data-testid="preview-frame"]')).toBeTruthy();
  });

  it('renders without crash when siteData has sections', async () => {
    mockSiteData = {
      businessName: 'Test Business',
      category: 'restaurant',
      colors: { primary: '#c2683a', background: '#0c0c0e', text: '#f4f2ee' },
      sections: [
        { type: 'hero', content: { title: 'Welcome' }, settings: {} },
      ],
    };

    render(<PreviewFrame />);
    expect(screen.getByTestId('preview-frame')).toBeTruthy();
  });

  it('calls composePage with siteData', async () => {
    mockSiteData = {
      businessName: 'Test Business',
      category: 'restaurant',
      colors: { primary: '#c2683a' },
      sections: [],
    };

    render(<PreviewFrame />);
    await waitFor(() => {
      expect(mockComposePage).toHaveBeenCalled();
    });
  });

  it('has data-testid="preview-frame" on the main container', () => {
    mockSiteData = { businessName: 'Test', category: 'service' };
    render(<PreviewFrame />);
    expect(screen.getByTestId('preview-frame')).toBeTruthy();
  });

  it('uses PreviewFrame.css class family without a fixed 700px iframe', () => {
    mockSiteData = { businessName: 'Test', category: 'service' };
    const { container } = render(<PreviewFrame />);
    const root = screen.getByTestId('preview-frame');
    expect(root.classList.contains('preview-frame-container')).toBe(true);
    const iframe = container.querySelector('iframe');
    expect(iframe.classList.contains('preview-iframe')).toBe(true);
    expect(iframe.style.height).not.toBe('700px');
  });

  it('renders device mode toggle buttons', () => {
    mockSiteData = { businessName: 'Test', category: 'service' };
    render(<PreviewFrame />);
    expect(screen.getByTestId('device-desktop')).toBeTruthy();
    expect(screen.getByTestId('device-tablet')).toBeTruthy();
    expect(screen.getByTestId('device-mobile')).toBeTruthy();
  });

  it('renders zoom controls', () => {
    mockSiteData = { businessName: 'Test', category: 'service' };
    render(<PreviewFrame />);
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('falls back to inline HTML rendering if composePage throws', async () => {
    // Make composePage throw to test fallback
    mockComposePage.mockImplementation(() => {
      throw new Error('composePage failed');
    });

    mockSiteData = {
      businessName: 'Fallback Business',
      category: 'restaurant',
      colors: { primary: '#ff0000', background: '#000000', text: '#ffffff' },
      businessTagline: 'Best food in town',
      sections: [
        { type: 'hero', content: { title: 'Fallback Hero' }, settings: {} },
      ],
    };

    const { container } = render(<PreviewFrame />);
    expect(container.querySelector('[data-testid="preview-frame"]')).toBeTruthy();
    // Should still render the iframe even when composePage fails
    expect(container.querySelector('iframe')).toBeTruthy();
  });

  it('handles empty siteData gracefully', () => {
    mockSiteData = {};
    const { container } = render(<PreviewFrame />);
    expect(container.querySelector('[data-testid="preview-frame"]')).toBeTruthy();
  });
});
