import React, { useEffect, useState } from 'react';
import { useCart } from '../../hooks/useCart';
import { useLocale } from '../../i18n/LocaleContext.jsx';
import { tLive } from '../../i18n/liveChrome/index.js';
import CheckoutButton from './CheckoutButton';
import { PayOnSiteConfirmation } from './PayOnSiteCheckout';
import './ShoppingCart.css';

function ShoppingCart({
  stripePublishableKey,
  siteId,
  paymentsReady = false,
  payOnSite = false,
  deliveryConfig = null,
}) {
  const { locale } = useLocale();
  const t = (key, vars) => tLive(locale, key, vars);
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
  const [placedOrder, setPlacedOrder] = useState(null);

  useEffect(() => {
    if (cartItems.length > 0) setPlacedOrder(null);
  }, [cartItems.length]);

  useEffect(() => {
    if (!isCartOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setIsCartOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isCartOpen, setIsCartOpen]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  return (
    <>
      <button
        type="button"
        className={`cart-toggle-btn ${itemCount > 0 ? 'has-items' : ''}`}
        onClick={() => setIsCartOpen(!isCartOpen)}
        aria-label={t('cartToggle')}
        aria-expanded={isCartOpen}
        aria-controls="ss-cart-panel"
        data-testid="cart-toggle-button"
      >
        🛒
        {itemCount > 0 && (
          <span className="cart-badge" data-testid="cart-item-count">{itemCount}</span>
        )}
      </button>

      <div
        className={`cart-sidebar ${isCartOpen ? 'open' : ''}`}
        data-testid="cart-sidebar"
        inert={!isCartOpen ? true : undefined}
      >
        {isCartOpen ? (
          <div className="cart-overlay" onClick={() => setIsCartOpen(false)} data-testid="cart-overlay" />
        ) : null}

        <div
          className="cart-panel"
          id="ss-cart-panel"
          data-testid="cart-panel"
          role="dialog"
          aria-modal={isCartOpen}
          aria-hidden={!isCartOpen}
          aria-label={t('cartLabel')}
        >
          <div className="cart-header">
            <h3>{t('yourCart')}</h3>
            <button
              type="button"
              className="cart-close-btn"
              onClick={() => setIsCartOpen(false)}
              aria-label={t('closeCart')}
              data-testid="cart-close-button"
            >
              ✕
            </button>
          </div>

          <div className="cart-body">
            {placedOrder ? (
              <div className="cart-footer" data-testid="cart-footer">
                <PayOnSiteConfirmation confirmation={placedOrder} />
                <button
                  type="button"
                  onClick={() => {
                    setPlacedOrder(null);
                    setIsCartOpen(false);
                  }}
                  className="cart-continue-btn"
                  data-testid="continue-shopping-button"
                >
                  {t('continueShopping')}
                </button>
              </div>
            ) : (
              <>
                <div className="cart-items" data-testid="cart-items-container">
                  {cartItems.length === 0 ? (
                    <div className="cart-empty" data-testid="cart-empty-state">
                      <div className="empty-icon">🛍️</div>
                      <p>{t('cartEmpty')}</p>
                      <button
                        type="button"
                        onClick={() => setIsCartOpen(false)}
                        className="cart-continue-btn"
                        data-testid="continue-shopping-empty"
                      >
                        {t('cartEmptyBtn')}
                      </button>
                    </div>
                  ) : (
                    <>
                      {cartItems.map((item, index) => (
                        <div key={`${item.id}-${index}`} className="cart-item" data-testid="cart-item">
                          {item.image && (
                            <div className="cart-item-image">
                              <img src={item.image} alt={item.name} data-testid="cart-item-image" />
                            </div>
                          )}

                          <div className="cart-item-details">
                            <h4 data-testid="cart-item-name">{item.name}</h4>

                            {item.options && Object.keys(item.options).length > 0 && (
                              <div className="cart-item-options" data-testid="cart-item-options">
                                {Object.entries(item.options).map(([key, value]) => (
                                  <span key={key} className="option-tag">
                                    {key}: {value}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="cart-item-price" data-testid="cart-item-price">
                              {formatPrice(item.price)}
                            </div>

                            <div className="quantity-controls" data-testid="cart-item-quantity-controls">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, item.quantity - 1, item.options)}
                                className="qty-btn"
                                aria-label={t('cartDecrease')}
                                data-testid="cart-item-decrease-qty"
                              >
                                -
                              </button>
                              <span className="qty-display" data-testid="cart-item-quantity">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, item.quantity + 1, item.options)}
                                className="qty-btn"
                                aria-label={t('cartIncrease')}
                                data-testid="cart-item-increase-qty"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id, item.options)}
                            className="cart-item-remove"
                            aria-label={t('cartRemove')}
                            data-testid="cart-item-remove"
                          >
                            🗑️
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={clearCart}
                        className="clear-cart-btn"
                        data-testid="clear-cart-button"
                      >
                        {t('clearCart')}
                      </button>
                    </>
                  )}
                </div>

                {cartItems.length > 0 && (
                  <div className="cart-footer" data-testid="cart-footer">
                    <div className="cart-total" data-testid="cart-total">
                      <span>{t('subtotal')}</span>
                      <strong data-testid="cart-total-amount">{formatPrice(total)}</strong>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsCartOpen(false)}
                      className="cart-continue-btn"
                      data-testid="continue-shopping-button"
                    >
                      {t('continueShopping')}
                    </button>

                    <CheckoutButton
                      stripePublishableKey={stripePublishableKey}
                      siteId={siteId}
                      buttonText={t('proceedToCheckout')}
                      paymentsReady={paymentsReady}
                      payOnSite={payOnSite}
                      deliveryConfig={deliveryConfig}
                      onConfirmed={setPlacedOrder}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default ShoppingCart;
