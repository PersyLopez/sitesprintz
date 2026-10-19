/**
 * PublishedSiteViewer — live /view/:subdomain sites.
 * Uses the same composePage + section HTML path as preview/publish,
 * with cart overlay when checkout is enabled.
 */

import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { CartProvider } from '../context/CartContext';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { buildLiveSiteMarkup, getLiveSiteThemeVars } from '../utils/publishedSiteDocument';
import { mountGoogleReviews } from '../utils/mountGoogleReviews';
import { getSiteWorkspacePaths } from '../utils/siteWorkspace';
import { isPayOnSiteEnabled } from '../utils/payOnSite';
import { getPublicDeliveryConfig } from '../utils/delivery';
import { siteFeesEnabled, siteWantsNativeBooking, subdomainFromLivePath } from '../utils/visitorExperience';
import { post } from '../utils/api';
import { tLive } from '../i18n/liveChrome/index.js';
import { useLocale } from '../i18n/LocaleContext.jsx';
import '../styles/published-site-viewer.css';

const BookingWidget = lazy(() => import('../components/BookingWidget'));
const ShoppingCart = lazy(() => import('../components/ecommerce/ShoppingCart'));
const PublishedLiveEdit = lazy(() => import('../components/published/PublishedLiveEdit'));

/**
 * Server-inlined showcase JSON (window.__RSL_PUBLISHED_SITE__) lets the FIRST
 * render show the composed site — no spinner, no /api/showcases round trip.
 * Subdomain must match the route so stale embeds from another path are ignored.
 */
function readEmbeddedSite(routeSubdomain) {
  const embed = typeof window !== 'undefined' ? window.__RSL_PUBLISHED_SITE__ : null;
  const candidate = embed?.site || embed || null;
  return candidate?.subdomain === routeSubdomain ? candidate : null;
}

