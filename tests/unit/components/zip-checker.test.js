/**
 * ZipChecker Component Unit Tests
 * 
 * Tests for the ZIP code service area checker component
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('ZipChecker', () => {
  let ZipChecker;
  let dom;
  let document;
  let container;

  beforeEach(async () => {
    // Setup JSDOM
    dom = new JSDOM('<!DOCTYPE html><html><body><div id="zip-checker-container"></div></body></html>', {
      url: 'http://localhost',
      pretendToBeVisual: true,
    });
    
    global.document = dom.window.document;
    global.window = dom.window;
    document = dom.window.document;
    
    container = document.getElementById('zip-checker-container');

    // Import the module
    const module = await import('../../../public/modules/zip-checker.js');
    ZipChecker = module.default || window.ZipChecker;
  });

  afterEach(() => {
    if (container) {
      container.innerHTML = '';
    }
    delete global.document;
    delete global.window;
  });

  describe('Constructor', () => {
    it('should create a ZipChecker instance', () => {
      const zipChecker = new ZipChecker({
        containerId: 'zip-checker-container',
        serviceZipCodes: ['75001', '75002']
      });

      expect(zipChecker).toBeDefined();
      expect(zipChecker.config.serviceZipCodes).toEqual(['75001', '75002']);
    });
  });

  describe('init()', () => {
    it('should render ZIP checker UI when container exists', () => {
      const zipChecker = new ZipChecker({
        containerId: 'zip-checker-container',
        serviceZipCodes: ['75001']
      });

      zipChecker.init();

      expect(container.innerHTML).not.toBe('');
      expect(container.querySelector('.zip-checker')).toBeTruthy();
    });
  });

  describe('checkZip()', () => {
    it('should return success for valid ZIP code', () => {
      const onCheck = vi.fn();
      const zipChecker = new ZipChecker({
        containerId: 'zip-checker-container',
        serviceZipCodes: ['75001', '75002'],
        onCheck: onCheck
      });

      zipChecker.init();
      
      const input = document.getElementById('zip-checker-container-input');
      const button = document.getElementById('zip-checker-container-button');
      
      input.value = '75001';
      button.click();

      expect(onCheck).toHaveBeenCalledWith('75001', true);
    });

    it('should return failure for invalid ZIP code', () => {
      const onCheck = vi.fn();
      const zipChecker = new ZipChecker({
        containerId: 'zip-checker-container',
        serviceZipCodes: ['75001', '75002'],
        onCheck: onCheck
      });

      zipChecker.init();
      
      const input = document.getElementById('zip-checker-container-input');
      const button = document.getElementById('zip-checker-container-button');
      
      input.value = '99999';
      button.click();

      expect(onCheck).toHaveBeenCalledWith('99999', false);
    });

    it('should handle wildcard ZIP codes', () => {
      const zipChecker = new ZipChecker({
        containerId: 'zip-checker-container',
        serviceZipCodes: ['7500*']
      });

      zipChecker.init();
      
      const input = document.getElementById('zip-checker-container-input');
      const button = document.getElementById('zip-checker-container-button');
      
      input.value = '75001';
      button.click();

      const result = document.getElementById('zip-checker-container-result');
      expect(result.className).toContain('success');
    });

    it('should handle ZIP code ranges', () => {
      const zipChecker = new ZipChecker({
        containerId: 'zip-checker-container',
        serviceZipCodes: ['75000-75999']
      });

      zipChecker.init();
      
      const input = document.getElementById('zip-checker-container-input');
      const button = document.getElementById('zip-checker-container-button');
      
      input.value = '75500';
      button.click();

      const result = document.getElementById('zip-checker-container-result');
      expect(result.className).toContain('success');
    });
  });
});

