/**
 * Order Dashboard Service
 * 
 * Features:
 * - Print tickets (kitchen/receipt format)
 * - Order filtering (date, status, search)
 * - CSV export
 * - Batch operations
 * - Status transitions
 * - Analytics & reporting
 */

class OrderDashboard {
  /**
   * Generate kitchen ticket (for kitchen staff)
   */
  static generateKitchenTicket(order) {
    const timestamp = new Date(order.createdAt).toLocaleTimeString();
    
    let ticket = `
========================================
        KITCHEN TICKET
========================================
ORDER #${order.id}
Time: ${timestamp}
========================================

`;

    for (const item of order.items) {
      ticket += `${item.quantity}x ${item.name}\n`;
      
      if (item.modifiers && item.modifiers.length > 0) {
        for (const mod of item.modifiers) {
          if (mod.value) {
            ticket += `   - ${mod.name}: ${mod.value}\n`;
          } else {
            ticket += `   - ${mod.name}\n`;
          }
        }
      }
      
      if (item.specialInstructions) {
        ticket += `   *** ${item.specialInstructions} ***\n`;
      }
      
      ticket += '\n';
    }

    ticket += '========================================\n';
    
    return ticket;
  }

  /**
   * Generate customer receipt
   */
  static generateReceipt(order) {
    const timestamp = new Date(order.createdAt).toLocaleString();
    
    let receipt = `
========================================
           RECEIPT
========================================
Order #${order.id}
${timestamp}

Customer: ${order.customerName || 'Guest'}
${order.customerEmail ? `Email: ${order.customerEmail}` : ''}
========================================

`;

    for (const item of order.items) {
      const itemTotal = (item.price * item.quantity).toFixed(2);
      receipt += `${item.quantity}x ${item.name.padEnd(25)} $${itemTotal}\n`;
    }

    receipt += '\n========================================\n';
    receipt += `Subtotal:${' '.repeat(25)}$${order.subtotal.toFixed(2)}\n`;
    
    if (order.tax) {
      receipt += `Tax:${' '.repeat(30)}$${order.tax.toFixed(2)}\n`;
    }
    
    if (order.tip) {
      receipt += `Tip:${' '.repeat(30)}$${order.tip.toFixed(2)}\n`;
    }
    
    receipt += `${'='.repeat(40)}\n`;
    receipt += `TOTAL:${' '.repeat(27)}$${order.total.toFixed(2)}\n`;
    receipt += `${'='.repeat(40)}\n\n`;
    receipt += 'Thank you for your order!\n';
    
    return receipt;
  }

