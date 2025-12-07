import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import ProductModal from '../components/products/ProductModal';
import ImportModal from '../components/products/ImportModal';
import './Products.css';

function Products() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [siteId, setSiteId] = useState(null);
  const [siteName, setSiteName] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    const id = searchParams.get('siteId');
    if (id) {
      setSiteId(id);
      loadProducts(id);
      loadSiteInfo(id);
    } else {
      showError('No site selected');
      setLoading(false);
    }
  }, [searchParams]);

  const loadProducts = async (id) => {
    setLoading(true);

    try {
      const response = await fetch(`/api/sites/${id}/products`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load products');
      }

      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Load products error:', error);
      showError('Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSiteInfo = async (id) => {
    try {
      const response = await fetch(`/api/sites/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSiteName(data.name || 'Your Site');
      }
    } catch (error) {
      console.error('Load site info error:', error);
    }
  };

  const handleSaveProduct = async (productData) => {
    try {
      let updatedProducts;

      if (editingProduct) {
        // Update existing product
        updatedProducts = products.map(p =>
          p.id === editingProduct.id ? { ...productData, id: p.id } : p
        );
      } else {
        // Add new product
        const newProduct = {
          ...productData,
          id: Date.now() + Math.random().toString(36).substr(2, 9)
        };
        updatedProducts = [...products, newProduct];
      }

      // Save to server
      const response = await fetch(`/api/sites/${siteId}/products`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ products: updatedProducts })
      });

      if (!response.ok) {
        throw new Error('Failed to save product');
      }

      setProducts(updatedProducts);
      setShowProductModal(false);
      setEditingProduct(null);
      showSuccess(editingProduct ? 'Product updated!' : 'Product added!');
    } catch (error) {
      console.error('Save product error:', error);
      showError('Failed to save product');
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowProductModal(true);
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Delete this product?')) return;

    try {
      const updatedProducts = products.filter(p => p.id !== productId);

      const response = await fetch(`/api/sites/${siteId}/products`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ products: updatedProducts })
      });

      if (!response.ok) {
        throw new Error('Failed to delete product');
      }

      setProducts(updatedProducts);
      showSuccess('Product deleted');
    } catch (error) {
      console.error('Delete product error:', error);
      showError('Failed to delete product');
    }
  };

  const handleToggleAvailability = async (productId) => {
    try {
      const updatedProducts = products.map(p =>
        p.id === productId ? { ...p, available: !p.available } : p
      );

      const response = await fetch(`/api/sites/${siteId}/products`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ products: updatedProducts })
      });

      if (!response.ok) {
        throw new Error('Failed to update availability');
      }

      setProducts(updatedProducts);
      showSuccess('Availability updated');
    } catch (error) {
      console.error('Toggle availability error:', error);
      showError('Failed to update availability');
    }
  };

  const handleDuplicateProduct = async (product) => {
    const duplicate = {
      ...product,
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      name: `${product.name} (Copy)`
    };

    try {
      const updatedProducts = [...products, duplicate];

      const response = await fetch(`/api/sites/${siteId}/products`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ products: updatedProducts })
      });

      if (!response.ok) {
        throw new Error('Failed to duplicate product');
      }

      setProducts(updatedProducts);
      showSuccess('Product duplicated');
    } catch (error) {
      console.error('Duplicate product error:', error);
      showError('Failed to duplicate product');
    }
  };

  const handleExportCSV = () => {
    if (products.length === 0) {
      showError('No products to export');
      return;
    }

    let csv = 'name,description,price,category,image,available\n';

    products.forEach(p => {
      csv += `"${p.name}","${p.description || ''}",${p.price},"${p.category || 'General'}","${p.image || ''}",${p.available !== false}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `products-${siteName}-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    showSuccess(`Exported ${products.length} products to CSV`);
  };

  const handleImportComplete = async (importedProducts, mode) => {
    try {
      let finalProducts;

      if (mode === 'replace') {
        finalProducts = importedProducts;
      } else {
        finalProducts = [...products, ...importedProducts];
      }

      const response = await fetch(`/api/sites/${siteId}/products`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ products: finalProducts })
      });

      if (!response.ok) {
        throw new Error('Failed to import products');
      }

      setProducts(finalProducts);
      setShowImportModal(false);
      showSuccess(`Successfully imported ${importedProducts.length} products!`);
    } catch (error) {
      console.error('Import error:', error);
      showError('Failed to import products');
      throw error;
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...new Set(products.map(p => p.category || 'General'))];

  return (
    <div className="products-page">
      <Header />

      <main className="products-container">
        <div className="products-header">
          <div className="header-content">
            <h1>📦 Products - {siteName}</h1>
            <p>{products.length} total products</p>
          </div>

          <div className="header-actions">
            <button onClick={() => setShowImportModal(true)} className="btn btn-secondary">
              📤 Import CSV
            </button>
            <button onClick={handleExportCSV} className="btn btn-secondary">
              📥 Export CSV
            </button>
            <button onClick={() => {
              setEditingProduct(null);
              setShowProductModal(true);
            }} className="btn btn-primary">
              ➕ Add Product
            </button>
            <Link to="/dashboard" className="btn btn-secondary">
              ← Dashboard
            </Link>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="products-filters">
          <input
            type="text"
            placeholder="🔍 Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="filter-select"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading products...</p>
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="products-grid">
            {filteredProducts.map(product => (
              <div key={product.id} className="product-card">
                <img
                  src={product.image || 'https://via.placeholder.com/280x200?text=No+Image'}
                  alt={product.name}
                  className="product-image"
                  onError={(e) => e.target.src = 'https://via.placeholder.com/280x200?text=No+Image'}
                />
                <div className="product-body">
                  <div className="product-name">{product.name}</div>
                  <div className="product-description">
                    {product.description || 'No description'}
                  </div>
                  <div className="product-meta">
                    <div className="product-price">${product.price.toFixed(2)}</div>
                    <div className="product-category">{product.category || 'General'}</div>
                  </div>
                  <div className={`product-status ${product.available !== false ? 'status-available' : 'status-unavailable'}`}>
                    {product.available !== false ? '✅ Available' : '❌ Unavailable'}
                  </div>
                  <div className="product-actions">
                    <button
                      onClick={() => handleToggleAvailability(product.id)}
                      className="btn-icon"
                      title="Toggle Availability"
                    >
                      {product.available !== false ? '👁️' : '🚫'}
                    </button>
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="btn-icon btn-primary edit-button"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDuplicateProduct(product)}
                      className="btn-icon btn-secondary"
                      title="Duplicate"
                    >
                      📋
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="btn-icon btn-danger delete-button"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🍽️</div>
            <h2>No products yet</h2>
            <p>Add your first product or import from CSV to get started!</p>
            <div className="empty-actions">
              <button onClick={() => {
                setEditingProduct(null);
                setShowProductModal(true);
              }} className="btn btn-primary">
                ➕ Add Product
              </button>
              <button onClick={() => setShowImportModal(true)} className="btn btn-secondary">
                📤 Import CSV
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />

      {/* Modals */}
      {showProductModal && (
        <ProductModal
          product={editingProduct}
          onSave={handleSaveProduct}
          onClose={() => {
            setShowProductModal(false);
            setEditingProduct(null);
          }}
        />
      )}

      {showImportModal && (
        <ImportModal
          currentProducts={products}
          onImport={handleImportComplete}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </div>
  );
}

export default Products;

