import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AnalyticsChart from '../../src/components/analytics/AnalyticsChart';

// Mock Chart.js
vi.mock('react-chartjs-2', () => ({
  Line: ({ data, options }) => (
    <div data-testid="line-chart">
      <div data-testid="chart-title">{data.datasets[0].label}</div>
      <div data-testid="chart-data">{JSON.stringify(data.datasets[0].data)}</div>
    </div>
  )
}));

describe('AnalyticsChart Component', () => {
  const mockData = [100, 150, 200, 180, 220, 250];
  const mockLabels = ['Jan 1', 'Jan 2', 'Jan 3', 'Jan 4', 'Jan 5', 'Jan 6'];

  // Rendering Tests (3 tests)
  describe('Component Rendering', () => {
    it('should render chart with title', () => {
      render(
        <AnalyticsChart
          title="Test Chart"
          data={mockData}
          labels={mockLabels}
        />
      );

      expect(screen.getByRole('heading', { name: 'Test Chart' })).toBeInTheDocument();
    });

    it('should render line chart component', () => {
      render(
        <AnalyticsChart
          title="Test Chart"
          data={mockData}
          labels={mockLabels}
        />
      );

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should pass data to chart', () => {
      render(
        <AnalyticsChart
          title="Test Chart"
          data={mockData}
          labels={mockLabels}
        />
      );

      const chartData = screen.getByTestId('chart-data');
      expect(chartData.textContent).toContain('100');
      expect(chartData.textContent).toContain('250');
    });
  });

  // Data Handling (4 tests)
  describe('Data Handling', () => {
    it('should handle empty data', () => {
      render(
        <AnalyticsChart
          title="Empty Chart"
          data={[]}
          labels={[]}
        />
      );

      expect(screen.getByRole('heading', { name: 'Empty Chart' })).toBeInTheDocument();
    });

    it('should handle large numbers', () => {
      const largeData = [10000, 25000, 50000];
      const labels = ['Day 1', 'Day 2', 'Day 3'];

      render(
        <AnalyticsChart
          title="Large Numbers"
          data={largeData}
          labels={labels}
        />
      );

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should handle decimal values', () => {
      const decimalData = [10.5, 20.7, 30.2];
      const labels = ['A', 'B', 'C'];

      render(
        <AnalyticsChart
          title="Decimals"
          data={decimalData}
          labels={labels}
        />
      );

      expect(screen.getByRole('heading', { name: 'Decimals' })).toBeInTheDocument();
    });

    it('should update when data changes', () => {
      const { rerender } = render(
        <AnalyticsChart
          title="Dynamic Chart"
          data={[1, 2, 3]}
          labels={['A', 'B', 'C']}
        />
      );

      expect(screen.getByTestId('chart-data').textContent).toContain('1');

      rerender(
        <AnalyticsChart
          title="Dynamic Chart"
          data={[4, 5, 6]}
          labels={['A', 'B', 'C']}
        />
      );

      expect(screen.getByTestId('chart-data').textContent).toContain('4');
    });
  });

  // Color Customization (3 tests)
  describe('Color Customization', () => {
    it('should use default color when none provided', () => {
      render(
        <AnalyticsChart
          title="Default Color"
          data={mockData}
          labels={mockLabels}
        />
      );

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should accept custom color', () => {
      render(
        <AnalyticsChart
          title="Custom Color"
          data={mockData}
          labels={mockLabels}
          color="#ff0000"
        />
      );

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should render with different color values', () => {
      const colors = ['#06b6d4', '#8b5cf6', '#22c55e', '#f59e0b'];

      colors.forEach(color => {
        const { unmount } = render(
          <AnalyticsChart
            title="Color Test"
            data={mockData}
            labels={mockLabels}
            color={color}
          />
        );
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
        unmount();
      });
    });
  });

  // Title Display (2 tests)
  describe('Title Display', () => {
    it('should display title with emoji', () => {
      render(
        <AnalyticsChart
          title="📈 Site Views Over Time"
          data={mockData}
          labels={mockLabels}
        />
      );

      expect(screen.getByRole('heading', { name: '📈 Site Views Over Time' })).toBeInTheDocument();
    });

    it('should handle long titles', () => {
      const longTitle = 'This is a Very Long Chart Title That Should Still Display Properly';

      render(
        <AnalyticsChart
          title={longTitle}
          data={mockData}
          labels={mockLabels}
        />
      );

      expect(screen.getByRole('heading', { name: longTitle })).toBeInTheDocument();
    });
  });

  // Chart Container (3 tests)
  describe('Chart Container', () => {
    it('should render chart container', () => {
      const { container } = render(
        <AnalyticsChart
          title="Container Test"
          data={mockData}
          labels={mockLabels}
        />
      );

      expect(container.querySelector('.analytics-chart')).toBeInTheDocument();
    });

    it('should have proper structure', () => {
      render(
        <AnalyticsChart
          title="Structure Test"
          data={mockData}
          labels={mockLabels}
        />
      );

      expect(screen.getByRole('heading', { name: 'Structure Test' })).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should render multiple charts independently', () => {
      render(
        <>
          <AnalyticsChart
            title="Chart 1"
            data={[1, 2, 3]}
            labels={['A', 'B', 'C']}
          />
          <AnalyticsChart
            title="Chart 2"
            data={[4, 5, 6]}
            labels={['D', 'E', 'F']}
          />
        </>
      );

      expect(screen.getByRole('heading', { name: 'Chart 1' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Chart 2' })).toBeInTheDocument();
    });
  });
});

