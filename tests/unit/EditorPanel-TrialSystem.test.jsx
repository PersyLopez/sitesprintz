import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import EditorPanel from '../../src/components/setup/EditorPanel';
import { SiteContext } from '../../src/context/SiteContext';
import { AuthContext } from '../../src/context/AuthContext';
import { sitesService } from '../../src/services/sites';

// Mock services
vi.mock('../../src/services/sites', () => ({
  sitesService: {
    getUserSites: vi.fn(),
  },
}));

// Mock child components
vi.mock('../../src/components/setup/forms/BusinessInfoForm', () => ({
  default: () => <div data-testid="business-info-form">Business Info Form</div>
}));

vi.mock('../../src/components/setup/forms/ProductsEditor', () => ({
  default: () => <div data-testid="products-editor">Products Editor</div>
}));

vi.mock('../../src/components/setup/forms/BookingEditor', () => ({
  default: () => <div data-testid="booking-editor">Booking Editor</div>
}));

vi.mock('../../src/components/setup/forms/PaymentSettings', () => ({
  default: () => <div data-testid="payment-settings">Payment Settings</div>
}));

// Mock fetch for Stripe checkout
global.fetch = vi.fn();

describe('EditorPanel - Trial & Subscription System', () => {
  let mockSiteContext;
  let mockAuthContext;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset fetch mock
    global.fetch.mockReset();

    // Mock site context
    mockSiteContext = {
      siteData: {
        id: 'draft-123',
        businessName: 'Test Business',
        template: 'restaurant-pro',
        services: [],
        contact: {},
        social: {},
        themeVars: {}
      },
      updateField: vi.fn(),
      addService: vi.fn(),
      updateService: vi.fn(),
      deleteService: vi.fn()
    };

    // Default auth context (starter plan, no trial/subscription)
    mockAuthContext = {
      user: { 
        id: 1, 
        email: 'test@example.com', 
        plan: 'starter',
        subscription_status: null,
        trial_expires_at: null
      },
      loading: false
    };

    // Mock localStorage
    Storage.prototype.getItem = vi.fn(() => 'mock-auth-token');
  });

  const renderEditorPanel = (authOverride = {}, sitesData = []) => {
    // Mock getUserSites
    sitesService.getUserSites.mockResolvedValue(sitesData);

    return render(
      <AuthContext.Provider value={{ ...mockAuthContext, ...authOverride }}>
        <SiteContext.Provider value={mockSiteContext}>
          <EditorPanel />
        </SiteContext.Provider>
      </AuthContext.Provider>
    );
  };

  // ============================================================
  // Trial Eligibility Logic (10 tests)
  // ============================================================

  describe('Trial Eligibility Logic', () => {
    it('should show trial eligible banner for first site (0 published sites)', async () => {
      renderEditorPanel({}, []); // No published sites
      
      await waitFor(() => {
        expect(screen.getByText(/Start Your Free Trial!/i)).toBeInTheDocument();
      });
    });

    it('should show trial eligible CTA for first site', async () => {
      renderEditorPanel({}, []); // No published sites
      
      await waitFor(() => {
        expect(screen.getByText(/🚀 Start 15-Day Free Trial/i)).toBeInTheDocument();
      });
    });

    it('should NOT show trial for users with existing subscription', async () => {
      renderEditorPanel({
        user: {
          id: 1,
          email: 'test@example.com',
          plan: 'starter',
          subscription_status: 'active'
        }
      }, []); // First site, but has subscription
      
      await waitFor(() => {
        expect(screen.queryByText(/Start Your Free Trial!/i)).not.toBeInTheDocument();
      });
    });

    it('should NOT show trial for users with active trial', async () => {
      renderEditorPanel({
        user: {
          id: 1,
          email: 'test@example.com',
          plan: 'starter',
          subscription_status: 'trial',
          trial_expires_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
        }
      }, []); // First site, but already on trial
      
      await waitFor(() => {
        expect(screen.queryByText(/Start Your Free Trial!/i)).not.toBeInTheDocument();
        expect(screen.getByText(/Trial Active/i)).toBeInTheDocument();
      });
    });

    it('should show subscription required for second site', async () => {
      const publishedSite = { id: 'site-1', status: 'published', publishedAt: new Date() };
      renderEditorPanel({}, [publishedSite]); // One published site
      
      await waitFor(() => {
        expect(screen.getByText(/Subscribe to Publish Your Site/i)).toBeInTheDocument();
      });
    });

    it('should show "Subscribe to Pro" CTA for second site', async () => {
      const publishedSite = { id: 'site-1', status: 'published', publishedAt: new Date() };
      renderEditorPanel({}, [publishedSite]); // One published site
      
      await waitFor(() => {
        expect(screen.getByText(/⭐ Subscribe to Pro/i)).toBeInTheDocument();
      });
    });

    it('should show trial note for first site', async () => {
      renderEditorPanel({}, []); // No published sites
      
      await waitFor(() => {
        expect(screen.getByText(/No charge until trial ends/i)).toBeInTheDocument();
      });
    });

    it('should show subscription note for subsequent sites', async () => {
      const publishedSite = { id: 'site-1', status: 'published', publishedAt: new Date() };
      renderEditorPanel({}, [publishedSite]);
      
      await waitFor(() => {
        expect(screen.getByText(/Free trial available only for first published site/i)).toBeInTheDocument();
      });
    });

    it('should count published sites correctly', async () => {
      const sites = [
        { id: 'site-1', status: 'published', publishedAt: new Date() },
        { id: 'site-2', status: 'draft' }, // Draft doesn't count
        { id: 'site-3', status: 'published', publishedAt: new Date() },
      ];
      
      renderEditorPanel({}, sites);
      
      await waitFor(() => {
        // Should show subscription required (2 published sites)
        expect(screen.getByText(/Subscribe to Publish Your Site/i)).toBeInTheDocument();
      });
    });

    it('should NOT show upgrade banner for pro users', async () => {
      renderEditorPanel({
        user: {
          id: 1,
          email: 'test@example.com',
          plan: 'pro',
          subscription_status: 'active'
        }
      }, []);
      
      await waitFor(() => {
        expect(screen.queryByText(/Trial Active/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Start Your Free Trial/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Subscribe to Pro/i)).not.toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // Upgrade Banner Display (8 tests)
  // ============================================================

  describe('Upgrade Banner Display', () => {
    it('should show upgrade banner when template is selected and user is not pro', async () => {
      renderEditorPanel({}, []);
      
      await waitFor(() => {
        expect(screen.getByTestId('upgrade-banner') || screen.getByText(/Start Your Free Trial!/i)).toBeInTheDocument();
      });
    });

    it('should NOT show upgrade banner when no template selected', async () => {
      mockSiteContext.siteData.template = null;
      renderEditorPanel({}, []);
      
      await waitFor(() => {
        expect(screen.queryByText(/Start Your Free Trial!/i)).not.toBeInTheDocument();
      });
    });

    it('should show trial active banner when user has active trial', async () => {
      renderEditorPanel({
        user: {
          id: 1,
          email: 'test@example.com',
          plan: 'starter',
          subscription_status: 'trial',
          trial_expires_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
        }
      }, []);
      
      await waitFor(() => {
        expect(screen.getByText(/Trial Active - All Features Unlocked!/i)).toBeInTheDocument();
      });
    });

    it('should show trial expiry date in active trial banner', async () => {
      const expiryDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      renderEditorPanel({
        user: {
          id: 1,
          email: 'test@example.com',
          plan: 'starter',
          subscription_status: 'trial',
          trial_expires_at: expiryDate.toISOString()
        }
      }, []);
      
      await waitFor(() => {
        expect(screen.getByText(new RegExp(expiryDate.toLocaleDateString()))).toBeInTheDocument();
      });
    });

    it('should show different icon for trial eligible vs subscription required', async () => {
      const { rerender, container } = renderEditorPanel({}, []); // Trial eligible
      
      await waitFor(() => {
        expect(screen.getByText('🎯')).toBeInTheDocument(); // Trial icon
      });
      
      // Change to second site
      const publishedSite = { id: 'site-1', status: 'published', publishedAt: new Date() };
      sitesService.getUserSites.mockResolvedValue([publishedSite]);
      
      rerender(
        <AuthContext.Provider value={mockAuthContext}>
          <SiteContext.Provider value={mockSiteContext}>
            <EditorPanel />
          </SiteContext.Provider>
        </AuthContext.Provider>
      );
      
      await waitFor(() => {
        expect(screen.getByText('⭐')).toBeInTheDocument(); // Subscription icon
      });
    });

    it('should show "Manage Subscription" link for trial users', async () => {
      renderEditorPanel({
        user: {
          id: 1,
          email: 'test@example.com',
          plan: 'starter',
          subscription_status: 'trial',
          trial_expires_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
        }
      }, []);
      
      await waitFor(() => {
        expect(screen.getByText(/View Dashboard/i)).toBeInTheDocument();
      });
    });

    it('should show "Learn More" link for non-trial users', async () => {
      const publishedSite = { id: 'site-1', status: 'published', publishedAt: new Date() };
      renderEditorPanel({}, [publishedSite]);
      
      await waitFor(() => {
        expect(screen.getByText(/Learn More/i)).toBeInTheDocument();
      });
    });

    it('should hide upgrade banner while loading site count', async () => {
      renderEditorPanel({}, []);
      
      // Initially, banner should not show while loading
      expect(screen.queryByText(/Start Your Free Trial!/i)).not.toBeInTheDocument();
      
      // After loading, banner should appear
      await waitFor(() => {
        expect(screen.getByText(/Start Your Free Trial!/i)).toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // Stripe Checkout Integration (10 tests)
  // ============================================================

  describe('Stripe Checkout Integration', () => {
    beforeEach(() => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://checkout.stripe.com/test-session' })
      });
    });

    it('should call Stripe checkout API when clicking start trial button', async () => {
      const user = userEvent.setup();
      renderEditorPanel({}, []);
      
      await waitFor(() => {
        expect(screen.getByText(/🚀 Start 15-Day Free Trial/i)).toBeInTheDocument();
      });
      
      const trialButton = screen.getByText(/🚀 Start 15-Day Free Trial/i);
      await user.click(trialButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/payments/create-subscription-checkout',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'Authorization': 'Bearer mock-auth-token'
            }),
            body: expect.stringContaining('"plan":"pro"')
          })
        );
      });
    });

    it('should include draft ID in checkout request', async () => {
      const user = userEvent.setup();
      renderEditorPanel({}, []);
      
      await waitFor(() => {
        expect(screen.getByText(/🚀 Start 15-Day Free Trial/i)).toBeInTheDocument();
      });
      
      const trialButton = screen.getByText(/🚀 Start 15-Day Free Trial/i);
      await user.click(trialButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/payments/create-subscription-checkout',
          expect.objectContaining({
            body: expect.stringContaining('"draftId":"draft-123"')
          })
        );
      });
    });

    it('should redirect to Stripe checkout on successful API response', async () => {
      const user = userEvent.setup();
      delete window.location;
      window.location = { href: '' };
      
      renderEditorPanel({}, []);
      
      await waitFor(() => {
        expect(screen.getByText(/🚀 Start 15-Day Free Trial/i)).toBeInTheDocument();
      });
      
      const trialButton = screen.getByText(/🚀 Start 15-Day Free Trial/i);
      await user.click(trialButton);
      
      await waitFor(() => {
        expect(window.location.href).toBe('https://checkout.stripe.com/test-session');
      });
    });

    it('should redirect to registration if not logged in', async () => {
      const user = userEvent.setup();
      Storage.prototype.getItem = vi.fn(() => null); // No auth token
      delete window.location;
      window.location = { href: '' };
      
      renderEditorPanel({}, []);
      
      await waitFor(() => {
        expect(screen.getByText(/🚀 Start 15-Day Free Trial/i)).toBeInTheDocument();
      });
      
      const trialButton = screen.getByText(/🚀 Start 15-Day Free Trial/i);
      await user.click(trialButton);
      
      await waitFor(() => {
        expect(window.location.href).toBe('/register.html?plan=pro');
      });
    });

    it('should handle Stripe API errors gracefully', async () => {
      const user = userEvent.setup();
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Payment processing unavailable' })
      });
      
      // Mock alert
      global.alert = vi.fn();
      
      renderEditorPanel({}, []);
      
      await waitFor(() => {
        expect(screen.getByText(/🚀 Start 15-Day Free Trial/i)).toBeInTheDocument();
      });
      
      const trialButton = screen.getByText(/🚀 Start 15-Day Free Trial/i);
      await user.click(trialButton);
      
      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(
          expect.stringContaining('Failed to start')
        );
      });
    });

    it('should show subscribe button for subsequent sites', async () => {
      const publishedSite = { id: 'site-1', status: 'published', publishedAt: new Date() };
      renderEditorPanel({}, [publishedSite]);
      
      await waitFor(() => {
        expect(screen.getByText(/⭐ Subscribe to Pro/i)).toBeInTheDocument();
      });
    });

    it('should call same API endpoint for subscription (not trial)', async () => {
      const user = userEvent.setup();
      const publishedSite = { id: 'site-1', status: 'published', publishedAt: new Date() };
      renderEditorPanel({}, [publishedSite]);
      
      await waitFor(() => {
        expect(screen.getByText(/⭐ Subscribe to Pro/i)).toBeInTheDocument();
      });
      
      const subscribeButton = screen.getByText(/⭐ Subscribe to Pro/i);
      await user.click(subscribeButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/payments/create-subscription-checkout',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"plan":"pro"')
          })
        );
      });
    });

    it('should NOT show trial button for users with active trial', async () => {
      renderEditorPanel({
        user: {
          id: 1,
          email: 'test@example.com',
          plan: 'starter',
          subscription_status: 'trial',
          trial_expires_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
        }
      }, []);
      
      await waitFor(() => {
        expect(screen.queryByText(/Start 15-Day Free Trial/i)).not.toBeInTheDocument();
        expect(screen.getByText(/✅ Trial Active/i)).toBeInTheDocument();
      });
    });

    it('should handle network errors during checkout', async () => {
      const user = userEvent.setup();
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      global.alert = vi.fn();
      
      renderEditorPanel({}, []);
      
      await waitFor(() => {
        expect(screen.getByText(/🚀 Start 15-Day Free Trial/i)).toBeInTheDocument();
      });
      
      const trialButton = screen.getByText(/🚀 Start 15-Day Free Trial/i);
      await user.click(trialButton);
      
      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(
          expect.stringContaining('Failed to start')
        );
      });
    });

    it('should pass correct plan parameter to API', async () => {
      const user = userEvent.setup();
      renderEditorPanel({}, []);
      
      await waitFor(() => {
        expect(screen.getByText(/🚀 Start 15-Day Free Trial/i)).toBeInTheDocument();
      });
      
      const trialButton = screen.getByText(/🚀 Start 15-Day Free Trial/i);
      await user.click(trialButton);
      
      await waitFor(() => {
        const call = global.fetch.mock.calls[0];
        const body = JSON.parse(call[1].body);
        expect(body.plan).toBe('pro');
      });
    });
  });

  // ============================================================
  // Pro Feature Access with Trial (8 tests)
  // ============================================================

  describe('Pro Feature Access with Trial', () => {
    it('should show Products editor during active trial', async () => {
      const user = userEvent.setup();
      renderEditorPanel({
        user: {
          id: 1,
          email: 'test@example.com',
          plan: 'starter',
          subscription_status: 'trial',
          trial_expires_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
        }
      }, []);
      
      await waitFor(() => {
        const productsTab = screen.getByRole('button', { name: /Products/i });
        expect(productsTab).not.toBeDisabled();
      });
      
      const productsTab = screen.getByRole('button', { name: /Products/i });
      await user.click(productsTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('products-editor')).toBeInTheDocument();
      });
    });

    it('should show Booking editor during active trial', async () => {
      const user = userEvent.setup();
      renderEditorPanel({
        user: {
          id: 1,
          email: 'test@example.com',
          plan: 'starter',
          subscription_status: 'trial',
          trial_expires_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
        }
      }, []);
      
      await waitFor(() => {
        const bookingTab = screen.getByRole('button', { name: /Booking/i });
        expect(bookingTab).not.toBeDisabled();
      });
      
      const bookingTab = screen.getByRole('button', { name: /Booking/i });
      await user.click(bookingTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('booking-editor')).toBeInTheDocument();
      });
    });

    it('should show Payment settings during active trial', async () => {
      const user = userEvent.setup();
      renderEditorPanel({
        user: {
          id: 1,
          email: 'test@example.com',
          plan: 'starter',
          subscription_status: 'trial',
          trial_expires_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
        }
      }, []);
      
      await waitFor(() => {
        const paymentsTab = screen.getByRole('button', { name: /Payments/i });
        expect(paymentsTab).not.toBeDisabled();
      });
      
      const paymentsTab = screen.getByRole('button', { name: /Payments/i });
      await user.click(paymentsTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('payment-settings')).toBeInTheDocument();
      });
    });

    it('should show upgrade prompt for Products when not on trial', async () => {
      const user = userEvent.setup();
      renderEditorPanel({}, []);
      
      await waitFor(() => {
        const productsTab = screen.getByRole('button', { name: /Products/i });
        expect(productsTab).toBeDisabled();
      });
    });

    it('should show upgrade prompt for Booking when not on trial', async () => {
      const user = userEvent.setup();
      renderEditorPanel({}, []);
      
      await waitFor(() => {
        const bookingTab = screen.getByRole('button', { name: /Booking/i });
        expect(bookingTab).toBeDisabled();
      });
    });

    it('should show upgrade prompt for Payments when not on trial', async () => {
      const user = userEvent.setup();
      renderEditorPanel({}, []);
      
      await waitFor(() => {
        const paymentsTab = screen.getByRole('button', { name: /Payments/i });
        expect(paymentsTab).toBeDisabled();
      });
    });

    it('should enable all pro features for business plan users', async () => {
      renderEditorPanel({
        user: {
          id: 1,
          email: 'test@example.com',
          plan: 'business',
          subscription_status: 'active'
        }
      }, []);
      
      await waitFor(() => {
        const productsTab = screen.getByRole('button', { name: /Products/i });
        const bookingTab = screen.getByRole('button', { name: /Booking/i });
        const paymentsTab = screen.getByRole('button', { name: /Payments/i });
        
        expect(productsTab).not.toBeDisabled();
        expect(bookingTab).not.toBeDisabled();
        expect(paymentsTab).not.toBeDisabled();
      });
    });

    it('should enable all pro features for pro plan users', async () => {
      renderEditorPanel({
        user: {
          id: 1,
          email: 'test@example.com',
          plan: 'pro',
          subscription_status: 'active'
        }
      }, []);
      
      await waitFor(() => {
        const productsTab = screen.getByRole('button', { name: /Products/i });
        const bookingTab = screen.getByRole('button', { name: /Booking/i });
        const paymentsTab = screen.getByRole('button', { name: /Payments/i });
        
        expect(productsTab).not.toBeDisabled();
        expect(bookingTab).not.toBeDisabled();
        expect(paymentsTab).not.toBeDisabled();
      });
    });
  });

  // ============================================================
  // Upgrade Prompt Content (6 tests)
  // ============================================================

  describe('Upgrade Prompt Content', () => {
    it('should show trial benefits in upgrade prompt for first site', async () => {
      const user = userEvent.setup();
      renderEditorPanel({}, []);
      
      await waitFor(() => {
        const productsTab = screen.getByRole('button', { name: /Products/i });
        expect(productsTab).toBeDisabled();
      });
      
      // Check for key benefits
      expect(screen.getByText(/Product catalog & shopping cart/i)).toBeInTheDocument();
      expect(screen.getByText(/Embedded booking widgets/i)).toBeInTheDocument();
      expect(screen.getByText(/Secure Stripe payment processing/i)).toBeInTheDocument();
    });

    it('should show different messaging for trial-eligible users', async () => {
      renderEditorPanel({}, []); // First site
      
      await waitFor(() => {
        expect(screen.getByText(/Your first site qualifies for a 15-day free trial/i)).toBeInTheDocument();
      });
    });

    it('should show different messaging for users requiring subscription', async () => {
      const publishedSite = { id: 'site-1', status: 'published', publishedAt: new Date() };
      renderEditorPanel({}, [publishedSite]); // Second site
      
      await waitFor(() => {
        expect(screen.getByText(/Free trial is available only for your first published site/i)).toBeInTheDocument();
      });
    });

    it('should show trial active message for users on trial', async () => {
      renderEditorPanel({
        user: {
          id: 1,
          email: 'test@example.com',
          plan: 'starter',
          subscription_status: 'trial',
          trial_expires_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
        }
      }, []);
      
      await waitFor(() => {
        expect(screen.getByText(/This feature is included in your active trial/i)).toBeInTheDocument();
      });
    });

    it('should show "No charge until trial ends" note for eligible users', async () => {
      renderEditorPanel({}, []); // First site
      
      await waitFor(() => {
        expect(screen.getByText(/No charge until trial ends/i)).toBeInTheDocument();
      });
    });

    it('should show payment method requirement for trial', async () => {
      renderEditorPanel({}, []); // First site
      
      await waitFor(() => {
        expect(screen.getByText(/Requires payment method/i)).toBeInTheDocument();
      });
    });
  });
});

