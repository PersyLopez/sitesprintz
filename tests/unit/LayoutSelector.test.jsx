import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LayoutSelector from '../../src/components/setup/LayoutSelector';

// Mock the template layouts config
vi.mock('../../src/config/templateLayouts', () => ({
  getLayoutsForTemplate: vi.fn((template) => {
    if (template === 'restaurant') {
      return {
        defaultLayout: 'casual',
        layouts: {
          'casual': {
            name: 'Casual Dining',
            emoji: '🍔',
            description: 'Family-friendly neighborhood restaurant',
            features: ['Full menu', 'Kids menu', 'Daily specials']
          },
          'fine-dining': {
            name: 'Fine Dining',
            emoji: '🍷',
            description: 'Upscale dining with tasting menus',
            features: ['Tasting menus', 'Wine pairings', 'Chef\'s table']
          }
        }
      };
    }
    return null;
  }),
}));

describe('LayoutSelector Component', () => {
  const mockOnLayoutChange = vi.fn();

  // Rendering Tests (2 tests)
  describe('Rendering', () => {
    it('should render layout options', () => {
      render(
        <LayoutSelector
          baseTemplate="restaurant"
          currentLayout="casual"
          onLayoutChange={mockOnLayoutChange}
        />
      );

      expect(screen.getByText(/choose layout style/i)).toBeInTheDocument();
      expect(screen.getByText('Casual Dining')).toBeInTheDocument();
      expect(screen.getByText('Fine Dining')).toBeInTheDocument();
    });

    it('should return null for invalid template', () => {
      const { container } = render(
        <LayoutSelector
          baseTemplate="invalid-template"
          currentLayout="default"
          onLayoutChange={mockOnLayoutChange}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  // Selection Tests (3 tests)
  describe('Layout Selection', () => {
    it('should show current layout as selected', () => {
      render(
        <LayoutSelector
          baseTemplate="restaurant"
          currentLayout="casual"
          onLayoutChange={mockOnLayoutChange}
        />
      );

      const selectedIndicator = screen.getByText(/selected/i);
      expect(selectedIndicator).toBeInTheDocument();
  });

    it('should call onLayoutChange when layout clicked', async () => {
      const user = userEvent.setup();
      render(
        <LayoutSelector
          baseTemplate="restaurant"
          currentLayout="casual"
          onLayoutChange={mockOnLayoutChange}
        />
      );

      const fineDiningOption = screen.getByText('Fine Dining');
      await user.click(fineDiningOption);

      expect(mockOnLayoutChange).toHaveBeenCalledWith('fine-dining');
    });

    it('should use default layout when currentLayout not provided', () => {
      render(
        <LayoutSelector
          baseTemplate="restaurant"
          onLayoutChange={mockOnLayoutChange}
        />
      );

      // Casual is the default for restaurant
      expect(screen.getByText(/selected/i)).toBeInTheDocument();
    });
  });

  // Layout Info Tests (2 tests)
  describe('Layout Information', () => {
    it('should display layout descriptions', () => {
      render(
        <LayoutSelector
          baseTemplate="restaurant"
          currentLayout="casual"
          onLayoutChange={mockOnLayoutChange}
        />
      );

      expect(screen.getByText(/family-friendly neighborhood restaurant/i)).toBeInTheDocument();
      expect(screen.getByText(/upscale dining with tasting menus/i)).toBeInTheDocument();
    });

    it('should display layout features', () => {
      render(
        <LayoutSelector
          baseTemplate="restaurant"
          currentLayout="casual"
          onLayoutChange={mockOnLayoutChange}
        />
      );

      expect(screen.getByText('Full menu')).toBeInTheDocument();
      expect(screen.getByText('Tasting menus')).toBeInTheDocument();
    });
  });

  // Visual Elements Test (1 test)
  describe('Visual Elements', () => {
    it('should display layout emojis', () => {
      render(
        <LayoutSelector
          baseTemplate="restaurant"
          currentLayout="casual"
          onLayoutChange={mockOnLayoutChange}
        />
      );

      expect(screen.getByText('🍔')).toBeInTheDocument();
      expect(screen.getByText('🍷')).toBeInTheDocument();
    });
  });
});
