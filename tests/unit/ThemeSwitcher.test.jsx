import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ThemeSwitcher from '../../src/components/layout/ThemeSwitcher';
import { ThemeProvider } from '../../src/context/ThemeContext.jsx';
import { LocaleProvider } from '../../src/i18n/LocaleContext.jsx';
import { THEME_STORAGE_KEY } from '../../src/utils/appTheme.js';

function renderSwitcher() {
  return render(
    <MemoryRouter>
      <LocaleProvider>
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>
      </LocaleProvider>
    </MemoryRouter>
  );
}

describe('ThemeSwitcher', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('shows light and dark options', () => {
    renderSwitcher();
    expect(screen.getByTestId('theme-switcher-light')).toBeInTheDocument();
    expect(screen.getByTestId('theme-switcher-dark')).toBeInTheDocument();
  });

  it('switches to dark and persists', async () => {
    const user = userEvent.setup();
    renderSwitcher();

    await user.click(screen.getByTestId('theme-switcher-dark'));

    expect(screen.getByTestId('theme-switcher-dark')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('theme-switcher-dark')).toHaveClass('is-active');
    expect(screen.getByTestId('theme-switcher-light')).toHaveAttribute('aria-pressed', 'false');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('marks light as selected after switching back', async () => {
    const user = userEvent.setup();
    renderSwitcher();

    await user.click(screen.getByTestId('theme-switcher-dark'));
    await user.click(screen.getByTestId('theme-switcher-light'));

    expect(screen.getByTestId('theme-switcher-light')).toHaveClass('is-active');
    expect(screen.getByTestId('theme-switcher-dark')).not.toHaveClass('is-active');
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
