import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminSubnav from '../../src/components/admin/AdminSubnav';

describe('AdminSubnav', () => {
  it('renders all admin navigation links', () => {
    render(
      <MemoryRouter>
        <AdminSubnav />
      </MemoryRouter>
    );

    const subnav = screen.getByTestId('admin-subnav');
    expect(subnav).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Hub' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'Users' })).toHaveAttribute('href', '/admin/users');
    expect(screen.getByRole('link', { name: 'Sites' })).toHaveAttribute('href', '/admin/sites');
    expect(screen.getByRole('link', { name: 'Candidates' })).toHaveAttribute('href', '/admin/candidates');
    expect(screen.getByRole('link', { name: 'Templates' })).toHaveAttribute('href', '/admin/templates');
    expect(screen.getByRole('link', { name: 'Pricing' })).toHaveAttribute('href', '/admin/pricing');
    expect(screen.getByRole('link', { name: 'Coupons' })).toHaveAttribute('href', '/admin/coupons');
    expect(screen.getByRole('link', { name: 'Plan features' })).toHaveAttribute('href', '/admin/plan-features');
  });
});
