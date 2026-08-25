import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ContactBookingForm from '../../src/components/setup/forms/ContactBookingForm.jsx';
import { SiteContext } from '../../src/context/SiteContext.jsx';

function renderForm(siteData, updates = {}) {
  const value = {
    siteData,
    updateField: vi.fn(),
    updateNestedField: vi.fn(),
    ...updates,
  };
  render(
    <SiteContext.Provider value={value}>
      <ContactBookingForm />
    </SiteContext.Provider>
  );
  return value;
}

describe('ContactBookingForm address privacy', () => {
  it('shows the hide-street callout without hunting', () => {
    renderForm({
      contact: { email: 'a@b.com', phone: '555', address: '99 Hidden Ln' },
    });
    expect(screen.getByTestId('address-privacy-callout')).toHaveTextContent('Hide your street on the live site');
    expect(screen.getByTestId('address-privacy-hint')).toHaveTextContent('Prefer not to show this on your site?');
    expect(screen.getByLabelText(/^Address$/i)).toBeInTheDocument();
  });

  it('switches to private address and area fields', async () => {
    const user = userEvent.setup();
    const ctx = renderForm({
      contact: { email: 'a@b.com', phone: '555', address: '99 Hidden Ln' },
    });
    await user.click(screen.getByTestId('address-display-area'));
    expect(ctx.updateNestedField).toHaveBeenCalledWith('contact.addressDisplay', 'area');
  });

  it('shows area controls when already opted in', () => {
    renderForm({
      contact: {
        email: 'a@b.com',
        address: '99 Hidden Ln',
        addressDisplay: 'area',
        serviceAreaLabel: 'Montclair, NJ',
        serviceRadiusMiles: 10,
      },
    });
    expect(screen.getByLabelText(/Private address/i)).toBeInTheDocument();
    expect(screen.getByTestId('service-area-label')).toHaveValue('Montclair, NJ');
    expect(screen.getByText(/Buyers still get the private address/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Google Maps URL/i)).not.toBeInTheDocument();
  });
});
