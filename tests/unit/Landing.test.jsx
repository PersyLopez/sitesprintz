import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Landing from '../../src/pages/Landing';
import { AuthContext } from '../../src/context/AuthContext';

// Mock child components
vi.mock('../../src/components/layout/Header', () => ({
  default: () => <div data-testid="header">Header</div>,
}));

vi.mock('../../src/components/layout/Footer', () => ({
  default: () => <div data-testid="footer">Footer</div>,
}));

describe('Landing Page', () => {
  const renderLanding = () => {
    return render(
      <BrowserRouter>
        <AuthContext.Provider
          value={{
            user: null,
            loading: false,
            isAuthenticated: false,
            logout: vi.fn(),
          }}
        >
          <Landing />
        </AuthContext.Provider>
      </BrowserRouter>
    );
  };

  let intervalId;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    if (intervalId) {
      clearInterval(intervalId);
    }
  });

  describe('Page Structure', () => {
    it('should render header and footer', () => {
      renderLanding();

      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('footer')).toBeInTheDocument();
    });

    it('should render hero section', () => {
      renderLanding();

      expect(
        screen.getByText('Create Your Professional Website in Minutes')
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /Choose from beautiful templates, customize with our easy editor/i
        )
      ).toBeInTheDocument();
    });

    it('should display hero badge', () => {
      renderLanding();

      expect(screen.getByText('Launch Your Business Online Today')).toBeInTheDocument();
    });
  });

  describe('CTA Buttons', () => {
    it('should have Get Started Free button in hero', () => {
      renderLanding();

      const ctaButton = screen.getByRole('link', { name: /Get Started Free/i });
      expect(ctaButton).toBeInTheDocument();
      expect(ctaButton).toHaveAttribute('href', '/register');
    });

    it('should have View Templates button in hero', () => {
      renderLanding();

      const templatesButton = screen.getByRole('link', { name: /View Templates/i });
      expect(templatesButton).toBeInTheDocument();
      expect(templatesButton).toHaveAttribute('href', '#templates');
    });

    it('should have Create Your Website Now button in final CTA', () => {
      renderLanding();

      const finalCta = screen.getByRole('link', { name: /Create Your Website Now/i });
      expect(finalCta).toBeInTheDocument();
      expect(finalCta).toHaveAttribute('href', '/register');
    });
  });

  describe('Template Categories', () => {
    it('should display Restaurant template card', () => {
      renderLanding();

      expect(screen.getByRole('heading', { name: 'Restaurant' })).toBeInTheDocument();
      expect(screen.getByText('Menu, reservations, contact')).toBeInTheDocument();
      expect(screen.getAllByText(/Fine Dining/i).length).toBeGreaterThan(0);
    });

    it('should display Salon & Spa template card', () => {
      renderLanding();

      expect(screen.getByRole('heading', { name: 'Salon & Spa' })).toBeInTheDocument();
      expect(screen.getByText('Services, booking, gallery')).toBeInTheDocument();
      expect(screen.getAllByText(/Hair Salon/i).length).toBeGreaterThan(0);
    });

    it('should display Fitness & Gym template card', () => {
      renderLanding();

      expect(screen.getByRole('heading', { name: 'Fitness & Gym' })).toBeInTheDocument();
      expect(screen.getByText('Classes, pricing, testimonials')).toBeInTheDocument();
      expect(screen.getAllByText(/CrossFit/i).length).toBeGreaterThan(0);
    });

    it('should display Consultant template card', () => {
      renderLanding();

      expect(screen.getByRole('heading', { name: 'Consultant' })).toBeInTheDocument();
      expect(screen.getByText('About, services, contact')).toBeInTheDocument();
      expect(screen.getAllByText(/Business/i).length).toBeGreaterThan(0);
    });

    it('should display Electrician template card', () => {
      renderLanding();

      expect(screen.getByRole('heading', { name: 'Electrician' })).toBeInTheDocument();
      expect(screen.getByText('Services, emergency, booking')).toBeInTheDocument();
      expect(screen.getAllByText(/Residential/i).length).toBeGreaterThan(0);
    });

    it('should display Auto Repair template card', () => {
      renderLanding();

      expect(screen.getByRole('heading', { name: 'Auto Repair' })).toBeInTheDocument();
      expect(screen.getByText('Services, booking, pricing')).toBeInTheDocument();
      expect(screen.getByText('Quick Service')).toBeInTheDocument();
    });

    it('should have all template cards link to registration', () => {
      renderLanding();

      const templateLinks = screen.getAllByRole('link').filter((link) => {
        const href = link.getAttribute('href');
        return href && href.startsWith('/register');
      });
      
      // Multiple template cards should link to registration (with or without template params)
      expect(templateLinks.length).toBeGreaterThan(6);
    });
  });

  describe('Templates Section', () => {
    it('should have templates section with anchor', () => {
      renderLanding();

      const templatesSection = document.querySelector('#templates');
      expect(templatesSection).toBeInTheDocument();
    });

    it('should display templates section heading', () => {
      renderLanding();

      expect(screen.getByRole('heading', { name: 'Choose Your Template' })).toBeInTheDocument();
      expect(
        screen.getByText('All templates included - pick the perfect one for your business')
      ).toBeInTheDocument();
    });
  });

  describe('How It Works Section', () => {
    it('should display How It Works heading', () => {
      renderLanding();

      expect(screen.getByRole('heading', { name: 'How It Works' })).toBeInTheDocument();
      expect(
        screen.getByText('Three simple steps to your perfect website')
      ).toBeInTheDocument();
    });

    it('should display step 1: Choose a Template', () => {
      renderLanding();

      expect(screen.getByRole('heading', { name: 'Choose a Template' })).toBeInTheDocument();
      expect(
        screen.getByText(
          'Select from 10+ professionally designed templates for your business type'
        )
      ).toBeInTheDocument();
    });

    it('should display step 2: Customize Content', () => {
      renderLanding();

      expect(screen.getByRole('heading', { name: 'Customize Content' })).toBeInTheDocument();
      expect(
        screen.getByText('Add your text, images, and branding with our intuitive editor')
      ).toBeInTheDocument();
    });

    it('should display step 3: Launch & Grow', () => {
      renderLanding();

      expect(screen.getByRole('heading', { name: 'Launch & Grow' })).toBeInTheDocument();
      expect(
        screen.getByText('Publish instantly and start attracting customers online')
      ).toBeInTheDocument();
    });
  });

  describe('Features Section', () => {
    it('should display Everything You Need heading', () => {
      renderLanding();

      expect(screen.getByRole('heading', { name: 'Everything You Need' })).toBeInTheDocument();
      expect(screen.getByText('Powerful features for modern websites')).toBeInTheDocument();
    });

    it('should display Mobile Responsive feature', () => {
      renderLanding();

      expect(screen.getByRole('heading', { name: 'Mobile Responsive' })).toBeInTheDocument();
      expect(screen.getByText('Perfect on all devices automatically')).toBeInTheDocument();
    });

    it('should display Payment Ready feature', () => {
      renderLanding();

      expect(screen.getByRole('heading', { name: 'Payment Ready' })).toBeInTheDocument();
      expect(screen.getByText('Accept payments with Stripe integration')).toBeInTheDocument();
    });

    it('should display Lightning Fast feature', () => {
      renderLanding();

      expect(screen.getByRole('heading', { name: 'Lightning Fast' })).toBeInTheDocument();
      expect(screen.getByText('Optimized for speed and SEO')).toBeInTheDocument();
    });

    it('should display Secure & Reliable feature', () => {
      renderLanding();

      expect(screen.getByRole('heading', { name: 'Secure & Reliable' })).toBeInTheDocument();
      expect(screen.getByText('HTTPS and daily backups included')).toBeInTheDocument();
    });
  });

  describe('Final CTA Section', () => {
    it('should display Ready to Get Started heading', () => {
      renderLanding();

      expect(screen.getByRole('heading', { name: 'Ready to Get Started?' })).toBeInTheDocument();
    });

    it('should display social proof text', () => {
      renderLanding();

      expect(
        screen.getByText('Join thousands of businesses already using SiteSprintz')
      ).toBeInTheDocument();
    });
  });

  describe('Template Showcase Carousel', () => {
    it('should render template showcase section', () => {
      renderLanding();

      const showcaseSection = document.querySelector('.template-showcase-section');
      expect(showcaseSection).toBeInTheDocument();
    });

    it('should have dots for manual navigation', () => {
      renderLanding();

      const dots = document.querySelectorAll('.dot');
      expect(dots.length).toBeGreaterThan(0);
    });

    it('should have slides for templates', () => {
      renderLanding();

      const slides = document.querySelectorAll('.showcase-slide');
      expect(slides.length).toBeGreaterThan(0);
    });
  });

  describe('Content Quality', () => {
    it('should have descriptive hero text', () => {
      renderLanding();

      expect(
        screen.getByText(/Choose from beautiful templates, customize with our easy editor/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/No coding required/i)).toBeInTheDocument();
    });

    it('should emphasize ease of use', () => {
      renderLanding();

      expect(screen.getByText(/in Minutes/i)).toBeInTheDocument();
      expect(screen.getByText(/Three simple steps/i)).toBeInTheDocument();
    });

    it('should highlight business benefits', () => {
      renderLanding();

      expect(screen.getByText(/Launch Your Business Online/i)).toBeInTheDocument();
      expect(screen.getByText(/start attracting customers online/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      renderLanding();

      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent('Create Your Professional Website in Minutes');

      const h2Headings = screen.getAllByRole('heading', { level: 2 });
      expect(h2Headings.length).toBeGreaterThan(3);
    });

    it('should have descriptive link text', () => {
      renderLanding();

      const getStartedLinks = screen.getAllByRole('link', { name: /Get Started/i });
      expect(getStartedLinks.length).toBeGreaterThan(0);

      const viewTemplatesLink = screen.getByRole('link', { name: /View Templates/i });
      expect(viewTemplatesLink).toBeInTheDocument();
    });
  });

  describe('Responsive Design Indicators', () => {
    it('should have template cards with proper structure', () => {
      renderLanding();

      const templateCards = document.querySelectorAll('.quick-template-card');
      expect(templateCards.length).toBeGreaterThanOrEqual(6);
    });

    it('should have feature cards with proper structure', () => {
      renderLanding();

      const featureCards = document.querySelectorAll('.feature-card');
      expect(featureCards.length).toBe(4);
    });

    it('should have step cards with proper structure', () => {
      renderLanding();

      const stepCards = document.querySelectorAll('.step-compact');
      expect(stepCards.length).toBe(3);
    });
  });

  describe('Template Links with Query Parameters', () => {
    it('should include template=restaurant in restaurant link', () => {
      renderLanding();
      
      const restaurantLink = screen.getByRole('link', { name: /restaurant/i });
      expect(restaurantLink).toHaveAttribute('href', '/register?template=restaurant');
    });

    it('should include template=salon in salon link', () => {
      renderLanding();
      
      const salonLink = screen.getByRole('link', { name: /salon & spa/i });
      expect(salonLink).toHaveAttribute('href', '/register?template=salon');
    });

    it('should include template=gym in gym link', () => {
      renderLanding();
      
      const gymLink = screen.getByRole('link', { name: /fitness & gym/i });
      expect(gymLink).toHaveAttribute('href', '/register?template=gym');
    });

    it('should include template=consultant in consultant link', () => {
      renderLanding();
      
      const consultantLink = screen.getByRole('link', { name: /consultant/i });
      expect(consultantLink).toHaveAttribute('href', '/register?template=consultant');
    });

    it('should include template=freelancer in freelancer link', () => {
      renderLanding();
      
      const freelancerLink = screen.getByRole('link', { name: /freelancer/i });
      expect(freelancerLink).toHaveAttribute('href', '/register?template=freelancer');
    });

    it('should include template=tech-repair in tech repair link', () => {
      renderLanding();
      
      const techRepairLink = screen.getByRole('link', { name: /tech repair/i });
      expect(techRepairLink).toHaveAttribute('href', '/register?template=tech-repair');
    });

    it('should include template=cleaning in cleaning services link', () => {
      renderLanding();
      
      const cleaningLink = screen.getByRole('link', { name: /cleaning services/i });
      expect(cleaningLink).toHaveAttribute('href', '/register?template=cleaning');
    });

    it('should include template=pet-care in pet care link', () => {
      renderLanding();
      
      const petCareLink = screen.getByRole('link', { name: /pet care/i });
      expect(petCareLink).toHaveAttribute('href', '/register?template=pet-care');
    });

    it('should include template=electrician in electrician link', () => {
      renderLanding();
      
      const electricianLink = screen.getByRole('link', { name: /electrician/i });
      expect(electricianLink).toHaveAttribute('href', '/register?template=electrician');
    });

    it('should include template=auto-repair in auto repair link', () => {
      renderLanding();
      
      const autoRepairLink = screen.getByRole('link', { name: /auto repair/i });
      expect(autoRepairLink).toHaveAttribute('href', '/register?template=auto-repair');
    });
  });
});

