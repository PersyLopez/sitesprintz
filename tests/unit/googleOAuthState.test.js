import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockRedis = {
  get: vi.fn(),
  setex: vi.fn(),
  del: vi.fn()
};

vi.mock('../../server/utils/redis.js', () => ({
  getRedis: () => mockRedis,
  default: mockRedis
}));

describe('Google OAuth state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setex.mockResolvedValue('OK');
    mockRedis.del.mockResolvedValue(1);
  });

  it('stores plan and intent behind a random nonce', async () => {
    const { createGoogleOAuthState } = await import('../../server/services/auth/googleOAuthState.js');
    const state = await createGoogleOAuthState({ plan: 'growth', intent: 'publish' });

    expect(state).toMatch(/^[a-f0-9]{64}$/);
    expect(state).not.toContain('growth');
    expect(state).not.toContain('intent');
    expect(mockRedis.setex).toHaveBeenCalledWith(
      `google_oauth_state:${state}`,
      600,
      JSON.stringify({ plan: 'growth', intent: 'publish' })
    );
  });

  it('consumes nonce once and returns stored plan', async () => {
    const { consumeGoogleOAuthState } = await import('../../server/services/auth/googleOAuthState.js');
    mockRedis.get.mockResolvedValue(JSON.stringify({ plan: 'starter', intent: 'publish' }));

    const first = await consumeGoogleOAuthState('a'.repeat(64));
    expect(first).toEqual({ plan: 'starter', intent: 'publish' });
    expect(mockRedis.del).toHaveBeenCalled();
  });

  it('stores Growth Managed behind a random nonce', async () => {
    const { createGoogleOAuthState } = await import('../../server/services/auth/googleOAuthState.js');
    const state = await createGoogleOAuthState({ plan: 'managed', intent: null });

    expect(mockRedis.setex).toHaveBeenCalledWith(
      `google_oauth_state:${state}`,
      600,
      JSON.stringify({ plan: 'growth_managed', intent: null })
    );
  });

  it('ignores legacy plaintext state values', async () => {
    const { consumeGoogleOAuthState } = await import('../../server/services/auth/googleOAuthState.js');
    const result = await consumeGoogleOAuthState('starter,intent:publish');
    expect(result).toEqual({ plan: 'free', intent: null });
    expect(mockRedis.get).not.toHaveBeenCalled();
  });
});
