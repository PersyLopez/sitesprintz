/**
 * SHOWCASE DETAIL COMPONENT TESTS
 * 
 * TDD Phase: RED
 * Testing the ShowcaseDetail React component for individual site showcase pages
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import ShowcaseDetail from '../../src/pages/ShowcaseDetail';

// Mock fetch globally
global.fetch = vi.fn();

const mockSite = {
  id: 'site-1',
  subdomain: 'amazing-restaurant',
  template_id: 'restaurant',
  status: 'published',
  plan: 'pro',
  is_public: true,
  created_at: '2024-01-15T00:00:00Z',
  site_data: {
    hero: {
      title: 'The Amazing Restaurant',
      subtitle: 'Fine dining in the heart of the city',
      backgroundImage: '/images/restaurant-hero.jpg'
    },
    about: {
      title: 'Our Story',
      description: 'We serve the finest cuisine with passion and dedication.'
    },
    contact: {
      phone: '(555) 123-4567',
      email: 'info@amazingrestaurant.com',
      address: '123 Main St, City, ST 12345'
    },
    images: {
      hero: '/images/restaurant-hero.jpg',
      gallery: [
        '/images/dish1.jpg',
        '/images/dish2.jpg',
        '/images/interior.jpg'
      ]
    }
  }
};

// Helper to render with router
function renderWithRouter(component, route = '/showcase/amazing-restaurant') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {component}
    </MemoryRouter>
  );
}

describe('ShowcaseDetail Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockSite
    });
  });

  // ==================== RENDERING TESTS ====================
  describe('Component Rendering', () => {
    it('should render the showcase detail page', async () => {
      renderWithRouter(<ShowcaseDetail />);
      
      await waitFor(() => {
        expect(screen.getByText('The Amazing Restaurant')).toBeInTheDocument();
      });
    });

    it('should display site hero image', async () => {
      renderWithRouter(<ShowcaseDetail />);
      
      await waitFor(() => {
        const heroImage = screen.getByAltText(/Amazing Restaurant/i);
        expect(heroImage).toBeInTheDocument();
        expect(heroImage).toHaveAttribute('src', expect.stringContaining('restaurant-hero'));
      });
    });

    it('should display site subtitle/tagline', async () => {
      renderWithRouter(<ShowcaseDetail />);
      
      await waitFor(() => {
        expect(screen.getByText(/Fine dining/i)).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      renderWithRouter(<ShowcaseDetail />);
      
      expect(screen.getByText(/Loading/i)).toBeInTheDocument();
    });

    it('should display site category badge', async () => {
      renderWithRouter(<ShowcaseDetail />);
      
      await waitFor(() => {
        expect(screen.getByText(/Restaurant/i)).toBeInTheDocument();
      });
    });

    it('should display site plan badge', async () => {
      renderWithRouter(<ShowcaseDetail />);
      
      await waitFor(() => {
        expect(screen.getByText(/Pro/i)).toBeInTheDocument();
      });
    });
  });

  // ==================== DATA FETCHING TESTS ====================
  describe('Data Fetching', () => {
    it('should fetch site details from API on mount', async () => {
      renderWithRouter(<ShowcaseDetail />);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/showcase/amazing-restaurant')
        );
      });
    });

    it('should use subdomain from URL params', async () => {
      renderWithRouter(<ShowcaseDetail />, '/showcase/my-custom-site');
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/showcase/my-custom-site')
        );
      });
    });

    it('should handle successful data fetch', async () => {
      renderWithRouter(<ShowcaseDetail />);
      
      await waitFor(() => {
        expect(screen.getByText('The Amazing Restaurant')).toBeInTheDocument();
      });
    });

    it('should handle 404 not found errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Site not found' })
      });
      
      renderWithRouter(<ShowcaseDetail />);
      
      await waitFor(() => {
        expect(screen.getByText(/not found/i)).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      
      renderWithRouter(<ShowcaseDetail />);
      
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });
  });

  // ==================== CONTENT DISPLAY TESTS ====================
  describe('Content Display', () => {
    it('should display about section if available', async () => {
      renderWithRouter(<ShowcaseDetail />);
      
      await waitFor(() => {
        expect(screen.getByText('Our Story')).toBeInTheDocument();
        expect(screen.getByText(/finest cuisine/i)).toBeInTheDocument();
      });
    });

    it('should display contact information if available', async () => {
      renderWithRouter(<ShowcaseDetail />);
      
      await waitFor(() => {
        expect(screen.getByText('(555) 123-4567')).toBeInTheDocument();
        expect(screen.getByText('info@amazingrestaurant.com')).toBeInTheDocument();
      });
    });

    it('should display image gallery if available', async () => {
      renderWithRouter(<ShowcaseDetail />);
      
      await waitFor(() => {
        const images = screen.getAllByRole('img');
        expect(images.length).toBeGreaterThan(1);
      });
    });

    it('should handle sites with minimal data gracefully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockSite,
          site_data: {
            hero: { title: 'Simple Site' }
          }
        })
      });
      
      renderWithRouter(<ShowcaseDetail />);
      
      await waitFor(() => {
        expect(screen.getByText('Simple Site')).toBeInTheDocument();
      });
    });
  });

  // ==================== METADATA TESTS ====================
  describe('Site Metadata', () => {
    it('should display launch date', async () => {
      renderWithRouter(<ShowcaseDetail />);
      
      await waitFor(() => {
        expect(screen.getByText(/Launched/i)).toBeInTheDocument();
        expect(screen.getByText(/2024/i)).toBeInTheDocument();
      });
    });

    it('should display site category', async () => {
      renderWithRouter(<ShowcaseDetail />);
      
      await waitFor(() => {
        expect(screen.getByText(/Restaurant/i)).toBeInTheDocument();
      });
    });

    it('should display site plan tier', async () => {
      renderWithRouter(<ShowcaseDetail />);
      
      await waitFor(() => {
        expect(screen.getByText(/Pro Plan/i)).toBeInTheDocument();
      });
    });
  });

  // ==================== NAVIGATION TESTS ====================
  describe('Navigation', () => {
    it('should have link to visit live site', async () => {
      renderWithRouter(<ShowcaseDetail />);
      
      await waitFor(() => {
        const visitLink = screen.getByText(/Visit Site/i).closest('a');
        expect(visitLink).toHaveAttribute('href', 'https://amazing-restaurant.sitesprintz.com');
        expect(visitLink).toHaveAttribute('target', '_blank');
      });
    });

    it('should have back to gallery link', async () => {
      renderWithRouter(<ShowcaseDetail />);
      
      await waitFor(() => {
        const backLink = screen.getByText(/Back to Gallery/i).closest('a');
        expect(backLink).toHaveAttribute('href', '/showcase');
      });
    });

    it('should have share button', async () => {
      renderWithRouter(<ShowcaseDetail />);
      
      await waitFor(() => {
        expect(screen.getByText(/Share/i)).toBeInTheDocument();
      });
    });
  });

  // ==================== SEO TESTS ====================
  describe('SEO Optimization', () => {
    it('should set page title dynamically', async () => {
      renderWithRouter(<ShowcaseDetail />);
      
      await waitFor(() => {
        expect(document.title).toContain('The Amazing Restaurant');
      });
    });

    it('should set meta description', async () => {
      renderWithRouter(<ShowcaseDetail />);
      
      await waitFor(() => {
        const metaDescription = document.querySelector('meta[name="description"]');
        expect(metaDescription).toBeTruthy();
        expect(metaDescription.getAttribute('content')).toContain('Amazing Restaurant');
      });
    });

    it('should have proper heading hierarchy', async () => {
      renderWithRouter(<ShowcaseDetail />);
      
      await waitFor(() => {
        const h1 = screen.getByRole('heading', { level: 1 });
        expect(h1).toBeInTheDocument();
        expect(h1).toHaveTextContent('The Amazing Restaurant');
      });
    });
  });

  // ==================== RESPONSIVE DESIGN TESTS ====================
  describe('Responsive Design', () => {
    it('should render mobile layout', async () => {
      renderWithRouter(<ShowcaseDetail />);
      
      await waitFor(() => {
        const container = screen.getByTestId('showcase-detail');
        expect(container).toBeInTheDocument();
      });
    });

    it('should display images responsively', async () => {
      renderWithRouter(<ShowcaseDetail />);
      
      await waitFor(() => {
        const images = screen.getAllByRole('img');
        images.forEach(img => {
          expect(img).toHaveStyle({ maxWidth: '100%' });
        });
      });
    });
  });

  // ==================== CALL TO ACTION TESTS ====================
  describe('Call to Action', () => {
    it('should display "Create Your Own" CTA', async () => {
      renderWithRouter(<ShowcaseDetail />);
      
      await waitFor(() => {
        expect(screen.getByText(/Create Your Own/i)).toBeInTheDocument();
      });
    });

    it('should have CTA link to homepage', async () => {
      renderWithRouter(<ShowcaseDetail />);
      
      await waitFor(() => {
        const ctaLink = screen.getByText(/Create Your Own/i).closest('a');
        expect(ctaLink).toHaveAttribute('href', '/');
      });
    });
  });

  // ==================== SOCIAL FEATURES TESTS ====================
  describe('Social Features', () => {
    it('should have social share buttons', async () => {
      renderWithRouter(<ShowcaseDetail />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Share on Twitter/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Share on Facebook/i)).toBeInTheDocument();
      });
    });

    it('should copy link to clipboard on share', async () => {
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined)
        }
      });
      
      renderWithRouter(<ShowcaseDetail />);
      
      await waitFor(() => {
        const copyButton = screen.getByText(/Copy Link/i);
        copyButton.click();
      });

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          expect.stringContaining('amazing-restaurant')
        );
      });
    });
  });

  // ==================== ACCESSIBILITY TESTS ====================
  describe('Accessibility', () => {
    it('should have alt text for all images', async () => {
      renderWithRouter(<ShowcaseDetail />);
      
      await waitFor(() => {
        const images = screen.getAllByRole('img');
        images.forEach(img => {
          expect(img).toHaveAttribute('alt');
          expect(img.getAttribute('alt')).not.toBe('');
        });
      });
    });

    it('should be keyboard navigable', async () => {
      renderWithRouter(<ShowcaseDetail />);
      
      await waitFor(() => {
        const links = screen.getAllByRole('link');
        links.forEach(link => {
          expect(link).toHaveAttribute('href');
        });
      });
    });

    it('should have ARIA labels for interactive elements', async () => {
      renderWithRouter(<ShowcaseDetail />);
      
      await waitFor(() => {
        const shareButtons = screen.getAllByRole('button');
        shareButtons.forEach(button => {
          expect(
            button.hasAttribute('aria-label') || button.textContent.length > 0
          ).toBeTruthy();
        });
      });
    });
  });

  // ==================== ERROR HANDLING TESTS ====================
  describe('Error Handling', () => {
    it('should show error message on fetch failure', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Failed to fetch'));
      
      renderWithRouter(<ShowcaseDetail />);
      
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    it('should show 404 page for nonexistent site', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' })
      });
      
      renderWithRouter(<ShowcaseDetail />);
      
      await waitFor(() => {
        expect(screen.getByText(/not found/i)).toBeInTheDocument();
      });
    });

    it('should have retry button on error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      
      renderWithRouter(<ShowcaseDetail />);
      
      await waitFor(() => {
        expect(screen.getByText(/Try Again/i)).toBeInTheDocument();
      });
    });
  });
});

