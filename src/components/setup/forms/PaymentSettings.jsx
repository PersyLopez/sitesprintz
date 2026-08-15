import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { usePlan } from '../../../hooks/usePlan';
import { api } from '../../../services/api';
import ProcessorConnectList from './ProcessorConnectList';
import './PaymentSettings.css';

function siteLabel(site) {
  return site?.businessName || site?.name || site?.subdomain || 'Untitled site';
}

function PaymentSettings({ site: siteProp = null }) {
  const { isGrowth } = usePlan();
  const [searchParams, setSearchParams] = useSearchParams();
  const [stripeStatus, setStripeStatus] = useState('loading');
  const [statusData, setStatusData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sites, setSites] = useState(siteProp ? [siteProp] : []);
  const [site, setSite] = useState(siteProp);
  const [sitesLoading, setSitesLoading] = useState(!siteProp);
  const [payOnSite, setPayOnSite] = useState(siteProp?.payOnSite === true);
  const [payOnSiteSaving, setPayOnSiteSaving] = useState(false);
  const [payOnSiteError, setPayOnSiteError] = useState(null);
  const [connectBanner, setConnectBanner] = useState(null);
  const [applyTo, setApplyTo] = useState('site');
  const [futureSaving, setFutureSaving] = useState(false);
  const [copySaving, setCopySaving] = useState(false);

  const loadStripeStatus = useCallback(async (siteId) => {
    try {
      setStripeStatus('loading');
      const data = await api.get('/api/connect/status', siteId ? { params: { siteId } } : {});
      setStatusData(data);
      if (data.chargesEnabled && data.payoutsEnabled && data.stripe?.connected) {
        setStripeStatus('ready');
      } else if (data.square?.connected || data.paypal?.connected) {
        setStripeStatus('ready');
      } else if (data.accountId) {
        setStripeStatus('incomplete');
      } else {
        setStripeStatus('not_started');
      }
    } catch (error) {
      setStripeStatus('error');
      setStatusData(null);
    }
  }, []);

  const selectSite = useCallback((nextSite, replace = false) => {
    setSite(nextSite);
    setPayOnSite(nextSite?.payOnSite === true);
    const next = new URLSearchParams(searchParams);
    if (nextSite?.id) next.set('site', nextSite.id);
    else next.delete('site');
    setSearchParams(next, { replace });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    loadSites(searchParams.get('site') || siteProp?.id);
  }, [siteProp, loadStripeStatus]);

  useEffect(() => {
    const result = searchParams.get('connect');
    const processor = searchParams.get('processor');
    if (!result) return;

    if (result === 'success' && processor) {
      setConnectBanner(`${processor} connected successfully`);
      loadStripeStatus(searchParams.get('site') || site?.id);
    } else if (result === 'error') {
      setConnectBanner('Could not finish connecting. Try again from the provider card.');
    }

    searchParams.delete('connect');
    searchParams.delete('processor');
    searchParams.delete('message');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams, loadStripeStatus, site?.id]);

  const loadSites = async (preferredId) => {
    try {
      setSitesLoading(true);
      const data = await api.get('/api/sites');
      const list = data.sites || data.data || [];
      setSites(list);
      const selected = list.find((item) => item.id === preferredId) || list[0] || null;
      setSite(selected);
      setPayOnSite(selected?.payOnSite === true);
      await loadStripeStatus(selected?.id);
    } catch (error) {
      setSite(null);
      setSites([]);
    } finally {
      setSitesLoading(false);
    }
  };

  const handleSiteChange = async (event) => {
    const next = sites.find((item) => item.id === event.target.value) || null;
    selectSite(next);
    await loadStripeStatus(next?.id);
  };

  const handlePayOnSiteToggle = async (event) => {
    const enabled = event.target.checked;
    if (!isGrowth || !site?.id || payOnSiteSaving) {
      return;
    }

    setPayOnSiteError(null);
    setPayOnSiteSaving(true);
    setPayOnSite(enabled);

    try {
      await api.put(`/api/sites/${site.id}/payment-options`, { payOnSite: enabled });
    } catch (error) {
      setPayOnSite(!enabled);
      setPayOnSiteError(error.message || 'Could not update pay on site');
    } finally {
      setPayOnSiteSaving(false);
    }
  };

  const futureEnabled = statusData?.futureDefaults?.enabled === true
    && statusData?.futureDefaults?.sourceSiteId === site?.id;

  const handleFutureToggle = async (event) => {
    if (!site?.id || futureSaving) return;
    const enabled = event.target.checked;
    setFutureSaving(true);
    try {
      await api.put('/api/connect/future-defaults', { enabled, siteId: site.id });
      if (enabled) setApplyTo((current) => (current === 'site' ? 'future' : current));
      else setApplyTo('site');
      await loadStripeStatus(site.id);
    } catch (error) {
      setConnectBanner(error.message || 'Could not update future-site preference');
    } finally {
      setFutureSaving(false);
    }
  };

  const copyToAllSites = async () => {
    if (!site?.id || copySaving || sites.length < 2) return;
    setCopySaving(true);
    try {
      await api.post('/api/connect/apply-setup', {
        siteId: site.id,
        applyToAll: true,
        applyToFuture: applyTo !== 'site'
      });
      setConnectBanner(`Copied this payment setup to ${sites.length} sites`);
      await loadStripeStatus(site.id);
    } catch (error) {
      setConnectBanner(error.message || 'Could not copy this setup to other sites');
    } finally {
      setCopySaving(false);
    }
  };

  const toggleDisabled = !isGrowth || !site?.id || payOnSiteSaving || sitesLoading;

  return (
    <div className="payment-settings">
      <div className="editor-header">
        <h3>Payment Configuration</h3>
        <p className="form-description">
          Choose how this site takes payment. You can keep it unique, reuse it on future sites,
          or copy it to every site you already have.
        </p>
      </div>

      {sites.length > 0 && (
        <label className="payment-site-picker">
          <span>Site</span>
          <select
            value={site?.id || ''}
            onChange={handleSiteChange}
            disabled={sitesLoading}
            data-testid="payment-site-select"
          >
            {sites.map((item) => (
              <option key={item.id} value={item.id}>
                {siteLabel(item)}
              </option>
            ))}
          </select>
        </label>
      )}

      <fieldset className="payment-apply-to" data-testid="payment-apply-to">
        <legend>When you connect a provider</legend>
        <label>
          <input
            type="radio"
            name="payment-apply-to"
            value="site"
            checked={applyTo === 'site'}
            onChange={() => setApplyTo('site')}
            data-testid="payment-apply-site"
          />
          This site only
        </label>
        <label>
          <input
            type="radio"
            name="payment-apply-to"
            value="future"
            checked={applyTo === 'future'}
            onChange={() => setApplyTo('future')}
            data-testid="payment-apply-future"
          />
          This site and future sites
        </label>
        <label>
          <input
            type="radio"
            name="payment-apply-to"
            value="all"
            checked={applyTo === 'all'}
            onChange={() => setApplyTo('all')}
            data-testid="payment-apply-all"
          />
          All current and future sites
        </label>
      </fieldset>

      {connectBanner && (
        <p
          className="processor-action-success"
          data-testid="processor-oauth-banner"
        >
          {connectBanner}
        </p>
      )}

      <ProcessorConnectList
        siteId={site?.id}
        status={statusData}
        isGrowth={isGrowth}
        isProcessing={isProcessing || stripeStatus === 'loading'}
        setIsProcessing={setIsProcessing}
        onStatusChange={() => loadStripeStatus(site?.id)}
        applyTo={applyTo}
      />

      {site?.id && (
        <div className="stripe-status-card payment-reuse-card">
          <div className="status-header">
            <h4>Reuse this setup</h4>
          </div>
          <p className="status-message">
            New sites start without payments unless you opt in. You can also copy this site’s
            processors onto every site you already published.
          </p>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={futureEnabled || applyTo === 'future' || applyTo === 'all'}
              onChange={handleFutureToggle}
              disabled={!isGrowth || futureSaving}
              data-testid="payment-future-toggle"
            />
            <span>{futureSaving ? 'Saving...' : 'Use this site’s payments on future sites'}</span>
          </label>
          {sites.length > 1 && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={copyToAllSites}
              disabled={!isGrowth || copySaving}
              data-testid="payment-copy-all"
            >
              {copySaving ? 'Copying…' : 'Copy to all existing sites'}
            </button>
          )}
        </div>
      )}

      <div className="stripe-status-card pay-on-site-card">
        <div className="status-header">
          <h4>Pay on site</h4>
          <div className={`status-badge ${payOnSite ? 'ready' : 'not_started'}`}>
            {payOnSite ? 'Enabled' : 'Off'}
          </div>
        </div>

        <p className="status-message">
          Customers can place an order without a card. You collect cash or payment in person at pickup or visit.
          {site ? ` Applies to ${siteLabel(site)}.` : ''}
        </p>

        {!isGrowth && (
          <p className="pay-on-site-upgrade" data-testid="pay-on-site-upgrade">
            Ordering is available on Growth.{' '}
            <Link to="/pricing">Upgrade to enable pay on site.</Link>
          </p>
        )}

        {isGrowth && !site && !sitesLoading && (
          <p className="pay-on-site-upgrade" data-testid="pay-on-site-no-site">
            Publish a site first, then you can let customers pay on site.{' '}
            <Link to="/setup">Create a site</Link>
          </p>
        )}

        <label className="checkbox-label pay-on-site-toggle">
          <input
            type="checkbox"
            checked={payOnSite}
            onChange={handlePayOnSiteToggle}
            disabled={toggleDisabled}
            data-testid="pay-on-site-toggle"
          />
          <span>{payOnSiteSaving ? 'Saving...' : 'Accept cash or in-person payment'}</span>
        </label>

        {payOnSiteError && (
          <p className="pay-on-site-error" data-testid="pay-on-site-save-error">{payOnSiteError}</p>
        )}
      </div>
    </div>
  );
}

export default PaymentSettings;
