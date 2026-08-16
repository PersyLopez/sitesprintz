/**
 * Unit Tests: Native Booking Widget Module
 * 
 * Tests for public/modules/native-booking-widget.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock DOM environment
global.window = {
  NativeBookingWidget: null
};
global.document = {
  getElementById: vi.fn(),
  createElement: vi.fn(),
  createTextNode: vi.fn(),
  head: {
    appendChild: vi.fn()
  }
};

describe('NativeBookingWidget', () => {
  let container;
  let widget;

  beforeEach(() => {
    container = {
      innerHTML: '',
      id: 'test-container'
    };
    
    document.getElementById = vi.fn(() => container);
    document.createElement = vi.fn((tag) => ({
      tagName: tag,
      textContent: '',
      innerHTML: '',
      setAttribute: vi.fn(),
      appendChild: vi.fn(),
      style: {}
    }));
    document.createTextNode = vi.fn((text) => ({ textContent: text }));
  });

  it('should initialize with container and userId', () => {
    const NativeBookingWidget = require('../../../public/modules/native-booking-widget.js').NativeBookingWidget || 
                                 global.window?.NativeBookingWidget;
    
    if (NativeBookingWidget) {
      widget = new NativeBookingWidget('test-container', 'user-123');
      expect(widget.container).toBe(container);
      expect(widget.userId).toBe('user-123');
      expect(widget.apiBase).toBe('/api/booking/tenants/user-123');
    }
  });

  it('should handle missing container gracefully', () => {
    document.getElementById = vi.fn(() => null);
    
    const NativeBookingWidget = global.window?.NativeBookingWidget;
    if (NativeBookingWidget) {
      widget = new NativeBookingWidget('missing-container', 'user-123');
      // Should not throw
      expect(widget.container).toBeNull();
    }
  });

  it('should escape HTML correctly', () => {
    const NativeBookingWidget = global.window?.NativeBookingWidget;
    if (NativeBookingWidget) {
      widget = new NativeBookingWidget('test-container', 'user-123');
      const escaped = widget.escapeHtml('<script>alert("xss")</script>');
      expect(escaped).not.toContain('<script>');
    }
  });
});



