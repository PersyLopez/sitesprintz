import React from 'react';
import { useCart } from '../../hooks/useCart';
import CheckoutButton from './CheckoutButton';
import './ShoppingCart.css';

function ShoppingCart({ stripePublishableKey, siteId }) {
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
      >
        🛒
        {itemCount > 0 && (
          <span className="cart-badge">{itemCount}</span>
        )}
      </button>

      {/* Cart Sidebar */}
      <div className={`cart-sidebar ${isCartOpen ? 'open' : ''}`}>
        <div className="cart-overlay" onClick={() => setIsCartOpen(false)} />
        
        <div className="cart-panel">
          {/* Header */}
          <div className="cart-header">
            <h3>🛒 Shopping Cart</h3>
            <button
              className="cart-close-btn"
              onClick={() => setIsCartOpen(false)}
              aria-label="Close Cart"
            >
              ✕
            </button>
          </div>

          {/* Cart Items */}
          <div className="cart-items">
            {cartItems.length === 0 ? (
              <div className="cart-empty">
                <div className="empty-icon">🛍️</div>
                <p>Your cart is empty</p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="btn btn-secondary"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              <>
                {cartItems.map((item, index) => (
                  <div key={`${item.id}-${index}`} className="cart-item">
                    {/* Item Image */}
                    {item.image && (
                      <div className="cart-item-image">
                        <img src={item.image} alt={item.name} />
                      </div>
                    )}

                    {/* Item Details */}
                    <div className="cart-item-details">
                      <h4>{item.name}</h4>
                      
                      {/* Options */}
                      {item.options && Object.keys(item.options).length > 0 && (
                        <div className="cart-item-options">
                          {Object.entries(item.options).map(([key, value]) => (
                            <span key={key} className="option-tag">
                              {key}: {value}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Price */}
                      <div className="cart-item-price">
                        {formatPrice(item.price)}
                      </div>

                      {/* Quantity Controls */}
                      <div className="quantity-controls">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1, item.options)}
                          className="qty-btn"
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="qty-display">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1, item.options)}
                          className="qty-btn"
                          aria-label="Increase quantity"
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
                  >
                    Clear Cart
                  </button>
                )}
              </>
            )}
          </div>

          {/* Cart Footer */}
          {cartItems.length > 0 && (
            <div className="cart-footer">
              <div className="cart-total">
                <span>Subtotal:</span>
                <strong>{formatPrice(total)}</strong>
              </div>

              <CheckoutButton
                stripePublishableKey={stripePublishableKey}
                siteId={siteId}
                buttonText="Proceed to Checkout"
              />

              <button
                onClick={() => setIsCartOpen(false)}
                className="btn btn-secondary btn-block"
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

