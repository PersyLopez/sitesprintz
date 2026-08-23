/**
 * ShowcaseGallery — public “Made with SiteSprintz” gallery
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { OptimizedImage } from '../components/common/OptimizedImage';
import PublicPageLayout from '../components/layout/PublicPageLayout';
import { useAuth } from '../hooks/useAuth';
import { useLocale } from '../i18n/LocaleContext.jsx';
import './ShowcaseGallery.css';

const CATEGORY_META = {
  restaurant: { emoji: '🍽️', accent: '#e87b1e' },
  product: { emoji: '🛍️', accent: '#c45a0a' },
  cleaning: { emoji: '✨', accent: '#0f766e' },
  consultant: { emoji: '💼', accent: '#b45309' },
  electrician: { emoji: '⚡', accent: '#ca8a04' },
  freelancer: { emoji: '🎨', accent: '#c2410c' },
  gym: { emoji: '💪', accent: '#9a3412' },
  pet: { emoji: '🐾', accent: '#ea580c' },
  plumbing: { emoji: '🔧', accent: '#0f766e' },
  salon: { emoji: '💇', accent: '#be185d' },
  tech: { emoji: '💻', accent: '#15803d' },
  auto: { emoji: '🚗', accent: '#78716c' },
  tow: { emoji: '🚛', accent: '#c2410c' },
  other: { emoji: '🌐', accent: '#e87b1e' },
};

function normalizeCategories(payload) {
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.categories)
      ? payload.categories
      : [];

  return list
    .map((cat) => {
      const key = cat?.name || cat?.template || cat?.id;
      if (!key) return null;
      return {
        id: String(key),
        label: String(key),
        count: Number(cat.count) || 0,
      };
    })
    .filter(Boolean);
}

function formatLabel(value) {
  if (!value || typeof value !== 'string') return 'Unknown';
  return value
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function categoryMeta(templateOrId) {
  if (!templateOrId) return CATEGORY_META.other;
  const key = String(templateOrId).split('-')[0].toLowerCase();
  return CATEGORY_META[key] || CATEGORY_META.other;
}

function ShowcaseGallery() {
  const { isAuthenticated } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();
  const [sites, setSites] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSites, setTotalSites] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const sitesAbortRef = useRef(null);

  const sitesPerPage = 12;
  const totalPages = Math.max(1, Math.ceil(totalSites / sitesPerPage) || 1);
  const ctaTo = isAuthenticated ? '/setup' : '/register';
  const ctaLabel = isAuthenticated ? t('showcase.cta.auth') : t('showcase.cta.guest');

  const handleCta = useCallback((e) => {
    if (isAuthenticated) {
      e.preventDefault();
      navigate('/setup');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    document.title = t('showcase.title');

    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute(
      'content',
      t('showcase.meta')
    );
  }, [t]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/showcases/categories', {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Failed to fetch categories');
        const data = await response.json();
        setCategories(normalizeCategories(data));
      } catch (err) {
        if (err?.name === 'AbortError') return;
        setCategories([]);
      }
    };

    fetchCategories();
    return () => controller.abort();
  }, []);

  const fetchSites = useCallback(async () => {
    if (sitesAbortRef.current) {
      sitesAbortRef.current.abort();
    }
    const controller = new AbortController();
    sitesAbortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: sitesPerPage.toString(),
      });

      if (selectedCategory) {
        params.append('category', selectedCategory);
      }

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const response = await fetch(`/api/showcases?${params.toString()}`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sites');
      }

      const data = await response.json();
      setSites(data.sites || []);
      setTotalSites(data.total || 0);
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setError(t('showcase.error'));
      setSites([]);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [currentPage, selectedCategory, searchQuery, sitesPerPage]);

  useEffect(() => {
    fetchSites();
    return () => {
      if (sitesAbortRef.current) {
        sitesAbortRef.current.abort();
      }
    };
  }, [fetchSites]);

  useEffect(() => {
    if (currentPage === 1) return undefined;
    const timer = setTimeout(() => setCurrentPage(1), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  const getSiteUrl = (subdomain) => `/view/${subdomain}`;

  const getSiteImage = (site) =>
    site.site_data?.images?.hero || site.heroImage || null;

  const getSiteTitle = (site) =>
    site.name ||
    site.site_data?.hero?.title ||
    site.site_data?.brand?.name ||
    t('showcase.untitled');

  const getSiteCategory = (site) => {
    if (!site.template || typeof site.template !== 'string') return 'Unknown';
    return formatLabel(site.template);
  };

  const rangeStart = totalSites === 0 ? 0 : (currentPage - 1) * sitesPerPage + 1;
  const rangeEnd = Math.min(currentPage * sitesPerPage, totalSites);

  return (
    <PublicPageLayout className="showcase-gallery-page">
      <div className="showcase-gallery">
        {/* Hero */}
        <header className="showcase-hero">
          <div className="showcase-hero-glow" aria-hidden="true" />
          <div className="showcase-hero-glow showcase-hero-glow--2" aria-hidden="true" />
          <div className="showcase-hero-inner">
            <span className="showcase-hero-badge">
              <span className="showcase-hero-badge-dot" aria-hidden="true" />
              {t('showcase.badge')}
            </span>
            <h1>{t('showcase.heading')}</h1>
            <p className="showcase-hero-lead">
              {t('showcase.lead')}
            </p>
            <div className="showcase-hero-stats">
              {totalSites > 0 && (
                <div className="showcase-stat" data-testid="showcase-count">
                  <strong>{totalSites}</strong>
                  <span>{totalSites === 1 ? t('showcase.sitesOne') : t('showcase.sitesMany')}</span>
                </div>
              )}
              <div className="showcase-stat">
                <strong>{categories.length || '12+'}</strong>
                <span>{t('showcase.industries')}</span>
              </div>
              <div className="showcase-stat">
                <strong>{t('showcase.themes')}</strong>
                <span>{t('showcase.themesMeta')}</span>
              </div>
            </div>
            <div className="showcase-hero-actions">
              <Link to={ctaTo} className="showcase-btn-primary" onClick={handleCta}>
                {ctaLabel}
              </Link>
              <a href="#showcase-browse" className="showcase-btn-ghost">
                {t('showcase.browse')}
              </a>
            </div>
          </div>
        </header>

        {/* Filters */}
        <section
          id="showcase-browse"
          className="showcase-filters"
          aria-label={t('showcase.filterAria')}
        >
          <div className="search-box">
            <span className="search-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type="search"
              placeholder={t('showcase.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label={t('showcase.searchAria')}
              data-testid="showcase-search"
            />
          </div>

          <div className="category-filters" role="group" aria-label={t('showcase.categoryAria')}>
            <button
              type="button"
              className={`category-btn ${!selectedCategory ? 'active' : ''}`}
              onClick={() => handleCategoryChange(null)}
              data-testid="category-btn-all"
            >
              <span className="category-btn-emoji" aria-hidden="true">✦</span>
              {t('showcase.all')}
              {totalSites > 0 && <span className="category-btn-count">{totalSites}</span>}
            </button>
            {categories.map((cat) => {
              const meta = categoryMeta(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                  onClick={() => handleCategoryChange(cat.id)}
                  data-testid={`category-btn-${cat.id}`}
                  style={
                    selectedCategory === cat.id
                      ? { '--chip-accent': meta.accent }
                      : undefined
                  }
                >
                  <span className="category-btn-emoji" aria-hidden="true">
                    {meta.emoji}
                  </span>
                  {formatLabel(cat.label)}
                  <span className="category-btn-count">{cat.count}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Results toolbar */}
        {!loading && !error && totalSites > 0 && (
          <div className="showcase-toolbar">
            <p className="showcase-results-label">
              {t('showcase.showing', { start: rangeStart, end: rangeEnd, total: totalSites })}
              {selectedCategory && (
                <> {t('showcase.in', { category: formatLabel(selectedCategory) })}</>
              )}
              {searchQuery.trim() && (
                <> {t('showcase.matching', { query: searchQuery.trim() })}</>
              )}
            </p>
          </div>
        )}

        {loading && (
          <div className="showcase-skeleton-grid" role="status" aria-live="polite" aria-label={t('showcase.loading')}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="showcase-skeleton-card">
                <div className="showcase-skeleton-image" />
                <div className="showcase-skeleton-line" />
                <div className="showcase-skeleton-line showcase-skeleton-line--short" />
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="error-state" role="alert">
            <div className="empty-icon" aria-hidden="true">⚠</div>
            <p>{error}</p>
            <button type="button" onClick={fetchSites} data-testid="showcase-retry">
              Try again
            </button>
          </div>
        )}

        {!loading && !error && sites.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon" aria-hidden="true">🔍</div>
            <h2>{t('showcase.empty.h')}</h2>
            <p>
              {searchQuery || selectedCategory
                ? t('showcase.empty.filter')
                : t('showcase.empty.soon')}
            </p>
            <Link to={ctaTo} className="empty-state-cta" data-testid="showcase-empty-cta" onClick={handleCta}>
              {t('showcase.empty.cta')}
            </Link>
          </div>
        )}

        {!loading && !error && sites.length > 0 && (
          <>
            <div className="showcase-grid" data-testid="showcase-grid">
              {sites.map((site) => {
                const title = getSiteTitle(site);
                const category = getSiteCategory(site);
                const meta = categoryMeta(site.template);
                const image = getSiteImage(site);
                const plan = (site.plan || 'starter').toLowerCase();

                return (
                  <article
                    key={site.id}
                    className="site-card"
                    data-testid={`site-card-${site.subdomain || site.id}`}
                    style={{ '--card-accent': meta.accent }}
                  >
                    <Link to={`/showcase/${site.subdomain}`} className="site-card-link">
                      <div className="site-browser">
                        <div className="site-browser-bar" aria-hidden="true">
                          <span className="site-browser-dots">
                            <i /><i /><i />
                          </span>
                          <span className="site-browser-url">
                            {site.subdomain}.sitesprintz.com
                          </span>
                        </div>
                        <div className="site-image">
                          {image ? (
                            <OptimizedImage
                              src={image}
                              alt={`${title} preview`}
                              width={600}
                              height={400}
                              aspectRatio="3/2"
                              priority={false}
                              sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                          ) : (
                            <div
                              className="site-image-fallback"
                              style={{
                                background: `linear-gradient(145deg, ${meta.accent}55 0%, #2a1f18 55%, #1a2e35 100%)`,
                              }}
                            >
                              <span className="site-image-fallback-emoji" aria-hidden="true">
                                {meta.emoji}
                              </span>
                              <span className="site-image-fallback-label">{category}</span>
                            </div>
                          )}
                          <div className="site-overlay">
                            <span className="view-details">See this look</span>
                          </div>
                          <span className={`site-plan-badge site-plan-badge--${plan}`}>
                            {plan}
                          </span>
                        </div>
                      </div>
                      <div className="site-info">
                        <div className="site-category-row">
                          <span className="site-category-pill">
                            <span aria-hidden="true">{meta.emoji}</span>
                            {category}
                          </span>
                          {site.themeName && (
                            <span
                              className={`site-theme-pill site-theme-pill--${site.themeMode || 'dark'}`}
                              style={site.themeAccent ? { '--theme-accent': site.themeAccent } : undefined}
                            >
                              {site.themeName}
                            </span>
                          )}
                        </div>
                        <p className="site-card-title">{title}</p>
                      </div>
                    </Link>
                    <div className="site-meta">
                      <Link
                        to={getSiteUrl(site.subdomain)}
                        className="visit-site-btn"
                        data-testid={`visit-site-${site.subdomain}`}
                      >
                        {t('showcase.open')}
                        <span aria-hidden="true">↗</span>
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>

            {totalPages > 1 && (
              <nav
                className="pagination"
                aria-label={t('showcase.pagination')}
                data-testid="showcase-pagination"
              >
                <button
                  type="button"
                  onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label={t('showcase.prevAria')}
                >
                  {t('showcase.prev')}
                </button>
                <span className="page-info">
                  {t('showcase.page', { current: currentPage, total: totalPages })}
                </span>
                <button
                  type="button"
                  onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  aria-label={t('showcase.nextAria')}
                >
                  {t('showcase.next')}
                </button>
              </nav>
            )}
          </>
        )}

        {/* Bottom CTA */}
        <section className="showcase-bottom-cta" aria-label={t('showcase.bottomAria')}>
          <div className="showcase-bottom-cta-inner">
            <h2>{t('showcase.bottom.h')}</h2>
            <p>
              {t('showcase.bottom.p')}
            </p>
            <div className="showcase-hero-actions">
              <Link to={ctaTo} className="showcase-btn-primary" onClick={handleCta}>
                {ctaLabel}
              </Link>
              <Link to="/#templates" className="showcase-btn-ghost">
                {t('showcase.seeTemplates')}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PublicPageLayout>
  );
}

export default ShowcaseGallery;
