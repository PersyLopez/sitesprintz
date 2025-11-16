/**
 * FoundationSettings Component Tests
 * 
 * Comprehensive test suite for Foundation Settings component
 * covering rendering, feature toggles, and save functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FoundationSettings from '../../src/components/dashboard/FoundationSettings';

describe('FoundationSettings Component', () => {
  let mockOnUpdate;
  let mockSite;
  let mockFetch;

  beforeEach(() => {
    mockOnUpdate = vi.fn();
    mockSite = {
      id: 'site-123',
      name: 'Test Site',
      subdomain: 'testsite',
      plan: 'starter',
      status: 'published',
      site_data: {
        foundation: {
          trustSignals: {
            enabled: true,
            yearsInBusiness: 5,
            showSSLBadge: true,
            showVerifiedBadge: true,
            showPaymentIcons: true
          },
          contactForm: {
            enabled: false,
            recipientEmail: '',
            autoResponder: {
              enabled: true,
              message: 'Thank you for contacting us!'
            }
          },
          seo: {
            enabled: true,
            businessType: 'LocalBusiness',
            customMetaDescription: '',
            autoGenerateAltTags: true,
            lazyLoadImages: true
          },
          socialMedia: {
            enabled: false,
            profiles: {
              facebook: '',
              instagram: '',
              twitter: '',
              linkedin: '',
              youtube: ''
            },
            position: 'footer'
          },
          contactBar: {
            enabled: false,
            phone: '',
            email: '',
            position: 'floating',
            showOnMobile: true
          }
        }
      }
    };

    // Mock localStorage
    global.localStorage = {
      getItem: vi.fn(() => 'fake-token'),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };

    // Mock fetch
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== RENDERING TESTS (10 tests) ====================
  describe('Component Rendering', () => {
    it('should render the settings header', () => {
      render(<FoundationSettings site={mockSite} onUpdate={mockOnUpdate} />);
      
      expect(screen.getByText('Foundation Features')).toBeInTheDocument();
      expect(screen.getByText('Configure core features for your website')).toBeInTheDocument();
    });

    it('should render all feature tabs', () => {
      render(<FoundationSettings site={mockSite} onUpdate={mockOnUpdate} />);
      
      const tabs = screen.getAllByRole('button');
      const tabTexts = tabs.map(tab => tab.textContent);
      
      expect(tabTexts).toContain('Trust Signals');
      expect(tabTexts).toContain('Contact Form');
      expect(tabTexts).toContain('SEO');
      expect(tabTexts).toContain('Social Media');
      expect(tabTexts).toContain('Contact Bar');
    });

    it('should show Trust Signals tab by default', () => {
      render(<FoundationSettings site={mockSite} onUpdate={mockOnUpdate} />);
      
      const trustSignalsPanel = screen.getByText('Display trust badges to increase credibility and conversions');
      expect(trustSignalsPanel).toBeInTheDocument();
    });

    it('should render Save Settings button', () => {
      render(<FoundationSettings site={mockSite} onUpdate={mockOnUpdate} />);
      
      expect(screen.getByText('Save Settings')).toBeInTheDocument();
    });

    it('should load config from site data', () => {
      render(<FoundationSettings site={mockSite} onUpdate={mockOnUpdate} />);
      
      // Trust Signals should be enabled (from mockSite)
      const enableCheckbox = screen.getByLabelText('Enable Trust Signals');
      expect(enableCheckbox).toBeChecked();
    });

    it('should show years in business input when trust signals enabled', () => {
      render(<FoundationSettings site={mockSite} onUpdate={mockOnUpdate} />);
      
      expect(screen.getByLabelText('Years in Business')).toBeInTheDocument();
      expect(screen.getByLabelText('Years in Business')).toHaveValue(5);
    });

    it('should display all badge toggles when trust signals enabled', () => {
      render(<FoundationSettings site={mockSite} onUpdate={mockOnUpdate} />);
      
      expect(screen.getByLabelText('Show SSL Secure Badge')).toBeInTheDocument();
      expect(screen.getByLabelText('Show Verified Business Badge')).toBeInTheDocument();
      expect(screen.getByLabelText('Show Payment Security Icons')).toBeInTheDocument();
    });

    it('should render contact form tab content when switched', async () => {
      const user = userEvent.setup();
      render(<FoundationSettings site={mockSite} onUpdate={mockOnUpdate} />);
      
      await user.click(screen.getByText('Contact Form'));
      
      expect(screen.getByText('Capture leads with a professional contact form')).toBeInTheDocument();
      expect(screen.getByLabelText('Enable Contact Form')).toBeInTheDocument();
    });

    it('should render SEO tab content when switched', async () => {
      const user = userEvent.setup();
      render(<FoundationSettings site={mockSite} onUpdate={mockOnUpdate} />);
      
      await user.click(screen.getByText('SEO'));
      
      expect(screen.getByText('Improve your search engine rankings automatically')).toBeInTheDocument();
      expect(screen.getByLabelText('Enable SEO Features')).toBeInTheDocument();
    });

    it('should use default config if site has no foundation data', () => {
      const siteWithoutFoundation = {
        ...mockSite,
        site_data: {}
      };
      
      render(<FoundationSettings site={siteWithoutFoundation} onUpdate={mockOnUpdate} />);
      
      // Default: trust signals enabled
      expect(screen.getByLabelText('Enable Trust Signals')).toBeChecked();
    });
  });

  // ==================== FEATURE TOGGLE TESTS (8 tests) ====================
  describe('Feature Toggles', () => {
    it('should toggle trust signals on/off', async () => {
      const user = userEvent.setup();
      render(<FoundationSettings site={mockSite} onUpdate={mockOnUpdate} />);
      
      const toggle = screen.getByLabelText('Enable Trust Signals');
      expect(toggle).toBeChecked();
      
      await user.click(toggle);
      expect(toggle).not.toBeChecked();
      
      // Fields should be hidden
      expect(screen.queryByLabelText('Years in Business')).not.toBeInTheDocument();
    });

    it('should toggle contact form on/off', async () => {
      const user = userEvent.setup();
      render(<FoundationSettings site={mockSite} onUpdate={mockOnUpdate} />);
      
      await user.click(screen.getByText('Contact Form'));
      
      const toggle = screen.getByLabelText('Enable Contact Form');
      expect(toggle).not.toBeChecked();
      
      await user.click(toggle);
      expect(toggle).toBeChecked();
      
      // Recipient email field should appear
      await waitFor(() => {
        expect(screen.getByLabelText(/recipient email/i)).toBeInTheDocument();
      });
    });

    it('should toggle SEO features on/off', async () => {
      const user = userEvent.setup();
      render(<FoundationSettings site={mockSite} onUpdate={mockOnUpdate} />);
      
      await user.click(screen.getByText('SEO'));
      
      const toggle = screen.getByLabelText('Enable SEO Features');
      expect(toggle).toBeChecked();
      
      await user.click(toggle);
      expect(toggle).not.toBeChecked();
      
      // SEO fields should be hidden
      expect(screen.queryByLabelText('Business Type')).not.toBeInTheDocument();
    });

    it('should toggle social media on/off', async () => {
      const user = userEvent.setup();
      render(<FoundationSettings site={mockSite} onUpdate={mockOnUpdate} />);
      
      await user.click(screen.getByText('Social Media'));
      
      const toggle = screen.getByLabelText('Enable Social Media Links');
      expect(toggle).not.toBeChecked();
      
      await user.click(toggle);
      expect(toggle).toBeChecked();
      
      // Social profile fields should appear
      await waitFor(() => {
        expect(screen.getByLabelText('Facebook URL')).toBeInTheDocument();
      });
    });

    it('should toggle contact bar on/off', async () => {
      const user = userEvent.setup();
      render(<FoundationSettings site={mockSite} onUpdate={mockOnUpdate} />);
      
      await user.click(screen.getByText('Contact Bar'));
      
      const toggle = screen.getByLabelText('Enable Contact Bar');
      expect(toggle).not.toBeChecked();
      
      await user.click(toggle);
      expect(toggle).toBeChecked();
      
      // Contact bar fields should appear
      await waitFor(() => {
        expect(screen.getByLabelText('Phone Number')).toBeInTheDocument();
      });
    });

    it('should update years in business value', async () => {
      const user = userEvent.setup();
      render(<FoundationSettings site={mockSite} onUpdate={mockOnUpdate} />);
      
      const input = screen.getByLabelText('Years in Business');
      await user.clear(input);
      await user.type(input, '10');
      
      expect(input).toHaveValue(10);
    });

    it('should update contact form recipient email', async () => {
      const user = userEvent.setup();
      render(<FoundationSettings site={mockSite} onUpdate={mockOnUpdate} />);
      
      await user.click(screen.getByText('Contact Form'));
      await user.click(screen.getByLabelText('Enable Contact Form'));
      
      const emailInput = await screen.findByLabelText(/recipient email/i);
      await user.type(emailInput, 'test@example.com');
      
      expect(emailInput).toHaveValue('test@example.com');
    });

    it('should update SEO business type', async () => {
      const user = userEvent.setup();
      render(<FoundationSettings site={mockSite} onUpdate={mockOnUpdate} />);
      
      await user.click(screen.getByText('SEO'));
      
      const select = screen.getByLabelText('Business Type');
      await user.selectOptions(select, 'Restaurant');
      
      expect(select).toHaveValue('Restaurant');
    });
  });

  // ==================== SAVE FLOW TESTS (5 tests) ====================
  describe('Save Functionality', () => {
    it('should call API when Save Settings clicked', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ foundation: mockSite.site_data.foundation })
      });
      
      render(<FoundationSettings site={mockSite} onUpdate={mockOnUpdate} />);
      
      await user.click(screen.getByText('Save Settings'));
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `/api/foundation/config/${mockSite.subdomain}`,
          expect.objectContaining({
            method: 'PUT',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'Authorization': 'Bearer fake-token'
            })
          })
        );
      });
    });

    it('should show success message after save', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ foundation: mockSite.site_data.foundation })
      });
      
      render(<FoundationSettings site={mockSite} onUpdate={mockOnUpdate} />);
      
      await user.click(screen.getByText('Save Settings'));
      
      await waitFor(() => {
        expect(screen.getByText('Settings saved successfully!')).toBeInTheDocument();
      });
    });

    it('should call onUpdate callback after successful save', async () => {
      const user = userEvent.setup();
      const updatedFoundation = { ...mockSite.site_data.foundation, updated: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ foundation: updatedFoundation })
      });
      
      render(<FoundationSettings site={mockSite} onUpdate={mockOnUpdate} />);
      
      await user.click(screen.getByText('Save Settings'));
      
      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith(updatedFoundation);
      });
    });

    it('should show error message on save failure', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });
      
      render(<FoundationSettings site={mockSite} onUpdate={mockOnUpdate} />);
      
      await user.click(screen.getByText('Save Settings'));
      
      await waitFor(() => {
        expect(screen.getByText('Failed to save settings. Please try again.')).toBeInTheDocument();
      });
    });

    it('should disable save button while saving', async () => {
      const user = userEvent.setup();
      mockFetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<FoundationSettings site={mockSite} onUpdate={mockOnUpdate} />);
      
      const saveButton = screen.getByText('Save Settings');
      await user.click(saveButton);
      
      // Button should be disabled and show "Saving..."
      expect(saveButton).toBeDisabled();
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });
  });

  // ==================== TAB NAVIGATION TESTS (2 additional tests) ====================
  describe('Tab Navigation', () => {
    it('should switch between tabs correctly', async () => {
      const user = userEvent.setup();
      render(<FoundationSettings site={mockSite} onUpdate={mockOnUpdate} />);
      
      // Start on Trust Signals
      expect(screen.getByText('Display trust badges to increase credibility and conversions')).toBeInTheDocument();
      
      // Switch to Contact Form
      await user.click(screen.getByText('Contact Form'));
      expect(screen.getByText('Capture leads with a professional contact form')).toBeInTheDocument();
      
      // Switch to Social Media
      await user.click(screen.getByText('Social Media'));
      expect(screen.getByText('Connect your social media profiles')).toBeInTheDocument();
    });

    it('should maintain active tab state', async () => {
      const user = userEvent.setup();
      render(<FoundationSettings site={mockSite} onUpdate={mockOnUpdate} />);
      
      const tabs = screen.getAllByRole('button', { name: /Trust Signals|Contact Form|SEO|Social Media|Contact Bar/i });
      const contactFormTab = tabs.find(tab => tab.textContent === 'Contact Form');
      
      await user.click(contactFormTab);
      
      // Contact Form tab should have 'active' class
      expect(contactFormTab).toHaveClass('active');
    });
  });

  // ==================== CONDITIONAL RENDERING TESTS (2 additional tests) ====================
  describe('Conditional Field Rendering', () => {
    it('should hide trust signal options when disabled', async () => {
      const user = userEvent.setup();
      render(<FoundationSettings site={mockSite} onUpdate={mockOnUpdate} />);
      
      // Initially enabled, fields visible
      expect(screen.getByLabelText('Years in Business')).toBeInTheDocument();
      
      // Disable trust signals
      await user.click(screen.getByLabelText('Enable Trust Signals'));
      
      // Fields should be hidden
      expect(screen.queryByLabelText('Years in Business')).not.toBeInTheDocument();
    });

    it('should show auto-responder fields only when contact form enabled', async () => {
      const user = userEvent.setup();
      render(<FoundationSettings site={mockSite} onUpdate={mockOnUpdate} />);
      
      await user.click(screen.getByText('Contact Form'));
      
      // Initially disabled, no auto-responder fields
      expect(screen.queryByLabelText('Auto-Responder Message')).not.toBeInTheDocument();
      
      // Enable contact form
      await user.click(screen.getByLabelText('Enable Contact Form'));
      
      // Auto-responder toggle should appear
      await waitFor(() => {
        expect(screen.getByLabelText('Enable Auto-Responder')).toBeInTheDocument();
      });
    });
  });
});

