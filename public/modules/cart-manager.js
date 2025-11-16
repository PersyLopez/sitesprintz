/**
 * Enhanced Shopping Cart Manager
 * 
 * Features:
 * - Product modifiers (size, extras, customizations)
 * - Special instructions per item
 * - Tip calculator (percentage, fixed, custom)
 * - Delivery/pickup scheduling
 * - Cart persistence (localStorage)
 * - Event system for UI updates
 * - Validation (minimum order, required fields)
 */

class CartManager {
  constructor(options = {}) {
    this.options = {
      taxRate: options.taxRate || 0,
      minimumOrder: options.minimumOrder || 0,
      storageKey: options.storageKey || 'cart'
    };

    this.items = [];
    this.tip = null;
    this.schedule = null;
    this.listeners = {};

    // Load from localStorage
    this.load();
  }

  /**
   * Generate unique ID for cart item based on product + modifiers
   */
  generateCartItemId(item) {
    const modifierString = item.modifiers 
      ? JSON.stringify(item.modifiers.map(m => ({ name: m.name, value: m.value })))
      : '';
    return `${item.id}_${modifierString}`;
  }

  /**
   * Calculate total price including modifiers
   */
  calculateItemPrice(item) {
    let total = item.price;
    
    if (item.modifiers) {
      for (const modifier of item.modifiers) {
        if (modifier.price) {
          total += modifier.price;
        }
      }
    }

    return parseFloat(total.toFixed(2));
  }

  /**
   * Add item to cart
   */
  addItem(item) {
    const cartItemId = this.generateCartItemId(item);
    const totalPrice = this.calculateItemPrice(item);

    // Check if identical item exists
    const existingItem = this.items.find(i => i.cartItemId === cartItemId);

    if (existingItem) {
      // Increment quantity
      existingItem.quantity += item.quantity || 1;
    } else {
      // Add new item
      this.items.push({
        ...item,
        cartItemId,
        quantity: item.quantity || 1,
        totalPrice,
        modifiers: item.modifiers || [],
        specialInstructions: item.specialInstructions || ''
      });

      this.emit('itemAdded', this.items[this.items.length - 1]);
    }

    this.save();
    this.emit('cartUpdated');
    this.recalculateTip();
  }

  /**
   * Update item quantity
   */
  updateQuantity(cartItemId, quantity) {
    if (quantity < 0) {
      return; // Don't allow negative
    }

    if (quantity === 0) {
      // Remove item
      this.items = this.items.filter(i => i.cartItemId !== cartItemId);
      this.emit('itemRemoved', cartItemId);
    } else {
      const item = this.items.find(i => i.cartItemId === cartItemId);
      if (item) {
        item.quantity = quantity;
      }
    }

    this.save();
    this.emit('cartUpdated');
    this.recalculateTip();
  }

  /**
   * Set tip
   */
  setTip(tipConfig) {
    this.tip = {
      type: tipConfig.type, // 'percentage', 'fixed', 'custom'
      value: tipConfig.value,
      amount: 0
    };

    this.recalculateTip();
    this.save();
    this.emit('tipChanged', this.tip);
  }

  /**
   * Recalculate tip amount
   */
  recalculateTip() {
    if (!this.tip) return;

    const subtotal = this.getSubtotal();

    if (this.tip.type === 'percentage') {
      this.tip.amount = parseFloat((subtotal * (this.tip.value / 100)).toFixed(2));
    } else if (this.tip.type === 'fixed' || this.tip.type === 'custom') {
      this.tip.amount = parseFloat(this.tip.value.toFixed(2));
    }
  }

  /**
   * Get tip presets
   */
  getTipPresets() {
    return [15, 18, 20, 25];
  }

  /**
   * Set schedule (delivery/pickup)
   */
  setSchedule(scheduleConfig) {
    // Validate date is not in the past
    const scheduleDate = new Date(`${scheduleConfig.date}T${scheduleConfig.time || '00:00'}`);
    const now = new Date();

    if (scheduleDate < now) {
      return {
        success: false,
        error: 'Schedule date cannot be in the past'
      };
    }

    this.schedule = {
      type: scheduleConfig.type, // 'delivery' or 'pickup'
      date: scheduleConfig.date,
      time: scheduleConfig.time,
      address: scheduleConfig.address
    };

    this.save();
    this.emit('scheduleChanged', this.schedule);

    return { success: true };
  }

  /**
   * Get available time slots for a date
   */
  getAvailableTimeSlots(date) {
    const slots = [];
    const start = 9; // 9 AM
    const end = 21; // 9 PM
    const interval = 30; // 30 minutes

    for (let hour = start; hour < end; hour++) {
      for (let minute = 0; minute < 60; minute += interval) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }

    return slots;
  }

  /**
   * Calculate subtotal (before tax and tip)
   */
  getSubtotal() {
    return parseFloat(
      this.items.reduce((sum, item) => {
        return sum + (item.totalPrice * item.quantity);
      }, 0).toFixed(2)
    );
  }

  /**
   * Calculate tax
   */
  getTax() {
    const subtotal = this.getSubtotal();
    return parseFloat((subtotal * this.options.taxRate).toFixed(2));
  }

  /**
   * Calculate total (subtotal + tax + tip)
   */
  getTotal() {
    const subtotal = this.getSubtotal();
    const tax = this.getTax();
    const tip = this.tip ? this.tip.amount : 0;

    return parseFloat((subtotal + tax + tip).toFixed(2));
  }

  /**
   * Validate cart before checkout
   */
  validate() {
    const errors = [];

    // Check minimum order
    const subtotal = this.getSubtotal();
    if (this.options.minimumOrder && subtotal < this.options.minimumOrder) {
      errors.push(`Minimum order is $${this.options.minimumOrder.toFixed(2)}`);
    }

    // Check delivery address if delivery selected
    if (this.schedule && this.schedule.type === 'delivery' && !this.schedule.address) {
      errors.push('Delivery address required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Clear cart
   */
  clear() {
    this.items = [];
    this.tip = null;
    this.schedule = null;
    
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.options.storageKey);
    }

    this.emit('cartCleared');
  }

  /**
   * Save to localStorage
   */
  save() {
    if (typeof localStorage === 'undefined') return;

    const data = {
      items: this.items,
      tip: this.tip,
      schedule: this.schedule
    };

    localStorage.setItem(this.options.storageKey, JSON.stringify(data));
  }

  /**
   * Load from localStorage
   */
  load() {
    if (typeof localStorage === 'undefined') return;

    try {
      const data = localStorage.getItem(this.options.storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        this.items = parsed.items || [];
        this.tip = parsed.tip || null;
        this.schedule = parsed.schedule || null;
      }
    } catch (error) {
      // Invalid data, start fresh
      this.items = [];
      this.tip = null;
      this.schedule = null;
    }
  }

  /**
   * Event system
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      for (const callback of this.listeners[event]) {
        callback(data);
      }
    }
  }
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CartManager;
}

// Export as default for ES modules
if (typeof exports !== 'undefined') {
  exports.default = CartManager;
  exports.CartManager = CartManager;
}

// Global export for browser
if (typeof window !== 'undefined') {
  window.CartManager = CartManager;
}

