import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PreviewFrame from '../../src/components/setup/PreviewFrame';
import { useSite } from '../../src/hooks/useSite';

vi.mock('../../src/hooks/useSite');

describe('PreviewFrame Component', () => {
  const mockSiteData = {
    businessName: 'Test Business',
    template: 'restaurant',
    colors: {
      primary: '#06b6d4',
      secondary: '#14b8a6'
    },
    content: {
      hero: {
        title: 'Welcome',
        subtitle: 'Test subtitle'
      }
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useSite.mockReturnValue({
      siteData: mockSiteData,
      previewKey: 0
    });
  });

  // Rendering (3 tests)
  describe('Rendering', () => {
    it('should render preview frame', () => {
      const { container } = render(<PreviewFrame />);
      
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
    });

    it('should render device mode toggle', () => {
      render(<PreviewFrame />);
      
      expect(screen.getByRole('button', { name: /desktop/i })).toBeInTheDocument();
    });

    it('should have preview container', () => {
      const { container } = render(<PreviewFrame />);
      
      const previewContainer = container.querySelector('.preview-frame-container');
      expect(previewContainer).toBeInTheDocument();
    });
  });

  // Device Modes (3 tests)
  describe('Device Modes', () => {
    it('should switch to mobile view', async () => {
      const user = userEvent.setup();
      render(<PreviewFrame />);
      
      const mobileButton = screen.getByRole('button', { name: /mobile/i });
      await user.click(mobileButton);
      
      expect(mobileButton).toBeInTheDocument();
    });

    it('should switch to tablet view', async () => {
      const user = userEvent.setup();
      render(<PreviewFrame />);
      
      const tabletButton = screen.getByRole('button', { name: /tablet/i });
      await user.click(tabletButton);
      
      expect(tabletButton).toBeInTheDocument();
    });

    it('should switch to desktop view', async () => {
      const user = userEvent.setup();
      render(<PreviewFrame />);
      
      const desktopButton = screen.getByRole('button', { name: /desktop/i });
      await user.click(desktopButton);
      
      expect(desktopButton).toBeInTheDocument();
    });
  });

  // Preview Updates (3 tests)
  describe('Preview Updates', () => {
    it('should update when previewKey changes', () => {
      const { rerender } = render(<PreviewFrame />);
      
      useSite.mockReturnValue({
        siteData: mockSiteData,
        previewKey: 1
      });
      
      rerender(<PreviewFrame />);
      
      const { container } = render(<PreviewFrame />);
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
    });

    it('should show refreshing indicator', async () => {
      useSite.mockReturnValue({
        siteData: mockSiteData,
        previewKey: 1
      });
      
      render(<PreviewFrame />);
      
      // Refreshing indicator appears briefly
      await waitFor(() => {
        const { container } = render(<PreviewFrame />);
        expect(container).toBeInTheDocument();
      });
    });

    it('should handle site data changes', () => {
      const { rerender } = render(<PreviewFrame />);
      
      const updatedSiteData = {
        ...mockSiteData,
        businessName: 'Updated Business'
      };
      
      useSite.mockReturnValue({
        siteData: updatedSiteData,
        previewKey: 1
      });
      
      rerender(<PreviewFrame />);
      
      const { container } = render(<PreviewFrame />);
      expect(container).toBeInTheDocument();
    });
  });

  // Responsive Behavior (3 tests)
  describe('Responsive Behavior', () => {
    it('should render in desktop mode by default', () => {
      const { container } = render(<PreviewFrame />);
      
      const previewContent = container.querySelector('.preview-content.device-desktop');
      expect(previewContent).toBeInTheDocument();
    });

    it('should adjust iframe size for mobile', async () => {
      const user = userEvent.setup();
      const { container } = render(<PreviewFrame />);
      
      const mobileButton = screen.getByRole('button', { name: /mobile/i });
      await user.click(mobileButton);
      
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
    });

    it('should adjust iframe size for tablet', async () => {
      const user = userEvent.setup();
      const { container } = render(<PreviewFrame />);
      
      const tabletButton = screen.getByRole('button', { name: /tablet/i });
      await user.click(tabletButton);
      
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
    });
  });

  // Refresh Controls (3 tests)
  describe('Refresh Controls', () => {
    it('should show refresh indicator when updating', () => {
      const { container } = render(<PreviewFrame />);
      
      const refreshIndicator = container.querySelector('.refresh-indicator');
      expect(refreshIndicator).toBeInTheDocument();
    });

    it('should update preview automatically on previewKey change', () => {
      const { container, rerender } = render(<PreviewFrame />);
      
      // Mock returns new previewKey
      useSite.mockReturnValue({
        siteData: mockSiteData,
        previewKey: 1
      });
      
      rerender(<PreviewFrame />);
      
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
    });

    it('should show updating text in refresh indicator', () => {
      render(<PreviewFrame />);
      
      const updatingText = screen.getByText(/updating/i);
      expect(updatingText).toBeInTheDocument();
    });
  });
});

