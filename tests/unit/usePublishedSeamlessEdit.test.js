import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePublishedSeamlessEdit } from '../../src/hooks/usePublishedSeamlessEdit';
import api from '../../src/services/api';

vi.mock('../../src/services/api', () => ({
  default: {
    patch: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock('../../src/utils/seamlessEdit', () => ({
  bindSeamlessEditing: (_root, { onCommit }) => {
    onCommit?.({ field: 'hero.title', previous: 'Old', value: 'New title' });
    return () => {};
  },
}));

describe('usePublishedSeamlessEdit flush', () => {
  const liveRef = { current: document.createElement('div') };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('setTimeout', (callback, delay) => {
      if (delay === 700 || delay === 3000) {
        callback();
        return 1;
      }
      return window.setTimeout(callback, delay);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('updates version and retries once after a 409 conflict', async () => {
    const conflictError = new Error('Version conflict detected');
    conflictError.statusCode = 409;
    conflictError.payload = { currentVersion: 5 };

    api.patch
      .mockRejectedValueOnce(conflictError)
      .mockResolvedValueOnce({ version: 6 });

    const { result } = renderHook(() => usePublishedSeamlessEdit({
      enabled: true,
      subdomain: 'gallery-salon',
      liveRef,
      siteData: { version: 4 },
      bindKey: 'markup',
      onRestored: vi.fn(),
    }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(api.patch).toHaveBeenCalledTimes(2);
    expect(api.patch.mock.calls[0][1].version).toBe(4);
    expect(api.patch.mock.calls[1][1].version).toBe(5);
    expect(result.current.saveState).toBe('saved');
  });

  it('does not treat 403 as a successful save', async () => {
    const forbiddenError = new Error('User does not have permission to edit this site');
    forbiddenError.statusCode = 403;
    forbiddenError.payload = { error: 'User does not have permission to edit this site' };

    api.patch.mockRejectedValueOnce(forbiddenError);

    const { result } = renderHook(() => usePublishedSeamlessEdit({
      enabled: true,
      subdomain: 'gallery-salon',
      liveRef,
      siteData: { version: 1 },
      bindKey: 'markup',
      onRestored: vi.fn(),
    }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.saveState).toBe('error');
    expect(api.patch).toHaveBeenCalledTimes(1);
  });
});
