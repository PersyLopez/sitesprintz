/**
 * Small Batch E2E Test 1: Template System
 * Tests basic template loading and structure
 */

import { test, expect } from '@playwright/test';
import { URLS } from '../fixtures/test-config.js';

test.describe('Batch 1: Template System - Pro Templates Only', () => {
  
  test('should load Pro templates via API', async ({ page }) => {
    // Test template loading via direct API call
    const response = await page.request.get(`${URLS.API}/api/templates`);
    expect(response.ok()).toBeTruthy();
    
    const templates = await response.json();
    expect(templates).toBeDefined();
    expect(templates.data || templates).toBeTruthy();
  });

  test('should load restaurant template with correct structure', async ({ page }) => {
    const response = await page.request.get(`${URLS.API}/api/templates/restaurant`);
    expect(response.ok()).toBeTruthy();
    
    const template = await response.json();
    
    // Verify template has required structure
    expect(template.id || template.template_id).toBeTruthy();
    expect(template.brand).toBeDefined();
    expect(template.hero).toBeDefined();
    expect(template.contact).toBeDefined();
  });

  test('should have tier field set to pro', async ({ page }) => {
    const response = await page.request.get(`${URLS.API}/api/templates/restaurant`);
    const template = await response.json();
    
    const tier = template.tier || template.plan?.toLowerCase();
    expect(['pro', 'Pro', 'PRO']).toContain(tier);
  });

  test('should not have layout variations', async ({ page }) => {
    const response = await page.request.get(`${URLS.API}/api/templates/restaurant`);
    const template = await response.json();
    
    // Verify no layout property exists
    expect(template.layouts).toBeUndefined();
    expect(template.defaultLayout).toBeUndefined();
  });
});


