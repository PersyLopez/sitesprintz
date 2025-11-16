/**
 * Shopping Cart Enhancement Tests
 * TDD Approach: RED phase - Define tests first
 * 
 * Enhanced cart should support:
 * - Product modifiers (size, extras, customizations)
 * - Special instructions per item
 * - Tip calculator (%, fixed, custom)
 * - Delivery/pickup scheduling
 * - Cart persistence (localStorage)
 * - Item quantity updates
 * - Total calculations with tax
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

let CartManager;

describe('Enhanced Shopping Cart', () => {
  let window, document, localStorage;

  beforeEach(async () => {
    // Setup JSDOM
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="cart"></div></body></html>', {
      url: 'http://localhost',
      pretendToBeVisual: true,
    });
    
    window = dom.window;
    document = dom.window.document;
    
    // Mock localStorage
    localStorage = {
      data: {},
      getItem(key) { return this.data[key] || null; },
      setItem(key, value) { this.data[key] = value; },
      removeItem(key) { delete this.data[key]; },
      clear() { this.data = {}; }
    };
    
    global.window = window;
    global.document = document;
    global.localStorage = localStorage;

    // Import module
    const cartModule = await import('../../public/modules/cart-manager.js');
    CartManager = cartModule.default || cartModule.CartManager;
  });

  afterEach(() => {
    delete global.window;
    delete global.document;
    delete global.localStorage;
  });

  describe('Initialization', () => {
    it('should create a cart manager instance', () => {
      const cart = new CartManager();
      expect(cart).toBeDefined();
      expect(cart.items).toEqual([]);
    });

    it('should load cart from localStorage on init', () => {
      const savedCart = {
        items: [{
          id: '1',
          name: 'Pizza',
          price: 12.99,
          quantity: 2,
          cartItemId: '1_',
          totalPrice: 12.99,
          modifiers: [],
          specialInstructions: ''
        }],
        tip: null,
        schedule: null
      };
      localStorage.setItem('cart', JSON.stringify(savedCart));

      const cart = new CartManager();
      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].name).toBe('Pizza');
    });

    it('should handle corrupted localStorage data', () => {
      localStorage.setItem('cart', 'invalid json');

      const cart = new CartManager();
      expect(cart.items).toEqual([]);
    });
  });

  describe('Adding Items with Modifiers', () => {
    it('should add item with modifiers', () => {
      const cart = new CartManager();
      
      cart.addItem({
        id: 'pizza-1',
        name: 'Pepperoni Pizza',
        price: 12.99,
        modifiers: [
          { name: 'Size', value: 'Large', price: 2.00 },
          { name: 'Extra Cheese', value: 'Yes', price: 1.50 }
        ]
      });

      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].modifiers).toHaveLength(2);
      expect(cart.items[0].totalPrice).toBe(16.49); // 12.99 + 2.00 + 1.50
    });

    it('should add special instructions to item', () => {
      const cart = new CartManager();
      
      cart.addItem({
        id: 'burger-1',
        name: 'Burger',
        price: 8.99,
        specialInstructions: 'No onions, extra pickles'
      });

      expect(cart.items[0].specialInstructions).toBe('No onions, extra pickles');
    });

    it('should generate unique item ID for items with different modifiers', () => {
      const cart = new CartManager();
      
      // Add pizza with large size
      cart.addItem({
        id: 'pizza-1',
        name: 'Pizza',
        price: 10,
        modifiers: [{ name: 'Size', value: 'Large', price: 2 }]
      });

      // Add same pizza with medium size
      cart.addItem({
        id: 'pizza-1',
        name: 'Pizza',
        price: 10,
        modifiers: [{ name: 'Size', value: 'Medium', price: 0 }]
      });

      expect(cart.items).toHaveLength(2);
    });

    it('should increment quantity for identical items', () => {
      const cart = new CartManager();
      
      const item = {
        id: 'pizza-1',
        name: 'Pizza',
        price: 10,
        modifiers: [{ name: 'Size', value: 'Large', price: 2 }]
      };

      cart.addItem(item);
      cart.addItem(item);

      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].quantity).toBe(2);
    });
  });

  describe('Quantity Management', () => {
    it('should update item quantity', () => {
      const cart = new CartManager();
      cart.addItem({ id: '1', name: 'Item', price: 10 });

      cart.updateQuantity(cart.items[0].cartItemId, 3);

      expect(cart.items[0].quantity).toBe(3);
    });

    it('should remove item when quantity is 0', () => {
      const cart = new CartManager();
      cart.addItem({ id: '1', name: 'Item', price: 10 });

      cart.updateQuantity(cart.items[0].cartItemId, 0);

      expect(cart.items).toHaveLength(0);
    });

    it('should not allow negative quantities', () => {
      const cart = new CartManager();
      cart.addItem({ id: '1', name: 'Item', price: 10 });

      cart.updateQuantity(cart.items[0].cartItemId, -5);

      expect(cart.items[0].quantity).toBe(1); // Unchanged
    });
  });

  describe('Tip Calculator', () => {
    it('should calculate percentage tip', () => {
      const cart = new CartManager();
      cart.addItem({ id: '1', name: 'Item', price: 20 });

      cart.setTip({ type: 'percentage', value: 15 });

      expect(cart.tip.amount).toBe(3.00); // 15% of 20
    });

    it('should calculate fixed tip', () => {
      const cart = new CartManager();
      cart.addItem({ id: '1', name: 'Item', price: 20 });

      cart.setTip({ type: 'fixed', value: 5 });

      expect(cart.tip.amount).toBe(5.00);
    });

    it('should handle custom tip amount', () => {
      const cart = new CartManager();
      cart.addItem({ id: '1', name: 'Item', price: 20 });

      cart.setTip({ type: 'custom', value: 7.50 });

      expect(cart.tip.amount).toBe(7.50);
    });

    it('should update tip when cart total changes', () => {
      const cart = new CartManager();
      cart.addItem({ id: '1', name: 'Item', price: 20 });
      cart.setTip({ type: 'percentage', value: 15 });

      expect(cart.tip.amount).toBe(3.00);

      // Add another item
      cart.addItem({ id: '2', name: 'Item 2', price: 10 });

      // Tip should recalculate
      expect(cart.tip.amount).toBe(4.50); // 15% of 30
    });

    it('should offer preset tip percentages', () => {
      const cart = new CartManager();
      const presets = cart.getTipPresets();

      expect(presets).toContain(15);
      expect(presets).toContain(18);
      expect(presets).toContain(20);
    });
  });

  describe('Scheduling', () => {
    it('should set delivery schedule', () => {
      const cart = new CartManager();
      
      cart.setSchedule({
        type: 'delivery',
        date: '2025-11-15',
        time: '18:00',
        address: '123 Main St'
      });

      expect(cart.schedule.type).toBe('delivery');
      expect(cart.schedule.date).toBe('2025-11-15');
      expect(cart.schedule.address).toBe('123 Main St');
    });

    it('should set pickup schedule', () => {
      const cart = new CartManager();
      
      cart.setSchedule({
        type: 'pickup',
        date: '2025-11-15',
        time: '12:30'
      });

      expect(cart.schedule.type).toBe('pickup');
      expect(cart.schedule.address).toBeUndefined();
    });

    it('should validate schedule date is not in the past', () => {
      const cart = new CartManager();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const result = cart.setSchedule({
        type: 'delivery',
        date: yesterday.toISOString().split('T')[0],
        time: '12:00'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('past');
    });

    it('should suggest next available time slots', () => {
      const cart = new CartManager();
      const slots = cart.getAvailableTimeSlots('2025-11-15');

      expect(slots).toBeInstanceOf(Array);
      expect(slots.length).toBeGreaterThan(0);
      expect(slots[0]).toMatch(/\d{2}:\d{2}/);
    });
  });

  describe('Price Calculations', () => {
    it('should calculate subtotal correctly', () => {
      const cart = new CartManager();
      cart.addItem({ id: '1', name: 'Item 1', price: 10, quantity: 2 });
      cart.addItem({ id: '2', name: 'Item 2', price: 15, quantity: 1 });

      expect(cart.getSubtotal()).toBe(35.00); // (10 * 2) + (15 * 1)
    });

    it('should calculate tax', () => {
      const cart = new CartManager({ taxRate: 0.08 }); // 8% tax
      cart.addItem({ id: '1', name: 'Item', price: 100 });

      expect(cart.getTax()).toBe(8.00);
    });

    it('should calculate total with tax and tip', () => {
      const cart = new CartManager({ taxRate: 0.08 });
      cart.addItem({ id: '1', name: 'Item', price: 100 });
      cart.setTip({ type: 'percentage', value: 15 });

      const total = cart.getTotal();
      
      // Subtotal: 100
      // Tax: 8
      // Tip: 15 (15% of 100)
      // Total: 123
      expect(total).toBe(123.00);
    });

    it('should include modifier prices in calculations', () => {
      const cart = new CartManager();
      cart.addItem({
        id: '1',
        name: 'Pizza',
        price: 10,
        modifiers: [
          { name: 'Size', value: 'Large', price: 3 },
          { name: 'Extra Cheese', price: 1.50 }
        ]
      });

      expect(cart.getSubtotal()).toBe(14.50); // 10 + 3 + 1.50
    });
  });

  describe('Persistence', () => {
    it('should save cart to localStorage on changes', () => {
      const cart = new CartManager();
      cart.addItem({ id: '1', name: 'Item', price: 10 });

      const saved = JSON.parse(localStorage.getItem('cart'));
      expect(saved.items).toHaveLength(1);
    });

    it('should save tip to localStorage', () => {
      const cart = new CartManager();
      cart.setTip({ type: 'percentage', value: 15 });

      const saved = JSON.parse(localStorage.getItem('cart'));
      expect(saved.tip.value).toBe(15);
    });

    it('should save schedule to localStorage', () => {
      const cart = new CartManager();
      cart.setSchedule({ type: 'delivery', date: '2025-11-15', time: '18:00' });

      const saved = JSON.parse(localStorage.getItem('cart'));
      expect(saved.schedule.type).toBe('delivery');
    });

    it('should clear cart and localStorage', () => {
      const cart = new CartManager();
      cart.addItem({ id: '1', name: 'Item', price: 10 });
      cart.setTip({ type: 'fixed', value: 5 });

      cart.clear();

      expect(cart.items).toHaveLength(0);
      expect(cart.tip).toBeNull();
      expect(localStorage.getItem('cart')).toBeNull();
    });
  });

  describe('Validation', () => {
    it('should validate minimum order amount', () => {
      const cart = new CartManager({ minimumOrder: 20 });
      cart.addItem({ id: '1', name: 'Item', price: 15 });

      const validation = cart.validate();

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Minimum order is $20.00');
    });

    it('should validate delivery address is provided', () => {
      const cart = new CartManager();
      cart.addItem({ id: '1', name: 'Item', price: 25 });
      cart.setSchedule({ type: 'delivery', date: '2025-11-15', time: '18:00' });

      const validation = cart.validate();

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Delivery address required');
    });

    it('should pass validation when all requirements met', () => {
      const cart = new CartManager({ minimumOrder: 20 });
      cart.addItem({ id: '1', name: 'Item', price: 25 });
      cart.setSchedule({
        type: 'delivery',
        date: '2025-11-15',
        time: '18:00',
        address: '123 Main St'
      });

      const validation = cart.validate();

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Events', () => {
    it('should emit event when item added', () => {
      const cart = new CartManager();
      const callback = vi.fn();
      
      cart.on('itemAdded', callback);
      cart.addItem({ id: '1', name: 'Item', price: 10 });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Item' })
      );
    });

    it('should emit event when cart updated', () => {
      const cart = new CartManager();
      const callback = vi.fn();
      
      cart.on('cartUpdated', callback);
      cart.addItem({ id: '1', name: 'Item', price: 10 });

      expect(callback).toHaveBeenCalled();
    });

    it('should emit event when tip changed', () => {
      const cart = new CartManager();
      const callback = vi.fn();
      
      cart.on('tipChanged', callback);
      cart.setTip({ type: 'percentage', value: 15 });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'percentage', value: 15 })
      );
    });
  });
});