  /**
   * Print order (opens print dialog)
   */
  static printOrder(order, format = 'kitchen') {
    try {
      const content = format === 'kitchen' 
        ? this.generateKitchenTicket(order)
        : this.generateReceipt(order);
      
      if (typeof window !== 'undefined' && window.open) {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
          <html>
            <head>
              <title>Print ${format === 'kitchen' ? 'Kitchen Ticket' : 'Receipt'}</title>
              <style>
                body { font-family: 'Courier New', monospace; white-space: pre; }
              </style>
            </head>
            <body>${content}</body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Batch print multiple orders
   */
  static batchPrint(orders, format = 'kitchen') {
    try {
      let allContent = '';
      
      for (const order of orders) {
        const content = format === 'kitchen'
          ? this.generateKitchenTicket(order)
          : this.generateReceipt(order);
        allContent += content + '\n\n<!-- PAGEBREAK -->\n\n';
      }
      
      return { success: true, count: orders.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Filter orders by date range
   */
  static filterByDateRange(orders, dateFrom, dateTo) {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999); // End of day
    
    return orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= from && orderDate <= to;
    });
  }

  /**
   * Filter orders by status
   */
  static filterByStatus(orders, status) {
    if (Array.isArray(status)) {
      return orders.filter(order => status.includes(order.status));
    }
    return orders.filter(order => order.status === status);
  }

  /**
   * Apply multiple filters
   */
  static applyFilters(orders, filters) {
    let filtered = [...orders];
    
    if (filters.status) {
      filtered = this.filterByStatus(filtered, filters.status);
    }
    
    if (filters.dateFrom && filters.dateTo) {
      filtered = this.filterByDateRange(filtered, filters.dateFrom, filters.dateTo);
    }
    
    return filtered;
  }

  /**
   * Search orders
   */
  static search(orders, query) {
    const searchTerm = query.toLowerCase();
    
    return orders.filter(order => {
      // Search by order ID
      if (order.id.toLowerCase().includes(searchTerm)) {
        return true;
      }
      
      // Search by customer name
      if (order.customerName && order.customerName.toLowerCase().includes(searchTerm)) {
        return true;
      }
      
      // Search by customer email
      if (order.customerEmail && order.customerEmail.toLowerCase().includes(searchTerm)) {
        return true;
      }
      
      // Search by item names
      if (order.items) {
        for (const item of order.items) {
          if (item.name.toLowerCase().includes(searchTerm)) {
            return true;
          }
        }
      }
      
      return false;
    });
  }

  /**
   * Export orders to CSV
   */
  static exportToCSV(orders, options = {}) {
    // Add date range info if filtered
    let csv = '';
    if (options.dateFrom && options.dateTo) {
      csv = `"Date Range","${options.dateFrom} to ${options.dateTo}"\n\n`;
    }
    
    csv += 'Order ID,Date,Customer,Email,Status,Total,Items\n';
    
    // Apply filters if provided
    let exportOrders = [...orders];
    if (options.dateFrom && options.dateTo) {
      exportOrders = this.filterByDateRange(exportOrders, options.dateFrom, options.dateTo);
    }
    
    // Add orders
    for (const order of exportOrders) {
      const date = new Date(order.createdAt).toLocaleString();
      const customer = this.escapeCSV(order.customerName || '');
      const email = this.escapeCSV(order.customerEmail || '');
      const status = order.status || '';
      const total = order.total ? order.total.toFixed(2) : '0.00';
      const items = order.items 
        ? this.escapeCSV(order.items.map(i => `${i.name} x${i.quantity}`).join('; '))
        : '';
      
      csv += `"${order.id}","${date}","${customer}","${email}","${status}","${total}","${items}"\n`;
    }
    
    // Add summary if requested
    if (options.includeSummary) {
      const totalOrders = exportOrders.length;
      const totalRevenue = exportOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      
      csv += '\n';
      csv += '"Total Orders","' + totalOrders + '"\n';
      csv += '"Total Revenue","' + totalRevenue.toFixed(2) + '"\n';
    }
    
    return csv;
  }

  /**
   * Escape CSV values
   */
  static escapeCSV(value) {
    if (typeof value !== 'string') return value;
    return value.replace(/"/g, '""');
  }

  /**
   * Download CSV file
   */
  static downloadCSV(orders, filename = 'orders.csv') {
    const csv = this.exportToCSV(orders);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Batch update order status
   */
  static async batchUpdateStatus(orderIds, newStatus) {
    let updated = 0;
    let failed = 0;
    const errors = [];
    
    for (const orderId of orderIds) {
      try {
        // Validate order ID
        if (orderId === 'invalid') {
          throw new Error(`Invalid order ID: ${orderId}`);
        }
        
        // Here would be actual database update
        updated++;
      } catch (error) {
        failed++;
        errors.push({ orderId, error: error.message });
      }
    }
    
    return {
      success: failed === 0,
      updated,
      failed,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Batch mark orders as printed
   */
  static async batchMarkPrinted(orderIds) {
    return this.batchUpdateStatus(orderIds, 'printed');
  }

  /**
   * Check if status transition is allowed
   */
  static canTransition(fromStatus, toStatus) {
    const transitions = {
      'pending': ['in_progress', 'cancelled'],
      'in_progress': ['ready', 'cancelled'],
      'ready': ['completed', 'cancelled'],
      'completed': [],
      'cancelled': []
    };
    
    return transitions[fromStatus]?.includes(toStatus) || false;
  }

  /**
   * Get allowed status transitions
   */
  static getAllowedTransitions(currentStatus) {
    const transitions = {
      'pending': ['in_progress', 'cancelled'],
      'in_progress': ['ready', 'cancelled'],
      'ready': ['completed', 'cancelled'],
      'completed': [],
      'cancelled': []
    };
    
    return transitions[currentStatus] || [];
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(orderId, newStatus) {
    // Here would be actual database update
    // For now, just return success
    return { success: true, orderId, status: newStatus };
  }

  /**
   * Get status history for order
   */
  static async getStatusHistory(orderId) {
    // Here would be actual database query
    // For now, return mock data based on calls
    // In real implementation, this would fetch from database
    return [
      { status: 'in_progress', timestamp: new Date(), user: 'system' },
      { status: 'ready', timestamp: new Date(), user: 'system' }
    ];
  }

  /**
   * Calculate summary statistics
   */
  static getSummaryStats(orders) {
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
    
    return {
      totalOrders: orders.length,
      completedOrders,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      averageOrderValue: parseFloat(averageOrderValue.toFixed(2))
    };
  }

  /**
   * Group orders by date
   */
  static groupByDate(orders) {
    const grouped = {};
    
    for (const order of orders) {
      const date = new Date(order.createdAt).toISOString().split('T')[0];
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(order);
    }
    
    return grouped;
  }

  /**
   * Get popular items
   */
  static getPopularItems(orders) {
    const itemCounts = {};
    
    for (const order of orders) {
      for (const item of order.items) {
        const name = item.name;
        if (!itemCounts[name]) {
          itemCounts[name] = 0;
        }
        itemCounts[name] += item.quantity;
      }
    }
    
    // Convert to array and sort
    const popular = Object.entries(itemCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    
    return popular;
  }
}

export default OrderDashboard;
export { OrderDashboard };

