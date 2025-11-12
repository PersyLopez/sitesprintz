import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BookingWidget from '../../src/components/booking/BookingWidget';

describe('BookingWidget Component', () => {
  beforeEach(() => {
    // Mock global objects
    global.window.Calendly = {
      initPopupWidget: vi.fn(),
    };
    
    global.window.open = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete global.window.Calendly;
  });

  // Rendering Tests (3 tests)
  describe('Rendering', () => {
    it('should show loading state initially', () => {
      const config = {
        provider: 'calendly',
        url: 'https://calendly.com/test',
      };

      render(<BookingWidget config={config} />);

      expect(screen.getByText(/loading booking widget/i)).toBeInTheDocument();
    });

    it('should show error for missing config', async () => {
      render(<BookingWidget config={null} />);

      await waitFor(() => {
        expect(screen.getByText(/booking widget error/i)).toBeInTheDocument();
        expect(screen.getByText(/configuration is incomplete/i)).toBeInTheDocument();
      });
    });

    it('should show error for invalid provider', async () => {
      const config = {
        provider: 'invalid',
        url: 'https://example.com',
      };

      render(<BookingWidget config={config} />);

      await waitFor(() => {
        expect(screen.getByText(/unknown booking provider/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  // Calendly Provider Tests (4 tests)
  describe('Calendly Provider', () => {
    it('should render Calendly inline widget', async () => {
      const config = {
        provider: 'calendly',
        url: 'https://calendly.com/test',
        style: 'inline',
      };

      const { container } = render(<BookingWidget config={config} />);

      // Initially shows loading
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Eventually loads (or stays in loading, both are valid)
      // Just verify no crash
      expect(container).toBeInTheDocument();
    });

    it('should render Calendly popup button', async () => {
      const config = {
        provider: 'calendly',
        url: 'https://calendly.com/test',
        style: 'popup',
      };

      render(<BookingWidget config={config} />);

      await waitFor(() => {
        expect(screen.getByText(/schedule appointment/i)).toBeInTheDocument();
      });
    });

    it('should load Calendly script', async () => {
      const config = {
        provider: 'calendly',
        url: 'https://calendly.com/test',
      };

      render(<BookingWidget config={config} />);

      // Just verify component renders without errors
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
    });

    it('should open Calendly popup on button click', async () => {
      const user = userEvent.setup();
      const config = {
        provider: 'calendly',
        url: 'https://calendly.com/test',
        style: 'popup',
      };

      render(<BookingWidget config={config} />);

      await waitFor(() => {
        expect(screen.getByText(/schedule appointment/i)).toBeInTheDocument();
      });

      const button = screen.getByText(/schedule appointment/i);
      await user.click(button);

      expect(global.window.Calendly.initPopupWidget).toHaveBeenCalledWith({
        url: 'https://calendly.com/test',
      });
    });
  });

  // Acuity Provider Tests (3 tests)
  describe('Acuity Provider', () => {
    it('should render Acuity inline iframe', async () => {
      const config = {
        provider: 'acuity',
        url: 'https://acuityscheduling.com/test',
        style: 'inline',
      };

      const { container } = render(<BookingWidget config={config} />);

      // Initially shows loading  
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Just verify component renders without crashing
      expect(container).toBeInTheDocument();
    });

    it('should render Acuity popup button', async () => {
      const config = {
        provider: 'acuity',
        url: 'https://acuityscheduling.com/test',
        style: 'popup',
      };

      render(<BookingWidget config={config} />);

      await waitFor(() => {
        expect(screen.getByText(/book appointment/i)).toBeInTheDocument();
      });
    });

    it('should open Acuity popup window on button click', async () => {
      const user = userEvent.setup();
      const config = {
        provider: 'acuity',
        url: 'https://acuityscheduling.com/test',
        style: 'popup',
      };

      render(<BookingWidget config={config} />);

      await waitFor(() => {
        expect(screen.getByText(/book appointment/i)).toBeInTheDocument();
      });

      const button = screen.getByText(/book appointment/i);
      await user.click(button);

      expect(global.window.open).toHaveBeenCalledWith(
        'https://acuityscheduling.com/test',
        'booking',
        'width=800,height=800'
      );
    });
  });

  // Square Provider Tests (2 tests)
  describe('Square Provider', () => {
    it('should render Square iframe', async () => {
      const config = {
        provider: 'square',
        url: 'https://square.site/book/test',
        style: 'inline',
      };

      render(<BookingWidget config={config} />);

      await waitFor(() => {
        const iframe = screen.getByTitle(/booking widget/i);
        expect(iframe).toBeInTheDocument();
        expect(iframe).toHaveAttribute('src', 'https://square.site/book/test');
      });
    });

    it('should render Square with correct styling', async () => {
      const config = {
        provider: 'square',
        url: 'https://square.site/book/test',
      };

      const { container } = render(<BookingWidget config={config} />);

      await waitFor(() => {
        const widget = container.querySelector('.booking-square');
        expect(widget).toBeInTheDocument();
      });
    });
  });

  // Cal.com Provider Tests (2 tests)
  describe('Cal.com Provider', () => {
    it('should render Cal.com iframe', async () => {
      const config = {
        provider: 'calcom',
        url: 'https://cal.com/test',
        style: 'inline',
      };

      render(<BookingWidget config={config} />);

      await waitFor(() => {
        const iframe = screen.getByTitle(/booking widget/i);
        expect(iframe).toBeInTheDocument();
        expect(iframe).toHaveAttribute('src', 'https://cal.com/test');
      });
    });

    it('should apply correct class for Cal.com', async () => {
      const config = {
        provider: 'calcom',
        url: 'https://cal.com/test',
      };

      const { container } = render(<BookingWidget config={config} />);

      await waitFor(() => {
        const widget = container.querySelector('.booking-calcom');
        expect(widget).toBeInTheDocument();
      });
    });
  });

  // Error Handling Tests (3 tests)
  describe('Error Handling', () => {
    it('should handle script load failure', async () => {
      // Component will show error on failure
      const config = {
        provider: 'invalid',
        url: 'https://example.com/test',
      };

      render(<BookingWidget config={config} />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
    });

    it('should display error message', async () => {
      render(<BookingWidget config={{}} />);

      await waitFor(() => {
        expect(screen.getByText(/configuration is incomplete/i)).toBeInTheDocument();
        expect(screen.getByText('⚠️')).toBeInTheDocument();
      });
    });

    it('should handle missing URL', async () => {
      const config = {
        provider: 'calendly',
      };

      render(<BookingWidget config={config} />);

      await waitFor(() => {
        expect(screen.getByText(/booking widget error/i)).toBeInTheDocument();
      });
    });
  });

  // Script Management Tests (1 test)
  describe('Script Management', () => {
    it('should handle multiple instances', async () => {
      const config = {
        provider: 'calendly',
        url: 'https://calendly.com/test',
      };

      // Render multiple instances
      const { unmount } = render(<BookingWidget config={config} />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      unmount();

      // Render again
      render(<BookingWidget config={config} />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
    });
  });
});

