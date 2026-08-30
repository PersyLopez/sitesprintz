import { useEffect, useState } from 'react';
import { laborDisplayVars, laborInquiryMailto } from '../../utils/laborInquiryMailto';

const SKU_LABELS = {
  managed_edit: 'Extra batch',
  brand_match: 'Brand match',
  unique_look: 'Unique look',
};

function LaborCheckoutButtons({ token }) {
  const vars = laborDisplayVars();
  const [skus, setSkus] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [collectsPayments, setCollectsPayments] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.billing?.collectsPayments != null) {
          setCollectsPayments(Boolean(data.billing.collectsPayments));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!token) {
      return undefined;
    }
    const controller = new AbortController();
    fetch('/api/payments/labor-skus', {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        const payload = body?.data || body;
        if (payload?.skus) {
          setSkus(payload.skus);
        }
      })
      .catch(() => {
        setSkus(null);
      });
    return () => controller.abort();
  }, [token]);

  if (!vars || !token || collectsPayments === false) {
    return null;
  }

  const configured = skus && Object.values(skus).some(Boolean);
  if (!configured) {
    return null;
  }

  const startCheckout = async (sku) => {
    setBusy(sku);
    setError(null);
    try {
      const response = await fetch('/api/payments/labor-checkout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sku }),
      });
      const body = await response.json().catch(() => ({}));
      const payload = body.data || body;
      if (!response.ok || !payload.url) {
        throw new Error(body.error || 'Could not start extras checkout');
      }
      window.location.assign(payload.url);
    } catch (err) {
      setError(err.message || 'Could not start extras checkout');
      setBusy(null);
    }
  };

  return (
    <div className="labor-checkout" data-testid="labor-checkout">
      <p>Pay for extras here. Amounts come from Stripe — not from this page.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
        {Object.keys(SKU_LABELS).filter((id) => skus[id]).map((id) => (
          <button
            key={id}
            type="button"
            className="btn btn-secondary"
            data-testid={`labor-checkout-${id}`}
            disabled={Boolean(busy)}
            onClick={() => startCheckout(id)}
          >
            {busy === id ? 'Starting…' : SKU_LABELS[id]}
          </button>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
      {laborInquiryMailto('optional extras') && (
        <p style={{ marginTop: '0.75rem' }}>
          Prefer email?{' '}
          <a href={laborInquiryMailto('optional extras')}>Ask us to build or update it</a>
        </p>
      )}
    </div>
  );
}

export default LaborCheckoutButtons;
