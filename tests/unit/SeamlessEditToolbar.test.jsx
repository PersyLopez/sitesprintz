import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SeamlessEditToolbar from '../../src/components/published/SeamlessEditToolbar';

function renderToolbar(props = {}) {
  return render(
    <MemoryRouter>
      <SeamlessEditToolbar
        saveState="saved"
        canUndo={false}
        onUndo={vi.fn()}
        onOpenHistory={vi.fn()}
        historyOpen={false}
        history={[]}
        historyError=""
        selectedVersion={null}
        onSelectVersion={vi.fn()}
        onCloseHistory={vi.fn()}
        onRestore={vi.fn()}
        restoring={false}
        formatHistoryTime={() => 'Today'}
        dashboardHref="/dashboard/sites/site-1"
        settingsHref="/dashboard/sites/site-1/settings"
        builderHref="/setup?site=site-1"
        appointmentsHref="/dashboard/sites/site-1/appointments"
        productsHref="/dashboard/sites/site-1/products"
        {...props}
      />
    </MemoryRouter>
  );
}

describe('SeamlessEditToolbar scope panel', () => {
  it('shows the always-visible scope hint', () => {
    renderToolbar();
    const hint = screen.getByTestId('seamless-edit-scope');
    expect(hint.textContent).toMatch(/outlined text/i);
    expect(hint.textContent).toMatch(/not edited here/i);
  });

  it('replaces the scope hint when an unbound control was clicked', () => {
    renderToolbar({ unboundHint: 'Phone, hours, and address are in Site settings.' });
    expect(screen.getByTestId('seamless-edit-scope').textContent).toMatch(/Site settings/);
  });

  it('opens the panel with four workspace links', async () => {
    const user = userEvent.setup();
    renderToolbar();
    await user.click(screen.getByTestId('seamless-edit-scope-toggle'));
    expect(screen.getByTestId('seamless-edit-scope-panel')).toBeInTheDocument();
    expect(screen.getByTestId('seamless-edit-scope-settings')).toHaveAttribute(
      'href',
      '/dashboard/sites/site-1/settings'
    );
    expect(screen.getByTestId('seamless-edit-scope-edit')).toHaveAttribute('href', '/setup?site=site-1');
    expect(screen.getByTestId('seamless-edit-scope-appointments')).toHaveAttribute(
      'href',
      '/dashboard/sites/site-1/appointments'
    );
    expect(screen.getByTestId('seamless-edit-scope-products')).toHaveAttribute(
      'href',
      '/dashboard/sites/site-1/products'
    );
  });
});
