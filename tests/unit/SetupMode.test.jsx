/**
 * Tests for Setup.jsx first screen — Quick Start, not a Permanent vs Pop-up choice.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Setup from '../../src/pages/Setup';

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

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
    useNavigate: () => vi.fn(),
  };
});

vi.mock('../../src/hooks/useToast', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showWarning: vi.fn(),
  }),
}));

vi.mock('../../src/services/templates', () => ({
  templatesService: {
    getTemplates: vi.fn().mockResolvedValue([]),
    getTemplate: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('../../src/hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: vi.fn(),
}));

vi.mock('../../src/components/setup/QuickStartWizard', () => ({
  default: () => <div data-testid="quickstart-wizard">QuickStartWizard</div>,
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

describe('Setup first screen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens Quick Start without a Permanent vs Pop-up choice', () => {
    render(
      <MemoryRouter>
        <Setup />
      </MemoryRouter>
    );
    expect(screen.getByTestId('quickstart-wizard')).toBeTruthy();
    expect(screen.queryByTestId('setup-mode-choice')).toBeNull();
    expect(screen.queryByTestId('choose-business')).toBeNull();
    expect(screen.queryByTestId('choose-bazaar')).toBeNull();
  });
});
