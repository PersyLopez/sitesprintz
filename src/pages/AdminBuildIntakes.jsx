import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import Header from '../components/layout/Header';
import AdminSubnav from '../components/admin/AdminSubnav';
import Footer from '../components/layout/Footer';
import './AdminUsers.css';
import './AdminCandidates.css';

function authHeaders(token, json = false) {
  const headers = {
    Authorization: `Bearer ${token || localStorage.getItem('accessToken')}`,
  };
  if (json) headers['Content-Type'] = 'application/json';
  return headers;
}

function AdminBuildIntakes() {
  const { token } = useAuth();
  const { showError, showSuccess } = useToast();
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadList = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/build-intake', { headers: authHeaders(token) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load intakes');
      }
      setRows(data.data?.submissions || data.submissions || []);
    } catch (err) {
      showError(err.message || 'Failed to load intakes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load on mount / token
  }, [token]);

  const openRow = async (id) => {
    try {
      const response = await fetch(`/api/build-intake/${id}`, { headers: authHeaders(token) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load intake');
      }
      const submission = data.data?.submission || data.submission;
      setSelected(submission);
      if (submission?.status === 'unread') {
        await patchStatus(id, 'in_progress', false);
      }
    } catch (err) {
      showError(err.message || 'Failed to load intake');
    }
  };

  const patchStatus = async (id, status, reload = true) => {
    try {
      const response = await fetch(`/api/build-intake/${id}`, {
        method: 'PATCH',
        headers: authHeaders(token, true),
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      showSuccess(`Marked ${status}`);
      if (reload) await loadList();
      if (selected?.id === id) {
        setSelected((prev) => (prev ? { ...prev, status } : prev));
      }
    } catch (err) {
      showError(err.message || 'Failed to update status');
    }
  };

  const resendOps = async (id) => {
    try {
      const response = await fetch(`/api/build-intake/${id}/resend-ops`, {
        method: 'POST',
        headers: authHeaders(token, true),
        body: '{}',
      });
      if (!response.ok) {
        throw new Error('Could not resend ops email');
      }
      showSuccess('Ops email sent');
      await loadList();
    } catch (err) {
      showError(err.message || 'Could not resend ops email');
    }
  };

  const payload = selected?.data && typeof selected.data === 'object' ? selected.data : {};

  return (
    <div className="admin-users-page">
      <Header />
      <AdminSubnav />
      <main className="admin-users-container">
        <div className="admin-users-header">
          <div className="header-content">
            <h1>Build intakes</h1>
            <p>We-build form packets — newest first. Match on contact email if you see doubles.</p>
          </div>
          <div className="header-actions">
            <Link to="/dashboard" className="btn btn-secondary">Back</Link>
          </div>
        </div>

        <div className="users-table-container">
          {loading ? <p>Loading…</p> : (
            <table className="users-table" data-testid="build-intakes-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Business</th>
                  <th>Contact</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.submittedAt ? new Date(row.submittedAt).toLocaleString() : ''}</td>
                    <td>{row.businessName}</td>
                    <td>{row.contactEmail}</td>
                    <td>{row.recommendedPlan}</td>
                    <td>{row.status}</td>
                    <td>
                      <button type="button" className="btn btn-secondary" onClick={() => openRow(row.id)}>
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selected ? (
          <section className="invite-section" data-testid="build-intake-detail">
            <h2>{payload.businessName || 'Intake'} — {selected.status}</h2>
            <p>{payload.contactName} · {payload.contactEmail} · {payload.recommendedPlan}</p>
            <div className="header-actions" style={{ margin: '12px 0', gap: '8px', display: 'flex', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary" onClick={() => patchStatus(selected.id, 'in_progress')}>
                In progress
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => patchStatus(selected.id, 'done')}>
                Done
              </button>
              {selected.status === 'notify_failed' ? (
                <button type="button" className="btn btn-primary" onClick={() => resendOps(selected.id)}>
                  Resend ops email
                </button>
              ) : null}
            </div>
            {payload.coverPhotoUrl ? (
              <p>
                Cover: <a href={payload.coverPhotoUrl}>{payload.coverPhotoUrl}</a>
              </p>
            ) : null}
            <pre style={{ whiteSpace: 'pre-wrap', overflow: 'auto', maxHeight: '480px' }}>
              {JSON.stringify(payload, null, 2)}
            </pre>
          </section>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}

export default AdminBuildIntakes;
