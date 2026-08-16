/**
 * PublishedSiteViewer — live /view/:subdomain sites.
 * Uses the same composePage + section HTML path as preview/publish,
 * with cart overlay when checkout is enabled.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BookingWidget from '../components/BookingWidget';
import ShoppingCart from '../components/ecommerce/ShoppingCart';
import { CartProvider } from '../context/CartContext';
import { useCart } from '../hooks/useCart';
import { buildLiveSiteMarkup } from '../utils/publishedSiteDocument';
import { isPayOnSiteEnabled } from '../utils/payOnSite';
import '../styles/published-site-viewer.css';

function PublishedSiteViewerContent({ onSiteId }) {
  const { subdomain } = useParams();
  const navigate = useNavigate();
  const { clearCart, addToCart } = useCart();
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [siteId, setSiteId] = useState(null);

  useEffect(() => {
    const fetchSite = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/showcases/${subdomain}`);

        if (!response.ok) {
          throw new Error('Site not found');
        }

        const data = await response.json();
        const siteData = data.site || data;
        setSite(siteData);

        if (siteData.id || siteData.subdomain) {
          const resolvedSiteId = siteData.id || siteData.subdomain;
          setSiteId(resolvedSiteId);
          onSiteId?.(resolvedSiteId);
          setUserId(siteData.userId || siteData.user_id);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (subdomain) {
      fetchSite();
    }
  }, [subdomain, onSiteId]);

  useEffect(() => {
    const existing = document.getElementById('ss-live-fonts');
    if (!existing) {
      const fontLink = document.createElement('link');
      fontLink.id = 'ss-live-fonts';
      fontLink.rel = 'stylesheet';
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap';
      document.head.appendChild(fontLink);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('order') === 'success') {
      clearCart();
      params.delete('order');
      const query = params.toString();
      const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
      window.history.replaceState({}, '', nextUrl);
    }
  }, [clearCart]);

  const payload = site?.data || site?.site_data || {};
  const markup = useMemo(() => {
    if (!payload || Object.keys(payload).length === 0) return null;
    try {
      return buildLiveSiteMarkup(payload);
    } catch {
      return null;
    }
  }, [payload]);

  if (loading) {
    return (
      <div className="published-site-viewer loading">
        <div className="spinner"></div>
        <p>Loading site...</p>
      </div>
    );
  }

  if (error || !site) {
    return (
      <div className="published-site-viewer error">
        <h2>Site Not Found</h2>
        <p>{error || 'This site is no longer available'}</p>
        <button type="button" onClick={() => navigate('/showcase')} className="btn btn-primary">
          Back to Gallery
        </button>
      </div>
    );
  }

  const handleLiveClick = (event) => {
    const button = event.target.closest('[data-ss-add-to-cart]');
    if (!button) return;
    event.preventDefault();
    const price = Number(button.getAttribute('data-product-price'));
    addToCart({
      id: button.getAttribute('data-product-id'),
      name: button.getAttribute('data-product-name'),
      price: Number.isFinite(price) ? price : 0,
      image: button.getAttribute('data-product-image') || undefined,
    });
  };

  const checkoutEnabled = Boolean(payload.settings?.allowCheckout && siteId);
  const bookingEnabled = Boolean(
    (payload.booking?.enabled || payload.settings?.bookingEnabled) && userId
  );
  const demoMode = Boolean(payload.settings?.demoMode) || String(subdomain || '').startsWith('gallery-');

  return (
    <div className="published-site-viewer">
      {demoMode && (
        <div className="showcase-demo-banner" data-testid="showcase-demo-banner" role="status">
          Gallery demo — this is an example of how your site could look. Cart and booking work as a visitor would experience them; orders and appointments are simulated and not saved.
        </div>
      )}

      {checkoutEnabled && (
        <ShoppingCart
          stripePublishableKey={import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY}
          siteId={siteId}
          paymentsReady={!demoMode && site?.stripe_connected === true}
          payOnSite={demoMode || isPayOnSiteEnabled(payload)}
        />
      )}

      {markup ? (
        <>
          <style>{markup.css}</style>
          <div
            className="ss-live"
            data-testid="published-composed-site"
            onClick={handleLiveClick}
            dangerouslySetInnerHTML={{ __html: markup.html }}
          />
        </>
      ) : (
        <div className="published-site-viewer error">
          <h2>{site.name || payload.brand?.name || 'Published Site'}</h2>
          <p>This site could not be rendered.</p>
        </div>
      )}

      {bookingEnabled && (
        <section id="booking" className="site-section booking-section" data-testid="live-booking-section">
          <div className="section-header">
            <h2>{payload.settings?.bookingTitle || 'Book an Appointment'}</h2>
          </div>
          <div className="booking-widget-container" data-testid="live-booking-widget">
            <BookingWidget userId={userId} siteId={siteId} demoMode={demoMode} />
          </div>
        </section>
      )}
    </div>
  );
}

function PublishedSiteViewer() {
  const [siteId, setSiteId] = useState(null);

  return (
    <CartProvider siteId={siteId}>
      <PublishedSiteViewerContent onSiteId={setSiteId} />
    </CartProvider>
  );
}

export default PublishedSiteViewer;
