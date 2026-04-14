// =============================================================================
// Tests: lib/utils/image.ts
// Covers: proxyReplicateUrl (Replicate → proxy, passthrough for data:/blob:/http:),
//         proxyFetch (Replicate → POST proxy, others → native fetch),
//         bufferToDataUrl, formatFileSize, generateFilename
// =============================================================================

// Note: browser-only functions (fileToBase64, getImageDimensions, downloadImage,
// base64ToBlob) are excluded — they require DOM APIs not available in Node.
// replicateHeaders and urlToBuffer are excluded as they call real network fetch.

import {
  proxyReplicateUrl,
  proxyFetch,
  bufferToDataUrl,
  formatFileSize,
  generateFilename,
} from '@/lib/utils/image';

// ---- Mock global fetch for proxyFetch tests ----
const mockFetch = jest.fn();
beforeAll(() => { global.fetch = mockFetch as unknown as typeof fetch; });
afterAll(() => { global.fetch = fetch; });
beforeEach(() => { mockFetch.mockReset(); });

// =============================================================================
// proxyReplicateUrl
// =============================================================================

describe('proxyReplicateUrl', () => {
  it('converts api.replicate.com/v1/files/* URLs to proxied path', () => {
    const input = 'https://api.replicate.com/v1/files/abc123def456';
    const result = proxyReplicateUrl(input);
    expect(result).toBe(
      `/api/proxy-image?url=${encodeURIComponent(input)}`,
    );
  });

  it('converts api.replicate.com/v1/files/* URL with query params correctly', () => {
    const input = 'https://api.replicate.com/v1/files/xyz?token=abc';
    const result = proxyReplicateUrl(input);
    expect(result).toContain('/api/proxy-image?url=');
    expect(result).toContain(encodeURIComponent(input));
  });

  it('passes through data: URLs unchanged', () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUh==';
    expect(proxyReplicateUrl(dataUrl)).toBe(dataUrl);
  });

  it('passes through blob: URLs unchanged', () => {
    const blobUrl = 'blob:http://localhost:3000/some-uuid-123';
    expect(proxyReplicateUrl(blobUrl)).toBe(blobUrl);
  });

  it('passes through normal https:// URLs unchanged', () => {
    const httpUrl = 'https://cdn.example.com/images/product.jpg';
    expect(proxyReplicateUrl(httpUrl)).toBe(httpUrl);
  });

  it('passes through replicate.delivery URLs unchanged (not api.replicate.com/v1/files)', () => {
    const deliveryUrl = 'https://replicate.delivery/pbxt/output.mp4';
    expect(proxyReplicateUrl(deliveryUrl)).toBe(deliveryUrl);
  });

  it('passes through fal.media URLs unchanged', () => {
    const falUrl = 'https://fal.media/files/video.mp4';
    expect(proxyReplicateUrl(falUrl)).toBe(falUrl);
  });

  it('handles null gracefully (no crash)', () => {
    // The function signature is (url: string) but at runtime null may be passed
    expect(() => proxyReplicateUrl(null as unknown as string)).not.toThrow();
  });

  it('handles undefined gracefully (no crash)', () => {
    expect(() => proxyReplicateUrl(undefined as unknown as string)).not.toThrow();
  });

  it('returns original value (not proxy) for empty string', () => {
    // Empty string doesn't match api.replicate.com/v1/files/ pattern
    const result = proxyReplicateUrl('');
    expect(result).toBe('');
  });
});

// =============================================================================
// proxyFetch
// =============================================================================

describe('proxyFetch', () => {
  it('routes api.replicate.com URLs through POST /api/proxy-image', async () => {
    const replicateUrl = 'https://api.replicate.com/v1/files/abc123';
    mockFetch.mockResolvedValue({ ok: true, status: 200 });

    await proxyFetch(replicateUrl);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/proxy-image',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ url: replicateUrl }),
      }),
    );
  });

  it('uses native fetch directly for non-Replicate URLs', async () => {
    const normalUrl = 'https://fal.media/files/output.mp4';
    mockFetch.mockResolvedValue({ ok: true, status: 200 });

    await proxyFetch(normalUrl);

    expect(mockFetch).toHaveBeenCalledWith(normalUrl);
    // Should NOT be called with /api/proxy-image
    expect(mockFetch.mock.calls[0][0]).toBe(normalUrl);
  });

  it('uses native fetch for data: URLs', async () => {
    const dataUrl = 'data:image/png;base64,abc==';
    mockFetch.mockResolvedValue({ ok: true, status: 200 });

    await proxyFetch(dataUrl);

    expect(mockFetch).toHaveBeenCalledWith(dataUrl);
  });

  it('uses native fetch for fal.media URLs', async () => {
    const falUrl = 'https://fal.media/files/video.mp4';
    mockFetch.mockResolvedValue({ ok: true });

    await proxyFetch(falUrl);

    expect(mockFetch).toHaveBeenCalledWith(falUrl);
  });

  it('returns the fetch Response for Replicate URLs', async () => {
    const fakeResponse = { ok: true, status: 200, body: 'video-data' };
    mockFetch.mockResolvedValue(fakeResponse);

    const result = await proxyFetch('https://api.replicate.com/v1/files/test');

    expect(result).toBe(fakeResponse);
  });

  it('returns the fetch Response for normal URLs', async () => {
    const fakeResponse = { ok: true, status: 200 };
    mockFetch.mockResolvedValue(fakeResponse);

    const result = await proxyFetch('https://example.com/image.jpg');

    expect(result).toBe(fakeResponse);
  });
});

