import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PricingTiers from '../../src/components/pricing/PricingTiers';

// Mock PricingCard component
vi.mock('../../src/components/pricing/PricingCard', () => ({
  default: ({ product, highlighted, onSelect }) => (
    <div 
      data-testid={`pricing-card-${product.id}`}
      className={highlighted ? 'highlighted' : ''}
      onClick={() => onSelect && onSelect(product)}
    >
      <h3>{product.name}</h3>
      <p>{product.price}</p>
      {highlighted && <span>Popular</span>}
    </div>
  ),
}));

describe('PricingTiers Component', () => {
  const mockPlans = [
    {
      id: 'basic',
      name: 'Basic Plan',
      price: '$9.99/month',
      features: ['Feature 1', 'Feature 2'],
    },
    {
      id: 'pro',
      name: 'Pro Plan',
      price: '$19.99/month',
      features: ['Feature 1', 'Feature 2', 'Feature 3'],
    },
    {
      id: 'enterprise',
      name: 'Enterprise Plan',
      price: '$49.99/month',
      features: ['All features', 'Priority support'],
    },
  ];

  const mockOnSelectPlan = vi.fn();

  // Empty State Tests (2 tests)
  describe('Empty State', () => {
    it('should show empty message when no plans provided', () => {
      render(<PricingTiers plans={[]} />);

      expect(screen.getByText(/no pricing plans available/i)).toBeInTheDocument();
    });

    it('should show empty message when plans is null', () => {
      render(<PricingTiers plans={null} />);

      expect(screen.getByText(/no pricing plans available/i)).toBeInTheDocument();
    });
  });

  // Header Tests (2 tests)
  describe('Header', () => {
    it('should display pricing header', () => {
      render(<PricingTiers plans={mockPlans} onSelectPlan={mockOnSelectPlan} />);

      expect(screen.getByText(/choose your plan/i)).toBeInTheDocument();
      expect(screen.getByText(/select the perfect plan/i)).toBeInTheDocument();
    });

    it('should display footer notes', () => {
      render(<PricingTiers plans={mockPlans} onSelectPlan={mockOnSelectPlan} />);

      expect(screen.getByText(/30-day money-back guarantee/i)).toBeInTheDocument();
      expect(screen.getByText(/secure payment processed by stripe/i)).toBeInTheDocument();
    });
  });

  // Plans Display Tests (3 tests)
  describe('Plans Display', () => {
    it('should render all plans', () => {
      render(<PricingTiers plans={mockPlans} onSelectPlan={mockOnSelectPlan} />);

      expect(screen.getByText('Basic Plan')).toBeInTheDocument();
      expect(screen.getByText('Pro Plan')).toBeInTheDocument();
      expect(screen.getByText('Enterprise Plan')).toBeInTheDocument();
    });

    it('should display plan prices', () => {
      render(<PricingTiers plans={mockPlans} onSelectPlan={mockOnSelectPlan} />);

      expect(screen.getByText('$9.99/month')).toBeInTheDocument();
      expect(screen.getByText('$19.99/month')).toBeInTheDocument();
      expect(screen.getByText('$49.99/month')).toBeInTheDocument();
    });

    it('should render correct number of pricing cards', () => {
      const { container } = render(
        <PricingTiers plans={mockPlans} onSelectPlan={mockOnSelectPlan} />
      );

      const cards = container.querySelectorAll('[data-testid^="pricing-card-"]');
      expect(cards).toHaveLength(3);
    });
  });

  // Highlighted Plan Tests (2 tests)
  describe('Highlighted Plan', () => {
    it('should highlight specified plan', () => {
      render(
        <PricingTiers
          plans={mockPlans}
          onSelectPlan={mockOnSelectPlan}
          highlightedPlanId="pro"
        />
      );

      const proCard = screen.getByTestId('pricing-card-pro');
      expect(proCard).toHaveClass('highlighted');
      expect(screen.getByText('Popular')).toBeInTheDocument();
    });

    it('should not highlight any plan when highlightedPlanId not provided', () => {
      const { container } = render(
        <PricingTiers 
          plans={mockPlans} 
          onSelectPlan={mockOnSelectPlan}
        />
      );

      const highlightedCards = container.querySelectorAll('.highlighted');
      expect(highlightedCards).toHaveLength(0);
    });
    });

  // Interaction Tests (2 tests)
  describe('Plan Selection', () => {
    it('should call onSelectPlan when plan clicked', async () => {
      const user = userEvent.setup();
      render(
        <PricingTiers
          plans={mockPlans}
          onSelectPlan={mockOnSelectPlan}
        />
      );

      const proCard = screen.getByTestId('pricing-card-pro');
      await user.click(proCard);

      expect(mockOnSelectPlan).toHaveBeenCalledWith(mockPlans[1]);
    });

    it('should work without onSelectPlan callback', () => {
      expect(() => {
        render(<PricingTiers plans={mockPlans} />);
      }).not.toThrow();
    });
  });

  // Edge Cases Test (1 test)
  describe('Edge Cases', () => {
    it('should handle single plan', () => {
      const singlePlan = [mockPlans[0]];
      render(
        <PricingTiers
          plans={singlePlan} 
          onSelectPlan={mockOnSelectPlan}
        />
      );

      expect(screen.getByText('Basic Plan')).toBeInTheDocument();
      expect(screen.queryByText('Pro Plan')).not.toBeInTheDocument();
    });
  });
});
