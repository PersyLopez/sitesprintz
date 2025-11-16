/**
 * SHOWCASE GALLERY COMPONENT TESTS
 * 
 * TDD Phase: RED
 * Testing the ShowcaseGallery React component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ShowcaseGallery from '../../src/pages/ShowcaseGallery';

// Mock fetch globally
global.fetch = vi.fn();

const mockSites = [
  {
    id: 'site-1',
    subdomain: 'amazing-restaurant',
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

// Helper to render component with router
function renderWithRouter(component) {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
}

describe('ShowcaseGallery Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        sites: mockSites,
        total: mockSites.length,
        page: 1,
        limit: 12
      })
    });
  });

  // ==================== RENDERING TESTS ====================
  describe('Component Rendering', () => {
    it('should render the showcase gallery title', async () => {
      renderWithRouter(<ShowcaseGallery />);
      
      expect(screen.getByText(/Made with SiteSprintz/i)).toBeInTheDocument();
    });

    it('should render the showcase description', async () => {
      renderWithRouter(<ShowcaseGallery />);
      
      expect(screen.getByText(/Discover amazing websites/i)).toBeInTheDocument();
    });

    it('should show loading state initially', () => {
      renderWithRouter(<ShowcaseGallery />);
      
      expect(screen.getByText(/Loading/i)).toBeInTheDocument();
    });

    it('should render site cards after data loads', async () => {
      renderWithRouter(<ShowcaseGallery />);
      
      await waitFor(() => {
        expect(screen.getByText('Amazing Restaurant')).toBeInTheDocument();
        expect(screen.getByText('Beauty Salon')).toBeInTheDocument();
        expect(screen.getByText('Fitness Gym')).toBeInTheDocument();
      });
    });

    it('should render site preview images', async () => {
      renderWithRouter(<ShowcaseGallery />);
      
      await waitFor(() => {
        const images = screen.getAllByRole('img');
        expect(images.length).toBeGreaterThan(0);
      });
    });
  });

  // ==================== DATA FETCHING TESTS ====================
  describe('Data Fetching', () => {
    it('should fetch showcase sites on mount', async () => {
      renderWithRouter(<ShowcaseGallery />);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/showcase')
        );
      });
    });

    it('should handle successful data fetch', async () => {
      renderWithRouter(<ShowcaseGallery />);
      
      await waitFor(() => {
        expect(screen.getByText('Amazing Restaurant')).toBeInTheDocument();
      });
    });

    it('should handle fetch errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      
      renderWithRouter(<ShowcaseGallery />);
      
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    it('should show empty state when no sites exist', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sites: [], total: 0, page: 1, limit: 12 })
      });
      
      renderWithRouter(<ShowcaseGallery />);
      
      await waitFor(() => {
        expect(screen.getByText(/No sites/i)).toBeInTheDocument();
      });
    });
  });

  // ==================== FILTERING TESTS ====================
  describe('Category Filtering', () => {
    beforeEach(() => {
      // Mock categories endpoint
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/showcase/categories')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockCategories
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            sites: mockSites,
            total: mockSites.length,
            page: 1,
            limit: 12
          })
        });
      });
    });

    it('should render category filter buttons', async () => {
      renderWithRouter(<ShowcaseGallery />);
      
      await waitFor(() => {
        expect(screen.getByText(/All/i)).toBeInTheDocument();
        expect(screen.getByText(/Restaurant/i)).toBeInTheDocument();
      });
    });

    it('should filter sites by category when clicked', async () => {
      renderWithRouter(<ShowcaseGallery />);
      
      await waitFor(() => {
        expect(screen.getByText(/Restaurant/i)).toBeInTheDocument();
      });

      const restaurantButton = screen.getByText(/Restaurant/i);
      fireEvent.click(restaurantButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('category=restaurant')
        );
      });
    });

    it('should show active state on selected category', async () => {
      renderWithRouter(<ShowcaseGallery />);
      
      await waitFor(() => {
        const allButton = screen.getByText(/All/i);
        expect(allButton).toHaveClass('active');
      });
    });

    it('should reset to all categories when "All" is clicked', async () => {
      renderWithRouter(<ShowcaseGallery />);
      
      await waitFor(() => {
        const restaurantButton = screen.getByText(/Restaurant/i);
        fireEvent.click(restaurantButton);
      });

      await waitFor(() => {
        const allButton = screen.getByText(/All/i);
        fireEvent.click(allButton);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.not.stringContaining('category=')
        );
      });
    });
  });

  // ==================== SEARCH TESTS ====================
  describe('Search Functionality', () => {
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

    it('should debounce search requests', async () => {
      vi.useFakeTimers();
      renderWithRouter(<ShowcaseGallery />);
      
      await waitFor(() => {
        expect(screen.getByText('Amazing Restaurant')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search/i);
      fireEvent.change(searchInput, { target: { value: 'rest' } });
      
      // Should not call immediately
      expect(global.fetch).toHaveBeenCalledTimes(1); // Only initial load
      
      // Fast-forward timers
      vi.advanceTimersByTime(500);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('search=rest')
        );
      });
      
      vi.useRealTimers();
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
        expect(global.fetch).toHaveBeenCalledWith(
          expect.not.stringContaining('search=')
        );
      });
    });
  });

  // ==================== PAGINATION TESTS ====================
  describe('Pagination', () => {
    beforeEach(() => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          sites: mockSites,
          total: 50, // More than one page
          page: 1,
          limit: 12
        })
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
        const nextButton = screen.getByText(/Next/i);
        fireEvent.click(nextButton);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('page=2')
        );
      });
    });

    it('should disable Previous button on first page', async () => {
      renderWithRouter(<ShowcaseGallery />);
      
      await waitFor(() => {
        const prevButton = screen.getByText(/Previous/i);
        expect(prevButton).toBeDisabled();
      });
    });

    it('should show current page number', async () => {
      renderWithRouter(<ShowcaseGallery />);
      
      await waitFor(() => {
        expect(screen.getByText(/Page 1 of/i)).toBeInTheDocument();
      });
    });
  });

  // ==================== NAVIGATION TESTS ====================
  describe('Navigation', () => {
    it('should link to individual site showcase pages', async () => {
      renderWithRouter(<ShowcaseGallery />);
      
      await waitFor(() => {
        const links = screen.getAllByRole('link');
        expect(links[0]).toHaveAttribute('href', '/showcase/amazing-restaurant');
      });
    });

    it('should open site in new tab when external link is clicked', async () => {
      renderWithRouter(<ShowcaseGallery />);
      
      await waitFor(() => {
        const externalLinks = screen.getAllByText(/Visit Site/i);
        expect(externalLinks[0].closest('a')).toHaveAttribute('target', '_blank');
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
        expect(document.title).toContain('Showcase');
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

