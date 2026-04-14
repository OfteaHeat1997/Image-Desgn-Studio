// =============================================================================
// E2E — File Upload in the Editor
// Tests that the file input accepts an image and triggers the upload flow.
// A 100×100 JPEG fixture is created programmatically in beforeAll.
// =============================================================================

import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Fixture setup — generate a 100×100 JPEG before the tests run.
// This is a valid minimal JPEG (1×1 white pixel) that sharp can process.
// For a real product shot replace this fixture with an actual photo.
// ---------------------------------------------------------------------------

// A valid 1×1 white JPEG, base64-encoded (~600 bytes).
// Generated with: sharp({create:{width:1,height:1,channels:3,background:'white'}}).jpeg().toBuffer()
const MINIMAL_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8U' +
  'HRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARC' +
  'AABAAEDASIA' +
  'AhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAABgUEB//EABsQAAIDAQEBAAAAAAAAAAAA' +
  'AAECAxEhMf/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA' +
  '/9oADAMBAAIRAxEAPwCwABmSlk3OEkrjUGBSsgnIDiZBGSHOIBtJAA//2Q==';

const FIXTURE_DIR = path.join(__dirname, 'fixtures');
const FIXTURE_PATH = path.join(FIXTURE_DIR, 'test-product.jpg');

test.beforeAll(() => {
  mkdirSync(FIXTURE_DIR, { recursive: true });
  writeFileSync(FIXTURE_PATH, Buffer.from(MINIMAL_JPEG_BASE64, 'base64'));
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.use({ viewport: { width: 1280, height: 800 } });

test.describe('Image upload flow', () => {
  test('file input accepts a JPEG image', async ({ page }) => {
    await page.goto('/editor');
    // Wait for the page to be interactive
    await expect(page.getByText('E-COMMERCE').first()).toBeVisible();

    // Find the file input — the editor uses react-dropzone which renders an <input type="file">
    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeAttached();

    // Trigger the upload
    await fileInput.setInputFiles(FIXTURE_PATH);

    // After upload: either an image preview, a canvas, or a processing indicator
    // should appear within 15 seconds
    await expect(
      page.locator('canvas, img[src*="data:image"], [class*="result"], [class*="preview"]').first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('dropzone area is visible before upload', async ({ page }) => {
    await page.goto('/editor');
    await expect(page.getByText('E-COMMERCE').first()).toBeVisible();

    // The dropzone should be present somewhere on the page
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput.first()).toBeAttached();
  });
});

// ---------------------------------------------------------------------------
// API-level upload test (using Playwright's request context — no browser needed)
// ---------------------------------------------------------------------------

test.describe('Upload API via request context', () => {
  test('POST /api/upload returns success with data URL', async ({ request }) => {
    const jpegBuffer = Buffer.from(MINIMAL_JPEG_BASE64, 'base64');

    const response = await request.fetch('/api/upload', {
      method: 'POST',
      multipart: {
        file: {
          name: 'test-product.jpg',
          mimeType: 'image/jpeg',
          buffer: jpegBuffer,
        },
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.url).toMatch(/^data:image\//);
  });

  test('POST /api/upload returns 400 for missing file', async ({ request }) => {
    const response = await request.fetch('/api/upload', {
      method: 'POST',
      multipart: {}, // no file
    });

    expect(response.status()).toBe(400);
  });

  test('POST /api/upload returns 400 for wrong MIME type', async ({ request }) => {
    const response = await request.fetch('/api/upload', {
      method: 'POST',
      multipart: {
        file: {
          name: 'doc.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('fake pdf content'),
        },
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  });
});
