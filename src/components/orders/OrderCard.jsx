import React from 'react';
import {
  isOwnerActionableOrder,
  ownerMarkCompleteApiStatus,
  ownerCancelApiStatus,
  formatOwnerOrderStatusLabel,
  ownerOrderStatusCssClass,
  ownerOrderStatusIcon,
} from '../../utils/orderOwnerStatus';
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

  const statusLabel = formatOwnerOrderStatusLabel(order.status);

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
        
        <div className={`order-status ${ownerOrderStatusCssClass(order.status)}`}>
          <span className="status-icon">{ownerOrderStatusIcon(order.status)}</span>
          <span className="status-text">{statusLabel}</span>
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
        <button type="button" onClick={onViewDetails} className="btn btn-secondary btn-sm">
          👁️ View Details
        </button>
        
        {isOwnerActionableOrder(order) && (
          <>
            <button
              type="button"
              onClick={() => onUpdateStatus(order.orderId, ownerMarkCompleteApiStatus())}
              className="btn btn-success btn-sm"
            >
              ✅ Mark Completed
            </button>
            <button
              type="button"
              onClick={() => onUpdateStatus(order.orderId, ownerCancelApiStatus())}
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
