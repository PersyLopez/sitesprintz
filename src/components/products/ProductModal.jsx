import React, { useState, useEffect } from 'react';
import { useToast } from '../../hooks/useToast';
import ImageUploader from '../setup/forms/ImageUploader';
import './ProductModal.css';

function ProductModal({ product, onSave, onClose }) {
  const { showError } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image: '',
    stock: '',
    available: true
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price ?? '',
        category: product.category || '',
        image: product.image || '',
        stock: product.stock ?? '',
        available: product.available !== false
      });
    }
  }, [product]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name?.trim() || formData.price === '' || formData.price === null) {
      showError('Name and price are required');
      return;
    }

    const price = parseFloat(formData.price);
    if (Number.isNaN(price) || price < 0) {
      showError('Enter a valid price');
      return;
    }

    onSave({
      ...formData,
      name: formData.name.trim(),
      price,
      category: formData.category?.trim() || 'General',
      stock: formData.stock === '' || formData.stock === null
        ? null
        : parseInt(formData.stock, 10),
      available: formData.available !== false
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose} data-testid="product-modal-overlay">
      <div
        className="modal-content product-modal"
        onClick={(e) => e.stopPropagation()}
        data-testid="product-modal-content"
        role="dialog"
        aria-labelledby="product-modal-title"
      >
        <div className="modal-header">
          <h2 id="product-modal-title">{product ? 'Edit Product' : 'Add Product'}</h2>
          <button type="button" className="close-btn" onClick={onClose} data-testid="close-modal-btn" aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Product image</label>
            <ImageUploader
              value={formData.image}
              onChange={(url) => setFormData((prev) => ({ ...prev, image: url }))}
              aspectRatio="1:1"
            />
          </div>

          <div className="form-group">
            <label htmlFor="product-name">Product name *</label>
            <input
              type="text"
              id="product-name"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              data-testid="product-name-input"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="product-description">Description</label>
            <textarea
              id="product-description"
              name="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your product…"
              rows="3"
              data-testid="product-description-input"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="product-price">Price ($) *</label>
              <input
                type="number"
                id="product-price"
                name="price"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                step="0.01"
                min="0"
                data-testid="product-price-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="product-category">Category</label>
              <input
                type="text"
                id="product-category"
                name="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g. Pizzas, Drinks"
                data-testid="product-category-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="product-stock">Stock (optional)</label>
              <input
                type="number"
                id="product-stock"
                name="stock"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                placeholder="Leave blank for unlimited"
                data-testid="product-stock-input"
              />
            </div>

            <div className="form-group">
              <label className="checkbox-label" htmlFor="product-available">
                <input
                  type="checkbox"
                  id="product-available"
                  checked={formData.available}
                  onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                  data-testid="product-available-checkbox"
                />
                <span>Available for purchase</span>
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary" data-testid="cancel-product-btn">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" data-testid="save-product-btn">
              {product ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProductModal;
