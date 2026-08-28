import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  assertSiteImageFile,
  isPhotoEditField,
  showOwnerPhotoOnSlot,
  uploadSiteImage,
} from '../../src/utils/siteImageUpload.js';
import { api } from '../../src/services/api.js';

vi.mock('../../src/services/api.js', () => ({
  api: { upload: vi.fn() },
}));

describe('siteImageUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('treats image paths as photo fields', () => {
    expect(isPhotoEditField('hero.image')).toBe(true);
    expect(isPhotoEditField('gallery.images.0.src')).toBe(true);
    expect(isPhotoEditField('hero.title')).toBe(false);
  });

  it('rejects non-image files', () => {
    const file = new File(['x'], 'notes.pdf', { type: 'application/pdf' });
    expect(() => assertSiteImageFile(file)).toThrow(/JPEG, PNG, GIF, or WebP/i);
  });

  it('uploads through the existing site upload route', async () => {
    api.upload.mockResolvedValue({ url: '/uploads/shop.jpg' });
    const file = new File(['img'], 'shop.jpg', { type: 'image/jpeg' });
    await expect(uploadSiteImage(file)).resolves.toBe('/uploads/shop.jpg');
    expect(api.upload).toHaveBeenCalledWith('/api/sites/upload', expect.any(FormData));
  });

  it('swaps the sample insert for the owner photo', () => {
    document.body.innerHTML = `
      <div class="ss-photo-placeholder">
        <img class="ss-photo-placeholder-img" src="/assets/hero-placeholder.jpg" alt="" />
        <span class="ss-photo-placeholder-mark">Use your business photo here</span>
      </div>
    `;
    const slot = document.querySelector('.ss-photo-placeholder');
    showOwnerPhotoOnSlot(slot, '/uploads/shop.jpg');
    expect(slot.querySelector('img').getAttribute('src')).toBe('/uploads/shop.jpg');
    expect(slot.querySelector('.ss-photo-placeholder-mark')).toBeNull();
    expect(slot.classList.contains('ss-photo-placeholder--owned')).toBe(true);
  });
});
