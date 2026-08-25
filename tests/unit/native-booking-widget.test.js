/**
 * Unit Tests: Native Booking Widget Module
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('NativeBookingWidget', () => {
  let NativeBookingWidget;
  let container;
  let widget;
  let dom;

  beforeEach(async () => {
    dom = new JSDOM('<!DOCTYPE html><html><body><div id="test-container"></div></body></html>', {
      url: 'http://localhost',
      pretendToBeVisual: true,
    });

    global.document = dom.window.document;
    global.window = dom.window;
    container = dom.window.document.getElementById('test-container');

    vi.resetModules();
    await import('../../public/modules/native-booking-widget.js');
    NativeBookingWidget = dom.window.NativeBookingWidget;
    widget = new NativeBookingWidget('test-container', 'user-123');
    dom.window.nativeBookingWidget = widget;
  });

  afterEach(() => {
    delete dom.window.nativeBookingWidget;
    delete global.document;
    delete global.window;
    vi.resetModules();
  });

  it('should initialize with container and userId', () => {
    expect(widget.container).toBe(container);
    expect(widget.userId).toBe('user-123');
    expect(widget.apiBase).toBe('/api/booking/tenants/user-123');
  });

  it('should handle missing container gracefully', () => {
    const missing = new NativeBookingWidget('missing-container', 'user-123');
    expect(missing.container).toBeNull();
  });

  it('should escape HTML correctly', () => {
    const escaped = widget.escapeHtml('<script>alert("xss")</script>');
    expect(escaped).not.toContain('<script>');
  });

  it('shows no-times copy when date selected and slots empty', () => {
    widget.state.step = 'date';
    widget.state.selectedDate = '2026-08-25';
    widget.state.timeSlots = [];
    widget.state.slotsLoading = false;
    widget.state.selectedService = { id: 'svc-1', name: 'Cut' };
    widget.renderDatePicker();

    expect(container.innerHTML).toContain('No times available this day. Try another date.');
    expect(container.querySelector('[data-testid="slots-empty"]')).toBeTruthy();
  });
});
