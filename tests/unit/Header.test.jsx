import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Header from '../../src/components/layout/Header';
import { AuthContext } from '../../src/context/AuthContext';

describe('Header Component', () => {
  const mockLogout = vi.fn();

  const renderHeader = (isAuthenticated = false, initialRoute = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthContext.Provider
          value={{
            isAuthenticated,
            logout: mockLogout,
            user: isAuthenticated ? { id: 1, email: 'test@example.com' } : null,
            loading: false,
          }}
        >
          <Header />
        </AuthContext.Provider>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Logo', () => {
    it('should display SiteSprintz logo', () => {
      renderHeader();

      expect(screen.getByText('SiteSprintz')).toBeInTheDocument();
      expect(screen.getByTestId('header-logo')).toBeInTheDocument();
    });

    it('should have logo link to home page', () => {
      renderHeader();

      const homeLink = screen.getByTestId('header-logo');
      expect(homeLink).toHaveAttribute('href', '/');
      expect(homeLink).toHaveTextContent('SiteSprintz');
    });
  });

  describe('Unauthenticated Navigation', () => {
    it('should show Login link when not authenticated', () => {
      renderHeader(false);

      const loginLink = screen.getByRole('link', { name: /Login/i });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute('href', '/login');
    });

    it('should show Get Started button when not authenticated', () => {
      renderHeader(false);

      const getStartedButton = screen.getByRole('link', { name: /Get Started/i });
      expect(getStartedButton).toBeInTheDocument();
      expect(getStartedButton).toHaveAttribute('href', '/register');
    });

    it('should not show Dashboard link when not authenticated', () => {
      renderHeader(false);

      expect(screen.queryByRole('link', { name: /Dashboard/i })).not.toBeInTheDocument();
    });

    it('should not show Logout button when not authenticated', () => {
      renderHeader(false);

      expect(screen.queryByRole('button', { name: /Logout/i })).not.toBeInTheDocument();
    });
  });

  describe('Authenticated Navigation', () => {
    it('should show Dashboard link when authenticated', () => {
      renderHeader(true);

      const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
      expect(dashboardLink).toBeInTheDocument();
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    });

    it('should mark Dashboard as current on account dashboard', () => {
      renderHeader(true, '/dashboard');

      const dashboardLink = screen.getByTestId('nav-dashboard');
      expect(dashboardLink).toHaveAttribute('aria-current', 'page');
    });

    it('should not mark Dashboard as current on site workspace routes', () => {
      renderHeader(true, '/dashboard/sites/site-1/orders');

      const dashboardLink = screen.getByTestId('nav-dashboard');
      expect(dashboardLink).toBeInTheDocument();
      expect(dashboardLink).not.toHaveAttribute('aria-current', 'page');
    });

    it('should show Create Site link when authenticated', () => {
      renderHeader(true, '/dashboard');

      const createSiteLink = screen.getByRole('link', { name: /Create Site/i });
      expect(createSiteLink).toBeInTheDocument();
      expect(createSiteLink).toHaveAttribute('href', '/setup');
    });

    it('should show Gallery link when authenticated', () => {
      renderHeader(true);

      const galleryLinks = screen.getAllByTestId('nav-gallery');
      expect(galleryLinks.length).toBeGreaterThan(0);
      expect(galleryLinks[0]).toHaveAttribute('href', '/showcase');
    });

    it('should show Logout button when authenticated', () => {
      renderHeader(true);

      const logoutButton = screen.getByRole('button', { name: /Logout/i });
      expect(logoutButton).toBeInTheDocument();
    });

    it('should not show Login link when authenticated', () => {
      renderHeader(true);

      expect(screen.queryByRole('link', { name: /^Login$/i })).not.toBeInTheDocument();
    });

    it('should not show Get Started button when authenticated', () => {
      renderHeader(true);

      expect(screen.queryByRole('link', { name: /Get Started/i })).not.toBeInTheDocument();
    });
  });

  describe('Staff route navigation', () => {
    it('should not show Create Site on /staff', () => {
      renderHeader(true, '/staff');

      expect(screen.queryByTestId('nav-create-site')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mobile-nav-create-site')).not.toBeInTheDocument();
      expect(screen.getByTestId('nav-logout-button')).toBeInTheDocument();
    });

    it('should not show Create Site on /staff/orders', () => {
      renderHeader(true, '/staff/orders/tenant-1');

      expect(screen.queryByTestId('nav-create-site')).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /Create Site/i })).not.toBeInTheDocument();
    });

    it('should not show Dashboard on staff routes', () => {
      renderHeader(true, '/staff/dashboard');

      expect(screen.queryByTestId('nav-dashboard')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mobile-nav-dashboard')).not.toBeInTheDocument();
    });

    it('should show Create Site on /dashboard for owners', () => {
      renderHeader(true, '/dashboard');

      expect(screen.getByTestId('nav-create-site')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Create Site/i })).toHaveAttribute('href', '/setup');
    });
  });

  describe('Logout Functionality', () => {
    it('should call logout when clicking logout button', async () => {
      const user = userEvent.setup();
      renderHeader(true);

      const logoutButton = screen.getByRole('button', { name: /Logout/i });
      await user.click(logoutButton);

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('should have accessible logout button', () => {
      renderHeader(true);

      const logoutButton = screen.getByRole('button', { name: /Logout/i });
      expect(logoutButton).toHaveClass('btn', 'btn-secondary');
    });
  });

  describe('Responsive Layout', () => {
    it('should render header with proper structure', () => {
      renderHeader();

      const header = document.querySelector('.site-header');
      expect(header).toBeInTheDocument();

      const container = document.querySelector('.header-container');
      expect(container).toBeInTheDocument();

      const nav = document.querySelector('.nav-menu');
      expect(nav).toBeInTheDocument();
    });

    it('should have logo with proper classes', () => {
      renderHeader();

      const logo = document.querySelector('.logo');
      expect(logo).toBeInTheDocument();

      const logoIcon = document.querySelector('.logo-icon');
      expect(logoIcon).toBeInTheDocument();

      const logoText = document.querySelector('.logo-text');
      expect(logoText).toBeInTheDocument();
    });
  });

  describe('Navigation Links Styling', () => {
    it('should apply nav-link class to navigation links', () => {
      renderHeader(false);

      const loginLink = screen.getByRole('link', { name: /Login/i });
      expect(loginLink).toHaveClass('nav-link');
    });

    it('should apply btn classes to buttons', () => {
      renderHeader(false);

      const getStartedButton = screen.getByRole('link', { name: /Get Started/i });
      expect(getStartedButton).toHaveClass('btn', 'btn-primary');
    });
  });

  describe('Accessibility', () => {
    it('should have semantic header element', () => {
      renderHeader();

      const header = document.querySelector('header');
      expect(header).toBeInTheDocument();
    });

    it('should have semantic nav element', () => {
      renderHeader();

      const nav = document.querySelector('nav');
      expect(nav).toBeInTheDocument();
    });

    it('should have accessible button text', () => {
      renderHeader(true);

      const logoutButton = screen.getByRole('button', { name: /Logout/i });
      expect(logoutButton).toHaveAccessibleName('Logout');
    });

    it('should have descriptive link text', () => {
      renderHeader(true, '/dashboard');

      expect(screen.getByRole('link', { name: /Dashboard/i })).toHaveAccessibleName();
      expect(screen.getByRole('link', { name: /Create Site/i })).toHaveAccessibleName();
    });

    it('should show light and dark theme controls', () => {
      renderHeader(true);

      expect(screen.getAllByTestId('theme-switcher-light').length).toBeGreaterThan(0);
      expect(screen.getAllByTestId('theme-switcher-dark').length).toBeGreaterThan(0);
    });
  });
});

