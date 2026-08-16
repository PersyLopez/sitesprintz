import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { Modal } from '../common/Modal';
import { hasFeature, FEATURES } from '../../utils/planFeatures.js';
import './CustomDomainSettings.css';

/**
 * CustomDomainSettings Component
 * Allows Pro tier users to connect their own custom domain
 */
export default function CustomDomainSettings({ subdomain }) {
  const { user } = useAuth();
  const { showSuccess } = useToast();
  const [domain, setDomain] = useState('');
  const [domainStatus, setDomainStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);

  const plan =
    user?.subscriptionPlan ||
    user?.subscription_plan ||
    user?.subscription?.plan ||
    user?.plan ||
    'trial';
  const hasCustomDomainFeature = hasFeature(plan, FEATURES.CUSTOM_DOMAIN);

  // Load domain status on mount
  useEffect(() => {
    if (hasCustomDomainFeature && subdomain) {
      loadDomainStatus();
    }
  }, [subdomain, hasCustomDomainFeature]);

  const loadDomainStatus = async () => {
    try {
      const response = await fetch(`/api/sites/${subdomain}/domain`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || localStorage.getItem('authToken') || localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDomainStatus(data.data || null);
        if (data.data?.domain) {
          setDomain(data.data.domain);
        }
      }
    } catch (err) {
      console.error('Error loading domain status:', err);
    }
  };

  const handleAddDomain = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/sites/${subdomain}/domain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || localStorage.getItem('authToken') || localStorage.getItem('token')}`
        },
        body: JSON.stringify({ domain })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Custom domain added successfully! Please configure DNS records below.');
        await loadDomainStatus();
      } else {
        setError(data.message || 'Failed to add domain');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDomain = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sites/${subdomain}/domain`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || localStorage.getItem('authToken') || localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setSuccess('Custom domain removed successfully');
        setDomain('');
        setShowConfirmRemove(false);
        await loadDomainStatus();
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to remove domain');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sites/${subdomain}/domain/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || localStorage.getItem('authToken') || localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        if (data.data?.verified) {
          setSuccess('Domain verified successfully! Your site should be accessible on your custom domain shortly.');
        } else {
          setError('DNS records not yet configured. Please add the DNS records below and try again.');
        }
        await loadDomainStatus();
      } else {
        setError(data.message || 'Verification failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(null), 2000);
  };

  const handleRemoveClick = () => {
    setShowConfirmRemove(true);
  };

  if (!hasCustomDomainFeature) {
    return (
      <div className="custom-domain-upgrade">
        <h3>Custom Domain</h3>
        <p>Connect your own domain (e.g., yourdomain.com) to your site.</p>
        <p className="upgrade-note">
          <strong>Growth plan required.</strong> Upgrade to Growth to connect your custom domain.
        </p>
      </div>
    );
  }

  const instructions = domainStatus?.instructions;

  return (
    <div className="custom-domain-settings">
      <h3>Custom Domain</h3>
      <p>Connect your own domain to your site. You'll need to purchase a domain from a registrar (GoDaddy, Namecheap, etc.) first.</p>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      {!domainStatus?.hasDomain ? (
        <form onSubmit={handleAddDomain} className="domain-form">
          <div className="form-group">
            <label htmlFor="domain">Domain Name</label>
            <input
              type="text"
              id="domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
              required
              pattern="^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$"
              title="Enter a valid domain (e.g., example.com)"
            />
            <small>Enter your domain without www (e.g., example.com)</small>
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Adding...' : 'Add Domain'}
          </button>
        </form>
      ) : (
        <div className="domain-status">
          <div className="domain-info">
            <p><strong>Domain:</strong> {domainStatus.domain}</p>
            <p><strong>Status:</strong> 
              <span className={`status-badge ${domainStatus.status}`}>
                {domainStatus.status}
              </span>
            </p>
            {domainStatus.verified && (
              <p className="verified-note">✓ Domain verified on {new Date(domainStatus.verifiedAt).toLocaleDateString()}</p>
            )}
          </div>

          {instructions && (
            <div className="dns-instructions">
              <h4>DNS Configuration</h4>
              <p>Add these DNS records at your domain registrar:</p>

              <div className="dns-record">
                <div className="dns-record-header">
                  <strong>CNAME Record (for www subdomain)</strong>
                  <button 
                    onClick={() => copyToClipboard(instructions.cname.value)}
                    className="btn-copy"
                  >
                    Copy
                  </button>
                </div>
                <div className="dns-record-details">
                  <p><strong>Type:</strong> {instructions.cname.type}</p>
                  <p><strong>Host:</strong> {instructions.cname.host}</p>
                  <p><strong>Value:</strong> <code>{instructions.cname.value}</code></p>
                  <p className="dns-note">{instructions.cname.description}</p>
                </div>
              </div>

              <div className="dns-record">
                <div className="dns-record-header">
                  <strong>A Record (for root domain)</strong>
                  <button 
                    onClick={() => copyToClipboard(instructions.aRecord.value)}
                    className="btn-copy"
                  >
                    Copy
                  </button>
                </div>
                <div className="dns-record-details">
                  <p><strong>Type:</strong> {instructions.aRecord.type}</p>
                  <p><strong>Host:</strong> {instructions.aRecord.host}</p>
                  <p><strong>Value:</strong> <code>{instructions.aRecord.value}</code></p>
                  <p className="dns-note">{instructions.aRecord.description}</p>
                </div>
              </div>

              <p className="dns-note">{instructions.note}</p>
            </div>
          )}

          <div className="domain-actions">
            <button 
              onClick={handleVerify}
              disabled={loading}
              className="btn btn-secondary"
            >
              {loading ? 'Verifying...' : 'Verify DNS'}
            </button>
            <button 
              onClick={handleRemoveClick}
              disabled={loading}
              className="btn btn-danger"
            >
              Remove Domain
            </button>
          </div>
        </div>
      )}

      <Modal
        isOpen={showConfirmRemove}
        onClose={() => setShowConfirmRemove(false)}
        title="Remove Custom Domain"
      >
        <div className="modal-body">
          <p>Are you sure you want to remove this custom domain? Your site will no longer be accessible at this domain.</p>
          <div className="modal-actions">
            <button onClick={() => setShowConfirmRemove(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={handleRemoveDomain} className="btn btn-danger">Remove Domain</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

