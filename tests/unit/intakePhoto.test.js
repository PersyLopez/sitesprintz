import { describe, it, expect } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import sharp from 'sharp';
import { persistIntakePhoto } from '../../server/utils/intakePhoto.js';

describe('persistIntakePhoto', () => {
  it('re-encodes to intake- webp without EXIF', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'intake-photo-'));
    const src = path.join(tmpDir, 'cam.jpg');
    await sharp({
      create: { width: 16, height: 16, channels: 3, background: { r: 200, g: 40, b: 40 } },
    })
      .jpeg()
      .toFile(src);

    const url = await persistIntakePhoto({ path: src, originalname: 'Vacation.JPG' });
    expect(url).toMatch(/^\/uploads\/intake-[a-f0-9]+\.webp$/);

    const dest = path.join(process.cwd(), 'public', url.replace(/^\//, ''));
    const meta = await sharp(dest).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.exif).toBeUndefined();

    await fs.unlink(dest).catch(() => {});
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('rejects non-image extensions', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'intake-photo-'));
    const src = path.join(tmpDir, 'note.svg');
    await fs.writeFile(src, '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    await expect(persistIntakePhoto({ path: src, originalname: 'note.svg' })).rejects.toMatchObject({
      code: 'IMAGE_TYPE',
    });
    await fs.rm(tmpDir, { recursive: true, force: true });
  });
});
