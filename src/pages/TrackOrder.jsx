import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import ProgressTimeline from '../components/tracking/ProgressTimeline';
import { usePolling } from '../hooks/usePolling';
import api from '../services/api';
import './Tracking.css';

function TrackOrder() {
  const { token } = useParams();
  const { showError } = useToast();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Poll for updates
  const { data: updates, lastUpdated } = usePolling({
    endpoint: `/api/tracking/order/${token}/updates`,
    interval: 30000,
    enabled: !!order,
    onUpdate: (newData) => {
      if (newData.status !== order?.status) {
        setOrder(prev => ({ ...prev, status: newData.status, updatedAt: newData.updatedAt }));
      }
    }
  });

  useEffect(() => {
    if (token) {
      loadOrder();
    }
  }, [token]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/tracking/order/${token}`);
      setOrder(response.order);
    } catch (err) {
      console.error('Load order error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load order';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="tracking-page">
        <Header />
        <main className="tracking-container">
          <div className="tracking-card">
            <div className="loading-message">
              <div className="spinner"></div>
              <p>Loading order details...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="tracking-page">
        <Header />
        <main className="tracking-container">
          <div className="tracking-card">
            <div className="error-message">
              <div className="error-icon">❌</div>
              <h2>Order Not Found</h2>
              <p>{error || 'The order you are looking for could not be found.'}</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Define status progression
  const statuses = [
    { id: 'pending', label: 'Order Placed', description: 'Your order has been received' },
    { id: 'confirmed', label: 'Confirmed', description: 'Your order has been confirmed' },
    { id: 'preparing', label: 'Preparing', description: 'Your order is being prepared' },
    { id: 'ready', label: 'Ready', description: 'Your order is ready' },
    { id: 'shipped', label: 'Shipped', description: 'Your order has been shipped' },
    { id: 'completed', label: 'Completed', description: 'Your order has been completed' }
  ];

  // Map order status to timeline status
  const currentStatus = order.status || 'pending';

  return (
    <div className="tracking-page">
      <Header />
      <main className="tracking-container">
        <div className="tracking-card">
          <ProgressTimeline
            title="Track Your Order"
            referenceId={order.id}
            currentStatus={currentStatus}
            statuses={statuses}
            updates={[
              {
                timestamp: order.createdAt,
                message: 'Order placed',
                status: 'pending'
              },
              ...(order.updatedAt && order.updatedAt !== order.createdAt ? [{
                timestamp: order.updatedAt,
                message: `Status updated to ${order.status}`,
                status: order.status
              }] : [])
            ]}
          />

          <div className="order-details-section">
            <h3>Order Details</h3>
            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-label">Order ID:</span>
                <span className="detail-value">{order.id}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Status:</span>
                <span className={`detail-value status-${order.status}`}>{order.status}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Total:</span>
                <span className="detail-value">${parseFloat(order.total || 0).toFixed(2)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Placed:</span>
                <span className="detail-value">
                  {new Date(order.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            {order.items && order.items.length > 0 && (
              <div className="order-items">
                <h4>Items</h4>
                <ul>
                  {order.items.map((item, index) => (
                    <li key={index}>
                      {item.name || item.product} x {item.quantity || 1}
                      {item.price && ` - $${parseFloat(item.price).toFixed(2)}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {lastUpdated && (
              <div className="last-updated">
                Last updated: {new Date(lastUpdated).toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default TrackOrder;



