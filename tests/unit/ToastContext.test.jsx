import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { ToastProvider, ToastContext } from '../../src/context/ToastContext';
import React, { useContext } from 'react';

// Test component to consume context
const TestConsumer = ({ onMount }) => {
  const context = useContext(ToastContext);
  
  React.useEffect(() => {
    if (onMount && context) {
      onMount(context);
    }
  }, [onMount, context]);
  
  return <div>Test Consumer</div>;
};

describe('ToastContext', () => {
  // Don't use fake timers globally - only where needed
  afterEach(() => {
    vi.clearAllTimers();
    vi.restoreAllMocks();
  });

  // Provider Rendering (2 tests)
  describe('Provider Rendering', () => {
    it('should render provider with children', () => {
      render(
        <ToastProvider>
          <div>Child Content</div>
        </ToastProvider>
      );

      expect(screen.getByText('Child Content')).toBeInTheDocument();
    });

    it('should provide context value', async () => {
      let contextValue;
      const onMount = (context) => {
        contextValue = context;
      };

      render(
        <ToastProvider>
          <TestConsumer onMount={onMount} />
        </ToastProvider>
      );

      await waitFor(() => {
        expect(contextValue).toBeDefined();
      });

      expect(contextValue.showSuccess).toBeDefined();
      expect(contextValue.showError).toBeDefined();
      expect(contextValue.showInfo).toBeDefined();
      expect(contextValue.showToast).toBeDefined();
    });
  });

  // Show Toast (4 tests)
  describe('showToast', () => {
    it('should show info toast', async () => {
      let contextValue;
      const onMount = (context) => {
        contextValue = context;
      };

      render(
        <ToastProvider>
          <TestConsumer onMount={onMount} />
        </ToastProvider>
      );

      await waitFor(() => {
        expect(contextValue).toBeDefined();
      });

      act(() => {
        contextValue.showToast('Test message', 'info');
      });

      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument();
      });
    });

    it('should auto-dismiss toast after 3 seconds', async () => {
      let contextValue;
      const onMount = (context) => {
        contextValue = context;
      };

      render(
        <ToastProvider>
          <TestConsumer onMount={onMount} />
        </ToastProvider>
      );

      await waitFor(() => {
        expect(contextValue).toBeDefined();
      });

      // Enable fake timers only after getting context
      vi.useFakeTimers();

      act(() => {
        contextValue.showToast('Auto dismiss', 'info');
      });

      // Check toast is visible (synchronous)
      expect(screen.getByText('Auto dismiss')).toBeInTheDocument();

      // Advance timers
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // Check toast is gone (synchronous)
      expect(screen.queryByText('Auto dismiss')).not.toBeInTheDocument();
      
      vi.useRealTimers();
    });

    it('should show multiple toasts', async () => {
      let contextValue;
      const onMount = (context) => {
        contextValue = context;
      };

      render(
        <ToastProvider>
          <TestConsumer onMount={onMount} />
        </ToastProvider>
      );

      await waitFor(() => {
        expect(contextValue).toBeDefined();
      });

      act(() => {
        contextValue.showToast('Toast 1', 'info');
        contextValue.showToast('Toast 2', 'success');
      });

      await waitFor(() => {
        expect(screen.getByText('Toast 1')).toBeInTheDocument();
        expect(screen.getByText('Toast 2')).toBeInTheDocument();
      });
    });

    it('should handle rapid successive toasts', async () => {
      let contextValue;
      const onMount = (context) => {
        contextValue = context;
      };

      render(
        <ToastProvider>
          <TestConsumer onMount={onMount} />
        </ToastProvider>
      );

      await waitFor(() => {
        expect(contextValue).toBeDefined();
      });

      act(() => {
        for (let i = 0; i < 5; i++) {
          contextValue.showToast(`Toast ${i}`, 'info');
        }
      });

      await waitFor(() => {
        expect(screen.getByText('Toast 0')).toBeInTheDocument();
        expect(screen.getByText('Toast 4')).toBeInTheDocument();
      });
    });
  });

  // Show Success (2 tests)
  describe('showSuccess', () => {
    it('should show success toast', async () => {
      let contextValue;
      const onMount = (context) => {
        contextValue = context;
      };

      render(
        <ToastProvider>
          <TestConsumer onMount={onMount} />
        </ToastProvider>
      );

      await waitFor(() => {
        expect(contextValue).toBeDefined();
      });

      act(() => {
        contextValue.showSuccess('Success message');
      });

      await waitFor(() => {
        const toast = screen.getByText('Success message');
        expect(toast).toBeInTheDocument();
      });
    });

    it('should dismiss success toast after timeout', async () => {
      let contextValue;
      const onMount = (context) => {
        contextValue = context;
      };

      render(
        <ToastProvider>
          <TestConsumer onMount={onMount} />
        </ToastProvider>
      );

      await waitFor(() => {
        expect(contextValue).toBeDefined();
      });

      // Enable fake timers only after getting context
      vi.useFakeTimers();

      act(() => {
        contextValue.showSuccess('Success!');
      });

      // Check toast is visible (synchronous)
      expect(screen.getByText('Success!')).toBeInTheDocument();

      // Advance timers
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // Check toast is gone (synchronous)
      expect(screen.queryByText('Success!')).not.toBeInTheDocument();
      
      vi.useRealTimers();
    });
  });

  // Show Error (2 tests)
  describe('showError', () => {
    it('should show error toast', async () => {
      let contextValue;
      const onMount = (context) => {
        contextValue = context;
      };

      render(
        <ToastProvider>
          <TestConsumer onMount={onMount} />
        </ToastProvider>
      );

      await waitFor(() => {
        expect(contextValue).toBeDefined();
      });

      act(() => {
        contextValue.showError('Error message');
      });

      await waitFor(() => {
        const toast = screen.getByText('Error message');
        expect(toast).toBeInTheDocument();
      });
    });

    it('should dismiss error toast after timeout', async () => {
      let contextValue;
      const onMount = (context) => {
        contextValue = context;
      };

      render(
        <ToastProvider>
          <TestConsumer onMount={onMount} />
        </ToastProvider>
      );

      await waitFor(() => {
        expect(contextValue).toBeDefined();
      });

      // Enable fake timers only after getting context
      vi.useFakeTimers();

      act(() => {
        contextValue.showError('Error!');
      });

      // Check toast is visible (synchronous)
      expect(screen.getByText('Error!')).toBeInTheDocument();

      // Advance timers
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // Check toast is gone (synchronous)
      expect(screen.queryByText('Error!')).not.toBeInTheDocument();
      
      vi.useRealTimers();
    });
  });

  // Show Info (2 tests)
  describe('showInfo', () => {
    it('should show info toast', async () => {
      let contextValue;
      const onMount = (context) => {
        contextValue = context;
      };

      render(
        <ToastProvider>
          <TestConsumer onMount={onMount} />
        </ToastProvider>
      );

      await waitFor(() => {
        expect(contextValue).toBeDefined();
      });

      act(() => {
        contextValue.showInfo('Info message');
      });

      await waitFor(() => {
        const toast = screen.getByText('Info message');
        expect(toast).toBeInTheDocument();
      });
    });

    it('should handle long info messages', async () => {
      let contextValue;
      const onMount = (context) => {
        contextValue = context;
      };

      render(
        <ToastProvider>
          <TestConsumer onMount={onMount} />
        </ToastProvider>
      );

      await waitFor(() => {
        expect(contextValue).toBeDefined();
      });

      const longMessage = 'This is a very long information message that should still display correctly in the toast notification';

      act(() => {
        contextValue.showInfo(longMessage);
      });

      await waitFor(() => {
        expect(screen.getByText(longMessage)).toBeInTheDocument();
      });
    });
  });
});

