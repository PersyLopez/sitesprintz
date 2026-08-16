import React from 'react';
import { useCart } from '../../hooks/useCart';
import CheckoutButton from './CheckoutButton';
import './ShoppingCart.css';

function ShoppingCart({ stripePublishableKey, siteId, paymentsReady = false, payOnSite = false }) {
  const {
    cartItems,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
    clearCart,
    getCartTotal,
    getItemCount
  } = useCart();

  const itemCount = getItemCount();
  const total = getCartTotal();

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  return (
    <>
      {/* Cart Toggle Button */}
      <button
        className={`cart-toggle-btn ${itemCount > 0 ? 'has-items' : ''}`}
        onClick={() => setIsCartOpen(!isCartOpen)}
        aria-label="Shopping Cart"
        data-testid="cart-toggle-button"
      >
        🛒
        {itemCount > 0 && (
          <span className="cart-badge" data-testid="cart-item-count">{itemCount}</span>
        )}
      </button>

      {/* Cart Sidebar */}
      <div className={`cart-sidebar ${isCartOpen ? 'open' : ''}`} data-testid="cart-sidebar">
        <div className="cart-overlay" onClick={() => setIsCartOpen(false)} data-testid="cart-overlay" />
        
        <div className="cart-panel" data-testid="cart-panel">
          {/* Header */}
          <div className="cart-header">
            <h3>🛒 Shopping Cart</h3>
            <button
              className="cart-close-btn"
              onClick={() => setIsCartOpen(false)}
              aria-label="Close Cart"
              data-testid="cart-close-button"
            >
              ✕
            </button>
          </div>

          {/* Cart Items */}
          <div className="cart-items" data-testid="cart-items-container">
            {cartItems.length === 0 ? (
              <div className="cart-empty" data-testid="cart-empty-state">
                <div className="empty-icon">🛍️</div>
                <p>Your cart is empty</p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="btn btn-secondary"
                  data-testid="continue-shopping-empty"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              <>
                {cartItems.map((item, index) => (
                  <div key={`${item.id}-${index}`} className="cart-item" data-testid="cart-item">
                    {/* Item Image */}
                    {item.image && (
                      <div className="cart-item-image">
                        <img src={item.image} alt={item.name} data-testid="cart-item-image" />
                      </div>
                    )}

                    {/* Item Details */}
                    <div className="cart-item-details">
                      <h4 data-testid="cart-item-name">{item.name}</h4>
                      
                      {/* Options */}
                      {item.options && Object.keys(item.options).length > 0 && (
                        <div className="cart-item-options" data-testid="cart-item-options">
                          {Object.entries(item.options).map(([key, value]) => (
                            <span key={key} className="option-tag">
                              {key}: {value}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Price */}
                      <div className="cart-item-price" data-testid="cart-item-price">
                        {formatPrice(item.price)}
                      </div>

                      {/* Quantity Controls */}
                      <div className="quantity-controls" data-testid="cart-item-quantity-controls">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1, item.options)}
                          className="qty-btn"
                          aria-label="Decrease quantity"
                          data-testid="cart-item-decrease-qty"
                        >
                          -
                        </button>
                        <span className="qty-display" data-testid="cart-item-quantity">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1, item.options)}
                          className="qty-btn"
                          aria-label="Increase quantity"
                          data-testid="cart-item-increase-qty"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => removeFromCart(item.id, item.options)}
                      className="cart-item-remove"
                      aria-label="Remove item"
                      data-testid="cart-item-remove"
                    >
                      🗑️
                    </button>
                  </div>
                ))}

                {/* Clear Cart */}
                {cartItems.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="clear-cart-btn"
                    data-testid="clear-cart-button"
                  >
                    Clear Cart
                  </button>
                )}
              </>
            )}
          </div>

          {/* Cart Footer */}
          {cartItems.length > 0 && (
            <div className="cart-footer" data-testid="cart-footer">
              <div className="cart-total" data-testid="cart-total">
                <span>Subtotal:</span>
                <strong data-testid="cart-total-amount">{formatPrice(total)}</strong>
              </div>

              <CheckoutButton
                stripePublishableKey={stripePublishableKey}
                siteId={siteId}
                buttonText="Proceed to Checkout"
                paymentsReady={paymentsReady}
                payOnSite={payOnSite}
              />

              <button
                onClick={() => setIsCartOpen(false)}
                className="btn btn-secondary btn-block"
                data-testid="continue-shopping-button"
              >
                Continue Shopping
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default ShoppingCart;

