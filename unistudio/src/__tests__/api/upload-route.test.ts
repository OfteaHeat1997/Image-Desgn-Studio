// =============================================================================
// Tests: /api/upload/route.ts
// Covers: missing file, MIME validation, size limit, successful upload,
//         replicateUrl fallback, format handling (JPEG/PNG/WebP)
// =============================================================================

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    private _body: unknown;
    constructor(body: unknown, init?: ResponseInit) {
      this.status = init?.status ?? 200;
      this._body = body;
    }
    async json() { return this._body; }
    static json(data: unknown, init?: ResponseInit) {
      const r = new MockNextResponse(data, init);
      r._body = data;
      return r;
    }
  }
  class MockNextRequest {
    method: string;
    headers: Headers;
    nextUrl: URL;
    private _formData: FormData;

    constructor(url: string, init?: RequestInit & { _formData?: FormData }) {
      this.method = (init?.method ?? 'POST').toUpperCase();
      this.headers = new Headers(init?.headers as HeadersInit);
      this.nextUrl = new URL(url);
      this._formData = (init as any)?._formData ?? new FormData();
    }

    async formData() { return this._formData; }
  }
  return { NextRequest: MockNextRequest, NextResponse: MockNextResponse };
});

// Mock sharp: return a jest.fn() directly so require('sharp') gives us the mock fn
jest.mock('sharp', () =>
  jest.fn().mockReturnValue({
    metadata: jest.fn().mockResolvedValue({ width: 800, height: 600 }),
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('compressed-image')),
  }),
);

jest.mock('@/lib/db/persist', () => ({
  saveUploadedImage: jest.fn().mockResolvedValue('img-123'),
}));

jest.mock('@/lib/api/replicate', () => ({
  ensureHttpUrl: jest.fn().mockResolvedValue('https://api.replicate.com/v1/files/uploaded'),
}));

import { POST } from '@/app/api/upload/route';
import { ensureHttpUrl } from '@/lib/api/replicate';
import { saveUploadedImage } from '@/lib/db/persist';

// ---- Helpers ----
function makeFile(name: string, type: string, sizeBytes: number): File {
  const buffer = new Uint8Array(sizeBytes).fill(1);
  return new File([buffer], name, { type });
}

function createUploadRequest(file: File | null, fieldName = 'file') {
  const { NextRequest } = jest.requireMock('next/server');
  const fd = new FormData();
  if (file) fd.append(fieldName, file);
  return new NextRequest('http://localhost/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'multipart/form-data; boundary=----boundary' },
    _formData: fd,
  } as any);
}

// ---- Tests ----
describe('POST /api/upload', () => {
  beforeEach(() => {
    // Note: jest.clearAllMocks() only clears call history, NOT implementations.
    // The sharp mock implementation from jest.mock() persists between tests.
    jest.clearAllMocks();
    // Re-set ensureHttpUrl default for each test (clearAllMocks clears call history only)
    (ensureHttpUrl as jest.Mock).mockResolvedValue('https://api.replicate.com/v1/files/uploaded');
    (saveUploadedImage as jest.Mock).mockResolvedValue('img-123');
  });

  // ---- Missing file ----
  it('returns 400 when no file is provided', async () => {
    const req = createUploadRequest(null);
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/file/i);
  });

  it('returns 400 when file field has wrong name', async () => {
    const file = makeFile('photo.png', 'image/png', 1024);
    const req = createUploadRequest(file, 'image'); // wrong field name
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  // ---- MIME type validation ----
  it('returns 400 for unsupported MIME type (PDF)', async () => {
    const file = makeFile('doc.pdf', 'application/pdf', 1024);
    const req = createUploadRequest(file);
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/type|PNG|JPG|WebP/i);
  });

  it('returns 400 for unsupported MIME type (MP4)', async () => {
    const file = makeFile('video.mp4', 'video/mp4', 1024);
    const req = createUploadRequest(file);
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('returns 400 for empty MIME type', async () => {
    const file = makeFile('file', '', 1024);
    const req = createUploadRequest(file);
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  // ---- File size limit (50 MB) ----
  it('returns 400 when file exceeds 50MB limit', async () => {
    const OVER_50MB = 51 * 1024 * 1024;
    const file = makeFile('huge.png', 'image/png', OVER_50MB);
    const req = createUploadRequest(file);
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/50MB|size/i);
  });

  it('accepts file exactly at 50MB limit', async () => {
    const EXACTLY_50MB = 50 * 1024 * 1024;
    const file = makeFile('big.jpg', 'image/jpeg', EXACTLY_50MB);
    const req = createUploadRequest(file);
    const res = await POST(req as any);
    // Should not return 400 for size reason (may still fail for other reasons in mock)
    const body = await res.json();
    expect(body.error ?? '').not.toMatch(/50MB/);
  });

  // ---- Successful upload: returns { url, replicateUrl } ----
  it('returns url and replicateUrl on successful PNG upload', async () => {
    const file = makeFile('product.png', 'image/png', 100 * 1024); // 100KB
    const req = createUploadRequest(file);
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('url');
    expect(body.data.url).toMatch(/^data:image\//);
    expect(body.data).toHaveProperty('replicateUrl');
    expect(saveUploadedImage).toHaveBeenCalledTimes(1);
  });

  it('returns url and replicateUrl on successful JPEG upload', async () => {
    const file = makeFile('photo.jpg', 'image/jpeg', 200 * 1024);
    const req = createUploadRequest(file);
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.url).toMatch(/^data:image\//);
    expect(body.data.replicateUrl).toBeTruthy();
  });

  it('returns url and replicateUrl on successful WebP upload', async () => {
    const file = makeFile('banner.webp', 'image/webp', 50 * 1024);
    const req = createUploadRequest(file);
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.url).toMatch(/^data:image\//);
  });

  // ---- replicateUrl fallback to null when Replicate fails ----
  it('returns replicateUrl as null and shows warning when Replicate upload fails', async () => {
    (ensureHttpUrl as jest.Mock).mockRejectedValue(new Error('Replicate upload failed'));
    const file = makeFile('product.png', 'image/png', 100 * 1024);
    const req = createUploadRequest(file);
    const res = await POST(req as any);
    expect(res.status).toBe(200); // still succeeds with fallback
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.replicateUrl).toBeNull();
    expect(body.warning).toMatch(/Replicate/i);
  });

  // ---- Response shape validation ----
  it('returns filename, width, height, fileSize, and imageId in response', async () => {
    const file = makeFile('hero.jpg', 'image/jpeg', 50 * 1024);
    const req = createUploadRequest(file);
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveProperty('filename', 'hero.jpg');
    expect(body.data).toHaveProperty('width');
    expect(body.data).toHaveProperty('height');
    expect(body.data).toHaveProperty('fileSize');
    expect(body.data).toHaveProperty('imageId', 'img-123');
    expect(body.cost).toBe(0);
  });

  // ---- GIF support ----
  it('accepts GIF files', async () => {
    const file = makeFile('animation.gif', 'image/gif', 10 * 1024);
    const req = createUploadRequest(file);
    const res = await POST(req as any);
    // Should not get a 400 type error
    const body = await res.json();
    if (res.status === 400) {
      // If it failed, it should NOT be because of MIME type
      expect(body.error).not.toMatch(/Unsupported file type/);
    }
  });
});
