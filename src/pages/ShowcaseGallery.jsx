/**
 * ShowcaseGallery Component
 * 
 * Public gallery page displaying all customer sites ("Made with SiteSprintz")
 * - Grid layout with site cards
 * - Category filtering
 * - Search functionality
 * - Pagination
 * - SEO optimized
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import './ShowcaseGallery.css';

function ShowcaseGallery() {
  const [sites, setSites] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSites, setTotalSites] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const sitesPerPage = 12;
  const totalPages = Math.ceil(totalSites / sitesPerPage);

  // Set page title for SEO
  useEffect(() => {
    document.title = 'Showcase - Made with SiteSprintz | Website Gallery';
    
    // Add/update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', 'Discover amazing websites created with SiteSprintz. Browse our gallery of beautiful small business sites.');
  }, []);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/showcase/categories');
        if (!response.ok) throw new Error('Failed to fetch categories');
        const data = await response.json();
        setCategories(data);
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };

    fetchCategories();
  }, []);

  // Fetch sites with filters
  const fetchSites = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: sitesPerPage.toString()
      });

      if (selectedCategory) {
        params.append('category', selectedCategory);
      }

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`/api/showcase?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch sites');
      }

      const data = await response.json();
      setSites(data.sites || []);
      setTotalSites(data.total || 0);
    } catch (err) {
      console.error('Error fetching sites:', err);
      setError('Failed to load showcase. Please try again later.');
      setSites([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedCategory, searchQuery, sitesPerPage]);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1); // Reset to first page on search
      } else {
        fetchSites();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const getSiteUrl = (subdomain) => {
    return `https://${subdomain}.sitesprintz.com`;
  };

  const getSiteImage = (site) => {
    return site.site_data?.images?.hero || '/images/default-site.jpg';
  };

  const getSiteTitle = (site) => {
    return site.site_data?.hero?.title || 'Untitled Site';
  };

  const formatCategory = (category) => {
    return category
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="showcase-gallery">
      {/* Header */}
      <header className="showcase-header">
        <h1>Made with SiteSprintz</h1>
        <p>Discover amazing websites created by businesses like yours</p>
      </header>

      {/* Filters */}
      <div className="showcase-filters">
        {/* Search */}
        <div className="search-box">
          <input
            type="text"
            placeholder="Search sites..."
            value={searchQuery}
            onChange={handleSearchChange}
            aria-label="Search sites"
          />
        </div>

        {/* Categories */}
        <div className="category-filters">
          <button
            className={`category-btn ${!selectedCategory ? 'active' : ''}`}
            onClick={() => handleCategoryChange(null)}
          >
            All
          </button>
          {/* TDD FIX: Handle missing/null/empty categories safely */}
          {categories && Array.isArray(categories) && categories.map((cat) => (
            <button
              key={cat.template}
              className={`category-btn ${selectedCategory === cat.template ? 'active' : ''}`}
              onClick={() => handleCategoryChange(cat.template)}
            >
              {formatCategory(cat.template)} ({cat.count})
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading showcase...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="error-state">
          <p>{error}</p>
          <button onClick={fetchSites}>Try Again</button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && sites.length === 0 && (
        <div className="empty-state">
          <h2>No sites found</h2>
          <p>
            {searchQuery || selectedCategory
              ? 'Try adjusting your filters'
              : 'Be the first to showcase your site!'}
          </p>
        </div>
      )}

      {/* Site Grid */}
      {!loading && !error && sites.length > 0 && (
        <>
          <div className="showcase-grid" data-testid="showcase-grid">
            {sites.map((site) => (
              <div key={site.id} className="site-card">
                <Link to={`/showcase/${site.subdomain}`} className="site-card-link">
                  <div className="site-image">
                    <img
                      src={getSiteImage(site)}
                      alt={`${getSiteTitle(site)} preview`}
                      loading="lazy"
                    />
                    <div className="site-overlay">
                      <span className="view-details">View Details</span>
                    </div>
                  </div>
                  <div className="site-info">
                    <h3>{getSiteTitle(site)}</h3>
                    <p className="site-category">{formatCategory(site.template_id)}</p>
                    <div className="site-meta">
                      <span className="site-plan">{site.plan}</span>
                      <a
                        href={getSiteUrl(site.subdomain)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="visit-site-btn"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Visit Site ↗
                      </a>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                aria-label="Previous page"
              >
                Previous
              </button>
              <span className="page-info">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
                aria-label="Next page"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ShowcaseGallery;
