import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useSiteWorkspace } from '../context/SiteWorkspaceContext';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import ProductModal from '../components/products/ProductModal';
import ImportModal from '../components/products/ImportModal';
import DeleteConfirmModal from '../components/products/DeleteConfirmModal';
import PaymentStatusCard from '../components/ecommerce/PaymentStatusCard';
import { OptimizedImage } from '../components/common/OptimizedImage';
import { api } from '../services/api';
import './Products.css';

function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();
  const { embedded, siteId: workspaceSiteId } = useSiteWorkspace();

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [sites, setSites] = useState([]);
  const [siteId, setSiteId] = useState(null);
  const [siteName, setSiteName] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [needsSitePick, setNeedsSitePick] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadProducts = useCallback(async (id) => {
    setLoading(true);
    try {
      const data = await api.get(`/api/sites/${id}/products`);
      setProducts(data.products || []);
    } catch (error) {
      console.error('Load products error:', error);
      showError('Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const loadSiteInfo = useCallback(async (id) => {
    try {
      const data = await api.get(`/api/sites/${id}`);
      const site = data.site || data;
      const recordName = site.businessName || site.name || site.data?.businessName || site.site_data?.businessName;
      setSiteName(recordName || 'Your Site');
    } catch (error) {
      console.error('Load site info error:', error);
      setSiteName('Your Site');
    }
  }, []);

  const selectSite = useCallback((id) => {
    setSiteId(id);
    setNeedsSitePick(false);
    if (!workspaceSiteId && searchParams.get('siteId') !== id) {
      setSearchParams({ siteId: id }, { replace: true });
    }
    loadProducts(id);
    loadSiteInfo(id);
  }, [searchParams, setSearchParams, loadProducts, loadSiteInfo, workspaceSiteId]);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;
    const paramId = workspaceSiteId || searchParams.get('siteId');

    (async () => {
      try {
        const data = await api.get('/api/sites');
        const list = data.sites || data || [];
        if (cancelled) return;
        const sitesList = Array.isArray(list) ? list : [];
        setSites(sitesList);

        if (paramId) {
          selectSite(paramId);
          return;
        }

        const published = sitesList.filter((s) => s.status === 'published');
        const candidates = published.length > 0 ? published : sitesList;

        if (candidates.length === 1) {
          selectSite(candidates[0].id);
        } else if (candidates.length > 1) {
          setNeedsSitePick(true);
          setLoading(false);
        } else {
          showError('Create or publish a site before managing products');
          setLoading(false);
        }
      } catch (error) {
        console.error('Resolve sites error:', error);
        if (!cancelled) {
          showError('Could not load your sites');
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [authLoading, workspaceSiteId, searchParams.get('siteId')]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveProduct = async (productData) => {
    try {
      let updatedProducts;

      if (editingProduct) {
        updatedProducts = products.map((p) =>
          p.id === editingProduct.id ? { ...productData, id: p.id } : p
        );
      } else {
        const newProduct = {
          ...productData,
          id: `product-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
        };
        updatedProducts = [...products, newProduct];
      }

      const data = await api.put(`/api/sites/${siteId}/products`, { products: updatedProducts });
      setProducts(data.products || updatedProducts);
      setShowProductModal(false);
      setEditingProduct(null);
      showSuccess(editingProduct ? 'Product updated!' : 'Product added!');
    } catch (error) {
      console.error('Save product error:', error);
      showError(error.message || 'Failed to save product');
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowProductModal(true);
  };

  const handleDeleteProduct = (productId) => {
    const product = products.find((p) => p.id === productId);
    setProductToDelete(product || null);
  };

  const handleCancelDelete = () => {
    setProductToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete || !siteId) return;

    setIsDeleting(true);
    try {
      const updatedProducts = products.filter((p) => p.id !== productToDelete.id);
      await api.put(`/api/sites/${siteId}/products`, { products: updatedProducts });
      setProducts(updatedProducts);
      showSuccess('Product deleted');
      setProductToDelete(null);
    } catch (error) {
      console.error('Delete product error:', error);
      showError('Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleAvailability = async (productId) => {
    try {
      const toggled = products.map((p) =>
        p.id === productId ? { ...p, available: !(p.available !== false) } : p
      );
      await api.put(`/api/sites/${siteId}/products`, { products: toggled });
      setProducts(toggled);
    } catch (error) {
      console.error('Toggle availability error:', error);
      showError('Failed to update availability');
    }
  };

  const handleDuplicateProduct = async (product) => {
    try {
      const copy = {
        ...product,
        id: `product-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: `${product.name} (copy)`
      };
      const updatedProducts = [...products, copy];
      const data = await api.put(`/api/sites/${siteId}/products`, { products: updatedProducts });
      setProducts(data.products || updatedProducts);
      showSuccess('Product duplicated');
    } catch (error) {
      console.error('Duplicate product error:', error);
      showError('Failed to duplicate product');
    }
  };

  const handleExportCSV = () => {
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
    a.download = `${(siteName || 'products').replace(/\s+/g, '-').toLowerCase()}-products.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess('CSV exported');
  };

  const handleImportComplete = async (importedProducts, importMode = 'replace') => {
    try {
      const finalProducts = importMode === 'append'
        ? [...products, ...importedProducts]
        : importedProducts;
      const data = await api.put(`/api/sites/${siteId}/products`, { products: finalProducts });
      setProducts(data.products || finalProducts);
      setShowImportModal(false);
      showSuccess(`Imported ${importedProducts.length} products`);
    } catch (error) {
      console.error('Import error:', error);
      showError(error.message || 'Failed to import products');
      throw error;
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...new Set(products.map((p) => p.category || 'General'))];
  const Container = embedded ? 'div' : 'main';
  const PageTitle = embedded ? 'h2' : 'h1';

  if (needsSitePick) {
    return (
      <div className={`products-page${embedded ? ' embedded-page' : ''}`}>
        {!embedded && <Header />}
        <Container className="products-container">
          <div className="site-picker" data-testid="products-site-picker">
            <PageTitle>Choose a site</PageTitle>
            <p>Select which site’s product catalog you want to manage.</p>
            <div className="site-picker-grid">
              {sites.map((site) => (
                <button
                  key={site.id}
                  type="button"
                  className="site-picker-card"
                  onClick={() => selectSite(site.id)}
                  data-testid={`pick-site-${site.id}`}
                >
                  <strong>{site.businessName || site.name || 'Untitled Site'}</strong>
                  <span>{site.status === 'published' ? 'Published' : 'Draft'}</span>
                </button>
              ))}
            </div>
            <Link to="/dashboard" className="btn btn-secondary">← Dashboard</Link>
          </div>
        </Container>
        {!embedded && <Footer />}
      </div>
    );
  }

  return (
    <div className={`products-page${embedded ? ' embedded-page' : ''}`}>
      {!embedded && <Header />}

      <Container className="products-container">
        <div className={`products-header${embedded ? ' pane-quiet-header' : ''}`}>
          <div className="header-content">
            <PageTitle>
              Products{!embedded && siteName ? ` — ${siteName}` : ''}
            </PageTitle>
            <p>
              {products.length} product{products.length === 1 ? '' : 's'}
              {!embedded && sites.length > 1 ? (
                <>
                  {' · '}
                  <button
                    type="button"
                    className="btn-link-inline"
                    onClick={() => {
                      setNeedsSitePick(true);
                      setSiteId(null);
                      navigate('/products');
                    }}
                  >
                    Switch site
                  </button>
                </>
              ) : null}
            </p>
          </div>

          <div className="header-actions">
            <button
              onClick={() => setShowImportModal(true)}
              className="btn btn-secondary"
              data-testid="import-csv-btn"
              disabled={!siteId}
            >
              Import CSV
            </button>
            <button
              onClick={handleExportCSV}
              className="btn btn-secondary"
              data-testid="export-csv-btn"
              disabled={!siteId || products.length === 0}
            >
              Export CSV
            </button>
            <button
              onClick={() => {
                setEditingProduct(null);
                setShowProductModal(true);
              }}
              className="btn btn-primary"
              data-testid="add-product-btn"
              disabled={!siteId}
            >
              Add Product
            </button>
            {!embedded && (
              <Link to="/dashboard" className="btn btn-secondary">
                ← Dashboard
              </Link>
            )}
          </div>
        </div>

        <PaymentStatusCard className="products-payment-status" />

        <div className="products-filters">
          <input
            type="text"
            placeholder="Search products…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            data-testid="product-search-input"
          />

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="filter-select"
            data-testid="product-category-filter"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner" />
            <p>Loading products…</p>
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="products-grid" data-testid="products-grid">
            {filteredProducts.map((product) => (
              <div key={product.id} className="product-card" data-testid={`product-card-${product.id}`}>
                {product.image ? (
                  <OptimizedImage
                    src={product.image}
                    alt={product.name}
                    width={400}
                    height={250}
                    aspectRatio="8/5"
                  />
                ) : (
                  <div className="product-card-placeholder">No image</div>
                )}
                <div className="product-card-body">
                  <h3>{product.name}</h3>
                  <p className="product-price">${Number(product.price || 0).toFixed(2)}</p>
                  {product.category ? <span className="product-category">{product.category}</span> : null}
                  <div className={`availability-badge ${product.available !== false ? 'available' : 'unavailable'}`}>
                    {product.available !== false ? 'Available' : 'Unavailable'}
                  </div>
                  <div className="product-actions">
                    <button
                      type="button"
                      onClick={() => handleToggleAvailability(product.id)}
                      className="btn-icon"
                      title="Toggle Availability"
                      data-testid={`toggle-availability-${product.id}`}
                    >
                      {product.available !== false ? '👁️' : '🚫'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditProduct(product)}
                      className="btn-icon btn-primary edit-button"
                      title="Edit"
                      data-testid={`edit-product-${product.id}`}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicateProduct(product)}
                      className="btn-icon btn-secondary"
                      title="Duplicate"
                      data-testid={`duplicate-product-${product.id}`}
                    >
                      📋
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(product.id)}
                      className="btn-icon btn-danger delete-button"
                      title="Delete"
                      data-testid={`delete-product-${product.id}`}
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
            <div className="empty-icon">📦</div>
            <h2>No products yet</h2>
            <p>Add items one at a time, or import a CSV to stock your catalog fast.</p>
            <div className="empty-actions">
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setShowProductModal(true);
                }}
                className="btn btn-primary"
                disabled={!siteId}
              >
                Add Product
              </button>
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="btn btn-secondary"
                disabled={!siteId}
              >
                Import CSV
              </button>
            </div>
          </div>
        )}
      </Container>

      {!embedded && <Footer />}

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

      {productToDelete && (
        <DeleteConfirmModal
          product={productToDelete}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}

export default Products;
