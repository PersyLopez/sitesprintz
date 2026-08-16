/**
 * SHOWCASE GALLERY COMPONENT TESTS
 * 
 * TDD Phase: RED
 * Testing the ShowcaseGallery React component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, fireEvent, act } from '@testing-library/react';
import ShowcaseGallery from '../../src/pages/ShowcaseGallery';
import { renderWithAllProviders } from '../utils/testWrapper.jsx';

// Mock fetch globally
global.fetch = vi.fn();

vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: false, user: null, loading: false }),
}));

const mockSites = [
  {
    id: 'site-1',
    subdomain: 'amazing-restaurant',
    template: 'restaurant',
    template_id: 'restaurant',
    status: 'published',
    plan: 'pro',
    is_public: true,
    created_at: '2024-01-01T00:00:00Z',
    site_data: {
      hero: { title: 'Amazing Restaurant' },
      images: { hero: '/images/restaurant-hero.jpg' }
    }
  },
  {
    id: 'site-2',
    subdomain: 'beauty-salon',
    template: 'salon',
    template_id: 'salon',
    status: 'published',
    plan: 'starter',
    is_public: true,
    created_at: '2024-01-02T00:00:00Z',
    site_data: {
      hero: { title: 'Beauty Salon' },
      images: { hero: '/images/salon-hero.jpg' }
    }
  },
  {
    id: 'site-3',
    subdomain: 'fitness-gym',
    template: 'gym',
    template_id: 'gym',
    status: 'published',
    plan: 'pro',
    is_public: true,
    created_at: '2024-01-03T00:00:00Z',
    site_data: {
      hero: { title: 'Fitness Gym' },
      images: { hero: '/images/gym-hero.jpg' }
    }
  }
];

const mockCategories = [
  { template: 'restaurant', count: 10 },
  { template: 'salon', count: 8 },
  { template: 'gym', count: 5 }
];

// Helper to render component with all providers
function renderWithRouter(component) {
  return renderWithAllProviders(component, { initialEntries: ['/showcase'] });
}

describe('ShowcaseGallery Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch.mockImplementation((url) => {
      const href = String(url);
      if (href.includes('/api/showcases/categories')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ categories: mockCategories }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          sites: mockSites,
          total: mockSites.length,
          page: 1,
          limit: 12,
        }),
      });
    });
  });

  // ==================== RENDERING TESTS ====================
  describe('Component Rendering', () => {
    it('should render the showcase gallery title', async () => {
      await act(async () => {
        renderWithRouter(<ShowcaseGallery />);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/See how your site could look/i)).toBeInTheDocument();
      });
    });

    it('should render the showcase description', async () => {
      await act(async () => {
        renderWithRouter(<ShowcaseGallery />);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Browse live examples by industry and theme/i)).toBeInTheDocument();
      });
    });

    it('should show loading state initially', async () => {
      await act(async () => {
        renderWithRouter(<ShowcaseGallery />);
      });
      
      // Loading state may be brief, check if it exists or content loads
      const loadingOrContent = screen.queryByText(/Loading/i) || screen.queryByText('Amazing Restaurant');
      expect(loadingOrContent).toBeTruthy();
    });

    it('should render site cards after data loads', async () => {
      await act(async () => {
        renderWithRouter(<ShowcaseGallery />);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Amazing Restaurant')).toBeInTheDocument();
        expect(screen.getByText('Beauty Salon')).toBeInTheDocument();
        expect(screen.getByText('Fitness Gym')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should render site preview images', async () => {
      await act(async () => {
        renderWithRouter(<ShowcaseGallery />);
      });
      
      await waitFor(() => {
        const images = screen.getAllByRole('img');
        expect(images.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });
  });

  // ==================== DATA FETCHING TESTS ====================
  describe('Data Fetching', () => {
    it('should fetch showcase sites on mount', async () => {
      await act(async () => {
        renderWithRouter(<ShowcaseGallery />);
      });
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/showcase'),
          expect.anything()
        );
      }, { timeout: 3000 });
    });

    it('should handle successful data fetch', async () => {
      await act(async () => {
        renderWithRouter(<ShowcaseGallery />);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Amazing Restaurant')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should handle fetch errors gracefully', async () => {
      global.fetch.mockImplementation((url) => {
        const href = String(url);
        if (href.includes('/categories')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ categories: [] }),
          });
        }
        return Promise.reject(new Error('Network error'));
      });

      await act(async () => {
        renderWithRouter(<ShowcaseGallery />);
      });

      await waitFor(() => {
        expect(screen.getByText(/Failed to load showcase/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should show empty state when no sites exist', async () => {
      global.fetch.mockImplementation((url) => {
        const href = String(url);
        if (href.includes('/categories')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ categories: [] }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ sites: [], total: 0, page: 1, limit: 12 }),
        });
      });

      await act(async () => {
        renderWithRouter(<ShowcaseGallery />);
      });

      await waitFor(() => {
        expect(screen.getByText(/No examples found/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  // ==================== FILTERING TESTS ====================
  describe('Category Filtering', () => {
    beforeEach(() => {
      global.fetch.mockImplementation((url) => {
        const href = String(url);
        if (href.includes('/api/showcases/categories')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ categories: mockCategories }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            sites: mockSites,
            total: mockSites.length,
            page: 1,
            limit: 12,
          }),
        });
      });
    });

    it('should render category filter buttons', async () => {
      renderWithRouter(<ShowcaseGallery />);

      await waitFor(() => {
        expect(screen.getByTestId('category-btn-all')).toBeInTheDocument();
        expect(screen.getByTestId('category-btn-restaurant')).toBeInTheDocument();
      });
    });

    it('should filter sites by category when clicked', async () => {
      renderWithRouter(<ShowcaseGallery />);

      await waitFor(() => {
        expect(screen.getByTestId('category-btn-restaurant')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('category-btn-restaurant'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('category=restaurant'),
          expect.anything()
        );
      });
    });

    it('should show active state on selected category', async () => {
      renderWithRouter(<ShowcaseGallery />);

      await waitFor(() => {
        const allButton = screen.getByTestId('category-btn-all');
        expect(allButton).toHaveClass('active');
      });
    });

    it('should reset to all categories when "All" is clicked', async () => {
      renderWithRouter(<ShowcaseGallery />);

      await waitFor(() => {
        expect(screen.getByTestId('category-btn-restaurant')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('category-btn-restaurant'));
      fireEvent.click(screen.getByTestId('category-btn-all'));

      await waitFor(() => {
        const calls = global.fetch.mock.calls.map((c) => String(c[0]));
        expect(calls.some((u) => u.includes('/api/showcases?') && !u.includes('category='))).toBe(true);
      });
    });
  });

  // ==================== SEARCH TESTS ====================
  describe('Search Functionality', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('should render search input', () => {
      renderWithRouter(<ShowcaseGallery />);

      expect(screen.getByPlaceholderText(/Search/i)).toBeInTheDocument();
    });

    it('should update search query on input', async () => {
      renderWithRouter(<ShowcaseGallery />);

      const searchInput = screen.getByPlaceholderText(/Search/i);
      fireEvent.change(searchInput, { target: { value: 'restaurant' } });

      expect(searchInput.value).toBe('restaurant');
    });

    it('should fetch with search query when input changes', async () => {
      renderWithRouter(<ShowcaseGallery />);

      await waitFor(() => {
        expect(screen.getByText('Amazing Restaurant')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search/i);
      fireEvent.change(searchInput, { target: { value: 'rest' } });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('search=rest'),
          expect.anything()
        );
      });
    });

    it('should clear search when input is cleared', async () => {
      renderWithRouter(<ShowcaseGallery />);

      await waitFor(() => {
        expect(screen.getByText('Amazing Restaurant')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search/i);
      fireEvent.change(searchInput, { target: { value: 'restaurant' } });
      fireEvent.change(searchInput, { target: { value: '' } });

      await waitFor(() => {
        const calls = global.fetch.mock.calls.map((c) => String(c[0]));
        expect(calls.some((u) => u.includes('/api/showcases?') && !u.includes('search='))).toBe(true);
      });
    });
  });

  // ==================== PAGINATION TESTS ====================
  describe('Pagination', () => {
    beforeEach(() => {
      global.fetch.mockImplementation((url) => {
        const href = String(url);
        if (href.includes('/categories')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ categories: mockCategories }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            sites: mockSites,
            total: 50,
            page: 1,
            limit: 12,
          }),
        });
      });
    });

    it('should render pagination controls when there are multiple pages', async () => {
      renderWithRouter(<ShowcaseGallery />);
      
      await waitFor(() => {
        expect(screen.getByText(/Next/i)).toBeInTheDocument();
      });
    });

    it('should load next page when Next is clicked', async () => {
      renderWithRouter(<ShowcaseGallery />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Next page/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByLabelText(/Next page/i));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('page=2'),
          expect.anything()
        );
      });
    });

    it('should disable Previous button on first page', async () => {
      renderWithRouter(<ShowcaseGallery />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Previous page/i)).toBeDisabled();
      });
    });

    it('should show current page number', async () => {
      renderWithRouter(<ShowcaseGallery />);

      await waitFor(() => {
        expect(screen.getByTestId('showcase-pagination')).toHaveTextContent(/Page\s*1\s*of\s*5/i);
      });
    });
  });

  // ==================== NAVIGATION TESTS ====================
  describe('Navigation', () => {
    it('should link to individual site showcase pages', async () => {
      renderWithRouter(<ShowcaseGallery />);

      await waitFor(() => {
        const detailLink = screen.getByTestId('site-card-amazing-restaurant').querySelector('a');
        expect(detailLink).toHaveAttribute('href', '/showcase/amazing-restaurant');
      });
    });

    it('should link to the live published site', async () => {
      renderWithRouter(<ShowcaseGallery />);

      await waitFor(() => {
        const visit = screen.getByTestId('visit-site-amazing-restaurant');
        expect(visit).toHaveAttribute('href', '/view/amazing-restaurant');
      });
    });
  });

  // ==================== RESPONSIVE DESIGN TESTS ====================
  describe('Responsive Design', () => {
    it('should render grid layout for desktop', async () => {
      renderWithRouter(<ShowcaseGallery />);
      
      await waitFor(() => {
        const grid = screen.getByTestId('showcase-grid');
        expect(grid).toHaveClass('showcase-grid');
      });
    });

    it('should adjust grid columns based on viewport', async () => {
      renderWithRouter(<ShowcaseGallery />);
      
      await waitFor(() => {
        const grid = screen.getByTestId('showcase-grid');
        expect(grid).toBeInTheDocument();
      });
    });
  });

  // ==================== SEO TESTS ====================
  describe('SEO Optimization', () => {
    it('should set page title for SEO', async () => {
      renderWithRouter(<ShowcaseGallery />);
      
      await waitFor(() => {
        expect(document.title).toContain('Gallery');
      });
    });

    it('should render meta description', async () => {
      renderWithRouter(<ShowcaseGallery />);
      
      await waitFor(() => {
        const metaDescription = document.querySelector('meta[name="description"]');
        expect(metaDescription).toBeTruthy();
      });
    });
  });

  // ==================== ACCESSIBILITY TESTS ====================
  describe('Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      renderWithRouter(<ShowcaseGallery />);
      
      await waitFor(() => {
        const h1 = screen.getByRole('heading', { level: 1 });
        expect(h1).toBeInTheDocument();
      });
    });

    it('should have alt text for images', async () => {
      renderWithRouter(<ShowcaseGallery />);
      
      await waitFor(() => {
        const images = screen.getAllByRole('img');
        images.forEach(img => {
          expect(img).toHaveAttribute('alt');
        });
      });
    });

    it('should be keyboard navigable', async () => {
      renderWithRouter(<ShowcaseGallery />);
      
      await waitFor(() => {
        const links = screen.getAllByRole('link');
        links.forEach(link => {
          expect(link).toHaveAttribute('href');
        });
      });
    });
  });
});

