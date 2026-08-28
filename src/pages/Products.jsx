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
import SkeletonLoader from '../components/common/SkeletonLoader';
import { OptimizedImage } from '../components/common/OptimizedImage';
import { api } from '../services/api';
import { remainingStock } from '../utils/productAvailability';
import './Products.css';

const PRODUCT_ICONS = {
  edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  delete: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
  duplicate: 'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z',
  visible: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z',
  hidden: 'M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z',
  empty: 'M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 12 7.4l3.38 4.6L17 10.83 14.92 8H20v6z',
  alert: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
};

function ProductIcon({ path, className = 'product-icon' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      aria-hidden="true"
      focusable="false"
    >
      <path fill="currentColor" d={path} />
    </svg>
  );
}

function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();
  const { embedded, siteId: workspaceSiteId } = useSiteWorkspace();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
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
    setLoadError(null);
    try {
      const data = await api.get(`/api/sites/${id}/products`);
      setProducts(data.products || []);
    } catch (error) {
      console.error('Load products error:', error);
      setLoadError('Failed to load products. Please try again.');
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
  const showEmptyCatalog = !loading && !loadError && products.length === 0;
  const showNoMatches = !loading && !loadError && products.length > 0 && filteredProducts.length === 0;

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
            {embedded ? (
              <PageTitle>Products</PageTitle>
            ) : (
              <PageTitle>
                Products{siteName ? ` — ${siteName}` : ''}
              </PageTitle>
            )}
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
              type="button"
              onClick={() => setShowImportModal(true)}
              className="btn btn-secondary"
              data-testid="import-csv-btn"
              aria-label="Import CSV"
              disabled={!siteId}
            >
              Import CSV
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="btn btn-secondary"
              data-testid="export-csv-btn"
              aria-label="Export CSV"
              disabled={!siteId || products.length === 0}
            >
              Export CSV
            </button>
            <button
              type="button"
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

        <div className="products-filters">
          <input
            type="text"
            placeholder="Search products…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            data-testid="product-search-input"
            aria-label="Search products"
          />

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="filter-select"
            data-testid="product-category-filter"
            aria-label="Filter by category"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="products-grid products-loading" aria-busy="true" aria-label="Loading products...">
            <span className="sr-only">Loading products…</span>
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonLoader key={i} variant="card" width="100%" height="280px" />
            ))}
          </div>
        ) : loadError ? (
          <div className="products-error-state" role="alert" data-testid="products-load-error">
            <div className="products-error-icon" aria-hidden="true">
              <ProductIcon path={PRODUCT_ICONS.alert} className="products-error-icon-svg" />
            </div>
            <h2 className="products-error-title">Could not load products</h2>
            <p>{loadError}</p>
            <button
              type="button"
              onClick={() => siteId && loadProducts(siteId)}
              className="btn btn-primary"
            >
              Retry
            </button>
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="products-grid" data-testid="products-grid">
            {filteredProducts.map((product) => {
              const isAvailable = product.available !== false;
              const toggleLabel = isAvailable ? 'Hide from shop' : 'Show in shop';

              return (
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
                    <div className={`availability-badge ${isAvailable ? 'available' : 'unavailable'}`}>
                      {isAvailable ? 'Available' : 'Unavailable'}
                    </div>
                    {(() => {
                      const stockCount = remainingStock(product);
                      if (stockCount === 0) {
                        return (
                          <div className="stock-badge sold-out" data-testid={`stock-badge-${product.id}`}>
                            Sold out
                          </div>
                        );
                      }
                      if (stockCount !== null) {
                        return (
                          <div className="stock-badge" data-testid={`stock-badge-${product.id}`}>
                            {stockCount} in stock
                          </div>
                        );
                      }
                      return null;
                    })()}
                    <div className="product-actions">
                      <button
                        type="button"
                        onClick={() => handleToggleAvailability(product.id)}
                        className="product-action-btn"
                        aria-label={`${toggleLabel}: ${product.name}`}
                        data-testid={`toggle-availability-${product.id}`}
                      >
                        <ProductIcon path={isAvailable ? PRODUCT_ICONS.hidden : PRODUCT_ICONS.visible} />
                        <span>{toggleLabel}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditProduct(product)}
                        className="product-action-btn product-action-btn--primary edit-button"
                        aria-label={`Edit ${product.name}`}
                        data-testid={`edit-product-${product.id}`}
                      >
                        <ProductIcon path={PRODUCT_ICONS.edit} />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicateProduct(product)}
                        className="product-action-btn"
                        aria-label={`Duplicate ${product.name}`}
                        data-testid={`duplicate-product-${product.id}`}
                      >
                        <ProductIcon path={PRODUCT_ICONS.duplicate} />
                        <span>Duplicate</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(product.id)}
                        className="product-action-btn product-action-btn--danger delete-button"
                        aria-label={`Delete ${product.name}`}
                        data-testid={`delete-product-${product.id}`}
                      >
                        <ProductIcon path={PRODUCT_ICONS.delete} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : showNoMatches ? (
          <div className="products-empty-state" data-testid="products-no-matches">
            <div className="products-empty-icon" aria-hidden="true">
              <ProductIcon path={PRODUCT_ICONS.empty} className="products-empty-icon-svg" />
            </div>
            <h2 className="products-empty-title">No matching products</h2>
            <p className="products-empty-description">
              Try a different search term or category filter.
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('all');
              }}
            >
              Clear filters
            </button>
          </div>
        ) : showEmptyCatalog ? (
          <div className="products-empty-state" data-testid="products-empty-state">
            <div className="products-empty-icon" aria-hidden="true">
              <ProductIcon path={PRODUCT_ICONS.empty} className="products-empty-icon-svg" />
            </div>
            <h2 className="products-empty-title">No products yet</h2>
            <p className="products-empty-description">
              Add items one at a time, or import a CSV to stock your catalog fast.
            </p>
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
                aria-label="Import CSV"
              >
                Import CSV
              </button>
            </div>
          </div>
        ) : null}
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
