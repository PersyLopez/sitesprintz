/**
 * Tests for CustomTemplateBuilder.jsx — blank business name on Create
 *
 * Seam tested:
 *   1. Create with a blank name shows the inline FieldValidation error
 *      (no window.alert) and does not complete the wizard.
 *   2. Entering a name and clicking Create calls onComplete.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import CustomTemplateBuilder from '../../src/components/setup/CustomTemplateBuilder';

describe('CustomTemplateBuilder — blank business name', () => {
  it('shows the inline field error instead of alert(), then completes with a name', () => {
    const onComplete = vi.fn();
    const onCancel = vi.fn();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<CustomTemplateBuilder onComplete={onComplete} onCancel={onCancel} />);

    // layout → colors → content (default layout is already selected)
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));

    fireEvent.click(screen.getByRole('button', { name: /Create My Website/ }));

    expect(screen.getByText('Please enter your business name')).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Business Name *'), {
      target: { value: 'Lopez Coffee' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Create My Website/ }));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ businessName: 'Lopez Coffee' })
    );

    alertSpy.mockRestore();
  });
});