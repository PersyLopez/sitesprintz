import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import OrderCard from '../components/orders/OrderCard';
import OrderDetailsModal from '../components/orders/OrderDetailsModal';
import './Orders.css';

function Orders() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  
  const siteId = searchParams.get('siteId');

  useEffect(() => {
    if (siteId) {
      loadOrders();
    } else {
      showError('No site selected. Please select a site from your dashboard.');
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    filterOrders();
  }, [orders, selectedStatus, searchTerm]);

  const loadOrders = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`/api/sites/${siteId}/orders`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load orders');
      }

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Load orders error:', error);
      showError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(order => order.status === selectedStatus);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.orderId?.toLowerCase().includes(term) ||
        order.customer?.name?.toLowerCase().includes(term) ||
        order.customer?.email?.toLowerCase().includes(term)
      );
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    setFilteredOrders(filtered);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`/api/sites/${siteId}/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update order');
      }

      const data = await response.json();

      // Update local state
      setOrders(prev => prev.map(order => 
        order.orderId === orderId ? data.order : order
      ));

      showSuccess(`Order ${orderId} marked as ${newStatus}`);
    } catch (error) {
      console.error('Update order error:', error);
      showError('Failed to update order');
    }
  };

  const toggleOrderSelection = (orderId) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedOrders(new Set(filteredOrders.map(o => o.orderId)));
  };

  const clearSelection = () => {
    setSelectedOrders(new Set());
  };

  const bulkUpdateStatus = async (newStatus) => {
    if (selectedOrders.size === 0) return;

    const confirmMessage = newStatus === 'cancelled' 
      ? `Cancel ${selectedOrders.size} order(s)?`
      : `Mark ${selectedOrders.size} order(s) as ${newStatus}?`;
    
    if (!confirm(confirmMessage)) return;

    let successCount = 0;

    for (const orderId of selectedOrders) {
      try {
        const response = await fetch(`/api/sites/${siteId}/orders/${orderId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
          const data = await response.json();
          setOrders(prev => prev.map(order => 
            order.orderId === orderId ? data.order : order
          ));
          successCount++;
        }
      } catch (error) {
        console.error(`Failed to update order ${orderId}:`, error);
      }
    }

    clearSelection();
    showSuccess(`${successCount} order(s) updated successfully`);
  };

  const exportOrders = () => {
    // Create CSV content
    const headers = ['Order ID', 'Date', 'Customer', 'Email', 'Total', 'Status'];
    const rows = filteredOrders.map(order => [
      order.orderId,
      new Date(order.createdAt).toLocaleDateString(),
      order.customer?.name || 'N/A',
      order.customer?.email || 'N/A',
      `$${(order.total / 100).toFixed(2)}`,
      order.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showSuccess('Orders exported successfully');
  };

  const statusCounts = {
    all: orders.length,
    new: orders.filter(o => o.status === 'new').length,
    completed: orders.filter(o => o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  if (!siteId) {
    return (
      <div className="orders-page">
        <Header />
        <div className="orders-container">
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h2>No Site Selected</h2>
            <p>Please select a site from your dashboard to view orders.</p>
            <Link to="/dashboard" className="btn btn-primary">
              Go to Dashboard
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="orders-page">
      <Header />
      
      <main className="orders-container">
        {/* Page Header */}
        <div className="page-header">
          <div className="header-title">
            <h1>📦 Orders</h1>
            <p>{filteredOrders.length} {selectedStatus === 'all' ? 'total' : selectedStatus} orders</p>
          </div>
          
          <div className="header-actions">
            <button onClick={exportOrders} className="btn btn-secondary">
              📥 Export CSV
            </button>
            <Link to="/dashboard" className="btn btn-secondary">
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by order ID, customer name, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Filters */}
        <div className="filters">
          <button
            className={`filter-btn ${selectedStatus === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedStatus('all')}
          >
            All Orders
            {statusCounts.all > 0 && <span className="count">{statusCounts.all}</span>}
          </button>
          <button
            className={`filter-btn ${selectedStatus === 'new' ? 'active' : ''}`}
            onClick={() => setSelectedStatus('new')}
          >
            New Orders
            {statusCounts.new > 0 && <span className="count badge-new">{statusCounts.new}</span>}
          </button>
          <button
            className={`filter-btn ${selectedStatus === 'completed' ? 'active' : ''}`}
            onClick={() => setSelectedStatus('completed')}
          >
            Completed
            {statusCounts.completed > 0 && <span className="count">{statusCounts.completed}</span>}
          </button>
          <button
            className={`filter-btn ${selectedStatus === 'cancelled' ? 'active' : ''}`}
            onClick={() => setSelectedStatus('cancelled')}
          >
            Cancelled
            {statusCounts.cancelled > 0 && <span className="count">{statusCounts.cancelled}</span>}
          </button>
        </div>

        {/* Bulk Actions */}
        {selectedOrders.size > 0 && (
          <div className="bulk-actions-bar">
            <div className="bulk-info">
              <span className="selected-count">{selectedOrders.size}</span> orders selected
            </div>
            <div className="bulk-actions">
              <button onClick={() => bulkUpdateStatus('completed')} className="bulk-btn success">
                ✓ Mark Completed
              </button>
              <button onClick={() => bulkUpdateStatus('cancelled')} className="bulk-btn danger">
                ✕ Cancel Orders
              </button>
              <button onClick={selectAll} className="bulk-btn">
                Select All ({filteredOrders.length})
              </button>
              <button onClick={clearSelection} className="bulk-btn">
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Orders List */}
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h2>No Orders Found</h2>
            <p>
              {searchTerm 
                ? 'No orders match your search.' 
                : selectedStatus === 'all'
                ? 'You haven\'t received any orders yet.'
                : `No ${selectedStatus} orders.`
              }
            </p>
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="btn btn-secondary">
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="orders-grid">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.orderId}
                order={order}
                selected={selectedOrders.has(order.orderId)}
                onToggleSelect={() => toggleOrderSelection(order.orderId)}
                onUpdateStatus={updateOrderStatus}
                onViewDetails={() => setSelectedOrder(order)}
              />
            ))}
          </div>
        )}
      </main>
      
      <Footer />

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={updateOrderStatus}
        />
      )}
    </div>
  );
}

export default Orders;

