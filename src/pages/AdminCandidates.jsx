import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import './AdminUsers.css';
import './AdminCandidates.css';

const NICHES = [
  { value: 'salon', label: 'Salon' },
  { value: 'gym', label: 'Gym' },
  { value: 'pet-care', label: 'Pet care' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'bakery/food-stall', label: 'Bakery / food stall' },
  { value: 'plumber', label: 'Plumber' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'auto-repair', label: 'Auto repair' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'keyword', label: 'Keyword' },
];

const QUEUE_STATUSES = ['queued', 'saved', 'rejected'];
const PLACES_KEY_MESSAGE =
  'Set GOOGLE_PLACES_API_KEY to search Places. You can still add people by hand.';

const EMPTY_MANUAL = {
  name: '',
  mapsUrl: '',
  address: '',
  city: '',
  phone: '',
  email: '',
  niche: 'salon',
  notes: '',
};

function authHeaders(token, json = false) {
  const headers = {
    Authorization: `Bearer ${token || localStorage.getItem('accessToken')}`,
  };
  if (json) headers['Content-Type'] = 'application/json';
  return headers;
}

function formatReasons(reasons) {
  if (!reasons) return '';
  const list = Array.isArray(reasons) ? reasons : [String(reasons)];
  return list.slice(0, 2).join('; ');
}

function formatRating(row) {
  const rating = row.rating ?? '—';
  const reviews = row.review_count ?? row.reviews ?? 0;
  return `${rating} / ${reviews}`;
}

function parseCandidates(data) {
  if (Array.isArray(data)) return data;
  return data?.candidates || [];
}

