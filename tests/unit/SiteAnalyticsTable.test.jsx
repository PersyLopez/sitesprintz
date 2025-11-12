import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SiteAnalyticsTable from '../../src/components/analytics/SiteAnalyticsTable';

describe('SiteAnalyticsTable Component', () => {
  const mockSites = [
    {
      id: '1',
      name: 'Main Site',
      views: 5234,
      visitors: 1543,
      bounceRate: 38.2,
      avgDuration: '3m 12s'
    },
    {
      id: '2',
      name: 'Restaurant Site',
      views: 4156,
      visitors: 1234,
      bounceRate: 45.1,
      avgDuration: '2m 08s'
    }
  ];

  // Rendering (3 tests)
  describe('Rendering', () => {
    it('should render table headers', () => {
      render(
        <MemoryRouter>
          <SiteAnalyticsTable sites={mockSites} />
        </MemoryRouter>
      );

      expect(screen.getByText('Site Name')).toBeInTheDocument();
      expect(screen.getByText('Views')).toBeInTheDocument();
      expect(screen.getByText('Visitors')).toBeInTheDocument();
      expect(screen.getByText('Bounce Rate')).toBeInTheDocument();
      expect(screen.getByText('Avg. Duration')).toBeInTheDocument();
    });

    it('should render site data', () => {
      render(
        <MemoryRouter>
          <SiteAnalyticsTable sites={mockSites} />
        </MemoryRouter>
      );

      expect(screen.getByText('Main Site')).toBeInTheDocument();
      expect(screen.getByText('Restaurant Site')).toBeInTheDocument();
    });

    it('should handle empty sites array', () => {
      render(
        <MemoryRouter>
          <SiteAnalyticsTable sites={[]} />
        </MemoryRouter>
      );

      expect(screen.getByText('Site Name')).toBeInTheDocument();
    });
  });

  // Data Display (4 tests)
  describe('Data Display', () => {
    it('should display formatted view counts', () => {
      render(
        <MemoryRouter>
          <SiteAnalyticsTable sites={mockSites} />
        </MemoryRouter>
      );

      expect(screen.getByText(/5,234/)).toBeInTheDocument();
      expect(screen.getByText(/4,156/)).toBeInTheDocument();
    });

    it('should display visitor counts', () => {
      render(
        <MemoryRouter>
          <SiteAnalyticsTable sites={mockSites} />
        </MemoryRouter>
      );

      expect(screen.getByText(/1,543/)).toBeInTheDocument();
      expect(screen.getByText(/1,234/)).toBeInTheDocument();
    });

    it('should display bounce rates', () => {
      render(
        <MemoryRouter>
          <SiteAnalyticsTable sites={mockSites} />
        </MemoryRouter>
      );

      expect(screen.getByText('38.2%')).toBeInTheDocument();
      expect(screen.getByText('45.1%')).toBeInTheDocument();
    });

    it('should display average durations', () => {
      render(
        <MemoryRouter>
          <SiteAnalyticsTable sites={mockSites} />
        </MemoryRouter>
      );

      expect(screen.getByText('3m 12s')).toBeInTheDocument();
      expect(screen.getByText('2m 08s')).toBeInTheDocument();
    });
  });

  // Links (2 tests)
  describe('Links', () => {
    it('should have view details links', () => {
      render(
        <MemoryRouter>
          <SiteAnalyticsTable sites={mockSites} />
        </MemoryRouter>
      );

      const links = screen.getAllByText('View Details');
      expect(links).toHaveLength(2);
    });

    it('should link to correct analytics page', () => {
      render(
        <MemoryRouter>
          <SiteAnalyticsTable sites={mockSites} />
        </MemoryRouter>
      );

      const links = screen.getAllByText('View Details');
      expect(links[0]).toHaveAttribute('href', '/analytics?siteId=1');
      expect(links[1]).toHaveAttribute('href', '/analytics?siteId=2');
    });
  });

  // Edge Cases (3 tests)
  describe('Edge Cases', () => {
    it('should handle missing data gracefully', () => {
      const sitesWithMissingData = [
        {
          id: '3',
          name: 'Incomplete Site',
          views: null,
          visitors: null,
          bounceRate: null,
          avgDuration: null
        }
      ];

      render(
        <MemoryRouter>
          <SiteAnalyticsTable sites={sitesWithMissingData} />
        </MemoryRouter>
      );

      expect(screen.getByText('Incomplete Site')).toBeInTheDocument();
      const naElements = screen.getAllByText('N/A');
      expect(naElements.length).toBeGreaterThan(0);
    });

    it('should render single site', () => {
      render(
        <MemoryRouter>
          <SiteAnalyticsTable sites={[mockSites[0]]} />
        </MemoryRouter>
      );

      expect(screen.getByText('Main Site')).toBeInTheDocument();
      const links = screen.getAllByText('View Details');
      expect(links).toHaveLength(1);
    });

    it('should render many sites', () => {
      const manySites = Array.from({ length: 10 }, (_, i) => ({
        id: String(i),
        name: `Site ${i}`,
        views: 1000 * i,
        visitors: 100 * i,
        bounceRate: 30 + i,
        avgDuration: `${i}m 00s`
      }));

      render(
        <MemoryRouter>
          <SiteAnalyticsTable sites={manySites} />
        </MemoryRouter>
      );

      expect(screen.getByText('Site 0')).toBeInTheDocument();
      expect(screen.getByText('Site 9')).toBeInTheDocument();
    });
  });
});