// =============================================================================
// bufferToDataUrl
// =============================================================================

describe('bufferToDataUrl', () => {
  it('converts a buffer to a data URL with the given MIME type', () => {
    const buffer = Buffer.from([0x89, 0x50, 0x4E, 0x47]); // PNG header bytes
    const result = bufferToDataUrl(buffer, 'image/png');
    expect(result).toMatch(/^data:image\/png;base64,/);
  });

  it('base64-encodes the buffer content correctly', () => {
    const text = 'Hello, UniStudio!';
    const buffer = Buffer.from(text, 'utf-8');
    const result = bufferToDataUrl(buffer, 'text/plain');
    const expected = `data:text/plain;base64,${buffer.toString('base64')}`;
    expect(result).toBe(expected);
  });

  it('handles empty buffer', () => {
    const buffer = Buffer.alloc(0);
    const result = bufferToDataUrl(buffer, 'image/png');
    expect(result).toBe('data:image/png;base64,');
  });

  it('handles video/mp4 MIME type', () => {
    const buffer = Buffer.from('fake-video-data');
    const result = bufferToDataUrl(buffer, 'video/mp4');
    expect(result).toMatch(/^data:video\/mp4;base64,/);
  });
});

// =============================================================================
// formatFileSize
// =============================================================================

describe('formatFileSize', () => {
  it('formats 0 bytes as "0 B"', () => {
    expect(formatFileSize(0)).toBe('0 B');
  });

  it('formats bytes correctly (under 1KB)', () => {
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(1)).toBe('1 B');
    expect(formatFileSize(1023)).toBe('1023 B');
  });

  it('formats KB correctly', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(2048)).toBe('2.0 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });

  it('formats MB correctly', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
    expect(formatFileSize(50 * 1024 * 1024)).toBe('50.0 MB');
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
  });

  it('formats GB correctly', () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB');
  });

  it('returns 1 decimal place for values above 1 KB', () => {
    const result = formatFileSize(2560); // 2.5 KB
    expect(result).toMatch(/\d+\.\d KB/);
  });
});

// =============================================================================
// generateFilename
// =============================================================================

describe('generateFilename', () => {
  it('inserts suffix before the file extension', () => {
    expect(generateFilename('product.jpg', 'nobg')).toBe('product-nobg.jpg');
  });

  it('works with PNG extension', () => {
    expect(generateFilename('banner.png', 'enhanced')).toBe('banner-enhanced.png');
  });

  it('works with WebP extension', () => {
    expect(generateFilename('hero.webp', 'upscaled')).toBe('hero-upscaled.webp');
  });

  it('handles filename without extension (appends suffix at end)', () => {
    expect(generateFilename('image', 'upscaled')).toBe('image-upscaled');
  });

  it('handles filenames with multiple dots (uses last dot as extension boundary)', () => {
    const result = generateFilename('my.product.photo.jpg', 'shadow');
    expect(result).toBe('my.product.photo-shadow.jpg');
  });

  it('handles empty suffix', () => {
    const result = generateFilename('photo.jpg', '');
    expect(result).toBe('photo-.jpg');
  });

  it('handles filenames with path separators gracefully', () => {
    const result = generateFilename('path/to/image.png', 'thumb');
    expect(result).toContain('-thumb.png');
  });

  it('preserves mixed-case extensions', () => {
    const result = generateFilename('Image.JPG', 'compressed');
    expect(result).toBe('Image-compressed.JPG');
  });

  it('handles single-character filename', () => {
    const result = generateFilename('a.jpg', 'bg');
    expect(result).toBe('a-bg.jpg');
  });
});
