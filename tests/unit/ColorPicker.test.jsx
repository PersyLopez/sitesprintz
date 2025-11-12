import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ColorPicker from '../../src/components/setup/forms/ColorPicker';

describe('ColorPicker Component', () => {
  const mockOnChange = vi.fn();
  const defaultProps = {
    label: 'Primary Color',
    value: '#06b6d4',
    onChange: mockOnChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Rendering Tests (2 tests)
  describe('Rendering', () => {
    it('should render label and controls', () => {
      render(<ColorPicker {...defaultProps} />);

      expect(screen.getByText('Primary Color')).toBeInTheDocument();
      // Check for text input specifically
      const textInput = screen.getByPlaceholderText('#000000');
      expect(textInput).toHaveValue('#06b6d4');
    });

    it('should not show picker dropdown initially', () => {
      render(<ColorPicker {...defaultProps} />);

      expect(screen.queryByText('Done')).not.toBeInTheDocument();
    });
  });

  // Color Preview Tests (2 tests)
  describe('Color Preview Button', () => {
    it('should display current color in preview', () => {
      render(<ColorPicker {...defaultProps} />);

      const preview = screen.getByTitle(/current color/i);
      expect(preview).toHaveStyle({ backgroundColor: '#06b6d4' });
      expect(screen.getByText('#06b6d4')).toBeInTheDocument();
    });

    it('should toggle picker dropdown on click', async () => {
      const user = userEvent.setup();
      render(<ColorPicker {...defaultProps} />);

      const preview = screen.getByTitle(/current color/i);
      
      // Initially hidden
      expect(screen.queryByText('Done')).not.toBeInTheDocument();

      // Show on click
      await user.click(preview);
      expect(screen.getByText('Done')).toBeInTheDocument();

      // Hide on second click
      await user.click(preview);
      expect(screen.queryByText('Done')).not.toBeInTheDocument();
    });
  });

  // Text Input Tests (1 test)
  describe('Text Input', () => {
    it('should have text input for manual color entry', () => {
      render(<ColorPicker {...defaultProps} />);

      const textInput = screen.getByPlaceholderText('#000000');
      expect(textInput).toBeInTheDocument();
      expect(textInput).toHaveValue('#06b6d4');
      expect(textInput).toHaveAttribute('maxLength', '7');
    });
  });

  // Native Color Picker Tests (1 test)
  describe('Native Color Picker', () => {
    it('should render native color input', () => {
      render(<ColorPicker {...defaultProps} />);

      const colorInput = screen.getByTitle('Pick a color');
      expect(colorInput).toHaveValue('#06b6d4');
    });
  });

  // Preset Colors Tests (2 tests)
  describe('Preset Colors', () => {
    it('should show preset colors when picker opened', async () => {
      const user = userEvent.setup();
      render(<ColorPicker {...defaultProps} />);

      const preview = screen.getByTitle(/current color/i);
      await user.click(preview);

      // Should show multiple preset colors
      const presetButtons = screen.getAllByRole('button');
      expect(presetButtons.length).toBeGreaterThan(10);
    });

    it('should select preset color and close picker', async () => {
      const user = userEvent.setup();
      render(<ColorPicker {...defaultProps} />);

      // Open picker
      const preview = screen.getByTitle(/current color/i);
      await user.click(preview);

      // Click a preset color (red)
      const redPreset = screen.getByTitle('#ef4444');
      await user.click(redPreset);

      expect(mockOnChange).toHaveBeenCalledWith('#ef4444');
      // Picker should close
      expect(screen.queryByText('Done')).not.toBeInTheDocument();
    });
  });
});