function AdminCandidates() {
  const { token } = useAuth();
  const { showError, showSuccess } = useToast();

  const [city, setCity] = useState('');
  const [niche, setNiche] = useState('salon');
  const [keyword, setKeyword] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [results, setResults] = useState([]);
  const [savingIndex, setSavingIndex] = useState(null);
  const [savingFits, setSavingFits] = useState(false);

  const [manual, setManual] = useState(EMPTY_MANUAL);
  const [manualSubmitting, setManualSubmitting] = useState(false);

  const [queue, setQueue] = useState([]);
  const [queueStatus, setQueueStatus] = useState('queued');
  const [queueLoading, setQueueLoading] = useState(true);
  const [prospectingId, setProspectingId] = useState(null);
  const [claimLinks, setClaimLinks] = useState({});

  const loadQueue = async (status = queueStatus) => {
    setQueueLoading(true);
    try {
      const response = await fetch(`/api/outreach/candidates?status=${encodeURIComponent(status)}`, {
        headers: authHeaders(token),
      });
      if (!response.ok) {
        throw new Error('Failed to load candidates');
      }
      const data = await response.json();
      setQueue(parseCandidates(data));
    } catch {
      showError('Failed to load candidates');
      setQueue([]);
    } finally {
      setQueueLoading(false);
    }
  };

  useEffect(() => {
    loadQueue(queueStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueStatus, token]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!city.trim()) {
      showError('City is required');
      return;
    }

    setSearching(true);
    setSearchError('');
    setResults([]);

    try {
      const response = await fetch('/api/outreach/search', {
        method: 'POST',
        headers: authHeaders(token, true),
        body: JSON.stringify({
          city: city.trim(),
          niche,
          keyword: keyword.trim(),
        }),
      });

      if (response.status === 503) {
        setSearchError(PLACES_KEY_MESSAGE);
        return;
      }

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(parseCandidates(data));
    } catch {
      showError('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const importCandidates = async (candidates) => {
    const response = await fetch('/api/outreach/candidates/import', {
      method: 'POST',
      headers: authHeaders(token, true),
      body: JSON.stringify({ candidates }),
    });
    if (!response.ok) {
      throw new Error('Import failed');
    }
    await loadQueue();
  };

  const handleSaveRow = async (row, index) => {
    setSavingIndex(index);
    try {
      await importCandidates([row]);
      showSuccess(`Saved ${row.name || 'candidate'}`);
    } catch {
      showError('Failed to save candidate');
    } finally {
      setSavingIndex(null);
    }
  };

  const handleSaveFits = async () => {
    const fits = results.filter((row) => (row.score ?? 0) >= 50);
    if (fits.length === 0) {
      showError('No results with score 50 or higher');
      return;
    }
    setSavingFits(true);
    try {
      await importCandidates(fits);
      showSuccess(`Saved ${fits.length} fit${fits.length === 1 ? '' : 's'}`);
    } catch {
      showError('Failed to save fits');
    } finally {
      setSavingFits(false);
    }
  };

  const handleManualChange = (field) => (e) => {
    setManual((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manual.name.trim()) {
      showError('Name is required');
      return;
    }

    const hasLocation =
      Boolean(manual.mapsUrl.trim()) ||
      Boolean(manual.address.trim()) ||
      Boolean(manual.city.trim()) ||
      Boolean(manual.phone.trim());
    if (!hasLocation) {
      showError('Need a location signal: address, city, phone, mapsUrl, or placeId');
      return;
    }

    setManualSubmitting(true);
    try {
      const response = await fetch('/api/outreach/candidates', {
        method: 'POST',
        headers: authHeaders(token, true),
        body: JSON.stringify({
          name: manual.name.trim(),
          mapsUrl: manual.mapsUrl.trim() || undefined,
          address: manual.address.trim() || undefined,
          city: manual.city.trim() || undefined,
          phone: manual.phone.trim() || undefined,
          email: manual.email.trim() || undefined,
          niche: manual.niche,
          notes: manual.notes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add candidate');
      }

      showSuccess(`Added ${manual.name.trim()}`);
      setManual(EMPTY_MANUAL);
      await loadQueue();
    } catch {
      showError('Failed to add candidate');
    } finally {
      setManualSubmitting(false);
    }
  };

  const handleStatusPatch = async (id, status) => {
    try {
      const response = await fetch(`/api/outreach/candidates/${id}`, {
        method: 'PATCH',
        headers: authHeaders(token, true),
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      showSuccess(`Marked ${status}`);
      await loadQueue();
    } catch {
      showError('Failed to update status');
    }
  };

  const handleCreateProspect = async (id) => {
    setProspectingId(id);
    try {
      const response = await fetch(`/api/outreach/candidates/${id}/prospect`, {
        method: 'POST',
        headers: authHeaders(token, true),
      });
      if (!response.ok) {
        throw new Error('Failed to create prospect site');
      }
      const data = await response.json();
      setClaimLinks((prev) => ({
        ...prev,
        [id]: {
          claimUrl: data.claimUrl,
          siteId: data.siteId,
          subdomain: data.subdomain,
        },
      }));
      showSuccess('Prospect site ready. Copy the claim link.');
    } catch {
      showError('Failed to create prospect site');
    } finally {
      setProspectingId(null);
    }
  };

  const handleCopyClaimUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      showSuccess('Claim link copied');
    } catch {
      showError('Could not copy claim link');
    }
  };

  const fitsCount = results.filter((row) => (row.score ?? 0) >= 50).length;

  return (
    <div className="admin-users-page">
      <Header />

      <main className="admin-users-container">
        <div className="admin-users-header">
          <div className="header-content">
            <h1>Candidates</h1>
            <p>Find local businesses and queue people you spotted</p>
          </div>
          <div className="header-actions">
            <Link to="/admin" className="btn btn-secondary">
              Admin Dashboard
            </Link>
            <Link to="/dashboard" className="btn btn-secondary">
              Back
            </Link>
          </div>
        </div>

        <div className="invite-section">
          <h2>Finder</h2>
          <form onSubmit={handleSearch} className="invite-form">
            <div className="form-group">
              <label htmlFor="finder-city">City</label>
              <input
                id="finder-city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Miami"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="finder-niche">Niche</label>
              <select
                id="finder-niche"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
              >
                {NICHES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="finder-keyword">Keyword</label>
              <input
                id="finder-keyword"
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={searching}
              data-testid="candidates-search"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </form>

          {searchError && (
            <p className="candidates-banner" role="status">{searchError}</p>
          )}

          {results.length > 0 && (
            <>
              <div className="candidates-table-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleSaveFits}
                  disabled={savingFits || fitsCount === 0}
                >
                  {savingFits ? 'Saving...' : 'Save fits (score ≥ 50)'}
                </button>
              </div>
              <div className="users-table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Address</th>
                      <th>Phone</th>
                      <th>Website</th>
                      <th>Rating</th>
                      <th>Score</th>
                      <th>Reasons</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row, index) => (
                      <tr key={row.place_id || row.placeId || `${row.name}-${index}`}>
                        <td>{row.name}</td>
                        <td>{row.address}</td>
                        <td>{row.phone}</td>
                        <td>{row.website_kind || '—'}</td>
                        <td>{formatRating(row)}</td>
                        <td>{row.score ?? '—'}</td>
                        <td className="candidates-reasons">{formatReasons(row.reasons)}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => handleSaveRow(row, index)}
                            disabled={savingIndex === index}
                          >
                            {savingIndex === index ? 'Saving...' : 'Save'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="invite-section">
          <h2>Someone I found</h2>
          <form onSubmit={handleManualSubmit} className="candidates-manual-form">
            <div className="form-group">
              <label htmlFor="manual-name">Name</label>
              <input
                id="manual-name"
                type="text"
                value={manual.name}
                onChange={handleManualChange('name')}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="manual-mapsUrl">Maps URL</label>
              <input
                id="manual-mapsUrl"
                type="url"
                value={manual.mapsUrl}
                onChange={handleManualChange('mapsUrl')}
                placeholder="https://maps.google.com/..."
              />
            </div>
            <div className="form-group">
              <label htmlFor="manual-address">Address</label>
              <input
                id="manual-address"
                type="text"
                value={manual.address}
                onChange={handleManualChange('address')}
              />
            </div>
            <div className="form-group">
              <label htmlFor="manual-city">City</label>
              <input
                id="manual-city"
                type="text"
                value={manual.city}
                onChange={handleManualChange('city')}
              />
            </div>
            <div className="form-group">
              <label htmlFor="manual-phone">Phone</label>
              <input
                id="manual-phone"
                type="tel"
                value={manual.phone}
                onChange={handleManualChange('phone')}
              />
            </div>
            <div className="form-group">
              <label htmlFor="manual-email">Email</label>
              <input
                id="manual-email"
                type="email"
                value={manual.email}
                onChange={handleManualChange('email')}
              />
            </div>
            <div className="form-group">
              <label htmlFor="manual-niche">Niche</label>
              <select
                id="manual-niche"
                value={manual.niche}
                onChange={handleManualChange('niche')}
              >
                {NICHES.filter((option) => option.value !== 'keyword').map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group candidates-notes">
              <label htmlFor="manual-notes">Notes</label>
              <textarea
                id="manual-notes"
                value={manual.notes}
                onChange={handleManualChange('notes')}
                rows={2}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={manualSubmitting}
              data-testid="candidates-manual-submit"
            >
              {manualSubmitting ? 'Adding...' : 'Add person'}
            </button>
          </form>
        </div>

        <div className="users-section">
          <div className="section-header">
            <h2>Queue</h2>
            <div className="filters">
              {QUEUE_STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`filter-select candidates-chip ${queueStatus === status ? 'active' : ''}`}
                  onClick={() => setQueueStatus(status)}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {queueLoading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading queue...</p>
            </div>
          ) : queue.length > 0 ? (
            <div className="users-table-container">
              <table className="users-table" data-testid="candidates-queue">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Address</th>
                    <th>Phone</th>
                    <th>Niche</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.address}</td>
                      <td>{item.phone}</td>
                      <td>{item.niche}</td>
                      <td>{item.score ?? '—'}</td>
                      <td>
                        <span className={`status-badge status-${item.status || 'queued'}`}>
                          {item.status || 'queued'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          {(item.status === 'queued' || item.status === 'saved') && (
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => handleCreateProspect(item.id)}
                              disabled={prospectingId === item.id}
                              data-testid="candidate-create-prospect"
                            >
                              {prospectingId === item.id ? 'Creating...' : 'Create prospect'}
                            </button>
                          )}
                          {item.status !== 'saved' && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => handleStatusPatch(item.id, 'saved')}
                            >
                              Saved
                            </button>
                          )}
                          {item.status !== 'rejected' && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => handleStatusPatch(item.id, 'rejected')}
                            >
                              Rejected
                            </button>
                          )}
                        </div>
                        {claimLinks[item.id]?.claimUrl && (
                          <div className="candidates-claim">
                            <code data-testid="candidate-claim-url">{claimLinks[item.id].claimUrl}</code>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => handleCopyClaimUrl(claimLinks[item.id].claimUrl)}
                            >
                              Copy
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state" data-testid="candidates-queue">
              <h3>No candidates</h3>
              <p>Search Places or add someone you found.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default AdminCandidates;
