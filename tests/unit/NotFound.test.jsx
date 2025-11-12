import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import NotFound from '../../src/pages/NotFound';

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock Header and Footer
vi.mock('../../src/components/layout/Header', () => ({
  default: () => <div data-testid="header">Header</div>,
}));

vi.mock('../../src/components/layout/Footer', () => ({
  default: () => <div data-testid="footer">Footer</div>,
}));

describe('NotFound Page', () => {
  const renderNotFound = () => {
    return render(
      <BrowserRouter>
        <NotFound />
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  describe('Page Structure', () => {
    it('should render 404 page', () => {
      renderNotFound();
      
      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('footer')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument();
    });

    it('should display 404 number', () => {
      renderNotFound();
      
      const digits = document.querySelectorAll('.digit');
      expect(digits.length).toBe(3);
      expect(digits[0]).toHaveTextContent('4');
      expect(digits[1]).toHaveTextContent('0');
      expect(digits[2]).toHaveTextContent('4');
    });

    it('should show error message', () => {
      renderNotFound();
      
      expect(screen.getByText(/oops/i)).toBeInTheDocument();
      expect(screen.getByText(/page you're looking for/i)).toBeInTheDocument();
    });
  });

  describe('Navigation Actions', () => {
    it('should have go back button', () => {
      renderNotFound();
      
      const goBackButton = screen.getByRole('button', { name: /go back/i });
      expect(goBackButton).toBeInTheDocument();
    });

    it('should navigate back when go back clicked', async () => {
      const user = userEvent.setup();
      renderNotFound();
      
      const goBackButton = screen.getByRole('button', { name: /go back/i });
      await user.click(goBackButton);
      
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it('should have go home link', () => {
      renderNotFound();
      
      const homeLink = screen.getByRole('link', { name: /go home/i });
      expect(homeLink).toBeInTheDocument();
      expect(homeLink).toHaveAttribute('href', '/');
    });

    it('should have dashboard link', () => {
      renderNotFound();
      
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      expect(dashboardLink).toBeInTheDocument();
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    });
  });

  describe('Helpful Links', () => {
    it('should show helpful links section', () => {
      renderNotFound();
      
      expect(screen.getByRole('heading', { name: /helpful links/i })).toBeInTheDocument();
    });

    it('should have create new site link', () => {
      renderNotFound();
      
      const setupLink = screen.getByRole('link', { name: /create new site/i });
      expect(setupLink).toBeInTheDocument();
      expect(setupLink).toHaveAttribute('href', '/setup');
    });

    it('should have view orders link', () => {
      renderNotFound();
      
      const ordersLink = screen.getByRole('link', { name: /view orders/i });
      expect(ordersLink).toBeInTheDocument();
      expect(ordersLink).toHaveAttribute('href', '/orders');
    });

    it('should have analytics link', () => {
      renderNotFound();
      
      const analyticsLink = screen.getByRole('link', { name: /analytics/i });
      expect(analyticsLink).toBeInTheDocument();
      expect(analyticsLink).toHaveAttribute('href', '/analytics');
    });

    it('should have login link', () => {
      renderNotFound();
      
      const loginLink = screen.getByRole('link', { name: /login/i });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute('href', '/login');
    });
  });

  describe('Accessibility', () => {
    it('should have semantic main element', () => {
      renderNotFound();
      
      const main = document.querySelector('main');
      expect(main).toBeInTheDocument();
      expect(main).toHaveClass('not-found-container');
    });

    it('should have proper heading hierarchy', () => {
      renderNotFound();
      
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent('Page Not Found');
      
      const h3 = screen.getByRole('heading', { level: 3 });
      expect(h3).toHaveTextContent('Helpful Links');
    });

    it('should have descriptive link text', () => {
      renderNotFound();
      
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link.textContent.trim().length).toBeGreaterThan(0);
      });
    });
  });
});
