import React from 'react';
import {
  isOwnerActionableOrder,
  ownerMarkCompleteApiStatus,
  ownerCancelApiStatus,
  formatOwnerOrderStatusLabel,
  ownerOrderStatusCssClass,
} from '../../utils/orderOwnerStatus';
import './OrderDetailsModal.css';

function OrderDetailsModal({ order, onClose, onUpdateStatus }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (cents) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const statusLabel = formatOwnerOrderStatusLabel(order.status);

  const handleStatusUpdate = (newStatus) => {
    onUpdateStatus(order.orderId, newStatus);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content order-details-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose}>×</button>
        
        <div className="modal-header">
          <h2>Order Details</h2>
          <div className={`order-status-badge ${ownerOrderStatusCssClass(order.status)}`}>
            {statusLabel}
          </div>
        </div>

        <div className="modal-body">
          <div className="detail-section">
            <h3>📦 Order Information</h3>
            <div className="detail-grid">
              <div className="detail-row">
                <span className="detail-label">Order ID:</span>
                <span className="detail-value"><strong>#{order.orderId}</strong></span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Date:</span>
                <span className="detail-value">{formatDate(order.createdAt)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status:</span>
                <span className="detail-value">
                  <span className={`status-pill ${ownerOrderStatusCssClass(order.status)}`}>
                    {statusLabel}
                  </span>
                </span>
              </div>
              <div className="detail-row" data-testid="order-detail-fulfillment">
                <span className="detail-label">Fulfillment:</span>
                <span className="detail-value">
                  {order.fulfillmentType === 'delivery' ? 'Delivery' : 'Pickup'}
                </span>
              </div>
              {order.fulfillmentType === 'delivery' && order.shippingAddress?.composed && (
                <div className="detail-row" data-testid="order-detail-delivery-address">
                  <span className="detail-label">Deliver to:</span>
                  <span className="detail-value">{order.shippingAddress.composed}</span>
                </div>
              )}
              {order.deliveryFee != null && order.deliveryFee > 0 && (
                <div className="detail-row">
                  <span className="detail-label">Delivery fee:</span>
                  <span className="detail-value">{formatCurrency(order.deliveryFee)}</span>
                </div>
              )}
              {order.paymentId && (
                <div className="detail-row">
                  <span className="detail-label">Payment ID:</span>
                  <span className="detail-value">{order.paymentId}</span>
                </div>
              )}
            </div>
          </div>

          <div className="detail-section">
            <h3>👤 Customer Information</h3>
            <div className="detail-grid">
              <div className="detail-row">
                <span className="detail-label">Name:</span>
                <span className="detail-value"><strong>{order.customer?.name || 'N/A'}</strong></span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Email:</span>
                <span className="detail-value">
                  <a href={`mailto:${order.customer?.email}`}>{order.customer?.email}</a>
                </span>
              </div>
              {order.customer?.phone && (
                <div className="detail-row">
                  <span className="detail-label">Phone:</span>
                  <span className="detail-value">
                    <a href={`tel:${order.customer?.phone}`}>{order.customer?.phone}</a>
                  </span>
                </div>
              )}
              {order.customer?.address && (
                <div className="detail-row full-width">
                  <span className="detail-label">Address:</span>
                  <span className="detail-value">{order.customer?.address}</span>
                </div>
              )}
            </div>
          </div>

          <div className="detail-section">
            <h3>🛒 Order Items</h3>
            <div className="items-table">
              <div className="items-table-header">
                <span>Item</span>
                <span>Qty</span>
                <span>Price</span>
                <span>Total</span>
              </div>
              {order.items?.map((item, index) => (
                <div key={index} className="items-table-row">
                  <span className="item-name">
                    {item.name || item.title}
                    {item.description && (
                      <small className="item-description">{item.description}</small>
                    )}
                  </span>
                  <span className="item-quantity">×{item.quantity}</span>
                  <span className="item-price">{formatCurrency(item.price)}</span>
                  <span className="item-total">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            
            <div className="order-summary">
              <div className="summary-row">
                <span>Subtotal:</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
              {order.tax && (
                <div className="summary-row">
                  <span>Tax:</span>
                  <span>{formatCurrency(order.tax)}</span>
                </div>
              )}
              {order.shipping && (
                <div className="summary-row">
                  <span>Shipping:</span>
                  <span>{formatCurrency(order.shipping)}</span>
                </div>
              )}
              <div className="summary-row total-row">
                <strong>Total:</strong>
                <strong className="total-amount">{formatCurrency(order.total)}</strong>
              </div>
            </div>
          </div>

          {order.notes && (
            <div className="detail-section">
              <h3>📝 Order Notes</h3>
              <div className="notes-box">
                {order.notes}
              </div>
            </div>
          )}

          {isOwnerActionableOrder(order) && (
            <div className="detail-section">
              <h3>⚡ Actions</h3>
              <div className="action-buttons">
                <button
                  type="button"
                  onClick={() => handleStatusUpdate(ownerMarkCompleteApiStatus())}
                  className="btn btn-success"
                >
                  ✅ Mark as Completed
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusUpdate(ownerCancelApiStatus())}
                  className="btn btn-danger"
                >
                  ❌ Cancel Order
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <a
            href={`mailto:${order.customer?.email}`}
            className="btn btn-primary"
          >
            📧 Email Customer
          </a>
          {order.customer?.phone && (
            <a
              href={`tel:${order.customer?.phone}`}
              className="btn btn-secondary"
            >
              📞 Call Customer
            </a>
          )}
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default OrderDetailsModal;
