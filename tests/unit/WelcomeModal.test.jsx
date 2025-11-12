import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import WelcomeModal from '../../src/components/dashboard/WelcomeModal';

describe('WelcomeModal Component', () => {
  const mockOnClose = vi.fn();

  const renderWelcomeModal = () => {
    return render(
      <BrowserRouter>
        <WelcomeModal onClose={mockOnClose} />
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Modal Display', () => {
    it('should render modal with welcome message', () => {
      renderWelcomeModal();

      expect(screen.getByText('Welcome to SiteSprintz!')).toBeInTheDocument();
      expect(screen.getByText(/You're all set to create your first professional website/i)).toBeInTheDocument();
    });

    it('should display welcome icon', () => {
      renderWelcomeModal();

      expect(screen.getByText('🎉')).toBeInTheDocument();
    });

    it('should have close button', () => {
      renderWelcomeModal();

      const closeButton = screen.getByRole('button', { name: /×/i });
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Onboarding Steps', () => {
    it('should display step 1: Choose a Template', () => {
      renderWelcomeModal();

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('Choose a Template')).toBeInTheDocument();
      expect(screen.getByText('Select from our collection of beautiful, responsive templates')).toBeInTheDocument();
    });

    it('should display step 2: Customize Your Content', () => {
      renderWelcomeModal();

      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('Customize Your Content')).toBeInTheDocument();
      expect(screen.getByText('Add your business info, images, and customize colors')).toBeInTheDocument();
    });

    it('should display step 3: Publish & Share', () => {
      renderWelcomeModal();

      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Publish & Share')).toBeInTheDocument();
      expect(screen.getByText('Launch your site and start reaching customers')).toBeInTheDocument();
    });

    it('should display all three steps', () => {
      renderWelcomeModal();

      const stepNumbers = screen.getAllByText(/^[123]$/);
      expect(stepNumbers).toHaveLength(3);
    });
  });

  describe('Call-to-Action Buttons', () => {
    it('should have Create Your First Site button', () => {
      renderWelcomeModal();

      const createButton = screen.getByRole('link', { name: /Create Your First Site/i });
      expect(createButton).toBeInTheDocument();
      expect(createButton).toHaveAttribute('href', '/setup');
    });

    it('should have I\'ll do this later button', () => {
      renderWelcomeModal();

      const laterButton = screen.getByRole('button', { name: /I'll do this later/i });
      expect(laterButton).toBeInTheDocument();
    });

    it('should apply correct classes to CTA buttons', () => {
      renderWelcomeModal();

      const createButton = screen.getByRole('link', { name: /Create Your First Site/i });
      expect(createButton).toHaveClass('btn', 'btn-primary', 'btn-large');

      const laterButton = screen.getByRole('button', { name: /I'll do this later/i });
      expect(laterButton).toHaveClass('btn', 'btn-secondary');
    });
  });

  describe('Modal Interactions', () => {
    it('should call onClose when clicking close button', async () => {
      const user = userEvent.setup();
      renderWelcomeModal();

      const closeButton = screen.getByRole('button', { name: /×/i });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when clicking later button', async () => {
      const user = userEvent.setup();
      renderWelcomeModal();

      const laterButton = screen.getByRole('button', { name: /I'll do this later/i });
      await user.click(laterButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when clicking overlay', async () => {
      const user = userEvent.setup();
      renderWelcomeModal();

      const overlay = document.querySelector('.modal-overlay');
      await user.click(overlay);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when clicking modal content', async () => {
      const user = userEvent.setup();
      renderWelcomeModal();

      const modalContent = document.querySelector('.modal-content');
      await user.click(modalContent);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Helpful Tip', () => {
    it('should display helpful tip', () => {
      renderWelcomeModal();

      expect(screen.getByText(/💡/i)).toBeInTheDocument();
      expect(screen.getByText(/Tip:/i)).toBeInTheDocument();
      expect(screen.getByText(/Start with a template that matches your business type for the best results/i)).toBeInTheDocument();
    });

    it('should bold the word Tip', () => {
      renderWelcomeModal();

      const tipStrong = screen.getByText('Tip:');
      expect(tipStrong.tagName).toBe('STRONG');
    });
  });

  describe('Modal Structure', () => {
    it('should have modal overlay', () => {
      renderWelcomeModal();

      const overlay = document.querySelector('.modal-overlay');
      expect(overlay).toBeInTheDocument();
    });

    it('should have modal content with welcome-modal class', () => {
      renderWelcomeModal();

      const modalContent = document.querySelector('.welcome-modal');
      expect(modalContent).toBeInTheDocument();
      expect(modalContent).toHaveClass('modal-content');
    });

    it('should have welcome-steps container', () => {
      renderWelcomeModal();

      const stepsContainer = document.querySelector('.welcome-steps');
      expect(stepsContainer).toBeInTheDocument();
    });

    it('should have welcome-actions container', () => {
      renderWelcomeModal();

      const actionsContainer = document.querySelector('.welcome-actions');
      expect(actionsContainer).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      renderWelcomeModal();

      const h2 = screen.getByRole('heading', { level: 2, name: /Welcome to SiteSprintz/i });
      expect(h2).toBeInTheDocument();

      const h3Headings = screen.getAllByRole('heading', { level: 3 });
      expect(h3Headings).toHaveLength(3);
    });

    it('should have accessible button text', () => {
      renderWelcomeModal();

      const laterButton = screen.getByRole('button', { name: /I'll do this later/i });
      expect(laterButton).toHaveAccessibleName();

      const closeButton = screen.getByRole('button', { name: /×/i });
      expect(closeButton).toBeInTheDocument();
    });

    it('should have descriptive link text', () => {
      renderWelcomeModal();

      const createLink = screen.getByRole('link', { name: /Create Your First Site/i });
      expect(createLink).toHaveAccessibleName();
    });
  });

  describe('Content Quality', () => {
    it('should explain the process clearly', () => {
      renderWelcomeModal();

      // All three steps should have clear explanations
      expect(screen.getByText(/Select from our collection/i)).toBeInTheDocument();
      expect(screen.getByText(/Add your business info/i)).toBeInTheDocument();
      expect(screen.getByText(/Launch your site/i)).toBeInTheDocument();
    });

    it('should encourage immediate action', () => {
      renderWelcomeModal();

      const ctaText = screen.getByText(/Create Your First Site →/i);
      expect(ctaText).toBeInTheDocument();
      expect(ctaText.textContent).toContain('→');
    });

    it('should provide later option without pressure', () => {
      renderWelcomeModal();

      expect(screen.getByText(/I'll do this later/i)).toBeInTheDocument();
    });
  });
});

