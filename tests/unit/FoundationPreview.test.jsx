/**
 * Foundation Preview Component Tests
 * 
 * Test suite for the live preview iframe component
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FoundationPreview from '../../src/components/dashboard/FoundationPreview';

describe('FoundationPreview Component', () => {
  let mockSite;
  let mockConfig;

  beforeEach(() => {
    mockSite = {
      id: 'site-123',
      name: 'Test Site',
      subdomain: 'testsite',
      status: 'published',
      plan: 'pro'
    };

    mockConfig = {
      trustSignals: {
        enabled: true,
        yearsInBusiness: 5
      },
      contactForm: {
        enabled: false
      },
      seo: {
        enabled: true
      }
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== RENDERING TESTS ====================
  describe('Component Rendering', () => {
    it('should render preview toolbar', () => {
      render(<FoundationPreview site={mockSite} config={mockConfig} />);
      
      expect(screen.getByText('Live Preview')).toBeInTheDocument();
    });

    it('should render device mode buttons', () => {
      render(<FoundationPreview site={mockSite} config={mockConfig} />);
      
      const buttons = screen.getAllByRole('button');
      const desktopBtn = buttons.find(btn => btn.getAttribute('aria-label') === 'Desktop View');
      const tabletBtn = buttons.find(btn => btn.getAttribute('aria-label') === 'Tablet View');
      const mobileBtn = buttons.find(btn => btn.getAttribute('aria-label') === 'Mobile View');
      
      expect(desktopBtn).toBeInTheDocument();
      expect(tabletBtn).toBeInTheDocument();
      expect(mobileBtn).toBeInTheDocument();
    });

    it('should render refresh and open buttons', () => {
      render(<FoundationPreview site={mockSite} config={mockConfig} />);
      
      const refreshBtn = screen.getByRole('button', { name: 'Refresh Preview' });
      const openLink = screen.getByRole('link', { name: 'Open in New Tab' });
      
      expect(refreshBtn).toBeInTheDocument();
      expect(openLink).toBeInTheDocument();
    });

    it('should render iframe with correct src', () => {
      render(<FoundationPreview site={mockSite} config={mockConfig} />);
      
      const iframe = screen.getByTitle('Foundation Preview');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('src', 'https://testsite.sitesprintz.com');
    });

    it('should show draft preview URL for draft sites', () => {
      const draftSite = { ...mockSite, status: 'draft' };
      render(<FoundationPreview site={draftSite} config={mockConfig} />);
      
      const iframe = screen.getByTitle('Foundation Preview');
      expect(iframe).toHaveAttribute('src', '/preview/testsite');
    });

    it('should show empty state when no site selected', () => {
      render(<FoundationPreview site={null} config={mockConfig} />);
      
      expect(screen.getByText('No site selected')).toBeInTheDocument();
    });
  });

  // ==================== DEVICE MODE TESTS ====================
  describe('Device Mode Switching', () => {
    it('should switch to tablet view', async () => {
      const user = userEvent.setup();
      render(<FoundationPreview site={mockSite} config={mockConfig} />);
      
      const tabletBtn = screen.getByRole('button', { name: 'Tablet View' });
      await user.click(tabletBtn);
      
      expect(tabletBtn).toHaveClass('active');
      
      // Check viewport size changed
      const viewport = document.querySelector('.preview-viewport');
      expect(viewport).toHaveClass('device-tablet');
    });

    it('should switch to mobile view', async () => {
      const user = userEvent.setup();
      render(<FoundationPreview site={mockSite} config={mockConfig} />);
      
      const mobileBtn = screen.getByRole('button', { name: 'Mobile View' });
      await user.click(mobileBtn);
      
      expect(mobileBtn).toHaveClass('active');
      
      // Check viewport size changed
      const viewport = document.querySelector('.preview-viewport');
      expect(viewport).toHaveClass('device-mobile');
    });

    it('should show device badge for non-desktop views', async () => {
      const user = userEvent.setup();
      render(<FoundationPreview site={mockSite} config={mockConfig} />);
      
      // No badge in desktop mode
      expect(screen.queryByText('768 × 1024')).not.toBeInTheDocument();
      
      // Switch to tablet
      const tabletBtn = screen.getByRole('button', { name: 'Tablet View' });
      await user.click(tabletBtn);
      
      // Badge should appear
      await waitFor(() => {
        expect(screen.getByText('768 × 1024')).toBeInTheDocument();
      });
    });

    it('should show mobile badge for mobile view', async () => {
      const user = userEvent.setup();
      render(<FoundationPreview site={mockSite} config={mockConfig} />);
      
      const mobileBtn = screen.getByRole('button', { name: 'Mobile View' });
      await user.click(mobileBtn);
      
      await waitFor(() => {
        expect(screen.getByText('375 × 667')).toBeInTheDocument();
      });
    });
  });

  // ==================== IFRAME INTERACTION TESTS ====================
  describe('Iframe Interactions', () => {
    it('should send postMessage when config changes', () => {
      const { rerender } = render(<FoundationPreview site={mockSite} config={mockConfig} />);
      
      // Mock iframe contentWindow
      const iframe = screen.getByTitle('Foundation Preview');
      const mockPostMessage = vi.fn();
      Object.defineProperty(iframe, 'contentWindow', {
        value: { postMessage: mockPostMessage },
        writable: true
      });
      
      // Update config
      const newConfig = {
        ...mockConfig,
        trustSignals: { ...mockConfig.trustSignals, enabled: false }
      };
      rerender(<FoundationPreview site={mockSite} config={newConfig} />);
      
      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'UPDATE_FOUNDATION_CONFIG',
          config: newConfig
        }),
        '*'
      );
    });

    it('should show loading state initially', () => {
      render(<FoundationPreview site={mockSite} config={mockConfig} />);
      
      expect(screen.getByText('Loading preview...')).toBeInTheDocument();
      expect(document.querySelector('.loading-spinner')).toBeInTheDocument();
    });

    it('should hide loading state after iframe loads', async () => {
      render(<FoundationPreview site={mockSite} config={mockConfig} />);
      
      const iframe = screen.getByTitle('Foundation Preview');
      
      // Simulate iframe load
      iframe.dispatchEvent(new Event('load'));
      
      await waitFor(() => {
        expect(screen.queryByText('Loading preview...')).not.toBeInTheDocument();
      });
    });

    it('should handle refresh button click', async () => {
      const user = userEvent.setup();
      render(<FoundationPreview site={mockSite} config={mockConfig} />);
      
      // Hide initial loading state
      const iframe = screen.getByTitle('Foundation Preview');
      iframe.dispatchEvent(new Event('load'));
      
      await waitFor(() => {
        expect(screen.queryByText('Loading preview...')).not.toBeInTheDocument();
      });
      
      // Click refresh
      const refreshBtn = screen.getByRole('button', { name: 'Refresh Preview' });
      await user.click(refreshBtn);
      
      // Loading should appear again
      await waitFor(() => {
        expect(screen.getByText('Loading preview...')).toBeInTheDocument();
      });
    });

    it('should have open in new tab link with correct attributes', () => {
      render(<FoundationPreview site={mockSite} config={mockConfig} />);
      
      const openLink = screen.getByRole('link', { name: 'Open in New Tab' });
      expect(openLink).toHaveAttribute('href', 'https://testsite.sitesprintz.com');
      expect(openLink).toHaveAttribute('target', '_blank');
      expect(openLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  // ==================== ERROR HANDLING TESTS ====================
  describe('Error Handling', () => {
    it('should not crash if config is null', () => {
      expect(() => {
        render(<FoundationPreview site={mockSite} config={null} />);
      }).not.toThrow();
    });

    it('should not crash if site is null', () => {
      expect(() => {
        render(<FoundationPreview site={null} config={mockConfig} />);
      }).not.toThrow();
    });

    it('should handle missing subdomain gracefully', () => {
      const siteWithoutSubdomain = { ...mockSite, subdomain: null };
      render(<FoundationPreview site={siteWithoutSubdomain} config={mockConfig} />);
      
      expect(screen.getByText('No site selected')).toBeInTheDocument();
    });

    it('should handle postMessage errors silently', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const { rerender } = render(<FoundationPreview site={mockSite} config={mockConfig} />);
      
      // Mock iframe with failing postMessage
      const iframe = screen.getByTitle('Foundation Preview');
      Object.defineProperty(iframe, 'contentWindow', {
        value: {
          postMessage: () => {
            throw new Error('postMessage failed');
          }
        },
        writable: true
      });
      
      // Update config (should trigger postMessage)
      const newConfig = { ...mockConfig, trustSignals: { enabled: false } };
      
      expect(() => {
        rerender(<FoundationPreview site={mockSite} config={newConfig} />);
      }).not.toThrow();
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to update preview:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  // ==================== RESPONSIVE DESIGN TESTS ====================
  describe('Responsive Design', () => {
    it('should apply correct iframe wrapper styles for desktop', () => {
      render(<FoundationPreview site={mockSite} config={mockConfig} />);
      
      const wrapper = document.querySelector('.preview-iframe-wrapper');
      expect(wrapper).toHaveStyle({ width: '100%', height: '100%' });
    });

    it('should apply correct iframe wrapper styles for tablet', async () => {
      const user = userEvent.setup();
      render(<FoundationPreview site={mockSite} config={mockConfig} />);
      
      const tabletBtn = screen.getByRole('button', { name: 'Tablet View' });
      await user.click(tabletBtn);
      
      const wrapper = document.querySelector('.preview-iframe-wrapper');
      expect(wrapper).toHaveStyle({ width: '768px', height: '1024px' });
    });

    it('should apply correct iframe wrapper styles for mobile', async () => {
      const user = userEvent.setup();
      render(<FoundationPreview site={mockSite} config={mockConfig} />);
      
      const mobileBtn = screen.getByRole('button', { name: 'Mobile View' });
      await user.click(mobileBtn);
      
      const wrapper = document.querySelector('.preview-iframe-wrapper');
      expect(wrapper).toHaveStyle({ width: '375px', height: '667px' });
    });
  });
});

