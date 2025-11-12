import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatsCard from '../../src/components/analytics/StatsCard';

describe('StatsCard Component', () => {
  // Basic Rendering (3 tests)
  describe('Basic Rendering', () => {
    it('should render with label and value', () => {
      render(
        <StatsCard
          icon="👁️"
          label="Total Views"
          value="12,458"
        />
      );

      expect(screen.getByText('Total Views')).toBeInTheDocument();
      expect(screen.getByText('12,458')).toBeInTheDocument();
    });

    it('should display icon', () => {
      render(
        <StatsCard
          icon="👥"
          label="Users"
          value="100"
        />
      );

      expect(screen.getByText('👥')).toBeInTheDocument();
    });

    it('should handle long values', () => {
      render(
        <StatsCard
          icon="💰"
          label="Revenue"
          value="$1,234,567.89"
        />
      );

      expect(screen.getByText('$1,234,567.89')).toBeInTheDocument();
    });
  });

  // Change Indicators (3 tests)
  describe('Change Indicators', () => {
    it('should show positive change', () => {
      render(
        <StatsCard
          icon="📈"
          label="Growth"
          value="150"
          change={15.5}
          changeLabel="vs last month"
        />
      );

      expect(screen.getByText(/15.5/)).toBeInTheDocument();
    });

    it('should show negative change', () => {
      render(
        <StatsCard
          icon="📉"
          label="Bounce Rate"
          value="42%"
          change={-5.2}
          changeLabel="vs last month"
        />
      );

      expect(screen.getByText(/5.2/)).toBeInTheDocument();
    });

    it('should show change label', () => {
      render(
        <StatsCard
          icon="⏱️"
          label="Duration"
          value="2m 30s"
          change={8.3}
          changeLabel="vs previous period"
        />
      );

      expect(screen.getByText(/vs previous period/i)).toBeInTheDocument();
    });
  });

  // Different Value Types (2 tests)
  describe('Value Types', () => {
    it('should handle numeric values', () => {
      render(
        <StatsCard
          icon="🔢"
          label="Count"
          value="1000"
        />
      );

      expect(screen.getByText('1000')).toBeInTheDocument();
    });

    it('should handle string values with formatting', () => {
      render(
        <StatsCard
          icon="⏰"
          label="Time"
          value="3m 45s"
        />
      );

      expect(screen.getByText('3m 45s')).toBeInTheDocument();
    });
  });

  // Multiple Cards (2 tests)
  describe('Multiple Cards', () => {
    it('should render multiple cards independently', () => {
      render(
        <>
          <StatsCard icon="📊" label="Metric 1" value="100" />
          <StatsCard icon="📈" label="Metric 2" value="200" />
          <StatsCard icon="💯" label="Metric 3" value="300" />
        </>
      );

      expect(screen.getByText('Metric 1')).toBeInTheDocument();
      expect(screen.getByText('Metric 2')).toBeInTheDocument();
      expect(screen.getByText('Metric 3')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('200')).toBeInTheDocument();
      expect(screen.getByText('300')).toBeInTheDocument();
    });

    it('should handle different icons', () => {
      const icons = ['👁️', '👥', '⏱️', '📈', '💰'];
      
      render(
        <>
          {icons.map((icon, i) => (
            <StatsCard key={i} icon={icon} label={`Stat ${i}`} value={i.toString()} />
          ))}
        </>
      );

      icons.forEach(icon => {
        expect(screen.getByText(icon)).toBeInTheDocument();
      });
    });
  });
});

