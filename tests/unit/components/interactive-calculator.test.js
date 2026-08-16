/**
 * InteractiveCalculator Component Unit Tests
 * 
 * Tests for the interactive pricing calculator component
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('InteractiveCalculator', () => {
  let InteractiveCalculator;
  let dom;
  let document;
  let container;

  beforeEach(async () => {
    // Setup JSDOM
    dom = new JSDOM('<!DOCTYPE html><html><body><div id="calculator-container"></div></body></html>', {
      url: 'http://localhost',
      pretendToBeVisual: true,
    });
    
    global.document = dom.window.document;
    global.window = dom.window;
    document = dom.window.document;
    
    container = document.getElementById('calculator-container');

    // Import the module
    const module = await import('../../../public/modules/interactive-calculator.js');
    InteractiveCalculator = module.default || window.InteractiveCalculator;
  });

  afterEach(() => {
    if (container) {
      container.innerHTML = '';
    }
    delete global.document;
    delete global.window;
  });

  describe('Constructor', () => {
    it('should create an InteractiveCalculator instance with default config', () => {
      const calculator = new InteractiveCalculator({
        containerId: 'calculator-container',
        basePrice: 100
      });

      expect(calculator).toBeDefined();
      expect(calculator.currentTotal).toBe(100);
      expect(calculator.config.type).toBe('simple');
    });

    it('should accept custom configuration', () => {
      const calculator = new InteractiveCalculator({
        containerId: 'calculator-container',
        type: 'room-by-room',
        basePrice: 50,
        currency: '€',
        items: [
          { id: 'room1', name: 'Room 1', price: 25 }
        ]
      });

      expect(calculator.config.type).toBe('room-by-room');
      expect(calculator.config.basePrice).toBe(50);
      expect(calculator.config.currency).toBe('€');
      expect(calculator.config.items).toHaveLength(1);
    });
  });

  describe('init()', () => {
    it('should render calculator UI when container exists', () => {
      const calculator = new InteractiveCalculator({
        containerId: 'calculator-container',
        basePrice: 100
      });

      calculator.init();

      expect(container.innerHTML).not.toBe('');
      expect(container.querySelector('.interactive-calculator')).toBeTruthy();
    });

    it('should not render if container does not exist', () => {
      const calculator = new InteractiveCalculator({
        containerId: 'non-existent',
        basePrice: 100
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      calculator.init();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('calculateTotal()', () => {
    it('should calculate total with selected items', () => {
      const calculator = new InteractiveCalculator({
        containerId: 'calculator-container',
        basePrice: 50,
        type: 'add-ons',
        items: [
          { id: 'item1', name: 'Item 1', price: 25 },
          { id: 'item2', name: 'Item 2', price: 30 }
        ]
      });

      calculator.selectedItems = {
        'item1': 25,
        'item2': 30
      };

      calculator.calculateTotal();

      expect(calculator.currentTotal).toBe(105); // 50 + 25 + 30
    });

    it('should calculate total with only base price when no items selected', () => {
      const calculator = new InteractiveCalculator({
        containerId: 'calculator-container',
        basePrice: 100
      });

      calculator.calculateTotal();

      expect(calculator.currentTotal).toBe(100);
    });
  });

  describe('updateTotal()', () => {
    it('should update total display element', () => {
      const calculator = new InteractiveCalculator({
        containerId: 'calculator-container',
        basePrice: 100
      });

      calculator.init();
      calculator.currentTotal = 150;
      calculator.updateTotal();

      const totalSpan = document.getElementById('calculator-container-total');
      expect(totalSpan).toBeTruthy();
      expect(totalSpan.textContent).toContain('150');
    });

    it('should call onChange callback when total is updated', () => {
      const onChange = vi.fn();
      const calculator = new InteractiveCalculator({
        containerId: 'calculator-container',
        basePrice: 100,
        onChange: onChange
      });

      calculator.init();
      calculator.currentTotal = 150;
      calculator.updateTotal();

      expect(onChange).toHaveBeenCalledWith(150);
    });
  });
});

