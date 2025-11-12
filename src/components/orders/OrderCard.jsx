import React from 'react';
import './OrderCard.css';

function OrderCard({ order, selected, onToggleSelect, onUpdateStatus, onViewDetails }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (cents) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'new':
        return 'status-new';
      case 'completed':
        return 'status-completed';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return '';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'new':
        return '🔔';
      case 'completed':
        return '✅';
      case 'cancelled':
        return '❌';
      default:
        return '📦';
    }
  };

  return (
    <div className={`order-card ${selected ? 'selected' : ''}`}>
      <div className="order-card-header">
        <div className="order-select">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="order-checkbox"
          />
        </div>
        
        <div className="order-info">
          <div className="order-id">
            <strong>#{order.orderId}</strong>
          </div>
          <div className="order-date">
            {formatDate(order.createdAt)}
          </div>
        </div>
        
        <div className={`order-status ${getStatusClass(order.status)}`}>
          <span className="status-icon">{getStatusIcon(order.status)}</span>
          <span className="status-text">{order.status}</span>
        </div>
      </div>

      <div className="order-card-body">
        <div className="customer-info">
          <div className="customer-name">
            <span className="label">Customer:</span>
            <strong>{order.customer?.name || 'Guest'}</strong>
          </div>
          <div className="customer-email">
            <span className="label">Email:</span>
            <a href={`mailto:${order.customer?.email}`}>
              {order.customer?.email}
            </a>
          </div>
          {order.customer?.phone && (
            <div className="customer-phone">
              <span className="label">Phone:</span>
              <a href={`tel:${order.customer?.phone}`}>
                {order.customer?.phone}
              </a>
            </div>
          )}
        </div>

        <div className="order-items">
          <strong>Items:</strong>
          <ul className="items-list">
            {order.items?.map((item, index) => (
              <li key={index} className="order-item">
                <span className="item-name">{item.name || item.title}</span>
                <span className="item-quantity">×{item.quantity}</span>
                <span className="item-price">{formatCurrency(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="order-total">
          <strong>Total:</strong>
          <span className="total-amount">{formatCurrency(order.total)}</span>
        </div>
      </div>

      <div className="order-card-actions">
        <button onClick={onViewDetails} className="btn btn-secondary btn-sm">
          👁️ View Details
        </button>
        
        {order.status === 'new' && (
          <>
            <button
              onClick={() => onUpdateStatus(order.orderId, 'completed')}
              className="btn btn-success btn-sm"
            >
              ✅ Mark Completed
            </button>
            <button
              onClick={() => onUpdateStatus(order.orderId, 'cancelled')}
              className="btn btn-danger btn-sm"
            >
              ❌ Cancel
            </button>
          </>
        )}
        
        <a
          href={`mailto:${order.customer?.email}`}
          className="btn btn-primary btn-sm"
        >
          📧 Email
        </a>
        
        {order.customer?.phone && (
          <a
            href={`tel:${order.customer?.phone}`}
            className="btn btn-secondary btn-sm"
          >
            📞 Call
          </a>
        )}
      </div>
    </div>
  );
}

export default OrderCard;

