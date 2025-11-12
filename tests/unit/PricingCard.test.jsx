import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PricingCard from '@/components/pricing/PricingCard';

describe('PricingCard', () => {
  const mockProduct = {
    name: 'Pro Plan',
    description: 'Perfect for growing businesses',
    price: 29.99,
    billingPeriod: 'monthly',
    features: [
      'Unlimited sites',
      'Custom domain',
      'E-commerce enabled',
      'Priority support'
    ]
  };

  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render product information correctly', () => {
    render(
      <PricingCard 
        product={mockProduct}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('Pro Plan')).toBeInTheDocument();
    expect(screen.getByText('Perfect for growing businesses')).toBeInTheDocument();
    expect(screen.getByText(/\$29\.99/)).toBeInTheDocument();
    expect(screen.getByText(/\/ month/)).toBeInTheDocument();
  });

  it('should display all features', () => {
    render(
      <PricingCard 
        product={mockProduct}
        onSelect={mockOnSelect}
      />
    );

    mockProduct.features.forEach(feature => {
      expect(screen.getByText(feature)).toBeInTheDocument();
    });
  });

  it('should call onSelect when button is clicked', () => {
    render(
      <PricingCard 
        product={mockProduct}
        onSelect={mockOnSelect}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockOnSelect).toHaveBeenCalledTimes(1);
    expect(mockOnSelect).toHaveBeenCalledWith(mockProduct);
  });

  it('should not render button if onSelect is not provided', () => {
    render(
      <PricingCard 
        product={mockProduct}
      />
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should display custom CTA text', () => {
    const productWithCTA = { 
      ...mockProduct, 
      ctaText: 'Get Started Now' 
    };
    
    render(
      <PricingCard 
        product={productWithCTA}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText(/Get Started Now/)).toBeInTheDocument();
  });

  it('should highlight featured products', () => {
    const featuredProduct = { 
      ...mockProduct, 
      featured: true 
    };
    
    const { container } = render(
      <PricingCard 
        product={featuredProduct}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText(/Most Popular/i)).toBeInTheDocument();
    expect(container.querySelector('.featured')).toBeTruthy();
  });

  it('should apply highlighted styling', () => {
    const { container } = render(
      <PricingCard 
        product={mockProduct}
        highlighted={true}
        onSelect={mockOnSelect}
      />
    );

    expect(container.querySelector('.highlighted')).toBeTruthy();
  });

  it('should display savings badge when compareAtPrice is higher', () => {
    const productWithSavings = {
      ...mockProduct,
      price: 29.99,
      compareAtPrice: 49.99
    };

    render(
      <PricingCard 
        product={productWithSavings}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText(/Save.*40%/i)).toBeInTheDocument();
  });

  it('should display strikethrough for compareAtPrice', () => {
    const productWithCompare = {
      ...mockProduct,
      price: 29.99,
      compareAtPrice: 49.99
    };

    render(
      <PricingCard 
        product={productWithCompare}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText(/Regular:/i)).toBeInTheDocument();
    // Check for strikethrough class on the element itself
    const comparePrice = document.querySelector('.strikethrough');
    expect(comparePrice).toBeInTheDocument();
    expect(comparePrice.textContent).toMatch(/\$49\.99/);
  });

  it('should display trial information when available', () => {
    const productWithTrial = {
      ...mockProduct,
      trialDays: 14
    };

    render(
      <PricingCard 
        product={productWithTrial}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText(/14-day free trial/i)).toBeInTheDocument();
  });

  it('should handle one-time payment products', () => {
    const oneTimeProduct = {
      ...mockProduct,
      billingPeriod: 'one-time'
    };

    render(
      <PricingCard 
        product={oneTimeProduct}
        onSelect={mockOnSelect}
      />
    );

    // Should not show period label for one-time payments
    expect(screen.queryByText('/ month')).not.toBeInTheDocument();
    expect(screen.queryByText('/ year')).not.toBeInTheDocument();
  });

  it('should format yearly billing period correctly', () => {
    const yearlyProduct = {
      ...mockProduct,
      billingPeriod: 'yearly'
    };

    render(
      <PricingCard 
        product={yearlyProduct}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('/ year')).toBeInTheDocument();
  });

  it('should format prices correctly', () => {
    const expensiveProduct = {
      ...mockProduct,
      price: 1234.56
    };

    render(
      <PricingCard 
        product={expensiveProduct}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText(/\$1,234/)).toBeInTheDocument();
  });

  it('should handle missing description gracefully', () => {
    const noDescProduct = {
      ...mockProduct,
      description: null
    };

    render(
      <PricingCard 
        product={noDescProduct}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('Pro Plan')).toBeInTheDocument();
    // Should not throw error
  });

  it('should handle empty features array', () => {
    const noFeaturesProduct = {
      ...mockProduct,
      features: []
    };

    render(
      <PricingCard 
        product={noFeaturesProduct}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('should calculate savings percentage correctly', () => {
    const productWithSavings = {
      ...mockProduct,
      price: 25,
      compareAtPrice: 100
    };

    render(
      <PricingCard 
        product={productWithSavings}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText(/Save 75%/i)).toBeInTheDocument();
  });
});

