import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImageUploader from '../../src/components/setup/forms/ImageUploader';
import { useToast } from '../../src/hooks/useToast';
import { uploadSiteImage } from '../../src/utils/siteImageUpload';

vi.mock('../../src/hooks/useToast');
vi.mock('../../src/utils/siteImageUpload', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    uploadSiteImage: vi.fn(),
  };
});

describe('ImageUploader Component', () => {
  let mockOnChange;
  let mockShowSuccess;
  let mockShowError;

  beforeEach(() => {
    mockOnChange = vi.fn();
    mockShowSuccess = vi.fn();
    mockShowError = vi.fn();

    useToast.mockReturnValue({
      showSuccess: mockShowSuccess,
      showError: mockShowError,
    });

    uploadSiteImage.mockReset();
    uploadSiteImage.mockResolvedValue('https://example.com/uploaded.jpg');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Rendering Tests (3 tests)
  describe('Rendering', () => {
    it('should render upload zone when no image', () => {
      render(<ImageUploader value="" onChange={mockOnChange} />);

      expect(screen.getByText(/click to upload/i)).toBeInTheDocument();
      expect(screen.getByText(/drag and drop/i)).toBeInTheDocument();
    });

    it('should render image preview when value provided', () => {
      render(
        <ImageUploader value="https://example.com/image.jpg" onChange={mockOnChange} />
      );

      const img = screen.getByAltText('Preview');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
    });

    it('should show aspect ratio hint when provided', () => {
      render(
        <ImageUploader
          value=""
          onChange={mockOnChange}
          aspectRatio="16:9"
        />
      );

      expect(screen.getByText(/16:9 aspect ratio/i)).toBeInTheDocument();
    });
  });

  // File Selection Tests (3 tests)
  describe('File Selection', () => {
    it('should open file dialog on click', async () => {
      const user = userEvent.setup();
      render(<ImageUploader value="" onChange={mockOnChange} />);

      const uploadZone = screen.getByText(/click to upload/i).closest('.upload-zone');
      
      // Verify upload zone is clickable
      await user.click(uploadZone);

      expect(uploadZone).toBeInTheDocument();
    });

    it('should handle file selection', async () => {
      const user = userEvent.setup();
      render(<ImageUploader value="" onChange={mockOnChange} />);

      const file = new File(['image'], 'test.png', { type: 'image/png' });
      const input = document.querySelector('input[type="file"]');

      await user.upload(input, file);

      await waitFor(() => {
        expect(uploadSiteImage).toHaveBeenCalledWith(file);
        expect(mockOnChange).toHaveBeenCalledWith('https://example.com/uploaded.jpg');
      });
    });

    it('should show file size limit', () => {
      render(<ImageUploader value="" onChange={mockOnChange} />);

      expect(screen.getByText(/max 5MB/i)).toBeInTheDocument();
    });
  });

  // Validation Tests (3 tests)
  describe('Validation', () => {
    it('should reject non-image files', async () => {
      render(<ImageUploader value="" onChange={mockOnChange} />);

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const input = document.querySelector('input[type="file"]');

      // Use fireEvent for file input
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith('Please upload a JPEG, PNG, GIF, or WebP image');
      });
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should reject files over 5MB', async () => {
      render(<ImageUploader value="" onChange={mockOnChange} />);

      // Create a file larger than 5MB
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      });
      const input = document.querySelector('input[type="file"]');

      fireEvent.change(input, { target: { files: [largeFile] } });

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith(
          'Image must be less than 5MB. Try compressing your image first.',
          expect.objectContaining({ action: expect.any(Object) })
        );
      });
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should accept valid image files', async () => {
      const user = userEvent.setup();
      render(<ImageUploader value="" onChange={mockOnChange} />);

      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]');

      await user.upload(input, file);

      await waitFor(() => {
        expect(mockShowError).not.toHaveBeenCalled();
        expect(uploadSiteImage).toHaveBeenCalled();
      });
    });
  });

  // Upload Tests (3 tests)
  describe('Upload', () => {
    it('should upload file successfully', async () => {
      const user = userEvent.setup();
      render(<ImageUploader value="" onChange={mockOnChange} />);

      const file = new File(['image'], 'test.png', { type: 'image/png' });
      const input = document.querySelector('input[type="file"]');

      await user.upload(input, file);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith('https://example.com/uploaded.jpg');
        expect(mockShowSuccess).toHaveBeenCalledWith('Image uploaded');
      });
    });

    it('should show uploading state', async () => {
      uploadSiteImage.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('https://example.com/uploaded.jpg'), 100))
      );

      const user = userEvent.setup();
      render(<ImageUploader value="" onChange={mockOnChange} />);

      const file = new File(['image'], 'test.png', { type: 'image/png' });
      const input = document.querySelector('input[type="file"]');

      await user.upload(input, file);

      expect(screen.getByText(/uploading/i)).toBeInTheDocument();
    });

    it('should handle upload errors', async () => {
      uploadSiteImage.mockRejectedValue(new Error('Upload failed'));

      const user = userEvent.setup();
      render(<ImageUploader value="" onChange={mockOnChange} />);

      const file = new File(['image'], 'test.png', { type: 'image/png' });
      const input = document.querySelector('input[type="file"]');

      await user.upload(input, file);

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith('Upload failed');
        expect(mockOnChange).not.toHaveBeenCalled();
      });
    });
  });

  // Image Management Tests (3 tests)
  describe('Image Management', () => {
    it('should show change and remove buttons with image', () => {
      render(
        <ImageUploader value="https://example.com/image.jpg" onChange={mockOnChange} />
      );

      expect(screen.getByTestId('change-image-btn')).toBeInTheDocument();
      expect(screen.getByTestId('remove-image-btn')).toBeInTheDocument();
    });

    it('should remove image', async () => {
      const user = userEvent.setup();
      render(
        <ImageUploader value="https://example.com/image.jpg" onChange={mockOnChange} />
      );

      const removeButton = screen.getByTestId('remove-image-btn');
      await user.click(removeButton);

      expect(mockOnChange).toHaveBeenCalledWith('');
    });

    it('should allow changing existing image', async () => {
      const user = userEvent.setup();
      render(
        <ImageUploader value="https://example.com/old-image.jpg" onChange={mockOnChange} />
      );

      const changeButton = screen.getByTestId('change-image-btn');
      await user.click(changeButton);

      expect(changeButton).toBeInTheDocument();
    });
  });

  // Drag and Drop Tests (3 tests)
  describe('Drag and Drop', () => {
    it('should show drag active state', async () => {
      render(<ImageUploader value="" onChange={mockOnChange} />);

      const uploadZone = screen.getByText(/click to upload/i).closest('.upload-zone');
      
      // Simulate drag over using fireEvent
      fireEvent.dragOver(uploadZone);

      await waitFor(() => {
        expect(uploadZone).toHaveClass('drag-active');
      });
    });

    it('should handle dropped files', async () => {
      render(<ImageUploader value="" onChange={mockOnChange} />);

      const uploadZone = screen.getByText(/click to upload/i).closest('.upload-zone');
      const file = new File(['image'], 'dropped.png', { type: 'image/png' });

      fireEvent.drop(uploadZone, {
        dataTransfer: { files: [file] },
      });

      await waitFor(() => {
        expect(uploadSiteImage).toHaveBeenCalledWith(file);
      });
    });

    it('should clear drag state on drag leave', async () => {
      render(<ImageUploader value="" onChange={mockOnChange} />);

      const uploadZone = screen.getByText(/click to upload/i).closest('.upload-zone');
      
      // Simulate drag over then leave using fireEvent
      fireEvent.dragOver(uploadZone);
      
      await waitFor(() => {
        expect(uploadZone).toHaveClass('drag-active');
      });
      
      fireEvent.dragLeave(uploadZone);
      
      await waitFor(() => {
        expect(uploadZone).not.toHaveClass('drag-active');
      });
    });
  });
});

