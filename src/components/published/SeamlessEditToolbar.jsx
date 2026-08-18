import { Link } from 'react-router-dom';
import './SeamlessEditToolbar.css';

function saveLabel(saveState) {
  if (saveState === 'saving' || saveState === 'pending') return 'Saving…';
  if (saveState === 'error') return 'Save failed — retrying';
  return 'All changes saved';
}

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
}) {
  return (
    <>
      <div className="seamless-edit-toolbar" data-testid="seamless-edit-toolbar" role="region" aria-label="Site editor">
        <div className="seamless-edit-toolbar-cluster">
          <span className="seamless-edit-kicker">Edit mode</span>
          <span className={`seamless-edit-save is-${saveState}`} data-testid="seamless-edit-save-state">
            {saveLabel(saveState)}
          </span>
        </div>
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
