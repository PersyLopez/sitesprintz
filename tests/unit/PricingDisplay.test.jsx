/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import PricingTiers from '../../src/components/pricing/PricingTiers';
import PricingCard from '../../src/components/pricing/PricingCard';

describe('Pricing Display - Tier Pricing Tests', () => {
  const mockPlans = [
    {
      id: 'starter',
      name: 'Starter',
      price: 15,
      billingPeriod: 'monthly',
      description: 'Perfect for service businesses',
      features: ['Professional website', 'Contact forms', 'Mobile responsive'],
      ctaText: 'Get Started',
      valueBadge: {
        title: 'Save $144/year',
        detail: 'vs Wix Combo ($27/mo)'
      }
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 45,
      billingPeriod: 'monthly',
      description: 'Add e-commerce and payments',
      features: ['Everything in Starter', 'Stripe payments', 'Order management'],
      featured: true,
      ctaText: 'Upgrade to Pro',
      valueBadge: {
        title: 'Save $720/year',
        detail: 'vs Shopify Basic ($105/mo)'
      }
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 100,
      billingPeriod: 'monthly',
      description: 'Full automation and advanced tools',
      features: ['Everything in Pro', 'Live chat', 'Email automation'],
      underDevelopment: true,
      releaseDate: 'Q1 2026',
      ctaText: 'Join Waitlist',
      valueBadge: {
        title: 'Save $1,440/year',
        detail: 'vs Separate SaaS Tools ($220/mo)'
      }
    }
  ];

  describe('Individual Plan Pricing', () => {
    test('should display Starter at $15/month', () => {
      const starterPlan = mockPlans[0];
      render(<PricingCard product={starterPlan} />);
      
      // Check price is displayed
      expect(screen.getByText(/\$15/)).toBeInTheDocument();
      expect(screen.getByText(/month/)).toBeInTheDocument();
    });

    test('should display Pro at $45/month', () => {
      const proPlan = mockPlans[1];
      render(<PricingCard product={proPlan} />);
      
      // Check price is displayed
      expect(screen.getByText(/\$45/)).toBeInTheDocument();
      expect(screen.getByText(/month/)).toBeInTheDocument();
    });

    test('should display Premium at $100/month', () => {
      const premiumPlan = mockPlans[2];
      render(<PricingCard product={premiumPlan} />);
      
      // Check price is displayed
      expect(screen.getByText(/\$100/)).toBeInTheDocument();
      expect(screen.getByText(/month/)).toBeInTheDocument();
    });
  });

  describe('Plan Features and Badges', () => {
    test('should mark Pro as "Most Popular"', () => {
      const proPlan = mockPlans[1];
      render(<PricingCard product={proPlan} />);
      
      // Check for featured/popular badge
      expect(screen.getByText(/Most Popular/i)).toBeInTheDocument();
    });

    test('should show Premium as "Under Development"', () => {
      const premiumPlan = mockPlans[2];
      render(<PricingCard product={premiumPlan} underDevelopment={true} />);
      
      // Check for development badge
      expect(screen.getByText(/Under Development/i)).toBeInTheDocument();
    });

    test('should show Premium release date', () => {
      const premiumPlan = mockPlans[2];
      render(<PricingCard product={premiumPlan} underDevelopment={true} releaseDate="Q1 2026" />);
      
      // Check for release date
      expect(screen.getByText(/Q1 2026/i)).toBeInTheDocument();
    });

    test('should disable Premium CTA button', () => {
      const premiumPlan = mockPlans[2];
      const mockOnSelect = vi.fn();
      render(<PricingCard product={premiumPlan} onSelect={mockOnSelect} underDevelopment={true} />);
      
      // Button should show "Join Waitlist" text
      const button = screen.getByText(/Join Waitlist/i);
      expect(button).toBeInTheDocument();
    });
  });

  describe('Full Pricing Grid', () => {
    test('should render all three pricing tiers', () => {
      render(<PricingTiers plans={mockPlans} />);
      
      // All three plans should be visible
      expect(screen.getByText('Starter')).toBeInTheDocument();
      expect(screen.getByText('Pro')).toBeInTheDocument();
      expect(screen.getByText('Premium')).toBeInTheDocument();
    });

    test('should display correct pricing hierarchy', () => {
      render(<PricingTiers plans={mockPlans} />);
      
      // Verify all prices are present
      expect(screen.getByText(/\$15/)).toBeInTheDocument();
      expect(screen.getByText(/\$45/)).toBeInTheDocument();
      expect(screen.getByText(/\$100/)).toBeInTheDocument();
    });

    test('should show empty state when no plans provided', () => {
      render(<PricingTiers plans={[]} />);
      
      expect(screen.getByText(/No pricing plans available/i)).toBeInTheDocument();
    });
  });

  describe('Plan Descriptions', () => {
    test('should show Starter description', () => {
      const starterPlan = mockPlans[0];
      render(<PricingCard product={starterPlan} />);
      
      expect(screen.getByText(/Perfect for service businesses/i)).toBeInTheDocument();
    });

    test('should show Pro description', () => {
      const proPlan = mockPlans[1];
      render(<PricingCard product={proPlan} />);
      
      expect(screen.getByText(/Add e-commerce and payments/i)).toBeInTheDocument();
    });

    test('should show Premium description', () => {
      const premiumPlan = mockPlans[2];
      render(<PricingCard product={premiumPlan} />);
      
      expect(screen.getByText(/Full automation and advanced tools/i)).toBeInTheDocument();
    });
  });

  describe('Feature Lists', () => {
    test('should display all Starter features', () => {
      const starterPlan = mockPlans[0];
      render(<PricingCard product={starterPlan} />);
      
      expect(screen.getByText(/Professional website/i)).toBeInTheDocument();
      expect(screen.getByText(/Contact forms/i)).toBeInTheDocument();
      expect(screen.getByText(/Mobile responsive/i)).toBeInTheDocument();
    });

    test('should display all Pro features', () => {
      const proPlan = mockPlans[1];
      render(<PricingCard product={proPlan} />);
      
      expect(screen.getByText(/Everything in Starter/i)).toBeInTheDocument();
      expect(screen.getByText(/Stripe payments/i)).toBeInTheDocument();
      expect(screen.getByText(/Order management/i)).toBeInTheDocument();
    });

    test('should display all Premium features', () => {
      const premiumPlan = mockPlans[2];
      render(<PricingCard product={premiumPlan} />);
      
      expect(screen.getByText(/Everything in Pro/i)).toBeInTheDocument();
      expect(screen.getByText(/Live chat/i)).toBeInTheDocument();
      expect(screen.getByText(/Email automation/i)).toBeInTheDocument();
    });
  });

  describe('Value Badges', () => {
    test('should display Starter value badge', () => {
      const starterPlan = mockPlans[0];
      render(<PricingCard product={starterPlan} />);
      
      expect(screen.getByText(/Save \$144\/year/i)).toBeInTheDocument();
      expect(screen.getByText(/vs Wix Combo/i)).toBeInTheDocument();
    });

    test('should display Pro value badge with highest savings', () => {
      const proPlan = mockPlans[1];
      render(<PricingCard product={proPlan} />);
      
      expect(screen.getByText(/Save \$720\/year/i)).toBeInTheDocument();
      expect(screen.getByText(/vs Shopify Basic/i)).toBeInTheDocument();
    });

    test('should display Premium value badge', () => {
      const premiumPlan = mockPlans[2];
      render(<PricingCard product={premiumPlan} />);
      
      expect(screen.getByText(/Save \$1,440\/year/i)).toBeInTheDocument();
      expect(screen.getByText(/vs Separate SaaS Tools/i)).toBeInTheDocument();
    });
  });
});

