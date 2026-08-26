import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemePicker from '../../src/components/setup/forms/ThemePicker';
import { colorsFromSiteTheme } from '../../src/config/siteThemes';

vi.mock('../../src/hooks/useSite', () => ({
  useSite: vi.fn(),
}));

vi.mock('../../src/i18n/LocaleContext.jsx', () => ({
  useLocale: () => ({ t: (key) => key }),
}));

vi.mock('../../src/utils/laborInquiryMailto', () => ({
  laborDisplayVars: () => null,
}));

import { useSite } from '../../src/hooks/useSite';

describe('ThemePicker', () => {
  let mockUpdateField;

  beforeEach(() => {
    mockUpdateField = vi.fn();
    useSite.mockReturnValue({
      siteData: {
        _themeId: 'onyx-ink',
        template: 'salon',
      },
      updateField: mockUpdateField,
    });
  });

  it('uses each palette’s text color for the Light/Dark label', () => {
    render(<ThemePicker templateId="salon" />);

    const darkLabel = screen.getByTestId('theme-card-onyx-ink').querySelector('.theme-mode-label');
    const lightLabel = screen.getByTestId('theme-card-ivory-navy').querySelector('.theme-mode-label');

    expect(darkLabel).toHaveTextContent('Dark');
    expect(darkLabel).toHaveStyle({ color: '#f4f2ee' });
    expect(lightLabel).toHaveTextContent('Light');
    expect(lightLabel).toHaveStyle({ color: '#1b1b1f' });
  });

  it('marks the current theme selected', () => {
    render(<ThemePicker templateId="salon" />);

    expect(screen.getByTestId('theme-card-onyx-ink')).toHaveClass('selected');
    expect(screen.getByTestId('theme-card-onyx-ink')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('theme-card-ivory-navy')).not.toHaveClass('selected');
  });

  it('applies locked theme colors when a card is chosen', async () => {
    const user = userEvent.setup();
    render(<ThemePicker templateId="salon" />);

    await user.click(screen.getByTestId('theme-card-ivory-grove'));

    expect(mockUpdateField).toHaveBeenCalledWith('_themeId', 'ivory-grove');
    expect(mockUpdateField).toHaveBeenCalledWith('colors', colorsFromSiteTheme('ivory-grove'));
  });
});
