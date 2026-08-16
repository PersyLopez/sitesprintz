/**
 * ServiceFilters Component Unit Tests
 * 
 * Tests for the multi-criteria filtering component
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('ServiceFilters', () => {
  let ServiceFilters;
  let dom;
  let document;
  let container;

  beforeEach(async () => {
    // Setup JSDOM
    dom = new JSDOM('<!DOCTYPE html><html><body><div id="filter-container"></div></body></html>', {
      url: 'http://localhost',
      pretendToBeVisual: true,
    });
    
    global.document = dom.window.document;
    global.window = dom.window;
    document = dom.window.document;
    
    container = document.getElementById('filter-container');

    // Import the module
    const module = await import('../../../public/modules/service-filters.js');
    ServiceFilters = module.default || window.ServiceFilters;
  });

  afterEach(() => {
    if (container) {
      container.innerHTML = '';
    }
    delete global.document;
    delete global.window;
  });

  describe('Constructor', () => {
    it('should create a ServiceFilters instance', () => {
      const items = [
        { id: 1, name: 'Service 1', category: 'A', price: 10 },
        { id: 2, name: 'Service 2', category: 'B', price: 20 }
      ];

      const filters = new ServiceFilters({
        containerId: 'filter-container',
        filters: ['category'],
        items: items,
        onChange: vi.fn()
      });

      expect(filters).toBeDefined();
      expect(filters.items).toEqual(items);
      expect(filters.filters).toEqual(['category']);
    });

    it('should initialize with empty activeFilters', () => {
      const filters = new ServiceFilters({
        containerId: 'filter-container',
        filters: ['category'],
        items: [],
        onChange: vi.fn()
      });

      expect(filters.activeFilters).toEqual({});
    });
  });

  describe('init()', () => {
    it('should render filter UI when container exists', () => {
      const items = [
        { id: 1, name: 'Service 1', category: 'A' },
        { id: 2, name: 'Service 2', category: 'B' }
      ];

      const filters = new ServiceFilters({
        containerId: 'filter-container',
        filters: ['category'],
        items: items,
        onChange: vi.fn()
      });

      filters.init();

      expect(container.innerHTML).not.toBe('');
      expect(container.querySelector('.filter-group')).toBeTruthy();
    });

    it('should not render if container does not exist', () => {
      const filters = new ServiceFilters({
        containerId: 'non-existent',
        filters: ['category'],
        items: [],
        onChange: vi.fn()
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      filters.init();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('handleFilterChange()', () => {
    it('should add filter to activeFilters when value is not "all"', () => {
      const items = [
        { id: 1, name: 'Service 1', category: 'A' },
        { id: 2, name: 'Service 2', category: 'B' }
      ];

      const onChange = vi.fn();
      const filters = new ServiceFilters({
        containerId: 'filter-container',
        filters: ['category'],
        items: items,
        onChange: onChange
      });

      filters.init();
      filters.handleFilterChange('category', 'A');

      expect(filters.activeFilters.category).toBe('A');
    });

    it('should remove filter from activeFilters when value is "all"', () => {
      const items = [
        { id: 1, name: 'Service 1', category: 'A' },
        { id: 2, name: 'Service 2', category: 'B' }
      ];

      const filters = new ServiceFilters({
        containerId: 'filter-container',
        filters: ['category'],
        items: items,
        onChange: vi.fn()
      });

      filters.activeFilters.category = 'A';
      filters.handleFilterChange('category', 'all');

      expect(filters.activeFilters.category).toBeUndefined();
    });
  });

  describe('applyFilters()', () => {
    it('should filter items based on active filters', () => {
      const items = [
        { id: 1, name: 'Service 1', category: 'A' },
        { id: 2, name: 'Service 2', category: 'B' },
        { id: 3, name: 'Service 3', category: 'A' }
      ];

      const onChange = vi.fn();
      const filters = new ServiceFilters({
        containerId: 'filter-container',
        filters: ['category'],
        items: items,
        onChange: onChange
      });

      filters.activeFilters.category = 'A';
      filters.applyFilters();

      expect(onChange).toHaveBeenCalledWith([
        { id: 1, name: 'Service 1', category: 'A' },
        { id: 3, name: 'Service 3', category: 'A' }
      ]);
    });

    it('should return all items when no filters are active', () => {
      const items = [
        { id: 1, name: 'Service 1', category: 'A' },
        { id: 2, name: 'Service 2', category: 'B' }
      ];

      const onChange = vi.fn();
      const filters = new ServiceFilters({
        containerId: 'filter-container',
        filters: ['category'],
        items: items,
        onChange: onChange
      });

      filters.applyFilters();

      expect(onChange).toHaveBeenCalledWith(items);
    });
  });
});

