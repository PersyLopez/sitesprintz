import React, { useState, useRef } from 'react';
import { useToast } from '../../../hooks/useToast';
import { api } from '../../../services/api';
import './ImageUploader.css';

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const ACCEPTED_EXT = /\.(jpe?g|png|gif|webp)$/i;

function ImageUploader({ value, onChange, aspectRatio, label, allowUrl = true }) {
  const { showError, showSuccess } = useToast();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file) => {
    const typeOk = ACCEPTED_TYPES.has(file.type) || ACCEPTED_EXT.test(file.name);
    if (!typeOk) {
      showError('Please upload a JPEG, PNG, GIF, or WebP image');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      showError('Image must be less than 5MB. Try compressing your image first.', {
        action: {
          label: 'Compress',
          onClick: () => window.open('https://tinypng.com', '_blank')
        }
      });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const data = await api.upload('/api/sites/upload', formData);
      const url = data.url || data.data?.url;
      if (!url) {
        throw new Error('Upload succeeded but no image URL was returned');
      }
      onChange(url);
      showSuccess('Image uploaded');
      setShowUrlInput(false);
    } catch (error) {
      console.error('Upload error:', error);
      showError(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange('');
    setUrlDraft('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const applyUrl = () => {
    const trimmed = urlDraft.trim();
    if (!trimmed) {
      showError('Enter an image URL');
      return;
    }
    try {
      // Allow absolute http(s) or site-relative /uploads paths
      if (trimmed.startsWith('/')) {
        onChange(trimmed);
      } else {
        const parsed = new URL(trimmed);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          throw new Error('Invalid URL');
        }
        onChange(trimmed);
      }
      setShowUrlInput(false);
      showSuccess('Image URL added');
    } catch {
      showError('Enter a valid image URL (https://… or /uploads/…)');
    }
  };

  return (
    <div className="image-uploader" data-testid="image-uploader">
      {label ? <span className="uploader-label">{label}</span> : null}

      {value ? (
        <div className="image-preview">
          <img src={value} alt="Preview" />
          <div className="image-overlay">
            <button
              type="button"
              onClick={handleClick}
              className="btn btn-secondary btn-sm"
              disabled={uploading}
              data-testid="change-image-btn"
            >
              Change
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="btn btn-danger btn-sm"
              disabled={uploading}
              data-testid="remove-image-btn"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={handleClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClick();
            }
          }}
          data-testid="image-upload-zone"
        >
          {uploading ? (
            <div className="upload-progress">
              <div className="loading-spinner" />
              <p>Uploading…</p>
            </div>
          ) : (
            <>
              <div className="upload-icon" aria-hidden="true">📷</div>
              <p className="upload-text">
                <strong>Click to upload</strong> or drag and drop
              </p>
              <p className="upload-hint">JPEG, PNG, GIF, or WebP · max 5MB</p>
              {aspectRatio ? (
                <p className="upload-hint">Recommended: {aspectRatio} aspect ratio</p>
              ) : null}
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
        onChange={handleChange}
        style={{ display: 'none' }}
        data-testid="image-file-input"
      />

      {allowUrl ? (
        <div className="url-fallback">
          {!showUrlInput ? (
            <button
              type="button"
              className="btn-link"
              onClick={() => {
                setUrlDraft(value || '');
                setShowUrlInput(true);
              }}
              data-testid="use-image-url-btn"
            >
              Or paste an image URL
            </button>
          ) : (
            <div className="url-fallback-row">
              <input
                type="url"
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                placeholder="https://… or /uploads/…"
                data-testid="image-url-input"
              />
              <button type="button" className="btn btn-secondary btn-sm" onClick={applyUrl} data-testid="apply-image-url-btn">
                Use URL
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowUrlInput(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default ImageUploader;
