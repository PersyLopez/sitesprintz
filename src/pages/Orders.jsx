import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { usePolling } from '../hooks/usePolling';
import { useSiteWorkspace } from '../context/SiteWorkspaceContext';
import { getSiteWorkspacePaths } from '../utils/siteWorkspace';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import OrderCard from '../components/orders/OrderCard';
import OrderDetailsModal from '../components/orders/OrderDetailsModal';
import { api } from '../services/api';
import {
  OWNER_ORDER_FILTERS,
  ownerFilterToApiQueryStatus,
  orderMatchesOwnerFilter,
  countOrdersForOwnerFilter,
  ownerMarkCompleteApiStatus,
  ownerCancelApiStatus,
  formatOwnerOrderStatusLabel,
} from '../utils/orderOwnerStatus';
import './Orders.css';

function Orders() {
  const [searchParams] = useSearchParams();
  const { embedded, siteId: workspaceSiteId } = useSiteWorkspace();
  const { user, token, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();

  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(OWNER_ORDER_FILTERS.ALL);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const siteId = workspaceSiteId || searchParams.get('siteId');
  const backTo = embedded && siteId ? getSiteWorkspacePaths(siteId).overview : '/dashboard';

  // Poll for order updates
  const pollStatusParam = ownerFilterToApiQueryStatus(selectedStatus);

  const { data: polledData } = usePolling({
    endpoint: siteId ? `/api/orders/${siteId}/orders` : null,
    interval: 30000,
    enabled: !!siteId && !authLoading,
    params: pollStatusParam ? { status: pollStatusParam } : undefined,
    onUpdate: (newData) => {
      if (newData.orders) {
        setOrders(newData.orders);
        setLoadError(null);
      }
    }
  });

  useEffect(() => {
    if (polledData?.orders) {
      setOrders(polledData.orders);
    }
  }, [polledData]);

  useEffect(() => {
    if (authLoading) return;

    if (siteId) {
      loadOrders();
    } else {
      showError('No site selected. Please select a site from your dashboard.');
      setLoading(false);
    }
  }, [siteId, authLoading]);

  useEffect(() => {
    filterOrders();
  }, [orders, selectedStatus, searchTerm]);

  const loadOrders = async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const data = await api.get(`/api/orders/${siteId}/orders`);
      setOrders(data.orders || []);
    } catch (error) {
      setLoadError('Failed to load orders. Please try again.');
      showError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];

    if (selectedStatus !== OWNER_ORDER_FILTERS.ALL) {
      filtered = filtered.filter((order) => orderMatchesOwnerFilter(order, selectedStatus));
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
      const data = await api.put(`/api/orders/${siteId}/orders/${orderId}/status`, {
        status: newStatus
      });

      // Update local state
      setOrders(prev => prev.map(order =>
        (order.orderId || order.id) === orderId ? { ...order, ...data.order } : order
      ));

      showSuccess(`Order ${orderId} marked as ${formatOwnerOrderStatusLabel(newStatus)}`);
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

    const confirmMessage = newStatus === ownerCancelApiStatus()
      ? `Cancel ${selectedOrders.size} order(s)?`
      : `Mark ${selectedOrders.size} order(s) as ${formatOwnerOrderStatusLabel(newStatus)}?`;

    if (!confirm(confirmMessage)) return;

    let successCount = 0;

    for (const orderId of selectedOrders) {
      try {
        const data = await api.put(`/api/orders/${siteId}/orders/${orderId}/status`, {
          status: newStatus
        });
        setOrders(prev => prev.map(order =>
          (order.orderId || order.id) === orderId ? { ...order, ...data.order } : order
        ));
        successCount++;
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
    [OWNER_ORDER_FILTERS.ALL]: countOrdersForOwnerFilter(orders, OWNER_ORDER_FILTERS.ALL),
    [OWNER_ORDER_FILTERS.NEW]: countOrdersForOwnerFilter(orders, OWNER_ORDER_FILTERS.NEW),
    [OWNER_ORDER_FILTERS.COMPLETED]: countOrdersForOwnerFilter(orders, OWNER_ORDER_FILTERS.COMPLETED),
    [OWNER_ORDER_FILTERS.CANCELLED]: countOrdersForOwnerFilter(orders, OWNER_ORDER_FILTERS.CANCELLED),
  };

  const selectedStatusLabel = selectedStatus === OWNER_ORDER_FILTERS.ALL
    ? 'total'
    : formatOwnerOrderStatusLabel(
      selectedStatus === OWNER_ORDER_FILTERS.NEW ? 'pending' : selectedStatus === OWNER_ORDER_FILTERS.COMPLETED ? 'fulfilled' : selectedStatus
    ).toLowerCase();

  const Container = embedded ? 'div' : 'main';
  const PageTitle = embedded ? 'h2' : 'h1';

  if (!siteId) {
    return (
      <div className={`orders-page${embedded ? ' embedded-page' : ''}`}>
        {!embedded && <Header />}
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
        {!embedded && <Footer />}
      </div>
    );
  }

  return (
    <div className={`orders-page${embedded ? ' embedded-page' : ''}`}>
      {!embedded && <Header />}

      <Container className="orders-container">
        {/* Page Header */}
        <div className={`page-header${embedded ? ' pane-quiet-header' : ''}`}>
          <div className="header-title">
            <PageTitle>Orders</PageTitle>
            <p>{filteredOrders.length} {selectedStatusLabel} orders</p>
          </div>

          <div className="header-actions">
            <button onClick={exportOrders} className="btn btn-secondary">
              📥 Export CSV
            </button>
            {!embedded && (
              <Link to={backTo} className="btn btn-secondary">
                ← Back to Dashboard
              </Link>
            )}
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
            type="button"
            data-testid="orders-filter-all"
            className={`filter-btn ${selectedStatus === OWNER_ORDER_FILTERS.ALL ? 'active' : ''}`}
            onClick={() => setSelectedStatus(OWNER_ORDER_FILTERS.ALL)}
          >
            All Orders
            {statusCounts[OWNER_ORDER_FILTERS.ALL] > 0 && (
              <span className="count">{statusCounts[OWNER_ORDER_FILTERS.ALL]}</span>
            )}
          </button>
          <button
            type="button"
            data-testid="orders-filter-new"
            className={`filter-btn ${selectedStatus === OWNER_ORDER_FILTERS.NEW ? 'active' : ''}`}
            onClick={() => setSelectedStatus(OWNER_ORDER_FILTERS.NEW)}
          >
            New Orders
            {statusCounts[OWNER_ORDER_FILTERS.NEW] > 0 && (
              <span className="count badge-new">{statusCounts[OWNER_ORDER_FILTERS.NEW]}</span>
            )}
          </button>
          <button
            type="button"
            data-testid="orders-filter-completed"
            className={`filter-btn ${selectedStatus === OWNER_ORDER_FILTERS.COMPLETED ? 'active' : ''}`}
            onClick={() => setSelectedStatus(OWNER_ORDER_FILTERS.COMPLETED)}
          >
            Completed
            {statusCounts[OWNER_ORDER_FILTERS.COMPLETED] > 0 && (
              <span className="count">{statusCounts[OWNER_ORDER_FILTERS.COMPLETED]}</span>
            )}
          </button>
          <button
            type="button"
            data-testid="orders-filter-cancelled"
            className={`filter-btn ${selectedStatus === OWNER_ORDER_FILTERS.CANCELLED ? 'active' : ''}`}
            onClick={() => setSelectedStatus(OWNER_ORDER_FILTERS.CANCELLED)}
          >
            Cancelled
            {statusCounts[OWNER_ORDER_FILTERS.CANCELLED] > 0 && (
              <span className="count">{statusCounts[OWNER_ORDER_FILTERS.CANCELLED]}</span>
            )}
          </button>
        </div>

        {/* Bulk Actions */}
        {selectedOrders.size > 0 && (
          <div className="bulk-actions-bar">
            <div className="bulk-info">
              <span className="selected-count">{selectedOrders.size}</span> orders selected
            </div>
            <div className="bulk-actions">
              <button onClick={() => bulkUpdateStatus(ownerMarkCompleteApiStatus())} className="bulk-btn success">
                ✓ Mark Completed
              </button>
              <button onClick={() => bulkUpdateStatus(ownerCancelApiStatus())} className="bulk-btn danger">
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
        ) : loadError ? (
          <div className="empty-state orders-error-state" data-testid="orders-load-error">
            <div className="empty-icon">⚠️</div>
            <h2>Could Not Load Orders</h2>
            <p>{loadError}</p>
            <button type="button" onClick={loadOrders} className="btn btn-primary">
              Retry
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state" data-testid="orders-empty-state">
            <div className="empty-icon">📦</div>
            <h2>No Orders Found</h2>
            <p>
              {searchTerm
                ? 'No orders match your search.'
                : selectedStatus === OWNER_ORDER_FILTERS.ALL
                  ? 'You haven\'t received any orders yet.'
                  : `No ${selectedStatusLabel} orders.`
              }
            </p>
            {searchTerm && (
              <button type="button" onClick={() => setSearchTerm('')} className="btn btn-secondary">
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
      </Container>

      {!embedded && <Footer />}

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

