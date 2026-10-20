import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FeedbackWidget from '@/components/common/FeedbackWidget';
import { ToastProvider } from '../../src/context/ToastContext';

// Wrapper component for tests that need ToastProvider
const renderWithToast = (component) => {
  return render(
    <ToastProvider>
      {component}
    </ToastProvider>
  );
};

describe('FeedbackWidget', () => {
  it('portals the open overlay to document.body', () => {
    renderWithToast(<FeedbackWidget />);

    fireEvent.click(screen.getByRole('button', { name: /send feedback/i }));

    const overlay = screen.getByTestId('feedback-overlay');
    expect(overlay.parentElement).toBe(document.body);
  });

  it('disables the submit button with readable text when the message is empty', () => {
    renderWithToast(<FeedbackWidget />);

    fireEvent.click(screen.getByRole('button', { name: /send feedback/i }));

    const submit = screen.getByTestId('feedback-submit');
    expect(submit).toBeDisabled();
    expect(submit).toHaveTextContent('Send Feedback');
  });
});
