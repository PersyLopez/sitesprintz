/**
 * Persist a guest we-build photo: re-encode (strip EXIF/GPS), intake- filename.
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const INTAKE_UPLOADS_DIR = path.join(__dirname, '../../public/uploads');

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

/**
 * @param {{ path: string, originalname?: string }} file
 * @returns {Promise<string>} public path /uploads/intake-*.webp
 */
export async function persistIntakePhoto(file) {
  if (!file?.path) {
    const error = new Error('No file uploaded');
    error.code = 'NO_FILE';
    throw error;
  }
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (ext && !ALLOWED_EXT.has(ext)) {
    await fs.unlink(file.path).catch(() => {});
    const error = new Error('Only image files are allowed');
    error.code = 'IMAGE_TYPE';
    throw error;
  }

  const filename = `intake-${crypto.randomBytes(12).toString('hex')}.webp`;
  const dest = path.join(INTAKE_UPLOADS_DIR, filename);
  await fs.mkdir(INTAKE_UPLOADS_DIR, { recursive: true });

  try {
    await sharp(file.path)
      .rotate()
      .webp({ quality: 82 })
      .toFile(dest);
  } catch (cause) {
    await fs.unlink(file.path).catch(() => {});
    await fs.unlink(dest).catch(() => {});
    const error = new Error('Could not process image');
    error.code = 'IMAGE_PROCESS';
    error.cause = cause;
    throw error;
  }

  await fs.unlink(file.path).catch(() => {});
  return `/uploads/${filename}`;
}
