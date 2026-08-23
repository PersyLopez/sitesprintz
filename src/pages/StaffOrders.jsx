import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useStaff } from '../context/StaffContext';
import { useToast } from '../hooks/useToast';
import { usePolling } from '../hooks/usePolling';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import api from '../services/api';
import './StaffDashboard.css';

function isToday(dateValue) {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate()
  );
}

function StaffOrders() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { assignments, loading: contextLoading } = useStaff();
  const { showSuccess, showError } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const assignment = assignments.find((a) => a.tenantId === tenantId);
  const canViewOrders = assignment?.permissions?.canViewOrders === true;
  const canFetchOrders = Boolean(
    tenantId && isAuthenticated && !contextLoading && assignment && canViewOrders
  );
  const todayOrders = useMemo(
    () => orders.filter((order) => isToday(order.created_at || order.createdAt)),
    [orders]
  );

  // Poll for orders
  const { data: polledData, lastUpdated } = usePolling({
    endpoint: `/api/staff/orders/${tenantId}`,
    interval: 15000,
    enabled: canFetchOrders,
    params: { status: statusFilter },
    onUpdate: (newData) => {
      setOrders(newData.orders || []);
    }
  });

  useEffect(() => {
    if (polledData?.orders) {
      setOrders(polledData.orders);
    }
  }, [polledData]);

  useEffect(() => {
    if (canFetchOrders) {
      loadOrders();
    }
  }, [tenantId, statusFilter, canFetchOrders]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await api.get(`/api/staff/orders/${tenantId}`, { params });
      setOrders(response.orders || []);
    } catch (err) {
      console.error('Load orders error:', err);
      showError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await api.put(`/api/staff/orders/${orderId}/status`, {
        status: newStatus,
        tenantId
      });
      showSuccess('Order status updated');
      loadOrders();
    } catch (err) {
      console.error('Update status error:', err);
      showError('Failed to update order status');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="staff-dashboard">
        <Header />
        <main className="dashboard-container">
          <div className="dashboard-card">
            <p>Please log in to view orders.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!contextLoading && !assignment) {
    return (
      <div className="staff-dashboard">
        <Header />
        <main className="dashboard-container">
          <div className="dashboard-card">
            <div className="empty-state">
              <h2>Not assigned to this business</h2>
              <p>Orders are only shown for businesses you are assigned to.</p>
              <button
                type="button"
                onClick={() => navigate('/staff/dashboard')}
                className="btn btn-secondary"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!contextLoading && assignment && !canViewOrders) {
    return (
      <div className="staff-dashboard">
        <Header />
        <main className="dashboard-container">
          <div className="dashboard-card">
            <div className="empty-state">
              <h2>Orders not available</h2>
              <p>Your staff role does not include permission to view orders.</p>
              <button
                type="button"
                onClick={() => navigate('/staff/dashboard')}
                className="btn btn-secondary"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="staff-dashboard">
      <Header />
      <main className="dashboard-container">
        <div className="dashboard-card">
          <div className="dashboard-header">
            <h1>Today&apos;s Orders</h1>
            <button
              onClick={() => navigate('/staff/dashboard')}
              className="btn btn-secondary"
            >
              ← Back to Dashboard
            </button>
          </div>

          <div className="filters">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-control"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="confirmed">Confirmed</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="shipped">Shipped</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {loading ? (
            <div className="loading-message">
              <div className="spinner"></div>
              <p>Loading orders...</p>
            </div>
          ) : todayOrders.length === 0 ? (
            <div className="empty-state" data-testid="staff-orders-empty">
              <p>No orders for today on your assigned businesses.</p>
            </div>
          ) : (
            <div className="orders-list">
              {todayOrders.map(order => (
                <div key={order.id} className="order-card">
                  <div className="order-header">
                    <div className="order-id">Order #{order.id}</div>
                    <div className={`order-status status-${order.status}`}>
                      {order.status}
                    </div>
                  </div>
                  <div className="order-details">
                    <p><strong>Customer:</strong> {order.customer_name || order.customerName}</p>
                    {order.customer_email && (
                      <p><strong>Email:</strong> <a href={`mailto:${order.customer_email || order.customerEmail}`}>{order.customer_email || order.customerEmail}</a></p>
                    )}
                    {order.customer_phone && (
                      <p><strong>Phone:</strong> <a href={`tel:${order.customer_phone || order.customerPhone}`}>{order.customer_phone || order.customerPhone}</a></p>
                    )}
                    <p><strong>Total:</strong> ${parseFloat(order.total || 0).toFixed(2)}</p>
                    {order.items && (
                      <div className="order-items">
                        <strong>Items:</strong>
                        <ul>
                          {(Array.isArray(order.items) ? order.items : []).map((item, idx) => (
                            <li key={idx}>
                              {item.name || item.product} x {item.quantity || 1}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="order-actions">
                    {order.status === 'new' && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(order.id, 'confirmed')}
                          className="btn btn-primary btn-sm"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(order.id, 'preparing')}
                          className="btn btn-secondary btn-sm"
                        >
                          Start Preparing
                        </button>
                      </>
                    )}
                    {order.status === 'preparing' && (
                      <button
                        onClick={() => handleStatusUpdate(order.id, 'ready')}
                        className="btn btn-success btn-sm"
                      >
                        Mark Ready
                      </button>
                    )}
                    {order.status === 'ready' && (
                      <button
                        onClick={() => handleStatusUpdate(order.id, 'completed')}
                        className="btn btn-success btn-sm"
                      >
                        Mark Completed
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {lastUpdated && (
            <div className="last-updated">
              Last updated: {new Date(lastUpdated).toLocaleTimeString()}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default StaffOrders;



