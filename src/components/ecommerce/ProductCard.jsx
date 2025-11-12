import React, { useState } from 'react';
import { useCart } from '../../hooks/useCart';
import './ProductCard.css';

function ProductCard({ product, showActions = true }) {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState({});

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const handleAddToCart = () => {
    addToCart(product, quantity, selectedOptions);
    setQuantity(1); // Reset quantity after adding
    setSelectedOptions({}); // Reset options
  };

  const handleOptionChange = (optionName, value) => {
    setSelectedOptions(prev => ({
      ...prev,
      [optionName]: value
    }));
  };

  const isRecurring = product.billingPeriod && product.billingPeriod !== 'one-time';
  const isAvailable = product.available !== false && (product.stock === undefined || product.stock > 0);

  return (
    <div className={`product-card ${!isAvailable ? 'out-of-stock' : ''}`}>
      {/* Product Image */}
      <div className="product-image">
        {product.image ? (
          <img src={product.image} alt={product.name} />
        ) : (
          <div className="product-image-placeholder">
            <span>📦</span>
          </div>
        )}

        {/* Badges */}
        <div className="product-badges">
          {isRecurring && (
            <span className="badge badge-recurring">
              🔁 {product.billingPeriod}
            </span>
          )}
          {!isAvailable && (
            <span className="badge badge-out-of-stock">
              Out of Stock
            </span>
          )}
          {product.featured && (
            <span className="badge badge-featured">
              ⭐ Featured
            </span>
          )}
        </div>
      </div>

      {/* Product Info */}
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        
        {product.description && (
          <p className="product-description">{product.description}</p>
        )}

        {/* Category */}
        {product.category && (
          <span className="product-category">{product.category}</span>
        )}

        {/* Price */}
        <div className="product-price">
          <span className="price-amount">{formatPrice(product.price)}</span>
          {isRecurring && (
            <span className="price-period">/ {product.billingPeriod}</span>
          )}
          
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <span className="price-compare">
              {formatPrice(product.compareAtPrice)}
            </span>
          )}
        </div>

        {/* Options (Variants) */}
        {product.options && product.options.length > 0 && showActions && (
          <div className="product-options">
            {product.options.map((option, index) => (
              <div key={index} className="option-group">
                <label className="option-label">{option.name}:</label>
                <select
                  className="option-select"
                  value={selectedOptions[option.name] || ''}
                  onChange={(e) => handleOptionChange(option.name, e.target.value)}
                >
                  <option value="">Select {option.name}</option>
                  {option.values.map((value, idx) => (
                    <option key={idx} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        {/* Stock Info */}
        {product.stock !== undefined && product.stock > 0 && product.stock <= 10 && (
          <div className="stock-warning">
            ⚠️ Only {product.stock} left in stock
          </div>
        )}

        {/* Actions */}
        {showActions && isAvailable && (
          <div className="product-actions">
            {/* Quantity Selector */}
            <div className="quantity-selector">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="qty-btn"
                aria-label="Decrease quantity"
              >
                -
              </button>
              <span className="qty-display">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="qty-btn"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>

            {/* Add to Cart Button */}
            <button
              onClick={handleAddToCart}
              className="btn btn-primary add-to-cart-btn"
            >
              🛒 Add to Cart
            </button>
          </div>
        )}

        {!isAvailable && showActions && (
          <button className="btn btn-disabled" disabled>
            Out of Stock
          </button>
        )}
      </div>
    </div>
  );
}

export default ProductCard;

