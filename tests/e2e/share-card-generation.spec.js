import { test, expect } from '@playwright/test';

test.describe('Share Card Generation', () => {
    let authToken;

    test.beforeEach(async ({ page, request }) => {
        // Login to get token
        const loginRes = await request.post('/api/auth/login', {
            data: {
                email: 'test@example.com',
                password: 'password123'
            }
        });
        const loginData = await loginRes.json();
        authToken = loginData.token;
    });

    test('should generate a share card via API', async ({ request }) => {
        const response = await request.post('/api/share/generate', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            data: {
                subdomain: 'test-restaurant', // Assumes this site exists from seed
                format: 'social'
            }
        });

        expect(response.ok()).toBeTruthy();
        expect(response.headers()['content-type']).toBe('image/png');

        // Check size to ensure it's not a 0-byte error
        const buffer = await response.body();
        expect(buffer.length).toBeGreaterThan(100);
    });

    test('should cache share cards', async ({ request }) => {
        // First request
        const start = Date.now();
        const res1 = await request.get('/api/share/test-restaurant/social');
        expect(res1.ok()).toBeTruthy();
        const duration1 = Date.now() - start;

        // Second request (should be faster/cached)
        const start2 = Date.now();
        const res2 = await request.get('/api/share/test-restaurant/social');
        expect(res2.ok()).toBeTruthy();
        const duration2 = Date.now() - start2;

        expect(res2.headers()['x-cache']).toBe('HIT');
    });

    test('should fail for invalid subdomain', async ({ request }) => {
        const response = await request.post('/api/share/generate', {
            headers: { 'Authorization': `Bearer ${authToken}` },
            data: { subdomain: 'invalid-site-12345', format: 'social' }
        });

        expect(response.status()).toBe(404);
    });
});
