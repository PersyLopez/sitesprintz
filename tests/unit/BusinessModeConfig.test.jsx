import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import BusinessModeConfig from '../../src/components/booking/BusinessModeConfig';
import * as api from '../../src/utils/api';

vi.mock('../../src/utils/api', () => ({
  get: vi.fn(),
  put: vi.fn(),
  post: vi.fn(),
}));

describe('BusinessModeConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url.includes('suggest')) {
        return Promise.reject(new Error('no suggestion'));
      }
      return Promise.resolve({
        config: { configuredMode: 'solo', isSoloOperation: true },
      });
    });
    api.put.mockResolvedValue({ success: true });
    api.post.mockResolvedValue({ success: true });
  });

  it('shows inline error instead of alert when a locked team card is clicked', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<BusinessModeConfig tenantId="t1" />);

    await waitFor(() => {
      expect(screen.getByTestId('business-mode-config')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('mode-card-team'));

    await waitFor(() => {
      expect(screen.getByTestId('config-error')).toHaveTextContent(
        'Add more staff members to enable team modes'
      );
    });

    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
