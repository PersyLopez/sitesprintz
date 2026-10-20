import React, { useState, useEffect } from 'react';
import { useSiteWorkspace } from '../context/SiteWorkspaceContext';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import SkeletonLoader from '../components/common/SkeletonLoader';
import { api } from '../services/api';
import './Orders.css';

const INQUIRY_KIND_LABELS = {
  'zip-check': 'ZIP check',
  'package-quote': 'Package quote',
  'diagnostic-quote': 'Estimate',
  inquiry: 'Inquiry',
  'plan-request': 'Plan request',
  'class-request': 'Class request',
};

export function inquiryKindLabel(type) {
  const key = String(type || 'contact');
  if (key === 'contact') return '';
  return INQUIRY_KIND_LABELS[key] || key.replace(/-/g, ' ');
}

function Inquiries() {
  const { embedded, site, refreshUnreadMessages } = useSiteWorkspace();
  const { loading: authLoading } = useAuth();
  const { showError } = useToast();

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const subdomain = site?.subdomain;

  useEffect(() => {
    if (authLoading) return;

    if (subdomain) {
      loadSubmissions();
    } else {
      setLoadError('No site selected. Please select a site from your dashboard.');
      setLoading(false);
    }
  }, [subdomain, authLoading]);

  const loadSubmissions = async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const data = await api.get(`/api/submissions/site/${subdomain}`);
      setSubmissions(data.submissions || []);
    } catch (error) {
      setLoadError('Failed to load messages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (submission) => {
    if (submission.status === 'read') return;

    try {
      await api.patch(`/api/submissions/${submission.id}/read`, {});
      setSubmissions((prev) => prev.map((s) => (
        s.id === submission.id ? { ...s, status: 'read' } : s
      )));
      refreshUnreadMessages();
    } catch (error) {
      showError('Failed to mark message as read');
    }
  };

  const archiveMessage = async (submission, event) => {
    event.stopPropagation();
    try {
      await api.patch(`/api/submissions/${submission.id}/archive`, {});
      setSubmissions((prev) => prev.filter((s) => s.id !== submission.id));
      if (submission.status === 'unread') {
        refreshUnreadMessages();
      }
    } catch (error) {
      showError('Failed to archive message');
    }
  };

  const Container = embedded ? 'div' : 'main';
  const PageTitle = embedded ? 'h2' : 'h1';

  return (
    <div className={`orders-page${embedded ? ' embedded-page' : ''}`}>
      <Container className="orders-container">
        <div className={`page-header${embedded ? ' pane-quiet-header' : ''}`}>
          <div className="header-title">
            <PageTitle>Messages</PageTitle>
            <p>{submissions.length} contact {submissions.length === 1 ? 'message' : 'messages'}</p>
          </div>
        </div>

        {loading ? (
          <div className="orders-loading" aria-busy="true" aria-label="Loading messages...">
            <span className="sr-only">Loading messages...</span>
            <SkeletonLoader variant="table" lines={5} />
          </div>
        ) : loadError ? (
          <div className="empty-state orders-error-state">
            <h2 className="empty-state-title">Could Not Load Messages</h2>
            <p className="empty-state-description">{loadError}</p>
            <button type="button" onClick={loadSubmissions} className="btn btn-primary">
              Retry
            </button>
          </div>
        ) : submissions.length === 0 ? (
          <div className="empty-state" data-testid="site-inquiries-empty">
            <h2 className="empty-state-title">No Messages Yet</h2>
            <p className="empty-state-description">
              Contact form submissions from your site will appear here.
            </p>
          </div>
        ) : (
          <div className="orders-table-container">
            <table className="orders-table" data-testid="site-inquiries">
              <thead>
                <tr>
                  <th scope="col">From</th>
                  <th scope="col">Message</th>
                  <th scope="col">Received</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission) => (
                  <tr
                    key={submission.id}
                    data-testid="site-inquiry-row"
                    onClick={() => markRead(submission)}
                    tabIndex="0"
                    aria-label={`Message from ${submission.name || 'Visitor'}`}
                    onKeyDown={(event) => {
                      if (event.target.closest('button')) return;
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        markRead(submission);
                      }
                    }}
                  >
                    <td>
                      <div className="orders-table-customer">
                        <strong>{submission.name || 'Visitor'}</strong>
                        {inquiryKindLabel(submission.type) ? (
                          <span data-testid="site-inquiry-kind">{inquiryKindLabel(submission.type)}</span>
                        ) : null}
                        {submission.email && <span>{submission.email}</span>}
                        {submission.phone && (
                          <span data-testid="site-inquiry-phone">{submission.phone}</span>
                        )}
                      </div>
                    </td>
                    <td>{submission.message}</td>
                    <td>{new Date(submission.submittedAt).toLocaleString()}</td>
                    <td>
                      {submission.status === 'unread' && (
                        <span className="orders-status-badge">New</span>
                      )}
                      <button
                        type="button"
                        className="orders-status-badge"
                        data-testid="site-inquiry-archive"
                        aria-label={`Archive message from ${submission.name || 'visitor'}`}
                        onClick={(event) => archiveMessage(submission, event)}
                      >
                        Archive
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Container>
    </div>
  );
}

export default Inquiries;
