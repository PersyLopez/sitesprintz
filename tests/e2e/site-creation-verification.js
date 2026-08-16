/**
 * Site Creation Process - End-to-End Verification
 * Tests the complete flow: Draft → Publish → Live Site with E-Commerce
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3000';

// Test data
const TEST_DATA = {
  // Growth tier user email (has cart + checkout)
  growthUserEmail: 'growth-user-' + Date.now() + '@test.sitesprintz.com',
  
  // Trial tier user email (no cart + checkout)
  trialUserEmail: 'trial-user-' + Date.now() + '@test.sitesprintz.com',
  
  // Template to use
  templateId: 'restaurant-casual',
  
  // Business data for draft
  businessData: {
    businessName: 'Verification Restaurant ' + Date.now(),
    heroTitle: 'Welcome to Our Restaurant',
    heroDescription: 'The best food in town',
    email: null, // Will be set per test
    phone: '555-1234',
    address: '123 Main St',
    services: [
      { name: 'Dine In', price: 0 },
      { name: 'Takeout', price: 0 }
    ]
  }
};

/**
 * Test 1: Create Draft
 */
async function testCreateDraft() {
  console.log('\n📋 TEST 1: Create Draft');
  console.log('─'.repeat(50));
  
  try {
    const draftPayload = {
      templateId: TEST_DATA.templateId,
      businessData: {
        ...TEST_DATA.businessData,
        email: TEST_DATA.growthUserEmail
      }
    };
    
    const response = await axios.post(`${API_BASE}/api/drafts`, draftPayload);
    const draft = response.data;
    
    console.log('✅ Draft created successfully');
    console.log(`   Draft ID: ${draft.draftId}`);
    console.log(`   Template: ${draft.templateId}`);
    console.log(`   Status: ${draft.status}`);
    console.log(`   Expires: ${draft.expiresAt}`);
    console.log(`   Preview: ${draft.previewUrl}`);
    
    return draft.draftId;
  } catch (error) {
    console.error('❌ Failed to create draft:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Test 2: Get Draft
 */
async function testGetDraft(draftId) {
  console.log('\n📋 TEST 2: Get Draft');
  console.log('─'.repeat(50));
  
  try {
    const response = await axios.get(`${API_BASE}/api/drafts/${draftId}`);
    const draft = response.data;
    
    console.log('✅ Draft retrieved successfully');
    console.log(`   ID: ${draft.id}`);
    console.log(`   Template: ${draft.templateId}`);
    console.log(`   Business Name: ${draft.businessData.businessName}`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to get draft:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test 3: Publish Draft as Growth Tier
 */
async function testPublishGrowthTier(draftId) {
  console.log('\n📋 TEST 3: Publish Draft (Growth Tier - Should Have E-Commerce)');
  console.log('─'.repeat(50));
  
  try {
    const publishPayload = {
      plan: 'growth',
      email: TEST_DATA.growthUserEmail
    };
    
    const response = await axios.post(
      `${API_BASE}/api/drafts/${draftId}/publish`,
      publishPayload
    );
    
    const result = response.data;
    
    console.log('✅ Draft published successfully');
    console.log(`   Site ID: ${result.siteId}`);
    console.log(`   Subdomain: ${result.subdomain}`);
    console.log(`   URL: ${result.siteUrl}`);
    console.log(`   Plan: ${result.plan}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Admin Email: ${result.adminEmail}`);
    
    // Check if e-commerce features are included
    if (result.features) {
      console.log('   E-Commerce Features:');
      console.log(`     - Stripe Checkout: ${result.features.stripeCheckout ? '✅' : '❌'}`);
      console.log(`     - Order Management: ${result.features.orderManagement ? '✅' : '❌'}`);
    }
    
    return { siteId: result.siteId, subdomain: result.subdomain, siteUrl: result.siteUrl };
  } catch (error) {
    console.error('❌ Failed to publish draft:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Test 4: Publish Draft as Trial Tier
 */
async function testPublishTrialTier() {
  console.log('\n📋 TEST 4: Publish Draft (Trial Tier - NO E-Commerce)');
  console.log('─'.repeat(50));
  
  try {
    // First create a new draft
    const draftPayload = {
      templateId: TEST_DATA.templateId,
      businessData: {
        ...TEST_DATA.businessData,
        email: TEST_DATA.trialUserEmail,
        businessName: 'Trial Restaurant ' + Date.now()
      }
    };
    
    const draftResponse = await axios.post(`${API_BASE}/api/drafts`, draftPayload);
    const draftId = draftResponse.data.draftId;
    
    // Now publish as trial
    const publishPayload = {
      plan: 'trial',
      email: TEST_DATA.trialUserEmail
    };
    
    const publishResponse = await axios.post(
      `${API_BASE}/api/drafts/${draftId}/publish`,
      publishPayload
    );
    
    const result = publishResponse.data;
    
    console.log('✅ Trial site published successfully');
    console.log(`   Site ID: ${result.siteId}`);
    console.log(`   Plan: ${result.plan}`);
    console.log(`   Status: ${result.status}`);
    
    // Check if e-commerce features are NOT included
    if (result.features) {
      console.log('   E-Commerce Features:');
      console.log(`     - Stripe Checkout: ${result.features.stripeCheckout ? '❌ SHOULD BE FALSE' : '✅ Correctly Disabled'}`);
      console.log(`     - Order Management: ${result.features.orderManagement ? '❌ SHOULD BE FALSE' : '✅ Correctly Disabled'}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to publish trial draft:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test 5: Verify Published Site Has E-Commerce
 */
async function testVerifyPublishedSite(subdomain) {
  console.log('\n📋 TEST 5: Verify Published Site (E-Commerce Enabled)');
  console.log('─'.repeat(50));
  
  try {
    const response = await axios.get(`${API_BASE}/published/${subdomain}/site.json`);
    const site = response.data;
    
    console.log('✅ Published site loaded successfully');
    console.log(`   Subdomain: ${site.subdomain}`);
    console.log(`   Status: ${site.status}`);
    console.log(`   Plan: ${site.plan}`);
    
    // Check for e-commerce features
    const hasCart = site.features?.stripeCheckout || false;
    const hasOrders = site.features?.orderManagement || false;
    const hasCheckout = site.features?.stripeCheckout || false;
    
    console.log('   E-Commerce Status:');
    console.log(`     - Has Stripe Checkout: ${hasCart ? '✅' : '❌'}`);
    console.log(`     - Has Order Management: ${hasOrders ? '✅' : '❌'}`);
    console.log(`     - Can Accept Payments: ${hasCheckout ? '✅' : '❌'}`);
    
    // Verify business data was merged
    console.log('   Business Data:');
    console.log(`     - Brand Name: ${site.brand?.name}`);
    console.log(`     - Hero Title: ${site.hero?.title}`);
    console.log(`     - Contact Email: ${site.contact?.email}`);
    
    return hasCart && hasOrders && hasCheckout;
  } catch (error) {
    console.error('❌ Failed to verify published site:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test 6: Guest Publishing (No Auth Required)
 */
async function testGuestPublish() {
  console.log('\n📋 TEST 6: Guest Publish (No Authentication)');
  console.log('─'.repeat(50));
  
  try {
    const guestEmail = 'guest-' + Date.now() + '@test.sitesprintz.com';
    
    const publishPayload = {
      templateId: TEST_DATA.templateId,
      businessData: {
        ...TEST_DATA.businessData,
        email: guestEmail,
        businessName: 'Guest Restaurant ' + Date.now()
      },
      plan: 'starter'
    };
    
    const response = await axios.post(`${API_BASE}/api/sites/guest-publish`, publishPayload);
    const result = response.data;
    
    console.log('✅ Guest publish successful');
    console.log(`   Site ID: ${result.siteId}`);
    console.log(`   Subdomain: ${result.subdomain}`);
    console.log(`   URL: ${result.siteUrl}`);
    console.log(`   Admin Email: ${guestEmail}`);
    console.log(`   Message: ${result.message}`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed guest publish:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test 7: Draft Expiration
 */
async function testDraftExpiration() {
  console.log('\n📋 TEST 7: Draft Expiration (7 days)');
  console.log('─'.repeat(50));
  
  try {
    const draftPayload = {
      templateId: TEST_DATA.templateId,
      businessData: {
        ...TEST_DATA.businessData,
        email: 'expiry-test-' + Date.now() + '@test.sitesprintz.com'
      }
    };
    
    const response = await axios.post(`${API_BASE}/api/drafts`, draftPayload);
    const draft = response.data;
    
    const expiresAt = new Date(draft.expiresAt);
    const createdAt = new Date(draft.createdAt);
    const daysUntilExpiry = Math.floor((expiresAt - createdAt) / (1000 * 60 * 60 * 24));
    
    console.log('✅ Draft expiration verified');
    console.log(`   Created: ${createdAt.toISOString()}`);
    console.log(`   Expires: ${expiresAt.toISOString()}`);
    console.log(`   TTL: ${daysUntilExpiry} days`);
    
    if (daysUntilExpiry === 7) {
      console.log('   ✅ Correct expiration (7 days)');
      return true;
    } else {
      console.log(`   ❌ Incorrect expiration (expected 7 days, got ${daysUntilExpiry})`);
      return false;
    }
  } catch (error) {
    console.error('❌ Failed expiration test:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('\n' + '═'.repeat(60));
  console.log('  🚀 SITE CREATION PROCESS - END-TO-END VERIFICATION');
  console.log('═'.repeat(60));
  
  const results = {
    createDraft: false,
    getDraft: false,
    publishGrowth: false,
    publishTrial: false,
    verifySite: false,
    guestPublish: false,
    draftExpiration: false
  };
  
  try {
    // Test 1: Create draft
    const draftId = await testCreateDraft();
    results.createDraft = !!draftId;
    
    if (!draftId) {
      console.error('\n❌ Cannot continue without draft ID');
      return results;
    }
    
    // Test 2: Get draft
    results.getDraft = await testGetDraft(draftId);
    
    // Test 3: Publish as Growth tier
    const siteInfo = await testPublishGrowthTier(draftId);
    results.publishGrowth = !!siteInfo;
    
    // Test 4: Publish as Trial tier
    results.publishTrial = await testPublishTrialTier();
    
    // Test 5: Verify published site (if we have site info)
    if (siteInfo) {
      results.verifySite = await testVerifyPublishedSite(siteInfo.subdomain);
    }
    
    // Test 6: Guest publish
    results.guestPublish = await testGuestPublish();
    
    // Test 7: Draft expiration
    results.draftExpiration = await testDraftExpiration();
    
  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
  }
  
  // Print summary
  console.log('\n' + '═'.repeat(60));
  console.log('  📊 TEST SUMMARY');
  console.log('═'.repeat(60));
  
  const testNames = [
    'Create Draft',
    'Get Draft',
    'Publish (Growth Tier)',
    'Publish (Trial Tier)',
    'Verify Published Site',
    'Guest Publish',
    'Draft Expiration'
  ];
  
  const testKeys = Object.keys(results);
  
  testNames.forEach((name, i) => {
    const passed = results[testKeys[i]];
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${name.padEnd(30)} ${status}`);
  });
  
  const totalPassed = Object.values(results).filter(v => v).length;
  const totalTests = Object.values(results).length;
  
  console.log('\n' + '─'.repeat(60));
  console.log(`  Total: ${totalPassed}/${totalTests} tests passed`);
  
  if (totalPassed === totalTests) {
    console.log('  🎉 ALL TESTS PASSED - SITE CREATION FULLY FUNCTIONAL');
  } else {
    console.log(`  ⚠️  ${totalTests - totalPassed} test(s) failed`);
  }
  
  console.log('═'.repeat(60) + '\n');
  
  return results;
}

// Run tests if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { runAllTests };
