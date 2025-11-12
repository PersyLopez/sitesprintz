import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import TrialBanner from '../../src/components/dashboard/TrialBanner';

describe('TrialBanner Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderTrialBanner = (user) => {
    return render(
      <MemoryRouter>
        <TrialBanner user={user} />
      </MemoryRouter>
    );
  };

  it('should render trial banner with days remaining', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    
    const user = { trial_expires_at: futureDate.toISOString() };
    renderTrialBanner(user);
    
    expect(screen.getByText(/10 days remaining/i)).toBeInTheDocument();
  });

  it('should show gift icon for non-urgent trials', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    
    const user = { trial_expires_at: futureDate.toISOString() };
    renderTrialBanner(user);
    
    expect(screen.getByText('🎁')).toBeInTheDocument();
  });

  it('should show warning icon for urgent trials', () => {
    const urgentDate = new Date();
    urgentDate.setDate(urgentDate.getDate() + 2);
    
    const user = { trial_expires_at: urgentDate.toISOString() };
    renderTrialBanner(user);
    
    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  it('should add urgent class when 3 days or less remain', () => {
    const urgentDate = new Date();
    urgentDate.setDate(urgentDate.getDate() + 2);
    
    const user = { trial_expires_at: urgentDate.toISOString() };
    const { container } = renderTrialBanner(user);
    
    const banner = container.querySelector('.trial-banner');
    expect(banner).toHaveClass('urgent');
  });

  it('should display urgent message when trial ending soon', () => {
    const urgentDate = new Date();
    urgentDate.setDate(urgentDate.getDate() + 2);
    
    const user = { trial_expires_at: urgentDate.toISOString() };
    renderTrialBanner(user);
    
    expect(screen.getByText(/Trial Ending Soon/i)).toBeInTheDocument();
    expect(screen.getByText(/Upgrade now to keep your sites online/i)).toBeInTheDocument();
  });

  it('should display normal message when trial not urgent', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 15);
    
    const user = { trial_expires_at: futureDate.toISOString() };
    renderTrialBanner(user);
    
    expect(screen.getByText(/Free Trial Active/i)).toBeInTheDocument();
    expect(screen.getByText(/Enjoying SiteSprintz/i)).toBeInTheDocument();
  });

  it('should show upgrade button', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    
    const user = { trial_expires_at: futureDate.toISOString() };
    renderTrialBanner(user);
    
    const upgradeButton = screen.getByRole('link', { name: /Upgrade Now/i });
    expect(upgradeButton).toHaveAttribute('href', '/#pricing');
  });

  it('should show compare plans button', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    
    const user = { trial_expires_at: futureDate.toISOString() };
    renderTrialBanner(user);
    
    const compareButton = screen.getByRole('link', { name: /Compare Plans/i });
    expect(compareButton).toHaveAttribute('href', '/#pricing');
  });

  it('should calculate days correctly', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    
    const user = { trial_expires_at: futureDate.toISOString() };
    renderTrialBanner(user);
    
    expect(screen.getByText(/7 days/i)).toBeInTheDocument();
  });

  it('should not show negative days', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);
    
    const user = { trial_expires_at: pastDate.toISOString() };
    renderTrialBanner(user);
    
    // Should show 0 days, not -5
    expect(screen.getByText(/0 days/i)).toBeInTheDocument();
  });
});
