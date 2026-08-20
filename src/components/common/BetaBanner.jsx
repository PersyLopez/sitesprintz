import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

function isPublishedSitePath(pathname) {
  return /^\/view\/[^/]+/.test(pathname) || /^\/sites\/[^/]+$/.test(pathname);
}

/**
 * Slim top banner for closed-beta app chrome (not published customer sites).
 */
export default function BetaBanner() {
  const location = useLocation();
  const [beta, setBeta] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.beta) {
          setBeta(data.beta);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!beta?.enabled || isPublishedSitePath(location.pathname)) {
    return null;
  }

  return (
    <div
      className="beta-banner"
      data-testid="beta-banner"
      role="status"
      style={{
        background: '#0f172a',
        color: '#f8fafc',
        fontSize: '0.875rem',
        padding: '0.5rem 1rem',
        textAlign: 'center',
        borderBottom: '1px solid #1e293b',
      }}
    >
      Private beta — expect rough edges. Use Send feedback (💬) to report issues.
    </div>
  );
}