function PublishedSiteViewerContent({ onSiteId, forcedSubdomain }) {
  const { locale, setLocale } = useLocale();
  const { subdomain: paramSubdomain } = useParams();
  const subdomain = forcedSubdomain || paramSubdomain;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { clearCart, addToCart } = useCart();
  const liveRef = useRef(null);
  const appliedHtmlRef = useRef('');
  const embeddedSite = readEmbeddedSite(subdomain);
  const [site, setSite] = useState(embeddedSite);
  const [loading, setLoading] = useState(!embeddedSite);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(embeddedSite?.userId || embeddedSite?.user_id || null);
  const [siteId, setSiteId] = useState(embeddedSite?.id || embeddedSite?.subdomain || null);
  const [bookingMount, setBookingMount] = useState(null);

  useEffect(() => {
    // When the embed matches this route the state above is already primed;
    // only the parent siteId sync stays here (effects, not render).
    const candidate = readEmbeddedSite(subdomain);
    if (candidate) {
      onSiteId?.(candidate.id || candidate.subdomain);
      return;
    }

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
      fontLink.media = 'print';
      fontLink.onload = () => {
        fontLink.media = 'all';
      };
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
  const ownerUserId = userId || site?.userId || site?.user_id || null;
  const markup = useMemo(() => {
    if (!payload || Object.keys(payload).length === 0) return null;
    try {
      return buildLiveSiteMarkup(payload, { locale, subdomain });
    } catch {
      return null;
    }
  }, [payload, locale]);
  const bookingEnabled = Boolean(
    ownerUserId
    && (
      siteWantsNativeBooking(payload)
      || Boolean(markup?.html?.includes('data-ss-booking-mount'))
    )
  );
  const themeVars = markup?.tokens ? getLiveSiteThemeVars(markup.tokens) : undefined;
  const wantsEdit = searchParams.get('edit') === 'true';
  const canEditPublished = Boolean(
    user?.id
    && ownerUserId
    && (user.id === ownerUserId || user.role === 'admin')
  );
  const editEnabled = Boolean(wantsEdit && canEditPublished && markup && !authLoading);

  const reloadPublishedSite = useCallback(async () => {
    if (!subdomain) return;
    appliedHtmlRef.current = '';
    const response = await fetch(`/api/showcases/${subdomain}`);
    if (!response.ok) throw new Error('Site not found');
    const data = await response.json();
    const siteData = data.site || data;
    setSite(siteData);
    if (siteData.id || siteData.subdomain) {
      const resolvedSiteId = siteData.id || siteData.subdomain;
      setSiteId(resolvedSiteId);
      onSiteId?.(resolvedSiteId);
      setUserId(siteData.userId || siteData.user_id);
    }
  }, [subdomain, onSiteId]);

  useLayoutEffect(() => {
    const root = liveRef.current;
    const nextHtml = markup?.html || '';
    if (!root) {
      setBookingMount((current) => (current == null ? current : null));
      return undefined;
    }
    // Apply composed HTML ourselves. dangerouslySetInnerHTML re-writes the
    // container on later renders and detaches a portaled booking widget.
    if (appliedHtmlRef.current !== nextHtml || (nextHtml && !root.firstChild)) {
      root.innerHTML = nextHtml;
      appliedHtmlRef.current = nextHtml;
    }
    const node = bookingEnabled ? root.querySelector('[data-ss-booking-mount]') : null;
    setBookingMount((current) => (current === node ? current : node));
    mountGoogleReviews(root);
    if (searchParams.get('contact') === 'sent') {
      const status = root.querySelector('[data-testid="contact-form-status"]');
      if (status) {
        status.textContent = 'Your message has been sent.';
        status.setAttribute('data-state', 'success');
      }
    }
    return undefined;
  }, [markup, bookingEnabled, searchParams]);

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
    const langBtn = event.target.closest('[data-ss-lang]');
    if (langBtn) {
      event.preventDefault();
      setLocale(langBtn.getAttribute('data-ss-lang'));
      return;
    }

    const bookTarget = event.target.closest('[data-ss-book-service]');
    if (bookTarget) {
      event.preventDefault();
      const card = bookTarget.closest('[data-service-id]');
      const serviceId = bookTarget.getAttribute('data-service-id')
        || card?.getAttribute('data-service-id');
      const serviceName = bookTarget.getAttribute('data-service-name')
        || card?.getAttribute('data-service-name');
      window.dispatchEvent(new CustomEvent('ss-book-service-select', {
        detail: { id: serviceId, name: serviceName },
      }));
      const bookingEl = liveRef.current?.querySelector('#booking') || document.getElementById('booking');
      if (bookingEl) {
        bookingEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

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
    const original = button.textContent;
    button.classList.add('is-added');
    button.textContent = 'Added';
    window.setTimeout(() => {
      button.classList.remove('is-added');
      if (button.isConnected) button.textContent = original;
    }, 1400);
  };

  const handleContactSubmit = async (event) => {
    const form = event.target.closest('form[data-type="contact"], form#contact-form, form[data-type="zip-check"], form[data-type="package-quote"]');
    if (!form) return;
    event.preventDefault();
    const status = form.querySelector('[data-testid="contact-form-status"], [data-testid="zip-form-status"], [data-testid="package-form-status"]');
    const formData = new FormData(form);
    const body = Object.fromEntries(formData.entries());
    body.subdomain = body.subdomain || subdomain || subdomainFromLivePath(window.location.pathname);
    if (status) {
      status.textContent = 'Sending…';
      status.setAttribute('data-state', '');
    }
    try {
      // Same api client as BookingWidget / PayOnSiteCheckout (credentials + CSRF when present)
      const data = await post('/api/submissions/contact', body);
      form.reset();
      if (status) {
        status.textContent = data.message || 'Your message has been sent.';
        status.setAttribute('data-state', 'success');
      }
    } catch (err) {
      if (status) {
        status.textContent = err.message || 'Failed to send message. Please try again.';
        status.setAttribute('data-state', 'error');
      }
    }
  };

  const checkoutEnabled = Boolean(payload.settings?.allowCheckout && siteId);
  const demoMode = payload.settings?.demoMode === true;
  const workspacePaths = siteId ? getSiteWorkspacePaths(siteId, site) : null;
  const pageCatalogMode = Boolean(markup?.html?.includes('data-ss-book-service'));
  const bookingSection = (payload.sections || []).find(
    (section) => section?.type === 'booking' || section?.type === 'native-booking'
  );
  const bookingMode = payload.booking?.businessMode
    || bookingSection?.content?.businessMode
    || payload._operatingModel?.businessMode
    || 'solo';
  const bookingNoPreference = payload.booking?.noPreferenceText
    || bookingSection?.content?.noPreferenceText
    || payload._operatingModel?.noPreferenceText
    || 'Any available';
  const feesEnabled = siteFeesEnabled(payload);
  const paymentsReady = !demoMode && (
    site?.online_payment_ready === true || site?.stripe_connected === true
  );
  const bookingWidget = bookingEnabled ? (
    <Suspense fallback={null}>
      <BookingWidget
        userId={ownerUserId}
        siteId={siteId}
        demoMode={demoMode}
        businessMode={bookingMode}
        noPreferenceText={bookingNoPreference}
        pageCatalogMode={pageCatalogMode}
        feesEnabled={feesEnabled}
        paymentsReady={paymentsReady}
      />
    </Suspense>
  ) : null;

  const portalTarget = bookingMount?.isConnected ? bookingMount : null;

  return (
    <div className="published-site-viewer" style={themeVars}>
      {wantsEdit && !authLoading && !isAuthenticated && (
        <div className="seamless-edit-login" data-testid="seamless-edit-login">
          <a href={`/login?redirect=${encodeURIComponent(`/view/${subdomain}?edit=true`)}`}>Log in</a>
          {' '}to edit this site.
        </div>
      )}
      {editEnabled && (
        <Suspense fallback={null}>
          <PublishedLiveEdit
            subdomain={subdomain}
            liveRef={liveRef}
            siteData={payload}
            bindKey={markup?.html || ''}
            onRestored={reloadPublishedSite}
            dashboardHref={workspacePaths?.overview || '/dashboard'}
            settingsHref={workspacePaths?.settings}
            builderHref={workspacePaths?.edit}
            appointmentsHref={workspacePaths?.appointments}
            productsHref={workspacePaths?.products}
          />
        </Suspense>
      )}
      {demoMode && (
        <div className="showcase-demo-banner" data-testid="showcase-demo-banner" role="status">
          {tLive(locale, 'demoBanner')}
        </div>
      )}

      {checkoutEnabled && (
        <Suspense fallback={null}>
          <ShoppingCart
            stripePublishableKey={import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY}
            siteId={siteId}
            paymentsReady={paymentsReady}
            payOnSite={demoMode || isPayOnSiteEnabled(payload)}
            deliveryConfig={getPublicDeliveryConfig(payload)}
          />
        </Suspense>
      )}

      {markup ? (
        <>
          <style>{markup.css}</style>
          <div
            ref={liveRef}
            className="ss-live"
            data-testid="published-composed-site"
            onClick={handleLiveClick}
            onSubmit={handleContactSubmit}
          />
        </>
      ) : (
        <div className="published-site-viewer error">
          <h2>{site.name || payload.brand?.name || 'Published Site'}</h2>
          <p>This site could not be rendered.</p>
        </div>
      )}

      {bookingWidget && portalTarget && createPortal(bookingWidget, portalTarget)}
      {bookingWidget && markup && !portalTarget && (
        <section id="booking" className="site-section booking-section" data-testid="live-booking-section">
          <div className="section-header">
            <h2>{payload.settings?.bookingTitle || 'Book an Appointment'}</h2>
          </div>
          <div className="booking-widget-container" data-testid="live-booking-widget">
            {bookingWidget}
          </div>
        </section>
      )}
    </div>
  );
}

function PublishedSiteViewer({ forcedSubdomain } = {}) {
  const [siteId, setSiteId] = useState(null);

  return (
    <CartProvider siteId={siteId}>
      <PublishedSiteViewerContent onSiteId={setSiteId} forcedSubdomain={forcedSubdomain} />
    </CartProvider>
  );
}

export default PublishedSiteViewer;
