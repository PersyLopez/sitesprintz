import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../hooks/useToast';
import { Modal } from '../common/Modal';
import api from '../../services/api';
import './CustomDomainSettings.css';

/**
 * Connect a registrar domain. Available on every plan.
 */
export default function CustomDomainSettings({ subdomain }) {
  const { showSuccess } = useToast();
  const [domain, setDomain] = useState('');
  const [domainStatus, setDomainStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);

  const loadDomainStatus = useCallback(async () => {
    if (!subdomain) return;
    try {
      const data = await api.get(`/api/sites/${encodeURIComponent(subdomain)}/domain`);
      setDomainStatus(data);
      if (data?.domain) setDomain(data.domain);
    } catch {
      setDomainStatus({ hasDomain: false });
    }
  }, [subdomain]);

  useEffect(() => {
    loadDomainStatus();
  }, [loadDomainStatus]);

  const handleAddDomain = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await api.post(`/api/sites/${encodeURIComponent(subdomain)}/domain`, { domain });
      setSuccess(data.message || 'Custom domain added. Configure DNS records below.');
      setDomainStatus(data);
      if (data.domain) setDomain(data.domain);
      showSuccess?.('Custom domain added');
    } catch (err) {
      setError(err.message || 'Failed to add domain');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDomain = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/api/sites/${encodeURIComponent(subdomain)}/domain`);
      setSuccess('Custom domain removed');
      setDomain('');
      setDomainStatus({ hasDomain: false });
      setShowConfirmRemove(false);
    } catch (err) {
      setError(err.message || 'Failed to remove domain');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.post(`/api/sites/${encodeURIComponent(subdomain)}/domain/verify`, {});
      setDomainStatus((current) => ({
        ...(current || {}),
        ...data,
        hasDomain: true,
      }));
      if (data.verified) {
        setSuccess('Domain verified. Your site is live on this domain after DNS and HTTPS propagate.');
      } else {
        setError(data.message || 'DNS records are not visible yet. Wait a few minutes and try again.');
      }
    } catch (err) {
      setError(err.message || 'Failed to verify domain');
    } finally {
      setLoading(false);
    }
  };

  const instructions = domainStatus?.instructions;
  const hasDomain = Boolean(domainStatus?.hasDomain && domainStatus?.domain);

  return (
    <div className="custom-domain-settings" data-testid="custom-domain-settings">
      <h3>Custom Domain</h3>
      <p>Connect a domain you already own. Point DNS here, then verify. Available on every plan.</p>

      {error && (
        <div className="alert alert-error" role="alert" data-testid="custom-domain-error">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success" role="status" data-testid="custom-domain-success">
          {success}
        </div>
      )}

      {!hasDomain ? (
        <form onSubmit={handleAddDomain} className="domain-form">
          <div className="form-group">
            <label htmlFor="domain">Domain Name</label>
            <input
              type="text"
              id="domain"
              data-testid="custom-domain-input"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
              required
              title="Enter a valid domain (e.g., example.com)"
            />
            <small>Enter the domain without https or www (e.g., example.com)</small>
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary" data-testid="custom-domain-add">
            {loading ? 'Adding...' : 'Add Domain'}
          </button>
        </form>
      ) : (
        <div className="domain-status" data-testid="custom-domain-status">
          <div className="domain-info">
            <p><strong>Domain:</strong> {domainStatus.domain}</p>
            <p>
              <strong>Status:</strong>
              {' '}
              <span className={`status-badge ${domainStatus.status || 'pending'}`} data-testid="custom-domain-status-value">
                {domainStatus.status || 'pending'}
              </span>
            </p>
            {domainStatus.verified && (
              <p className="verified-note">Verified{domainStatus.verifiedAt ? ` on ${new Date(domainStatus.verifiedAt).toLocaleDateString()}` : ''}</p>
            )}
          </div>

          {instructions && (
            <div className="dns-instructions" data-testid="custom-domain-dns">
              <h4>DNS Configuration</h4>
              <p>Add these DNS records at your registrar:</p>
              <div className="dns-record">
                <div className="dns-record-header">
                  <strong>CNAME Record (www)</strong>
                </div>
                <p>Host: {instructions.cname?.host} → {instructions.cname?.value}</p>
              </div>
              <div className="dns-record">
                <div className="dns-record-header">
                  <strong>A Record (@)</strong>
                </div>
                <p>Host: {instructions.aRecord?.host} → {instructions.aRecord?.value}</p>
              </div>
              {instructions.note && <p>{instructions.note}</p>}
            </div>
          )}

          <div className="domain-actions">
            <button type="button" className="btn btn-primary" disabled={loading} onClick={handleVerify} data-testid="custom-domain-verify">
              {loading ? 'Checking…' : 'Verify DNS'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowConfirmRemove(true)} data-testid="custom-domain-remove">
              Remove domain
            </button>
          </div>
        </div>
      )}

      <Modal
        isOpen={showConfirmRemove}
        onClose={() => setShowConfirmRemove(false)}
        title="Remove Custom Domain"
      >
        <p>Remove this custom domain? Visitors will use your Right Site Light link instead.</p>
        <button type="button" className="btn btn-primary" onClick={handleRemoveDomain} data-testid="custom-domain-remove-confirm">
          Remove
        </button>
      </Modal>
    </div>
  );
}
