import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LIVE_EDIT_HELP_ROWS, LIVE_EDIT_SCOPE_HINT } from '../../utils/liveEditScope';
import './SeamlessEditToolbar.css';

function saveLabel(saveState) {
  if (saveState === 'saving' || saveState === 'pending') return 'Saving…';
  if (saveState === 'error') return 'Save failed — retrying';
  return 'All changes saved';
}

const SCOPE_LINK_TEST_IDS = {
  settings: 'seamless-edit-scope-settings',
  edit: 'seamless-edit-scope-edit',
  appointments: 'seamless-edit-scope-appointments',
  products: 'seamless-edit-scope-products',
};

function SeamlessEditToolbar({
  saveState,
  canUndo,
  onUndo,
  onOpenHistory,
  historyOpen,
  history,
  historyError,
  selectedVersion,
  onSelectVersion,
  onCloseHistory,
  onRestore,
  restoring,
  formatHistoryTime,
  dashboardHref = '/dashboard',
  settingsHref,
  builderHref,
  appointmentsHref,
  productsHref,
  unboundHint = '',
}) {
  const [scopeOpen, setScopeOpen] = useState(false);

  const scopeHrefs = {
    settings: settingsHref,
    edit: builderHref,
    appointments: appointmentsHref,
    products: productsHref,
  };

  return (
    <>
      <div className="seamless-edit-toolbar" data-testid="seamless-edit-toolbar" role="region" aria-label="Site editor">
        <div className="seamless-edit-toolbar-cluster">
          <span className="seamless-edit-kicker">Edit mode</span>
          <span className={`seamless-edit-save is-${saveState}`} data-testid="seamless-edit-save-state">
            {saveLabel(saveState)}
          </span>
        </div>
        <div className="seamless-edit-scope-row">
          <p className="seamless-edit-scope-hint" data-testid="seamless-edit-scope">
            {unboundHint || LIVE_EDIT_SCOPE_HINT}
          </p>
          <button
            type="button"
            className="seamless-edit-btn seamless-edit-scope-toggle"
            onClick={() => setScopeOpen((open) => !open)}
            aria-expanded={scopeOpen}
            aria-controls="seamless-edit-scope-panel"
            data-testid="seamless-edit-scope-toggle"
          >
            Where to edit
          </button>
        </div>
        {scopeOpen && (
          <div
            id="seamless-edit-scope-panel"
            className="seamless-edit-scope-panel"
            data-testid="seamless-edit-scope-panel"
            role="region"
            aria-label="Where to edit site content"
          >
            <ul className="seamless-edit-scope-links">
              {LIVE_EDIT_HELP_ROWS.map((row) => (
                <li key={row.key}>
                  <Link
                    to={scopeHrefs[row.key] || dashboardHref}
                    className="seamless-edit-scope-link"
                    data-testid={SCOPE_LINK_TEST_IDS[row.key]}
                  >
                    <strong>{row.title}</strong>
                  </Link>
                </li>
              ))}
            </ul>
            {unboundHint ? (
              <p className="seamless-edit-scope-unbound" data-testid="seamless-edit-scope-unbound">
                {unboundHint}
              </p>
            ) : null}
          </div>
        )}
        <div className="seamless-edit-toolbar-actions">
          <button type="button" className="seamless-edit-btn" onClick={onUndo} disabled={!canUndo} data-testid="seamless-edit-undo">
            Undo
          </button>
          <button type="button" className="seamless-edit-btn" onClick={onOpenHistory} data-testid="seamless-edit-history">
            Restore
          </button>
          <Link to={dashboardHref} className="seamless-edit-btn seamless-edit-btn-secondary">
            Dashboard
          </Link>
        </div>
      </div>

      {historyOpen && (
        <div className="seamless-history" data-testid="seamless-edit-history-panel" role="dialog" aria-labelledby="seamless-history-title">
          <div className="seamless-history-card">
            <div className="seamless-history-header">
              <h2 id="seamless-history-title">Restore a previous version</h2>
              <button type="button" className="seamless-edit-btn" onClick={onCloseHistory} aria-label="Close history">
                Close
              </button>
            </div>
            {historyError ? <p className="seamless-history-error">{historyError}</p> : null}
            <ul className="seamless-history-list">
              {history.length === 0 && !historyError ? (
                <li className="seamless-history-empty">No saved versions yet. Edit text on the page and it will auto-save here.</li>
              ) : history.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`seamless-history-item${selectedVersion === item.id ? ' is-selected' : ''}`}
                    onClick={() => onSelectVersion(item.id)}
                  >
                    <strong>{item.description || `Version ${item.version}`}</strong>
                    <span>{formatHistoryTime(item.timestamp)}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="seamless-edit-btn seamless-edit-btn-primary"
              onClick={onRestore}
              disabled={!selectedVersion || restoring}
              data-testid="seamless-edit-restore"
            >
              {restoring ? 'Restoring…' : 'Restore selected'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default SeamlessEditToolbar;
