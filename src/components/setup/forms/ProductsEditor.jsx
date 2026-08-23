import { useState } from 'react';
import { useSite } from '../../../hooks/useSite';
import ImageUploader from './ImageUploader';
import ImportModal from '../../products/ImportModal';
import { useToast } from '../../../hooks/useToast';
import './ProductsEditor.css';

function ProductsEditor() {
  const { siteData, updateNestedField } = useSite();
  const { showSuccess, showError } = useToast();
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);

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
    const updatedProducts = products.map((p) =>
      p.id === id ? { ...p, ...updates } : p
    );
    updateNestedField('products', updatedProducts);
  };

  const deleteProduct = (id) => {
    if (!window.confirm('Delete this product?')) return;

    const updatedProducts = products.filter((p) => p.id !== id);
    updateNestedField('products', updatedProducts);

    if (expandedProduct === id) {
      setExpandedProduct(null);
    }
  };

  const handleImport = (importedProducts, importMode = 'replace') => {
    const finalProducts = importMode === 'append'
      ? [...products, ...importedProducts]
      : importedProducts;
    updateNestedField('products', finalProducts);
    setShowImportModal(false);
    showSuccess(`Imported ${importedProducts.length} products into your draft`);
  };

  const handleExportCSV = () => {
    if (products.length === 0) {
      showError('No products to export yet');
      return;
    }
    const headers = ['name', 'description', 'price', 'category', 'image', 'stock', 'available'];
    const rows = products.map((p) =>
      headers.map((h) => {
        const val = p[h] ?? '';
        const str = String(val);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products.csv';
    a.click();
    URL.revokeObjectURL(url);
    showSuccess('CSV exported');
  };

  return (
    <div className="products-editor" data-testid="products-editor">
      <div className="editor-header">
        <div>
          <h3>Products</h3>
          <p className="editor-subtitle">
            Add items for your online catalog. Upload photos or import a CSV list.
          </p>
        </div>
        <div className="editor-header-actions">
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="btn btn-secondary btn-sm"
            data-testid="setup-import-csv-btn"
          >
            Import CSV
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="btn btn-secondary btn-sm"
            data-testid="setup-export-csv-btn"
            disabled={products.length === 0}
          >
            Export CSV
          </button>
          <button type="button" onClick={addProduct} className="btn btn-primary btn-sm" data-testid="setup-add-product-btn">
            + Add Product
          </button>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h4>No products yet</h4>
          <p>Start with one product, or import a CSV to load your whole catalog.</p>
          <div className="empty-actions">
            <button type="button" onClick={addProduct} className="btn btn-primary">
              + Add Your First Product
            </button>
            <button type="button" onClick={() => setShowImportModal(true)} className="btn btn-secondary">
              Import CSV
            </button>
          </div>
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setExpandedProduct(expandedProduct === product.id ? null : product.id);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="product-preview">
                  {product.image ? (
                    <img src={product.image} alt={product.name || 'Product'} className="product-thumb" />
                  ) : (
                    <div className="no-image">📦</div>
                  )}
                  <div className="product-info">
                    <strong>{product.name || 'Untitled Product'}</strong>
                    <span className="product-price">${product.price || '0.00'}</span>
                  </div>
                </div>
                <button className="expand-icon" type="button" aria-label="Expand product">
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
                    <label htmlFor={`name-${product.id}`}>Product Name *</label>
                    <input
                      id={`name-${product.id}`}
                      type="text"
                      value={product.name}
                      onChange={(e) => updateProduct(product.id, { name: e.target.value })}
                      placeholder="e.g., Premium Package"
                      data-testid={`product-name-${product.id}`}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor={`desc-${product.id}`}>Description</label>
                    <textarea
                      id={`desc-${product.id}`}
                      value={product.description}
                      onChange={(e) => updateProduct(product.id, { description: e.target.value })}
                      placeholder="Describe your product…"
                      rows={3}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor={`price-${product.id}`}>Price * ($)</label>
                      <input
                        id={`price-${product.id}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={product.price}
                        onChange={(e) => updateProduct(product.id, { price: e.target.value })}
                        placeholder="29.99"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor={`cat-${product.id}`}>Category</label>
                      <input
                        id={`cat-${product.id}`}
                        type="text"
                        value={product.category}
                        onChange={(e) => updateProduct(product.id, { category: e.target.value })}
                        placeholder="e.g., Services"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor={`stock-${product.id}`}>Stock (optional)</label>
                      <input
                        id={`stock-${product.id}`}
                        type="number"
                        min="0"
                        value={product.stock ?? ''}
                        onChange={(e) => updateProduct(product.id, {
                          stock: e.target.value ? parseInt(e.target.value, 10) : null
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
                      Delete Product
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="editor-tip">
        <span className="tip-icon" aria-hidden="true">💡</span>
        <div>
          <strong>Tip:</strong> After publishing, use Dashboard → Products for bulk edits,
          availability toggles, and CSV import/export anytime.
        </div>
      </div>

      {showImportModal && (
        <ImportModal
          currentProducts={products}
          onImport={handleImport}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </div>
  );
}

export default ProductsEditor;
