import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import LegacySitePaneRedirect from '../../src/components/dashboard/LegacySitePaneRedirect';

function LocationDisplay() {
  const { pathname } = useLocation();
  return <div data-testid="location">{pathname}</div>;
}

function renderRedirect(initialEntry, pane) {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/orders" element={<LegacySitePaneRedirect pane={pane} />} />
        <Route path="/products" element={<LegacySitePaneRedirect pane={pane} />} />
        <Route path="/booking-dashboard" element={<LegacySitePaneRedirect pane={pane} />} />
        <Route path="/dashboard" element={<LocationDisplay />} />
        <Route path="/dashboard/sites/:siteId/orders" element={<LocationDisplay />} />
        <Route path="/dashboard/sites/:siteId/products" element={<LocationDisplay />} />
        <Route path="/dashboard/sites/:siteId/appointments" element={<LocationDisplay />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LegacySitePaneRedirect', () => {
  it('redirects /orders?siteId=site-1 to site orders workspace', () => {
    renderRedirect('/orders?siteId=site-1', 'orders');
    expect(screen.getByTestId('location')).toHaveTextContent('/dashboard/sites/site-1/orders');
  });

  it('redirects /products without siteId to /dashboard', () => {
    renderRedirect('/products', 'products');
    expect(screen.getByTestId('location')).toHaveTextContent('/dashboard');
  });

  it('redirects /booking-dashboard?siteId=abc to appointments workspace', () => {
    renderRedirect('/booking-dashboard?siteId=abc', 'appointments');
    expect(screen.getByTestId('location')).toHaveTextContent('/dashboard/sites/abc/appointments');
  });
});
