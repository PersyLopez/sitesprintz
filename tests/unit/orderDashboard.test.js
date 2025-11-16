/**
 * Order Dashboard Enhancement Tests
 * TDD Approach: RED phase
 * 
 * Enhanced dashboard should support:
 * - Print order tickets (kitchen/receipt format)
 * - Order history filtering (date range, status)
 * - CSV export for accounting
 * - Search (order ID, customer name, items)
 * - Batch operations (mark multiple as complete)
 * - Order status transitions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

let OrderDashboard;

describe('Order Dashboard Enhancements', () => {
  beforeEach(async () => {
    // Mock window.print
    global.window = {
      print: vi.fn(),
      open: vi.fn(() => ({
        document: {
          write: vi.fn(),
          close: vi.fn()
        },
        print: vi.fn(),
        close: vi.fn()
      }))
    };

    const module = await import('../../server/services/orderDashboardService.js');
    OrderDashboard = module.default || module.OrderDashboard;
  });

  describe('Print Functionality', () => {
    it('should generate kitchen ticket format', () => {
      const order = {
        id: '123',
        items: [
          {
            name: 'Burger',
            quantity: 2,
            modifiers: [{ name: 'No onions', value: '' }],
            specialInstructions: 'Extra sauce'
          }
        ],
        createdAt: new Date('2025-11-13T12:00:00')
      };

      const ticket = OrderDashboard.generateKitchenTicket(order);

      expect(ticket).toContain('ORDER #123');
      expect(ticket).toContain('2x Burger');
      expect(ticket).toContain('No onions');
      expect(ticket).toContain('Extra sauce');
    });

    it('should generate customer receipt format', () => {
      const order = {
        id: '123',
        customerName: 'John Doe',
        items: [{ name: 'Pizza', quantity: 1, price: 12.99 }],
        subtotal: 12.99,
        tax: 1.04,
        tip: 2.00,
        total: 16.03,
        createdAt: new Date()
      };

      const receipt = OrderDashboard.generateReceipt(order);

      expect(receipt).toContain('RECEIPT');
      expect(receipt).toContain('John Doe');
      expect(receipt).toContain('Pizza');
      expect(receipt).toContain('$12.99');
      expect(receipt).toContain('$16.03');
    });

    it('should batch print multiple tickets', () => {
      const orders = [
        { id: '1', items: [{ name: 'Item 1', quantity: 1 }] },
        { id: '2', items: [{ name: 'Item 2', quantity: 1 }] }
      ];

      const result = OrderDashboard.batchPrint(orders, 'kitchen');

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
    });

    it('should handle print errors gracefully', () => {
      // In test environment, window is undefined by default
      // This test confirms that the service handles it gracefully
      delete global.window;

      const order = { id: '123', items: [] };
      const result = OrderDashboard.printOrder(order, 'kitchen');

      expect(result.success).toBe(true); // Should still return success even without window
    });
  });

  describe('Order History & Filtering', () => {
    it('should filter orders by date range', () => {
      const orders = [
        { id: '1', createdAt: new Date('2025-11-01') },
        { id: '2', createdAt: new Date('2025-11-10') },
        { id: '3', createdAt: new Date('2025-11-20') }
      ];

      const filtered = OrderDashboard.filterByDateRange(
        orders,
        '2025-11-05',
        '2025-11-15'
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('2');
    });

    it('should filter orders by status', () => {
      const orders = [
        { id: '1', status: 'pending' },
        { id: '2', status: 'completed' },
        { id: '3', status: 'pending' }
      ];

      const filtered = OrderDashboard.filterByStatus(orders, 'pending');

      expect(filtered).toHaveLength(2);
    });

    it('should filter orders by multiple statuses', () => {
      const orders = [
        { id: '1', status: 'pending' },
        { id: '2', status: 'in_progress' },
        { id: '3', status: 'completed' }
      ];

      const filtered = OrderDashboard.filterByStatus(
        orders,
        ['pending', 'in_progress']
      );

      expect(filtered).toHaveLength(2);
    });

    it('should combine multiple filters', () => {
      const orders = [
        { id: '1', status: 'completed', createdAt: new Date('2025-11-10') },
        { id: '2', status: 'completed', createdAt: new Date('2025-11-15') },
        { id: '3', status: 'pending', createdAt: new Date('2025-11-15') }
      ];

      const filtered = OrderDashboard.applyFilters(orders, {
        status: 'completed',
        dateFrom: '2025-11-12',
        dateTo: '2025-11-20'
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('2');
    });
  });

  describe('Search Functionality', () => {
    it('should search by order ID', () => {
      const orders = [
        { id: '123', customerName: 'John' },
        { id: '456', customerName: 'Jane' }
      ];

      const results = OrderDashboard.search(orders, '123');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('123');
    });

    it('should search by customer name', () => {
      const orders = [
        { id: '1', customerName: 'John Doe', customerEmail: 'john@example.com' },
        { id: '2', customerName: 'Jane Smith', customerEmail: 'jane@example.com' }
      ];

      const results = OrderDashboard.search(orders, 'Jane');

      expect(results).toHaveLength(1);
      expect(results[0].customerName).toBe('Jane Smith');
    });

    it('should search by item name', () => {
      const orders = [
        { id: '1', items: [{ name: 'Burger' }, { name: 'Fries' }] },
        { id: '2', items: [{ name: 'Pizza' }] }
      ];

      const results = OrderDashboard.search(orders, 'pizza');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('2');
    });

    it('should search by customer email', () => {
      const orders = [
        { id: '1', customerEmail: 'john@example.com' },
        { id: '2', customerEmail: 'jane@example.com' }
      ];

      const results = OrderDashboard.search(orders, 'john@example');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('1');
    });

    it('should be case insensitive', () => {
      const orders = [{ id: '1', customerName: 'John Doe' }];

      const results = OrderDashboard.search(orders, 'JOHN');

      expect(results).toHaveLength(1);
    });

    it('should handle partial matches', () => {
      const orders = [{ id: '1', customerName: 'John Doe' }];

      const results = OrderDashboard.search(orders, 'Joh');

      expect(results).toHaveLength(1);
    });
  });

  describe('CSV Export', () => {
    it('should generate CSV from orders', () => {
      const orders = [
        {
          id: '123',
          createdAt: new Date('2025-11-13T12:00:00'),
          customerName: 'John Doe',
          customerEmail: 'john@example.com',
          status: 'completed',
          total: 25.50,
          items: [{ name: 'Burger', quantity: 2 }]
        }
      ];

      const csv = OrderDashboard.exportToCSV(orders);

      expect(csv).toContain('Order ID,Date,Customer,Email,Status,Total,Items');
      expect(csv).toContain('123');
      expect(csv).toContain('John Doe');
      expect(csv).toContain('25.50');
    });

    it('should handle special characters in CSV', () => {
      const orders = [
        {
          id: '1',
          customerName: 'Smith, John',
          items: [{ name: 'Pizza "Deluxe"', quantity: 1 }],
          createdAt: new Date(),
          total: 10
        }
      ];

      const csv = OrderDashboard.exportToCSV(orders);

      expect(csv).toContain('"Smith, John"');
      expect(csv).toContain('Pizza ""Deluxe""'); // CSV escaping: " becomes ""
    });

    it('should include order summary in CSV', () => {
      const orders = [
        { id: '1', total: 10, createdAt: new Date(), items: [] },
        { id: '2', total: 15, createdAt: new Date(), items: [] }
      ];

      const csv = OrderDashboard.exportToCSV(orders, { includeSummary: true });

      expect(csv).toContain('"Total Orders","2"');
      expect(csv).toContain('"Total Revenue","25.00"');
    });

    it('should export filtered date range', () => {
      const orders = [
        { id: '1', createdAt: new Date('2025-11-01'), total: 10 },
        { id: '2', createdAt: new Date('2025-11-15'), total: 15 }
      ];

      const csv = OrderDashboard.exportToCSV(orders, {
        dateFrom: '2025-11-10',
        dateTo: '2025-11-20'
      });

      expect(csv).toContain('Date Range');
      expect(csv).not.toContain('"1"');
      expect(csv).toContain('"2"');
    });

    it('should trigger download in browser', () => {
      const createObjectURL = vi.fn(() => 'blob:url');
      const revokeObjectURL = vi.fn();
      
      global.URL = {
        createObjectURL,
        revokeObjectURL
      };

      const link = {
        href: '',
        download: '',
        click: vi.fn()
      };
      
      global.document = {
        createElement: vi.fn(() => link),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn()
        }
      };

      const orders = [{ id: '1', total: 10 }];
      OrderDashboard.downloadCSV(orders, 'orders.csv');

      expect(link.click).toHaveBeenCalled();
      expect(link.download).toBe('orders.csv');
    });
  });

  describe('Batch Operations', () => {
    it('should update status for multiple orders', async () => {
      const orderIds = ['1', '2', '3'];
      const newStatus = 'completed';

      const result = await OrderDashboard.batchUpdateStatus(orderIds, newStatus);

      expect(result.success).toBe(true);
      expect(result.updated).toBe(3);
    });

    it('should mark multiple orders as printed', async () => {
      const orderIds = ['1', '2'];

      const result = await OrderDashboard.batchMarkPrinted(orderIds);

      expect(result.success).toBe(true);
      expect(result.updated).toBe(2);
    });

    it('should handle partial batch failures', async () => {
      const orderIds = ['valid1', 'invalid', 'valid2'];

      const result = await OrderDashboard.batchUpdateStatus(orderIds, 'completed');

      expect(result.success).toBe(false);
      expect(result.updated).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('Order Status Transitions', () => {
    it('should validate status transitions', () => {
      expect(OrderDashboard.canTransition('pending', 'in_progress')).toBe(true);
      expect(OrderDashboard.canTransition('pending', 'completed')).toBe(false);
      expect(OrderDashboard.canTransition('in_progress', 'ready')).toBe(true);
      expect(OrderDashboard.canTransition('ready', 'completed')).toBe(true);
    });

    it('should get allowed next statuses', () => {
      const allowed = OrderDashboard.getAllowedTransitions('pending');

      expect(allowed).toContain('in_progress');
      expect(allowed).toContain('cancelled');
      expect(allowed).not.toContain('completed');
    });

    it('should track status history', async () => {
      const orderId = '123';
      
      await OrderDashboard.updateOrderStatus(orderId, 'in_progress');
      await OrderDashboard.updateOrderStatus(orderId, 'ready');
      
      const history = await OrderDashboard.getStatusHistory(orderId);

      expect(history).toHaveLength(2);
      expect(history[0].status).toBe('in_progress');
      expect(history[1].status).toBe('ready');
    });
  });

  describe('Analytics & Reporting', () => {
    it('should calculate summary statistics', () => {
      const orders = [
        { id: '1', total: 10, status: 'completed' },
        { id: '2', total: 15, status: 'completed' },
        { id: '3', total: 20, status: 'pending' }
      ];

      const stats = OrderDashboard.getSummaryStats(orders);

      expect(stats.totalOrders).toBe(3);
      expect(stats.totalRevenue).toBe(45);
      expect(stats.averageOrderValue).toBe(15);
      expect(stats.completedOrders).toBe(2);
    });

    it('should group orders by date', () => {
      const orders = [
        { id: '1', createdAt: new Date('2025-11-13'), total: 10 },
        { id: '2', createdAt: new Date('2025-11-13'), total: 15 },
        { id: '3', createdAt: new Date('2025-11-14'), total: 20 }
      ];

      const grouped = OrderDashboard.groupByDate(orders);

      expect(grouped['2025-11-13']).toHaveLength(2);
      expect(grouped['2025-11-14']).toHaveLength(1);
    });

    it('should identify popular items', () => {
      const orders = [
        { items: [{ name: 'Burger', quantity: 2 }, { name: 'Fries', quantity: 1 }] },
        { items: [{ name: 'Burger', quantity: 1 }, { name: 'Pizza', quantity: 1 }] }
      ];

      const popular = OrderDashboard.getPopularItems(orders);

      expect(popular[0].name).toBe('Burger');
      expect(popular[0].count).toBe(3);
    });
  });
});

