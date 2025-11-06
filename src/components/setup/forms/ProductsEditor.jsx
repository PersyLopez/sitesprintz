import React, { useState } from 'react';
import { useSite } from '../../../hooks/useSite';
import ImageUploader from './ImageUploader';
import './ProductsEditor.css';

function ProductsEditor() {
  const { siteData, updateNestedField } = useSite();
  const [expandedProduct, setExpandedProduct] = useState(null);

  const products = siteData.products || [];

  const addProduct = () => {
    const newProduct = {
      id: `product-${Date.now()}`,
      name: '',
      description: '',
      price: '',
      category: '',
      image: '',
      stock: null,
      available: true
    };
    
    updateNestedField('products', [...products, newProduct]);
    setExpandedProduct(newProduct.id);
  };

  const updateProduct = (id, updates) => {
    const updatedProducts = products.map(p =>
      p.id === id ? { ...p, ...updates } : p
    );
    updateNestedField('products', updatedProducts);
  };

  const deleteProduct = (id) => {
    if (!window.confirm('Delete this product?')) return;
    
    const updatedProducts = products.filter(p => p.id !== id);
    updateNestedField('products', updatedProducts);
    
    if (expandedProduct === id) {
      setExpandedProduct(null);
    }
  };

  return (
    <div className="products-editor">
      <div className="editor-header">
        <div>
          <h3>🛍️ Products</h3>
          <p className="editor-subtitle">Manage your products for online sales</p>
        </div>
        <button onClick={addProduct} className="btn btn-primary btn-sm">
          + Add Product
        </button>
      </div>

      {products.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h4>No products yet</h4>
          <p>Add your first product to start selling online</p>
          <button onClick={addProduct} className="btn btn-primary">
            + Add Your First Product
          </button>
        </div>
      ) : (
        <div className="products-list">
          {products.map((product) => (
            <div 
              key={product.id} 
              className={`product-item ${expandedProduct === product.id ? 'expanded' : ''}`}
            >
              <div 
                className="product-header"
                onClick={() => setExpandedProduct(
                  expandedProduct === product.id ? null : product.id
                )}
              >
                <div className="product-preview">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="product-thumb" />
                  ) : (
                    <div className="no-image">📦</div>
                  )}
                  <div className="product-info">
                    <strong>{product.name || 'Untitled Product'}</strong>
                    <span className="product-price">${product.price || '0.00'}</span>
                  </div>
                </div>
                <button className="expand-icon" type="button">
                  {expandedProduct === product.id ? '▼' : '▶'}
                </button>
              </div>

              {expandedProduct === product.id && (
                <div className="product-form">
                  <div className="form-group">
                    <label>Product Image</label>
                    <ImageUploader
                      value={product.image}
                      onChange={(url) => updateProduct(product.id, { image: url })}
                      aspectRatio="1:1"
                    />
                  </div>

                  <div className="form-group">
                    <label>Product Name *</label>
                    <input
                      type="text"
                      value={product.name}
                      onChange={(e) => updateProduct(product.id, { name: e.target.value })}
                      placeholder="e.g., Premium Package"
                    />
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      value={product.description}
                      onChange={(e) => updateProduct(product.id, { description: e.target.value })}
                      placeholder="Describe your product..."
                      rows={3}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Price * ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={product.price}
                        onChange={(e) => updateProduct(product.id, { price: e.target.value })}
                        placeholder="29.99"
                      />
                    </div>

                    <div className="form-group">
                      <label>Category</label>
                      <input
                        type="text"
                        value={product.category}
                        onChange={(e) => updateProduct(product.id, { category: e.target.value })}
                        placeholder="e.g., Services"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Stock (optional)</label>
                      <input
                        type="number"
                        min="0"
                        value={product.stock || ''}
                        onChange={(e) => updateProduct(product.id, { 
                          stock: e.target.value ? parseInt(e.target.value) : null 
                        })}
                        placeholder="Leave empty for unlimited"
                      />
                      <small className="form-help">Leave blank for unlimited stock</small>
                    </div>

                    <div className="form-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={product.available !== false}
                          onChange={(e) => updateProduct(product.id, { available: e.target.checked })}
                        />
                        <span>Available for purchase</span>
                      </label>
                    </div>
                  </div>

                  <div className="product-actions">
                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="btn btn-danger btn-sm"
                      type="button"
                    >
                      🗑️ Delete Product
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="editor-tip">
        <span className="tip-icon">💡</span>
        <div>
          <strong>Pro Feature:</strong> Products will appear on your site with "Add to Cart" buttons. 
          Make sure to configure your payment settings in the Payments tab.
        </div>
      </div>
    </div>
  );
}

export default ProductsEditor;

