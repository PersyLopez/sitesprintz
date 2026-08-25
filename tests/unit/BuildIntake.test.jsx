/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BuildIntake from '../../src/pages/BuildIntake.jsx';

vi.mock('../../src/components/layout/Header', () => ({
  default: () => <div data-testid="header">Header</div>,
}));

vi.mock('../../src/components/layout/Footer', () => ({
  default: () => <div data-testid="footer">Footer</div>,
}));

function renderBuild() {
  return render(
    <MemoryRouter>
      <BuildIntake />
    </MemoryRouter>,
  );
}

describe('BuildIntake — Growth Managed', () => {
  it('is Growth Managed at $75 and keeps submit disabled until acknowledged', () => {
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
