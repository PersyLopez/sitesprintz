/**
 * Owner photo uploads for ImageUploader and click-to-replace inserts.
 * Same /api/sites/upload path — not a second media kit.
 */

import { api } from '../services/api.js';

export const SITE_IMAGE_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp';
export const SITE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const ACCEPTED_EXT = /\.(jpe?g|png|gif|webp)$/i;

export function isPhotoEditField(field) {
  if (!field || typeof field !== 'string') return false;
  return /\.(image|photo|src|before|after)$/.test(field);
}

export function assertSiteImageFile(file) {
  if (!file) {
    const error = new Error('Choose a photo to upload');
    error.code = 'IMAGE_MISSING';
    throw error;
  }
  const typeOk = ACCEPTED_TYPES.has(file.type) || ACCEPTED_EXT.test(file.name);
  if (!typeOk) {
    const error = new Error('Please upload a JPEG, PNG, GIF, or WebP image');
    error.code = 'IMAGE_TYPE';
    throw error;
  }
  if (file.size > SITE_IMAGE_MAX_BYTES) {
    const error = new Error('Image must be less than 5MB. Try compressing your image first.');
    error.code = 'IMAGE_TOO_LARGE';
    throw error;
  }
}

export async function uploadSiteImage(file) {
  assertSiteImageFile(file);
  const formData = new FormData();
  formData.append('image', file);
  const data = await api.upload('/api/sites/upload', formData);
  const url = data.url || data.data?.url;
  if (!url) {
    throw new Error('Upload succeeded but no image URL was returned');
  }
  return url;
}

/**
 * Open the file picker in the same document as the click (iframe-safe).
 * Must run in the user-gesture turn — do not await anything first.
 */
export function pickSiteImageFile(doc = document) {
  return new Promise((resolve) => {
    const input = doc.createElement('input');
    input.type = 'file';
    input.accept = SITE_IMAGE_ACCEPT;
    input.setAttribute('data-testid', 'photo-replace-file-input');
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    const finish = (file) => {
      input.remove();
      resolve(file || null);
    };
    input.addEventListener('change', () => finish(input.files?.[0] || null), { once: true });
    input.addEventListener('cancel', () => finish(null), { once: true });
    (doc.body || doc.documentElement).appendChild(input);
    input.click();
  });
}

export function showOwnerPhotoOnSlot(el, url) {
  if (!el || !url) return;
  const img = el.tagName === 'IMG' ? el : el.querySelector('img');
  if (img) img.setAttribute('src', url);
  el.querySelector('.ss-photo-placeholder-mark')?.remove();
  el.classList.add('ss-photo-placeholder--owned');
}
