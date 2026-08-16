/**
 * Tests for Setup.jsx mode choice — Bazaar vs QuickStart
 *
 * Verifies:
 *   1. Choice screen renders with data-testid="setup-mode-choice"
 *   2. Clicking pop-up shows BazaarWizard
 *   3. Clicking business shows QuickStartWizard
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Setup from '../../src/pages/Setup';

// Mock useSite
const mockLoadTemplate = vi.fn().mockResolvedValue(undefined);
const mockSaveDraft = vi.fn().mockResolvedValue({ id: 'test-draft' });
vi.mock('../../src/hooks/useSite', () => ({
  useSite: () => ({
    siteData: {},
    draftId: null,
    loadTemplate: mockLoadTemplate,
    saveDraft: mockSaveDraft,
    setSiteData: vi.fn(),
    clearDraft: vi.fn(),
    getDraft: vi.fn().mockResolvedValue(null),
  }),
}));

// Mock useSearchParams
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
    useNavigate: () => vi.fn(),
  };
});

// Mock toast
vi.mock('../../src/hooks/useToast', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showWarning: vi.fn(),
  }),
}));

// Mock templates service
vi.mock('../../src/services/templates', () => ({
  templatesService: {
    getTemplates: vi.fn().mockResolvedValue([]),
    getTemplate: vi.fn().mockResolvedValue(null),
  },
}));

// Mock keyboard shortcuts
vi.mock('../../src/hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: vi.fn(),
}));

// Mock heavy components so tests stay fast
vi.mock('../../src/components/setup/QuickStartWizard', () => ({
  default: () => <div data-testid="quickstart-wizard">QuickStartWizard</div>,
}));

vi.mock('../../src/components/setup/BazaarWizard', () => ({
  default: ({ onComplete, onCancel }) => (
    <div data-testid="bazaar-wizard">
      BazaarWizard
      <button data-testid="bazaar-complete" onClick={() => onComplete && onComplete({})}>Complete</button>
    </div>
  ),
}));

vi.mock('../../src/components/setup/TemplateGrid', () => ({
  default: () => <div>TemplateGrid</div>,
}));

vi.mock('../../src/components/setup/EditorPanel', () => ({
  default: () => <div>EditorPanel</div>,
}));

vi.mock('../../src/components/setup/PublishModal', () => ({
  default: () => <div>PublishModal</div>,
}));

vi.mock('../../src/components/setup/CustomTemplateBuilder', () => ({
  default: () => <div>CustomTemplateBuilder</div>,
}));

vi.mock('../../src/components/common/LoadingFallback', () => ({
  default: () => <div>Loading</div>,
}));

vi.mock('../../src/components/common/SaveIndicator', () => ({
  default: () => <div>SaveIndicator</div>,
}));

vi.mock('../../src/components/common/ProgressIndicator', () => ({
  default: () => <div>ProgressIndicator</div>,
}));

vi.mock('../../src/components/common/SkeletonLoader', () => ({
  default: () => <div>SkeletonLoader</div>,
}));

vi.mock('../../src/components/layout/Header', () => ({
  default: () => <div>Header</div>,
}));

describe('Setup mode choice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the setup mode choice screen', () => {
    render(
      <MemoryRouter>
        <Setup />
      </MemoryRouter>
    );
    const choice = screen.getByTestId('setup-mode-choice');
    expect(choice).toBeTruthy();
  });

  it('shows "choose-bazaar" button for pop-up mode', () => {
    render(
      <MemoryRouter>
        <Setup />
      </MemoryRouter>
    );
    const bazaarBtn = screen.getByTestId('choose-bazaar');
    expect(bazaarBtn).toBeTruthy();
  });

  it('shows "choose-business" button for permanent business', () => {
    render(
      <MemoryRouter>
        <Setup />
      </MemoryRouter>
    );
    const businessBtn = screen.getByTestId('choose-business');
    expect(businessBtn).toBeTruthy();
  });

  it('clicking pop-up shows BazaarWizard', async () => {
    render(
      <MemoryRouter>
        <Setup />
      </MemoryRouter>
    );

    const bazaarBtn = screen.getByTestId('choose-bazaar');
    fireEvent.click(bazaarBtn);

    await waitFor(() => {
      expect(screen.getByTestId('bazaar-wizard')).toBeTruthy();
    });
  });

  it('clicking business shows QuickStartWizard', async () => {
    render(
      <MemoryRouter>
        <Setup />
      </MemoryRouter>
    );

    const businessBtn = screen.getByTestId('choose-business');
    fireEvent.click(businessBtn);

    await waitFor(() => {
      expect(screen.getByTestId('quickstart-wizard')).toBeTruthy();
    });
  });
});
