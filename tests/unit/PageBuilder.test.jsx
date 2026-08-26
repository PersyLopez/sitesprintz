import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PageBuilder, { inspectorKindForSection, LOOK_ID } from '../../src/components/setup/PageBuilder';
import { SiteContext } from '../../src/context/SiteContext';

vi.mock('../../src/hooks/useToast', () => ({
  useToast: () => ({ showError: vi.fn(), showSuccess: vi.fn() }),
}));

vi.mock('../../src/hooks/usePlan', () => ({
  usePlan: () => ({ plan: 'growth' }),
}));

vi.mock('../../src/components/setup/forms/BusinessInfoForm', () => ({
  default: () => <div data-testid="business-info-form">Business Info Form</div>,
}));

vi.mock('../../src/components/setup/forms/ThemePicker', () => ({
  default: () => <div data-testid="theme-picker">Theme Picker</div>,
}));

vi.mock('../../src/components/setup/forms/ServicesProductsEditor', () => ({
  default: () => <div data-testid="services-products-editor">Services & Products</div>,
}));

vi.mock('../../src/components/setup/forms/ContactBookingForm', () => ({
  default: () => <div data-testid="contact-booking-form">Contact & Booking</div>,
}));

describe('PageBuilder', () => {
  let updateField;

  const sections = [
    { id: 'hero-1', type: 'hero', enabled: true, order: 0 },
    { id: 'about-1', type: 'about', enabled: true, order: 1 },
    { id: 'services-1', type: 'services', enabled: true, order: 2 },
    { id: 'contact-1', type: 'contact', enabled: true, order: 3 },
  ];

  const renderBuilder = (extra = {}) => {
    updateField = vi.fn();
    return render(
      <SiteContext.Provider
        value={{
          siteData: { template: 'salon', sections, ...extra.siteData },
          updateField,
        }}
      >
        <PageBuilder />
      </SiteContext.Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps section types to inspector kinds', () => {
    expect(inspectorKindForSection(LOOK_ID)).toBe('look');
    expect(inspectorKindForSection('hero')).toBe('essentials');
    expect(inspectorKindForSection('services')).toBe('services');
    expect(inspectorKindForSection('contact')).toBe('contact');
  });

  it('shows essentials for the first section by default', () => {
    renderBuilder();
    expect(screen.getByTestId('page-builder')).toBeInTheDocument();
    expect(screen.getByTestId('business-info-form')).toBeInTheDocument();
  });

  it('opens look and services inspectors from the rail', async () => {
    const user = userEvent.setup();
    renderBuilder();

    await user.click(screen.getByTestId('builder-look'));
    expect(screen.getByTestId('theme-picker')).toBeInTheDocument();

    await user.click(screen.getByTestId('section-type-services'));
    expect(screen.getByTestId('services-products-editor')).toBeInTheDocument();

    await user.click(screen.getByTestId('section-type-contact'));
    expect(screen.getByTestId('contact-booking-form')).toBeInTheDocument();
  });

  it('does not offer a duplicate non-repeatable hero in the add menu', async () => {
    const user = userEvent.setup();
    renderBuilder();
    await user.click(screen.getByTestId('add-section-button'));
    expect(screen.getByTestId('add-section-menu')).toBeInTheDocument();
    expect(screen.queryByTestId('add-type-hero')).not.toBeInTheDocument();
  });

  it('adds a repeatable gallery section', async () => {
    const user = userEvent.setup();
    renderBuilder();
    await user.click(screen.getByTestId('add-section-button'));
    await user.click(screen.getByTestId('add-type-gallery'));
    expect(updateField).toHaveBeenCalled();
    const next = updateField.mock.calls[0][1];
    expect(next.some((section) => section.type === 'gallery')).toBe(true);
  });

  it('toggles section visibility', async () => {
    const user = userEvent.setup();
    renderBuilder();
    await user.click(screen.getByTestId('section-toggle-about-1'));
    expect(updateField).toHaveBeenCalledWith(
      'sections',
      expect.arrayContaining([expect.objectContaining({ id: 'about-1', enabled: false })])
    );
  });

  it('canceling remove leaves the section', async () => {
    const user = userEvent.setup();
    renderBuilder();
    await user.click(screen.getByTestId('section-remove-about-1'));
    expect(screen.getByTestId('remove-confirm')).toBeInTheDocument();
    await user.click(screen.getByTestId('remove-cancel'));
    expect(screen.queryByTestId('remove-confirm')).not.toBeInTheDocument();
    expect(updateField).not.toHaveBeenCalled();
  });

  it('confirming remove drops the section', async () => {
    const user = userEvent.setup();
    renderBuilder();
    await user.click(screen.getByTestId('section-remove-about-1'));
    await user.click(screen.getByTestId('remove-confirm-button'));
    const next = updateField.mock.calls[0][1];
    expect(next.some((section) => section.id === 'about-1')).toBe(false);
  });

  it('does not allow removing a required hero', () => {
    renderBuilder();
    expect(screen.getByTestId('section-remove-hero-1')).toBeDisabled();
  });

  it('moves a section down with the button', async () => {
    const user = userEvent.setup();
    renderBuilder();
    await user.click(screen.getByTestId('section-move-down-hero-1'));
    const next = updateField.mock.calls[0][1];
    expect(next[0].id).toBe('about-1');
    expect(next[1].id).toBe('hero-1');
  });

  it('closes the add menu on Escape', async () => {
    const user = userEvent.setup();
    renderBuilder();
    await user.click(screen.getByTestId('add-section-button'));
    expect(screen.getByTestId('add-section-menu')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByTestId('add-section-menu')).not.toBeInTheDocument();
  });

  it('does not persist a drop on the same index', () => {
    renderBuilder();
    const handle = screen.getByTestId('section-drag-about-1');
    fireEvent.dragStart(handle, { dataTransfer: { effectAllowed: 'move', setData: vi.fn() } });
    fireEvent.drop(screen.getByTestId('section-row-about-1'));
    expect(updateField).not.toHaveBeenCalled();
  });

  it('drops a section onto the end target', () => {
    renderBuilder();
    const handle = screen.getByTestId('section-drag-about-1');
    fireEvent.dragStart(handle, { dataTransfer: { effectAllowed: 'move', setData: vi.fn() } });
    fireEvent.drop(screen.getByTestId('section-drop-end'));
    expect(updateField).toHaveBeenCalled();
    const next = updateField.mock.calls[0][1];
    expect(next[next.length - 1].id).toBe('about-1');
  });
});
