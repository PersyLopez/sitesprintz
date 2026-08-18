import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api } from '../../src/services/api';

describe('API client abort handling', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.localStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };
  });

  it('does not retry or log aborted requests', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    global.fetch = vi.fn().mockRejectedValue(abortError);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(api.get('/api/booking/appointments', { retries: 3 })).rejects.toMatchObject({
      name: 'AbortError'
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
