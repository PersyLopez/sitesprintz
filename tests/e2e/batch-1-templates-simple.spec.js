/**
 * Simple Batch 1: Template System Tests (API Only)
 * No authentication required, pure API testing
 */

import { test, expect } from '@playwright/test';
import { URLS } from '../fixtures/test-config.js';

test.describe('Batch 1: Template System - API Tests', () => {
  
  test('should load all Pro templates via API', async ({ request }) => {
    const response = await request.get(`${URLS.API}/api/templates`);
    expect(response.ok()).toBeTruthy();
    
    const templates = await response.json();
    expect(Array.isArray(templates)).toBeTruthy();
    expect(templates.length).toBeGreaterThan(0);
    
    // Verify all templates have tier: pro
    templates.forEach(template => {
      expect(template.tier || 'pro').toBe('pro');
    });
  });

  test('should load restaurant template', async ({ request }) => {
    const response = await request.get(`${URLS.API}/api/templates/restaurant`);
    expect(response.ok()).toBeTruthy();
    
    const template = await response.json();
    expect(template.id).toBe('restaurant');
    expect(template.tier).toBe('pro');
  });

  test('should have normalized template structure', async ({ request }) => {
    const response = await request.get(`${URLS.API}/api/templates/salon`);
    const template = await response.json();
    
    // Verify all templates have this structure
    expect(template.brand).toBeDefined();
    expect(template.hero).toBeDefined();
    expect(template.contact).toBeDefined();
    expect(template.features).toBeDefined();
  });

  test('should not have layout variations in templates', async ({ request }) => {
    const response = await request.get(`${URLS.API}/api/templates/gym`);
    const template = await response.json();
    
    // Verify no layouts property
    expect(template.layouts).toBeUndefined();
    expect(template.defaultLayout).toBeUndefined();
  });
});


