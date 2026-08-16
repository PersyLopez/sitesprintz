import './DeleteConfirmModal.css';

function DeleteConfirmModal({ product, onConfirm, onCancel, isDeleting = false }) {
  if (!product) return null;

  return (
    <div className="modal-overlay" onClick={onCancel} data-testid="delete-modal-overlay">
      <div
        className="modal-content delete-confirm-modal"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-labelledby="delete-modal-title"
        aria-describedby="delete-modal-message"
        data-testid="delete-modal-content"
      >
        <div className="modal-header">
          <h2 id="delete-modal-title">Delete product?</h2>
          <button type="button" className="close-btn" onClick={onCancel} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-body">
          <p id="delete-modal-message">
            Are you sure you want to delete <strong>{product.name || 'Untitled Product'}</strong>?
          </p>
          <p className="delete-modal-detail">
            This will remove it from your catalog and published site. This action cannot be undone.
          </p>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
            disabled={isDeleting}
            data-testid="cancel-delete-btn"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn btn-danger"
            disabled={isDeleting}
            data-testid="confirm-delete-btn"
          >
            {isDeleting ? 'Deleting…' : 'Delete Product'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmModal;
