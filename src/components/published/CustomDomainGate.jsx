import { useEffect, useState, Suspense, lazy } from 'react';
import { isPlatformHostname } from '../../utils/customDomainHost.js';
import LoadingFallback from '../common/LoadingFallback';

const PublishedSiteViewer = lazy(() => import('../../pages/PublishedSiteViewer'));

/**
 * When the app is opened on a connected customer domain, render that
 * published site at `/` instead of the platform marketing pages.
 */
export default function CustomDomainGate({ children }) {
  const hostname = typeof window === 'undefined' ? 'localhost' : window.location.hostname;
  const onPlatform = isPlatformHostname(hostname);
  const [lookup, setLookup] = useState(() => ({
    loading: !onPlatform,
    subdomain: null,
    missing: false,
  }));

  useEffect(() => {
    if (onPlatform) return undefined;
    let cancelled = false;
    fetch(`/api/domain/lookup?host=${encodeURIComponent(hostname)}`)
      .then((response) => response.json().then((body) => ({ ok: response.ok, body })))
      .then(({ ok, body }) => {
        if (cancelled) return;
        const subdomain = body?.subdomain;
        setLookup({
          loading: false,
          subdomain: ok && subdomain ? subdomain : null,
          missing: !ok || !subdomain,
        });
      })
      .catch(() => {
        if (!cancelled) setLookup({ loading: false, subdomain: null, missing: true });
      });
    return () => {
      cancelled = true;
    };
  }, [hostname, onPlatform]);

  if (onPlatform) return children;

  if (lookup.loading) {
    return <LoadingFallback message="Loading published site..." />;
  }

  if (lookup.subdomain) {
    return (
      <Suspense fallback={<LoadingFallback message="Loading published site..." />}>
        <PublishedSiteViewer forcedSubdomain={lookup.subdomain} />
      </Suspense>
    );
  }

  return (
    <div className="published-site-viewer error" data-testid="custom-domain-unknown">
      <h1>Site not connected</h1>
      <p>This domain is not connected to a published Right Site Light site yet.</p>
    </div>
  );
}
