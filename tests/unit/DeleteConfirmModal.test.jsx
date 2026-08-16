import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteConfirmModal from '../../src/components/products/DeleteConfirmModal';
import { renderWithAllProviders } from '../utils/testWrapper.jsx';

const renderModal = (props = {}) =>
  renderWithAllProviders(<DeleteConfirmModal {...props} />);

describe('DeleteConfirmModal', () => {
  it('renders nothing when no product is provided', () => {
    renderModal();
    expect(screen.queryByTestId('delete-modal-overlay')).not.toBeInTheDocument();
  });

  it('displays the product name and calls confirm on delete', async () => {
    const user = userEvent.setup();
    const product = { id: '1', name: 'Premium Widget', price: 99.99 };
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    renderModal({ product, onConfirm, onCancel });

    expect(screen.getByTestId('delete-modal-content')).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('Premium Widget'))).toBeInTheDocument();
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();

    const confirmButton = screen.getByTestId('confirm-delete-btn');
    await user.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('calls cancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const product = { id: '1', name: 'Premium Widget' };
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    renderModal({ product, onConfirm, onCancel });

    const cancelButton = screen.getByTestId('cancel-delete-btn');
    await user.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('disables buttons while deleting', () => {
    const product = { id: '1', name: 'Premium Widget' };

    renderModal({ product, onConfirm: vi.fn(), onCancel: vi.fn(), isDeleting: true });

    expect(screen.getByTestId('confirm-delete-btn')).toBeDisabled();
    expect(screen.getByTestId('cancel-delete-btn')).toBeDisabled();
  });
});
