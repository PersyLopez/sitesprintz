/**
 * ClassScheduler Component Unit Tests
 * 
 * Tests for the class/appointment scheduler component
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('ClassScheduler', () => {
  let ClassScheduler;
  let dom;
  let document;
  let container;

  beforeEach(async () => {
    // Setup JSDOM
    dom = new JSDOM('<!DOCTYPE html><html><body><div id="scheduler-container"></div></body></html>', {
      url: 'http://localhost',
      pretendToBeVisual: true,
    });
    
    global.document = dom.window.document;
    global.window = dom.window;
    document = dom.window.document;
    
    container = document.getElementById('scheduler-container');

    // Import the module
    const module = await import('../../../public/modules/class-scheduler.js');
    ClassScheduler = module.default || window.ClassScheduler;
  });

  afterEach(() => {
    if (container) {
      container.innerHTML = '';
    }
    delete global.document;
    delete global.window;
  });

  describe('Constructor', () => {
    it('should create a ClassScheduler instance', () => {
      const classes = [
        {
          id: 'class1',
          name: 'Yoga',
          date: '2024-01-15',
          time: '10:00 AM',
          instructor: 'Jane Doe',
          capacity: 20,
          booked: 10
        }
      ];

      const scheduler = new ClassScheduler({
        containerId: 'scheduler-container',
        classes: classes,
        onBook: vi.fn()
      });

      expect(scheduler).toBeDefined();
      expect(scheduler.config.classes).toEqual(classes);
    });

    it('should initialize with current date', () => {
      const scheduler = new ClassScheduler({
        containerId: 'scheduler-container',
        classes: [],
        onBook: vi.fn()
      });

      expect(scheduler.currentDate).toBeInstanceOf(Date);
    });
  });

  describe('init()', () => {
    it('should render scheduler UI when container exists', () => {
      const scheduler = new ClassScheduler({
        containerId: 'scheduler-container',
        classes: [],
        onBook: vi.fn()
      });

      scheduler.init();

      expect(container.innerHTML).not.toBe('');
      expect(container.querySelector('.class-scheduler')).toBeTruthy();
    });

    it('should not render if container does not exist', () => {
      const scheduler = new ClassScheduler({
        containerId: 'non-existent',
        classes: [],
        onBook: vi.fn()
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      scheduler.init();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('renderClassList()', () => {
    it('should display classes for current month', () => {
      const currentDate = new Date('2024-01-15');
      const classes = [
        {
          id: 'class1',
          name: 'Yoga',
          date: '2024-01-15',
          time: '10:00 AM',
          instructor: 'Jane Doe',
          capacity: 20,
          booked: 10
        },
        {
          id: 'class2',
          name: 'Pilates',
          date: '2024-02-15',
          time: '11:00 AM',
          instructor: 'John Doe',
          capacity: 15,
          booked: 5
        }
      ];

      const scheduler = new ClassScheduler({
        containerId: 'scheduler-container',
        classes: classes,
        onBook: vi.fn()
      });

      scheduler.currentDate = currentDate;
      scheduler.init();

      const classCards = container.querySelectorAll('.class-card');
      expect(classCards.length).toBeGreaterThan(0);
    });

    it('should show message when no classes for current month', () => {
      const scheduler = new ClassScheduler({
        containerId: 'scheduler-container',
        classes: [],
        onBook: vi.fn()
      });

      scheduler.init();

      expect(container.textContent).toContain('No classes scheduled');
    });
  });

  describe('changeMonth()', () => {
    it('should change current month and re-render', () => {
      const scheduler = new ClassScheduler({
        containerId: 'scheduler-container',
        classes: [],
        onBook: vi.fn()
      });

      const initialMonth = scheduler.currentDate.getMonth();
      scheduler.init();
      scheduler.changeMonth(1);

      expect(scheduler.currentDate.getMonth()).toBe((initialMonth + 1) % 12);
    });
  });
});

