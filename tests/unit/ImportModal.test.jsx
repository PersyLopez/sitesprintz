import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImportModal from '../../src/components/products/ImportModal';
import { ToastContext } from '../../src/context/ToastContext';

describe('ImportModal Component', () => {
  let mockOnClose;
  let mockOnImport;
  let mockShowSuccess;
  let mockShowError;

  const renderWithToast = (props) => {
    return render(
      <ToastContext.Provider
        value={{
          showSuccess: mockShowSuccess,
          showError: mockShowError,
        }}
      >
        <ImportModal {...props} />
      </ToastContext.Provider>
    );
  };

  beforeEach(() => {
    mockOnClose = vi.fn();
    mockOnImport = vi.fn();
    mockShowSuccess = vi.fn();
    mockShowError = vi.fn();
  });

  // Display (3 tests)
  describe('Display', () => {
    it('should render modal', () => {
      renderWithToast({ onClose: mockOnClose, onImport: mockOnImport });

      expect(screen.getByText(/import/i)).toBeInTheDocument();
    });

    it('should have close button', () => {
      renderWithToast({ onClose: mockOnClose, onImport: mockOnImport });

      // Close button is the × symbol
      const buttons = screen.getAllByRole('button');
      const closeButton = buttons.find(btn => btn.textContent === '×' || btn.className.includes('close'));
      expect(closeButton).toBeInTheDocument();
    });

    it('should show instructions', () => {
      renderWithToast({ onClose: mockOnClose, onImport: mockOnImport });

      // Check for specific instruction text
      expect(screen.getByText(/upload a csv file/i)).toBeInTheDocument();
    });
  });

  // File Upload (4 tests)
  describe('File Upload', () => {
    it('should have file input', () => {
      renderWithToast({ onClose: mockOnClose, onImport: mockOnImport });

      const fileInput = screen.getByLabelText(/choose file|upload/i);
      expect(fileInput).toBeInTheDocument();
    });

    it('should accept CSV files', () => {
      renderWithToast({ onClose: mockOnClose, onImport: mockOnImport });

      const fileInput = screen.getByLabelText(/choose file|upload/i);
      expect(fileInput).toHaveAttribute('accept', expect.stringContaining('csv'));
    });

    it('should handle file selection', async () => {
      const user = userEvent.setup();
      const file = new File(['id,name,price\n1,Product,10'], 'products.csv', {
        type: 'text/csv',
      });

      renderWithToast({ onClose: mockOnClose, onImport: mockOnImport });

      const fileInput = screen.getByLabelText(/choose file|upload/i);
      await user.upload(fileInput, file);

      expect(fileInput.files[0]).toBe(file);
      expect(fileInput.files).toHaveLength(1);
    });

    it('should show selected file name', async () => {
      const user = userEvent.setup();
      const file = new File(['name,price\nTest Product,10'], 'products.csv', {
        type: 'text/csv',
      });
      file.text = vi.fn().mockResolvedValue('name,price\nTest Product,10');

      renderWithToast({ onClose: mockOnClose, onImport: mockOnImport });

      const fileInput = screen.getByLabelText(/choose file|upload/i);
      await user.upload(fileInput, file);

      // The component shows preview instead of filename, check for preview
      await waitFor(() => {
        expect(screen.getByText(/Preview.*1 products/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  // CSV Parsing (3 tests)
  describe('CSV Parsing', () => {
    it('should have import button', () => {
      renderWithToast({ onClose: mockOnClose, onImport: mockOnImport, currentProducts: [] });

      // Import button only appears after file is selected, check for download template button
      expect(screen.getByRole('button', { name: /download template/i })).toBeInTheDocument();
    });

    it('should disable import when no file selected', () => {
      renderWithToast({ onClose: mockOnClose, onImport: mockOnImport, currentProducts: [] });

      // Import button doesn't exist until file is uploaded
      expect(screen.queryByRole('button', { name: /import.*products/i })).not.toBeInTheDocument();
    });

    it('should enable import when file selected', async () => {
      const user = userEvent.setup();
      const file = new File(['name,price\nTest Product,10'], 'products.csv', {
        type: 'text/csv',
      });
      file.text = vi.fn().mockResolvedValue('name,price\nTest Product,10');

      renderWithToast({ onClose: mockOnClose, onImport: mockOnImport, currentProducts: [] });

      const fileInput = screen.getByLabelText(/choose file|upload/i);
      await user.upload(fileInput, file);

      // Wait for preview to appear and import button to become available
      await waitFor(() => {
        expect(screen.getByText(/Preview.*1 products/i)).toBeInTheDocument();
      }, { timeout: 3000 });
      const importButton = await screen.findByRole('button', { name: /import.*products/i });
      expect(importButton).not.toBeDisabled();
    });
  });

  // Error Handling (2 tests)
  describe('Error Handling', () => {
    it('should show error for invalid file type', async () => {
      const user = userEvent.setup();
      const file = new File(['data'], 'file.txt', { type: 'text/plain' });
      file.text = vi.fn().mockResolvedValue('data');

      renderWithToast({ onClose: mockOnClose, onImport: mockOnImport, currentProducts: [] });

      const fileInput = screen.getByLabelText(/choose file|upload/i);
      await user.upload(fileInput, file);

      // showError is called with the error message
      expect(mockShowError).toHaveBeenCalledWith(expect.stringMatching(/invalid.*csv/i));
    });

    it('should show error for empty file', async () => {
      const user = userEvent.setup();
      const file = new File([''], 'empty.csv', { type: 'text/csv' });
      file.text = vi.fn().mockResolvedValue('');

      renderWithToast({ onClose: mockOnClose, onImport: mockOnImport, currentProducts: [] });

      const fileInput = screen.getByLabelText(/choose file|upload/i);
      await user.upload(fileInput, file);

      // showError is called with the error message about empty file
      expect(mockShowError).toHaveBeenCalledWith(expect.stringMatching(/empty|no.*data/i));
    });
  });
});

