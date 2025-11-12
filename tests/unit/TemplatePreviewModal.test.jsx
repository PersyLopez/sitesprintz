import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TemplatePreviewModal from '../../src/components/setup/TemplatePreviewModal';

describe('TemplatePreviewModal Component', () => {
  const mockOnClose = vi.fn();
  const mockOnSelect = vi.fn();

  const mockTemplate = {
    name: 'Modern Restaurant',
    tier: 'Premium',
    category: 'Food & Dining',
    description: 'A beautiful template for restaurants',
    preview: '/images/restaurant-preview.jpg',
    features: [
      'Online menu',
      'Reservation system',
      'Photo gallery',
      'Contact form',
      'Mobile responsive',
    ],
    demoData: {
      services: [{ name: 'Service 1' }, { name: 'Service 2' }, { name: 'Service 3' }],
      menu: [{ name: 'Item 1' }, { name: 'Item 2' }],
    },
  };

  const renderModal = (template = mockTemplate) => {
    return render(
      <TemplatePreviewModal
        template={template}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Modal Rendering', () => {
    it('should render modal', () => {
      renderModal();

      expect(screen.getByRole('heading', { name: /modern restaurant/i })).toBeInTheDocument();
    });

    it('should return null when no template', () => {
      const { container } = render(
        <TemplatePreviewModal
          template={null}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should show template name', () => {
      renderModal();

      expect(screen.getByRole('heading', { name: /modern restaurant/i })).toBeInTheDocument();
    });

    it('should show tier badge', () => {
      renderModal();

      expect(screen.getByText('Premium Plan')).toBeInTheDocument();
    });

    it('should show category badge', () => {
      renderModal();

      expect(screen.getByText('Food & Dining')).toBeInTheDocument();
    });
  });

  describe('Close Functionality', () => {
    it('should have close button', () => {
      renderModal();

      const closeButton = screen.getByLabelText(/close/i);
      expect(closeButton).toBeInTheDocument();
    });

    it('should call onClose when close button clicked', async () => {
      const user = userEvent.setup();
      renderModal();

      const closeButton = screen.getByLabelText(/close/i);
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when overlay clicked', async () => {
      const user = userEvent.setup();
      const { container } = renderModal();

      const overlay = container.querySelector('.preview-modal-overlay');
      await user.click(overlay);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close when modal content clicked', async () => {
      const user = userEvent.setup();
      const { container } = renderModal();

      const content = container.querySelector('.preview-modal-content');
      await user.click(content);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Device Toggle', () => {
    it('should show device toggle buttons', () => {
      renderModal();

      expect(screen.getByRole('button', { name: /🖥️ desktop/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /📱 tablet/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /📱 mobile/i })).toBeInTheDocument();
    });

    it('should have desktop view active by default', () => {
      renderModal();

      const desktopBtn = screen.getByRole('button', { name: /🖥️ desktop/i });
      expect(desktopBtn).toHaveClass('active');
    });

    it('should switch to tablet view', async () => {
      const user = userEvent.setup();
      renderModal();

      const tabletBtn = screen.getByRole('button', { name: /📱 tablet/i });
      await user.click(tabletBtn);

      expect(tabletBtn).toHaveClass('active');
    });

    it('should switch to mobile view', async () => {
      const user = userEvent.setup();
      renderModal();

      const mobileBtn = screen.getByRole('button', { name: /📱 mobile/i });
      await user.click(mobileBtn);

      expect(mobileBtn).toHaveClass('active');
    });
  });

  describe('Preview Display', () => {
    it('should show preview image', () => {
      renderModal();

      const image = screen.getByRole('img', { name: /modern restaurant/i });
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', '/images/restaurant-preview.jpg');
    });

    it('should show placeholder when no preview image', () => {
      const templateWithoutPreview = {
        ...mockTemplate,
        preview: null,
        heroImage: null,
        hero: null,
      };
      renderModal(templateWithoutPreview);

      expect(screen.getByText(/preview not available/i)).toBeInTheDocument();
    });
  });

  describe('Template Details', () => {
    it('should show description', () => {
      renderModal();

      expect(screen.getByText(/a beautiful template for restaurants/i)).toBeInTheDocument();
    });

    it('should show features list', () => {
      renderModal();

      expect(screen.getByRole('heading', { name: /features included/i })).toBeInTheDocument();
      expect(screen.getByText('Online menu')).toBeInTheDocument();
      expect(screen.getByText('Reservation system')).toBeInTheDocument();
      expect(screen.getByText('Photo gallery')).toBeInTheDocument();
    });

    it('should show demo data stats', () => {
      renderModal();

      expect(screen.getByText('3')).toBeInTheDocument(); // 3 services
      expect(screen.getByText(/pre-filled services/i)).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // 2 menu items
      expect(screen.getByText(/menu items/i)).toBeInTheDocument();
    });

    it('should use default features when not provided', () => {
      const templateWithoutFeatures = {
        ...mockTemplate,
        features: null,
      };
      renderModal(templateWithoutFeatures);

      expect(screen.getByText(/responsive design/i)).toBeInTheDocument();
      expect(screen.getByText(/contact form/i)).toBeInTheDocument();
    });
  });

  describe('Selection Actions', () => {
    it('should have keep looking button', () => {
      renderModal();

      expect(screen.getByRole('button', { name: /keep looking/i })).toBeInTheDocument();
    });

    it('should have use template button', () => {
      renderModal();

      expect(screen.getByRole('button', { name: /use this template/i })).toBeInTheDocument();
    });

    it('should call onClose when keep looking clicked', async () => {
      const user = userEvent.setup();
      renderModal();

      const keepLookingBtn = screen.getByRole('button', { name: /keep looking/i });
      await user.click(keepLookingBtn);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onSelect when use template clicked', async () => {
      const user = userEvent.setup();
      renderModal();

      const useTemplateBtn = screen.getByRole('button', { name: /use this template/i });
      await user.click(useTemplateBtn);

      expect(mockOnSelect).toHaveBeenCalledWith(mockTemplate);
    });

    it('should call onClose after selection', async () => {
      const user = userEvent.setup();
      renderModal();

      const useTemplateBtn = screen.getByRole('button', { name: /use this template/i });
      await user.click(useTemplateBtn);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Category Icons', () => {
    it('should show correct icon for category', () => {
      renderModal();

      expect(screen.getByRole('heading', { name: /🍽️/i })).toBeInTheDocument();
    });

    it('should handle different tier values', () => {
      const starterTemplate = {
        ...mockTemplate,
        tier: 'Starter',
      };
      renderModal(starterTemplate);

      expect(screen.getByText('Starter Plan')).toBeInTheDocument();
    });

    it('should use plan as fallback for tier', () => {
      const templateWithPlan = {
        ...mockTemplate,
        tier: null,
        plan: 'Premium',
      };
      renderModal(templateWithPlan);

      expect(screen.getByText('Premium Plan')).toBeInTheDocument();
    });

    it('should default to Starter when no tier or plan', () => {
      const templateWithoutTier = {
        ...mockTemplate,
        tier: null,
        plan: null,
      };
      renderModal(templateWithoutTier);

      expect(screen.getByText('Starter Plan')).toBeInTheDocument();
    });
  });
});

