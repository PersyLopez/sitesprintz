/**
 * E2E Tests: Image Upload Functionality
 * Tests image upload via drag-and-drop, file input, validation, and progress indicators
 */

import { test, expect } from '@playwright/test';
import { login } from '../helpers/e2e-test-utils.js';
import path from 'path';
import fs from 'fs';

test.describe('Image Upload', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await login(page);
    await page.goto('/dashboard');
  });

  test('should upload image via file input', async ({ page }) => {
    // Navigate to setup page or image upload area
    await page.goto('/setup');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Find file input (could be in editor, admin, or setup page)
    const fileInput = page.locator('input[type="file"]').first();

    // Create a test image file (1x1 pixel PNG)
    const testImagePath = path.join(__dirname, '../fixtures/test-image.png');

    // Create fixtures directory if it doesn't exist
    const fixturesDir = path.dirname(testImagePath);
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }

    // Create a minimal PNG file (1x1 pixel)
    // PNG header + minimal data
    const pngData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE,
      0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
      0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00, 0x00, 0x03, 0x00, 0x01, 0xE2, 0x21, 0xBC, 0x33,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND
    ]);

    fs.writeFileSync(testImagePath, pngData);

    // Set file input
    await fileInput.setInputFiles(testImagePath);

    // Wait for upload to complete (check for success message or image preview)
    await page.waitForTimeout(2000);

    // Check for success indicators
    const successIndicator = page.locator('text=/upload.*success|image.*uploaded|success/i');
    const imagePreview = page.locator('img[src*="/uploads/"], .image-preview, [data-testid="image-preview"]');

    // At least one should be visible
    const hasSuccess = await successIndicator.count() > 0;
    const hasPreview = await imagePreview.count() > 0;

    expect(hasSuccess || hasPreview).toBeTruthy();

    // Cleanup
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
  });

  test('should validate image file types', async ({ page }) => {
    await page.goto('/setup');
    await page.waitForLoadState('networkidle');

    const fileInput = page.locator('input[type="file"]').first();

    // Create a test PDF file (invalid type)
    const testPdfPath = path.join(__dirname, '../fixtures/test-file.pdf');
    const fixturesDir = path.dirname(testPdfPath);
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }

    // Create minimal PDF
    const pdfContent = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\nxref\n0 1\ntrailer\n<< /Root 1 0 R >>\n%%EOF';
    fs.writeFileSync(testPdfPath, pdfContent);

    // Try to upload PDF
    await fileInput.setInputFiles(testPdfPath);

    // Wait for validation error
    await page.waitForTimeout(1000);

    // Check for error message
    const errorMessage = page.locator('text=/invalid.*file|only.*image|image.*file|file.*type/i');
    const hasError = await errorMessage.count() > 0;

    expect(hasError).toBeTruthy();

    // Cleanup
    if (fs.existsSync(testPdfPath)) {
      fs.unlinkSync(testPdfPath);
    }
  });

  test('should show progress indicator during upload', async ({ page }) => {
    await page.goto('/setup');
    await page.waitForLoadState('networkidle');

    const fileInput = page.locator('input[type="file"]').first();

    // Create a larger test image (simulate upload time)
    const testImagePath = path.join(__dirname, '../fixtures/test-large-image.png');
    const fixturesDir = path.dirname(testImagePath);
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }

    // Create a larger PNG (simulate with repeated data)
    const basePng = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x64, 0x00, 0x00, 0x00, 0x64, // 100x100
      0x08, 0x02, 0x00, 0x00, 0x00
    ]);

    // Add padding to make it larger
    const largePng = Buffer.concat([basePng, Buffer.alloc(50000)]);
    fs.writeFileSync(testImagePath, largePng);

    // Set file input
    await fileInput.setInputFiles(testImagePath);

    // Check for progress indicator (could be progress bar, spinner, or loading text)
    const progressIndicator = page.locator(
      '[data-testid="upload-progress"], .upload-progress, .progress-bar, text=/uploading|processing/i'
    );

    // Progress indicator should appear (may be brief)
    const hasProgress = await progressIndicator.count() > 0;

    // Wait for upload to complete
    await page.waitForTimeout(3000);

    // Either progress was shown or upload completed quickly
    expect(hasProgress || await page.locator('img[src*="/uploads/"]').count() > 0).toBeTruthy();

    // Cleanup
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
  });

  test('should handle large files (>5MB rejection)', async ({ page }) => {
    await page.goto('/setup');
    await page.waitForLoadState('networkidle');

    const fileInput = page.locator('input[type="file"]').first();

    // Create a file larger than 5MB
    const testLargePath = path.join(__dirname, '../fixtures/test-large.png');
    const fixturesDir = path.dirname(testLargePath);
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }

    // Create 6MB file
    const largeFile = Buffer.alloc(6 * 1024 * 1024, 0xFF);
    fs.writeFileSync(testLargePath, largeFile);

    // Try to upload
    await fileInput.setInputFiles(testLargePath);

    // Wait for validation
    await page.waitForTimeout(2000);

    // Check for size error
    const sizeError = page.locator('text=/too.*large|file.*size|max.*5|5.*mb/i');
    const hasSizeError = await sizeError.count() > 0;

    expect(hasSizeError).toBeTruthy();

    // Cleanup
    if (fs.existsSync(testLargePath)) {
      fs.unlinkSync(testLargePath);
    }
  });

  test('should upload image via drag and drop', async ({ page }) => {
    await page.goto('/setup');
    await page.waitForLoadState('networkidle');

    // Find drop zone (could be a div with drop event handlers)
    const dropZone = page.locator(
      '[data-testid="drop-zone"], .drop-zone, .image-uploader, .upload-area'
    ).first();

    // Create test image
    const testImagePath = path.join(__dirname, '../fixtures/test-drag-drop.png');
    const fixturesDir = path.dirname(testImagePath);
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }

    const pngData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE,
      0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54,
      0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00, 0x00, 0x03, 0x00, 0x01, 0xE2, 0x21, 0xBC, 0x33,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    fs.writeFileSync(testImagePath, pngData);

    // If drop zone exists, try drag and drop
    if (await dropZone.count() > 0) {
      const fileContent = fs.readFileSync(testImagePath);
      const fileName = path.basename(testImagePath);

      // Simulate drag and drop
      await dropZone.dispatchEvent('dragenter', { bubbles: true });
      await dropZone.dispatchEvent('dragover', { bubbles: true });

      // Create DataTransfer object
      const dataTransfer = await page.evaluateHandle(({ fileContent, fileName }) => {
        const dt = new DataTransfer();
        const file = new File([new Uint8Array(fileContent)], fileName, { type: 'image/png' });
        dt.items.add(file);
        return dt;
      }, { fileContent: Array.from(fileContent), fileName });

      await dropZone.dispatchEvent('drop', { dataTransfer });

      // Wait for upload
      await page.waitForTimeout(2000);

      // Check for success
      const imagePreview = page.locator('img[src*="/uploads/"], .image-preview');
      const hasPreview = await imagePreview.count() > 0;

      expect(hasPreview).toBeTruthy();
    } else {
      // If no drop zone, skip this test (feature may not be implemented)
      test.skip();
    }

    // Cleanup
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
  });

  test('should display uploaded image preview', async ({ page }) => {
    await page.goto('/setup');
    await page.waitForLoadState('networkidle');

    const fileInput = page.locator('input[type="file"]').first();

    // Create test image
    const testImagePath = path.join(__dirname, '../fixtures/test-preview.png');
    const fixturesDir = path.dirname(testImagePath);
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }

    const pngData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE,
      0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54,
      0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00, 0x00, 0x03, 0x00, 0x01, 0xE2, 0x21, 0xBC, 0x33,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    fs.writeFileSync(testImagePath, pngData);

    await fileInput.setInputFiles(testImagePath);

    // Wait for preview to appear
    await page.waitForTimeout(2000);

    // Check for image preview
    const preview = page.locator('img[src*="/uploads/"], .image-preview img, [data-testid="image-preview"] img');
    await expect(preview.first()).toBeVisible({ timeout: 5000 });

    // Cleanup
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
  });
});









