/**
 * PublishedSiteViewer — live /view/:subdomain sites.
 * Uses the same composePage + section HTML path as preview/publish,
 * with cart overlay when checkout is enabled.
 */

import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import BookingWidget from '../components/BookingWidget';
import ShoppingCart from '../components/ecommerce/ShoppingCart';
import SeamlessEditToolbar from '../components/published/SeamlessEditToolbar';
import { CartProvider } from '../context/CartContext';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { usePublishedSeamlessEdit } from '../hooks/usePublishedSeamlessEdit';
import { buildLiveSiteMarkup, getLiveSiteThemeVars } from '../utils/publishedSiteDocument';
import { mountGoogleReviews } from '../utils/mountGoogleReviews';
import { getSiteWorkspacePaths } from '../utils/siteWorkspace';
import { isPayOnSiteEnabled } from '../utils/payOnSite';
import { siteWantsNativeBooking, subdomainFromLivePath } from '../utils/visitorExperience';
import '../styles/published-site-viewer.css';

function PublishedSiteViewerContent({ onSiteId, forcedSubdomain }) {
  const { subdomain: paramSubdomain } = useParams();
  const subdomain = forcedSubdomain || paramSubdomain;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { clearCart, addToCart } = useCart();
  const liveRef = useRef(null);
  const appliedHtmlRef = useRef('');
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [siteId, setSiteId] = useState(null);
  const [bookingMount, setBookingMount] = useState(null);

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
  const ownerUserId = userId || site?.userId || site?.user_id || null;
  const markup = useMemo(() => {
    if (!payload || Object.keys(payload).length === 0) return null;
    try {
      return buildLiveSiteMarkup(payload);
    } catch {
      return null;
    }
  }, [payload]);
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

  const edit = usePublishedSeamlessEdit({
    enabled: editEnabled,
    subdomain,
    liveRef,
    siteData: payload,
    bindKey: markup?.html || '',
    onRestored: reloadPublishedSite,
  });

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
    return undefined;
  }, [markup, bookingEnabled]);

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
    const form = event.target.closest('form[data-type="contact"], form#contact-form');
    if (!form) return;
    event.preventDefault();
    const status = form.querySelector('[data-testid="contact-form-status"]');
    const formData = new FormData(form);
    const body = Object.fromEntries(formData.entries());
    body.subdomain = body.subdomain || subdomain || subdomainFromLivePath(window.location.pathname);
    if (status) {
      status.textContent = 'Sending…';
      status.setAttribute('data-state', '');
    }
    try {
      const response = await fetch('/api/submissions/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to send message');
      }
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
  const bookingWidget = bookingEnabled ? (
    <BookingWidget
      userId={ownerUserId}
      siteId={siteId}
      demoMode={demoMode}
      businessMode={bookingMode}
      noPreferenceText={bookingNoPreference}
      pageCatalogMode={pageCatalogMode}
    />
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
        <SeamlessEditToolbar
          saveState={edit.saveState}
          canUndo={edit.canUndo}
          onUndo={edit.undo}
          onOpenHistory={edit.openHistory}
          historyOpen={edit.historyOpen}
          history={edit.history}
          historyError={edit.historyError}
          selectedVersion={edit.selectedVersion}
          onSelectVersion={edit.setSelectedVersion}
          onCloseHistory={edit.closeHistory}
          onRestore={edit.restore}
          restoring={edit.restoring}
          formatHistoryTime={edit.formatHistoryTime}
          dashboardHref={workspacePaths?.overview || '/dashboard'}
          settingsHref={workspacePaths?.settings}
          builderHref={workspacePaths?.edit}
          appointmentsHref={workspacePaths?.appointments}
          productsHref={workspacePaths?.products}
          unboundHint={edit.unboundHint}
        />
      )}
      {demoMode && (
        <div className="showcase-demo-banner" data-testid="showcase-demo-banner" role="status">
          Gallery demo — this is an example of how your site could look. Try the full visitor experience. The only thing you cannot do here is pay by card.
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
