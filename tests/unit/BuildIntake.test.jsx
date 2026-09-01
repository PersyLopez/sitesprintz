/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../../src/context/ToastContext';
import BuildIntake from '../../src/pages/BuildIntake.jsx';
import { isSetupOfferActive } from '../../src/config/pricing.config.js';

vi.mock('../../src/components/layout/Header', () => ({
  default: () => <div data-testid="header">Header</div>,
}));

vi.mock('../../src/components/layout/Footer', () => ({
  default: () => <div data-testid="footer">Footer</div>,
}));

vi.mock('../../src/components/setup/forms/ImageUploader', () => ({
  default: ({ label }) => <div data-testid="image-uploader">{label}</div>,
}));

vi.mock('../../src/config/pricing.config.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    isSetupOfferActive: vi.fn(() => false),
  };
});

function renderBuild() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <BuildIntake />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('BuildIntake — Growth Managed', () => {
  it('is Growth Managed at $75 and keeps submit disabled until acknowledged', () => {
    isSetupOfferActive.mockReturnValue(false);
    renderBuild();

    expect(screen.getByTestId('build-plan-callout')).toHaveTextContent(/Growth Managed/i);
    expect(screen.getByTestId('build-plan-callout')).toHaveTextContent('$75');
    expect(screen.getByTestId('build-plan-ack')).not.toBeChecked();
    expect(screen.getByTestId('build-intake-submit')).toBeDisabled();
    expect(screen.getByRole('link', { name: /edit it myself on Growth/i })).toHaveAttribute(
      'href',
      '/register?plan=growth',
    );
    expect(document.body.textContent).not.toMatch(/\$49/);
  });
});

describe('BuildIntake — setup offer', () => {
  it('shows essential-first copy without Managed ack', () => {
    isSetupOfferActive.mockReturnValue(true);
    renderBuild();

    expect(screen.getByTestId('build-need-this')).toHaveTextContent(/Need this|the big photo at the top/i);
    expect(screen.getByTestId('build-intake-email-alt')).toHaveAttribute('href', expect.stringMatching(/^mailto:support@rightsitelight\.com/));
    expect(screen.queryByTestId('build-plan-ack')).toBeNull();
    expect(screen.getByTestId('build-intake-submit')).not.toBeDisabled();
    expect(document.body.textContent).not.toMatch(/hero/i);
    expect(document.body.textContent).not.toMatch(/no setup fee/i);
  });
});
