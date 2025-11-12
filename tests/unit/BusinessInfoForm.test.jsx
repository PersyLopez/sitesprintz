import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BusinessInfoForm from '../../src/components/setup/forms/BusinessInfoForm';

// Mock dependencies
vi.mock('../../src/hooks/useSite', () => ({
  useSite: vi.fn(),
}));

vi.mock('../../src/components/setup/forms/ImageUploader', () => ({
  default: ({ value, onChange, aspectRatio }) => (
    <div data-testid="image-uploader" data-aspect-ratio={aspectRatio}>
      <button onClick={() => onChange('https://example.com/image.jpg')}>
        Upload
      </button>
      {value && <span>Current: {value}</span>}
    </div>
  ),
}));

vi.mock('../../src/components/setup/forms/ColorPicker', () => ({
  default: ({ label, value, onChange }) => (
    <div data-testid={`color-picker-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <label>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Color"
      />
    </div>
  ),
}));

import { useSite } from '../../src/hooks/useSite';

describe('BusinessInfoForm Component', () => {
  let mockUpdateField;
  let mockUpdateNestedField;

  beforeEach(() => {
    mockUpdateField = vi.fn();
    mockUpdateNestedField = vi.fn();

    useSite.mockReturnValue({
      siteData: {
        brand: {
          name: 'Test Business',
          tagline: 'Test Tagline',
          logo: '',
        },
        hero: {
          title: 'Welcome',
          subtitle: 'Test subtitle',
          image: '',
          cta: [
            { label: 'Book Now', href: '#contact' },
          ],
        },
        themeVars: {
          'color-primary': '#06b6d4',
          'color-accent': '#0891b2',
        },
      },
      updateField: mockUpdateField,
      updateNestedField: mockUpdateNestedField,
    });
  });

  // Rendering Tests (3 tests)
  describe('Rendering', () => {
    it('should render all form sections', () => {
      render(<BusinessInfoForm />);

      expect(screen.getByText('Basic Information')).toBeInTheDocument();
      expect(screen.getByText('Hero Section')).toBeInTheDocument();
      expect(screen.getByText('Branding')).toBeInTheDocument();
      expect(screen.getByText('Call-to-Action Buttons')).toBeInTheDocument();
    });

    it('should render all input fields', () => {
      render(<BusinessInfoForm />);

      expect(screen.getByLabelText(/business name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/tagline/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/hero title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/hero subtitle/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/primary button text/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/primary button link/i)).toBeInTheDocument();
    });

    it('should populate fields with site data', () => {
      render(<BusinessInfoForm />);

      expect(screen.getByLabelText(/business name/i)).toHaveValue('Test Business');
      expect(screen.getByLabelText(/tagline/i)).toHaveValue('Test Tagline');
      expect(screen.getByLabelText(/hero title/i)).toHaveValue('Welcome');
      expect(screen.getByLabelText(/hero subtitle/i)).toHaveValue('Test subtitle');
      expect(screen.getByLabelText(/primary button text/i)).toHaveValue('Book Now');
      expect(screen.getByLabelText(/primary button link/i)).toHaveValue('#contact');
    });
  });

  // Basic Information Tests (2 tests)
  describe('Basic Information', () => {
    it('should update business name', async () => {
      const user = userEvent.setup();
      render(<BusinessInfoForm />);

      const input = screen.getByLabelText(/business name/i);
      await user.clear(input);
      await user.type(input, 'New Business');

      // Check that updateNestedField was called (with each keystroke)
      expect(mockUpdateNestedField).toHaveBeenCalled();
      // Check the last call has the final value
      const calls = mockUpdateNestedField.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toBe('brand.name');
      expect(lastCall[1]).toContain('Business');
    });

    it('should update tagline', async () => {
      const user = userEvent.setup();
      render(<BusinessInfoForm />);

      const input = screen.getByLabelText(/tagline/i);
      await user.clear(input);
      await user.type(input, 'New Tagline');

      expect(mockUpdateNestedField).toHaveBeenCalled();
      const calls = mockUpdateNestedField.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toBe('brand.tagline');
      expect(lastCall[1]).toContain('Tagline');
    });
  });

  // Hero Section Tests (3 tests)
  describe('Hero Section', () => {
    it('should update hero title', async () => {
      const user = userEvent.setup();
      render(<BusinessInfoForm />);

      const input = screen.getByLabelText(/hero title/i);
      // Just verify onChange is wired up by typing at the end
      await user.click(input);
      await user.type(input, 'X');

      expect(mockUpdateNestedField).toHaveBeenCalled();
      const calls = mockUpdateNestedField.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toBe('hero.title');
    });

    it('should update hero subtitle', async () => {
      const user = userEvent.setup();
      render(<BusinessInfoForm />);

      const textarea = screen.getByLabelText(/hero subtitle/i);
      await user.click(textarea);
      await user.type(textarea, 'X');

      expect(mockUpdateNestedField).toHaveBeenCalled();
      const calls = mockUpdateNestedField.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toBe('hero.subtitle');
    });

    it('should update hero image through ImageUploader', async () => {
      const user = userEvent.setup();
      render(<BusinessInfoForm />);

      const uploaders = screen.getAllByTestId('image-uploader');
      const heroImageUploader = uploaders.find(
        (uploader) => uploader.getAttribute('data-aspect-ratio') === '16:9'
      );

      const uploadButton = heroImageUploader.querySelector('button');
      await user.click(uploadButton);

      await waitFor(() => {
        expect(mockUpdateNestedField).toHaveBeenCalledWith('hero.image', 'https://example.com/image.jpg');
      });
    });
  });

  // Branding Tests (2 tests)
  describe('Branding', () => {
    it('should update logo through ImageUploader', async () => {
      const user = userEvent.setup();
      render(<BusinessInfoForm />);

      const uploaders = screen.getAllByTestId('image-uploader');
      const logoUploader = uploaders.find(
        (uploader) => uploader.getAttribute('data-aspect-ratio') === '1:1'
      );

      const uploadButton = logoUploader.querySelector('button');
      await user.click(uploadButton);

      await waitFor(() => {
        expect(mockUpdateNestedField).toHaveBeenCalledWith('brand.logo', 'https://example.com/image.jpg');
      });
    });

    it('should update theme colors', async () => {
      const user = userEvent.setup();
      render(<BusinessInfoForm />);

      const primaryColorPicker = screen.getByTestId('color-picker-primary-color');
      const colorInput = primaryColorPicker.querySelector('input[type="text"]');
      
      await user.click(colorInput);
      await user.type(colorInput, 'a');

      expect(mockUpdateNestedField).toHaveBeenCalled();
      const calls = mockUpdateNestedField.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toBe('themeVars.color-primary');
    });
  });

  // Call-to-Action Tests (2 tests)
  describe('Call-to-Action', () => {
    it('should update primary CTA label', async () => {
      const user = userEvent.setup();
      render(<BusinessInfoForm />);

      const input = screen.getByLabelText(/primary button text/i);
      await user.click(input);
      await user.type(input, 'X');

      expect(mockUpdateNestedField).toHaveBeenCalled();
      const calls = mockUpdateNestedField.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toBe('hero.cta');
    });

    it('should update primary CTA href', async () => {
      const user = userEvent.setup();
      render(<BusinessInfoForm />);

      const input = screen.getByLabelText(/primary button link/i);
      await user.click(input);
      await user.type(input, 'X');

      expect(mockUpdateNestedField).toHaveBeenCalled();
      const calls = mockUpdateNestedField.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toBe('hero.cta');
    });
  });
});

