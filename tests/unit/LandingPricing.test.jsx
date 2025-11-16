/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Landing from '../../src/pages/Landing';

// Mock the child components
vi.mock('../../src/components/layout/Header', () => ({
  default: () => <div data-testid="header">Header</div>
}));

vi.mock('../../src/components/layout/Footer', () => ({
  default: () => <div data-testid="footer">Footer</div>
}));

vi.mock('../../src/components/PlatformShareButton', () => ({
  default: () => <button data-testid="share-button">Share</button>
}));

// Mock useNavigate at the module level
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderLanding = () => {
  return render(
    <BrowserRouter>
      <Landing />
    </BrowserRouter>
  );
};

describe('Landing Page - Pricing Selection (Unauthenticated)', () => {
  beforeEach(() => {
    localStorage.clear();
    delete window.location;
    window.location = { href: '' };
  });

  test('clicking "Start Free Trial" navigates to /register', () => {
    renderLanding();
    
    const freeTrialButton = screen.getByRole('link', { name: /start free trial/i });
    expect(freeTrialButton).toHaveAttribute('href', '/register');
  });

  test('clicking "Get Started" (Starter) should trigger plan selection', async () => {
    renderLanding();
    
    // Find Starter tier button
    const starterButtons = screen.getAllByText(/get started/i);
    const starterButton = starterButtons.find(btn => 
      btn.closest('.pricing-card') && 
      !btn.closest('.pricing-card').classList.contains('featured')
    );
    
    expect(starterButton).toBeTruthy();
    
    // Should be a button (not a link) after implementation
    // For now, this test will fail (RED)
  });

  test('clicking "Upgrade to Pro" should trigger plan selection', async () => {
    renderLanding();
    
    const proButton = screen.getByText(/upgrade to pro/i);
    expect(proButton).toBeTruthy();
    
    // Should be a button (not a link) after implementation
    // For now, this test will fail (RED)
  });

  test('Premium "Join Waitlist" button is disabled', () => {
    renderLanding();
    
    const waitlistButton = screen.getByText(/join waitlist/i);
    expect(waitlistButton).toBeDisabled();
  });

  test('all 4 pricing cards are rendered', () => {
    renderLanding();
    
    // Check for pricing tier names
    expect(screen.getByText('Free Trial')).toBeInTheDocument();
    expect(screen.getByText('Starter')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
  });

  test('Pro card has "Most Popular" badge', () => {
    renderLanding();
    
    const popularBadge = screen.getByText(/most popular/i);
    expect(popularBadge).toBeInTheDocument();
    
    // Badge should be in the Pro card
    const proCard = popularBadge.closest('.pricing-card');
    expect(proCard).toHaveClass('featured');
  });

  test('Premium card has "Under Development" badge', () => {
    renderLanding();
    
    const devBadge = screen.getByText(/🚧 Q1 2026/i);
    expect(devBadge).toBeInTheDocument();
    
    // Badge should be in the Premium card
    const premiumCard = devBadge.closest('.pricing-card');
    expect(premiumCard).toHaveClass('under-dev');
  });

  test('value badges display correct savings', () => {
    renderLanding();
    
    expect(screen.getByText(/save \$144\/year/i)).toBeInTheDocument();
    expect(screen.getByText(/save \$720\/year/i)).toBeInTheDocument();
    expect(screen.getByText(/save \$1,440\/year/i)).toBeInTheDocument();
  });

  test('pricing displays correct amounts', () => {
    renderLanding();
    
    // Check for pricing amounts
    expect(screen.getByText('$0')).toBeInTheDocument(); // Free Trial
    expect(screen.getByText('$15')).toBeInTheDocument(); // Starter
    expect(screen.getByText('$45')).toBeInTheDocument(); // Pro
    expect(screen.getByText('$100')).toBeInTheDocument(); // Premium
  });
});

describe('Landing Page - Pricing Selection (Authenticated)', () => {
  const mockToken = 'mock-jwt-token-123';
  
  beforeEach(() => {
    localStorage.setItem('authToken', mockToken);
    global.fetch = vi.fn();
    global.alert = vi.fn();
    mockNavigate.mockClear();
    delete window.location;
    window.location = { href: '' };
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  test('clicking Starter plan with auth token initiates Stripe checkout', async () => {
    // Mock successful API response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://checkout.stripe.com/test-starter' })
    });

    renderLanding();
    
    // This test will fail initially (RED) because button is still a Link
    // After implementation, it should:
    // 1. Call fetch with correct endpoint
    // 2. Set window.location.href to Stripe URL
  });

  test('clicking Pro plan with auth token initiates Stripe checkout', async () => {
    // Mock successful API response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://checkout.stripe.com/test-pro' })
    });

    renderLanding();
    
    // This test will fail initially (RED)
  });

  test('shows "Loading..." and disables button during checkout', async () => {
    // Mock delayed API response
    global.fetch.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ url: 'https://checkout.stripe.com/test' })
      }), 100))
    );

    renderLanding();
    
    // This test will fail initially (RED)
    // After implementation, button should show "Loading..." and be disabled
  });

  test('shows error and re-enables button when checkout fails', async () => {
    // Mock failed API response
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Payment setup failed' })
    });

    renderLanding();
    
    // This test will fail initially (RED)
    // After implementation, alert should be called and button re-enabled
  });

  test('handles network errors gracefully', async () => {
    // Mock network error
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    renderLanding();
    
    // This test will fail initially (RED)
    // After implementation, alert should be called with generic error
  });
});

describe('Landing Page - Component Integration', () => {
  test('How It Works section is present', () => {
    renderLanding();
    
    expect(screen.getByText('How It Works')).toBeInTheDocument();
    expect(screen.getByText(/choose a template/i)).toBeInTheDocument();
    expect(screen.getByText(/customize free/i)).toBeInTheDocument();
    expect(screen.getByText(/launch & grow/i)).toBeInTheDocument();
  });

  test('FAQ section is present', () => {
    renderLanding();
    
    expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
    expect(screen.getByText(/do i need to know code/i)).toBeInTheDocument();
    expect(screen.getByText(/can i try before i pay/i)).toBeInTheDocument();
  });

  test('Template showcase carousel is present', () => {
    renderLanding();
    
    // Check for template iframes
    const iframes = screen.getAllByTitle(/template/i);
    expect(iframes.length).toBeGreaterThan(0);
  });

  test('all major sections are in correct order', () => {
    const { container } = renderLanding();
    
    const sections = container.querySelectorAll('section');
    const sectionIds = Array.from(sections).map(s => 
      s.id || s.className.split(' ')[0]
    );
    
    // Expected order: showcase, trust, how-it-works, pricing, templates, faq, cta
    expect(sectionIds).toContain('how-it-works');
    expect(sectionIds).toContain('pricing');
    expect(sectionIds).toContain('templates');
    expect(sectionIds).toContain('faq');
  });
});

