/**
 * Phase 3 Test Data Setup
 * Creates products for checkout/cart tests
 * 
 * This should run before checkout-flow.spec.js tests
 */

import { test as setup, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-credentials.js';

setup('create test products via API', async ({ request, page }) => {
  console.log('\n🔧 Phase 3 Setup: Creating test products...\n');

  try {
    // Get CSRF token for API calls
    const csrfResponse = await request.get('http://localhost:3000/api/csrf-token');
    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.csrfToken;

    console.log('✅ CSRF token obtained');

    // First, get fresh auth tokens
    const loginResponse = await request.post('http://localhost:3000/api/auth/login', {
      data: {
        email: TEST_USERS.PRO_USER.email,
        password: TEST_USERS.PRO_USER.password
      },
      headers: {
        'X-CSRF-Token': csrfToken
      }
    });

    const loginData = await loginResponse.json();
    const accessToken = loginData.accessToken;

    if (!accessToken) {
      console.warn('⚠️  Could not obtain access token for product creation');
      return;
    }

    console.log('✅ Authenticated as test user');

    // Get or create test restaurant site
    const sitesResponse = await request.get('http://localhost:3000/api/sites', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    const sitesData = await sitesResponse.json();
    let testSiteId = sitesData.sites?.find(s => s.businessName?.includes('Restaurant') || s.templateId === 'restaurant-casual')?.id;

    if (!testSiteId) {
      console.log('⚠️  No test restaurant site found - products may not be visible');
      return;
    }

    console.log(`✅ Found test site: ${testSiteId}`);

    // Create test products
    const products = [
      {
        name: 'Margherita Pizza',
        description: 'Classic pizza with tomato, mozzarella, and basil',
        price: 12.99,
        category: 'Pizzas',
        available: true,
        imageUrl: '/images/margherita.jpg'
      },
      {
        name: 'Caesar Salad',
        description: 'Fresh romaine with parmesan and croutons',
        price: 8.99,
        category: 'Salads',
        available: true,
        imageUrl: '/images/caesar.jpg'
      },
      {
        name: 'Pasta Carbonara',
        description: 'Creamy pasta with bacon and parmesan',
        price: 14.99,
        category: 'Pasta',
        available: true,
        imageUrl: '/images/carbonara.jpg'
      }
    ];

    let createdCount = 0;
    for (const product of products) {
      try {
        const createResponse = await request.post(`http://localhost:3000/api/sites/${testSiteId}/products`, {
          data: product,
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-CSRF-Token': csrfToken,
            'Content-Type': 'application/json'
          }
        });

        if (createResponse.ok) {
          createdCount++;
          console.log(`  ✅ Created product: ${product.name}`);
        } else {
          const error = await createResponse.json().catch(() => ({}));
          console.log(`  ⚠️  Failed to create ${product.name}: ${error.message || createResponse.status()}`);
        }
      } catch (e) {
        console.log(`  ⚠️  Error creating ${product.name}: ${e.message}`);
      }
    }

    console.log(`\n✅ Phase 3 Setup Complete: ${createdCount}/${products.length} products created\n`);

  } catch (error) {
    console.error('❌ Phase 3 Setup Error:', error.message);
    console.log('⚠️  Tests will run but may fail if products are not available\n');
  }
});


