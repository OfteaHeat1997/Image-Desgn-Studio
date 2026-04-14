// =============================================================================
// Tests: /api/jewelry-tryon/route.ts
// Covers: FormData validation, mode routing, garment_des NoneType bug, bgStyle
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
    private _contentType: string;
    private _jsonBody: unknown;
    private _formData: FormData | null;

    constructor(url: string, init?: RequestInit & { _formData?: FormData }) {
      this.method = (init?.method ?? 'POST').toUpperCase();
      this.headers = new Headers(init?.headers as HeadersInit);
      this.nextUrl = new URL(url);
      this._contentType = this.headers.get('content-type') ?? '';
      this._formData = (init as any)?._formData ?? null;
      try {
        this._jsonBody = init?.body ? JSON.parse(init.body as string) : undefined;
      } catch {
        this._jsonBody = undefined;
      }
    }

    async json() { return this._jsonBody; }
    async formData() { return this._formData ?? new FormData(); }
  }
  return { NextRequest: MockNextRequest, NextResponse: MockNextResponse };
});

jest.mock('@/lib/processing/jewelry', () => ({
  applyJewelry: jest.fn().mockResolvedValue('https://example.com/result.jpg'),
  applyJewelryDisplay: jest.fn().mockResolvedValue('https://example.com/display.jpg'),
  JEWELRY_COSTS: {
    earrings: 0.05,
    necklace: 0.05,
    ring: 0.05,
    bracelet: 0.05,
    sunglasses: 0.05,
    watch: 0.05,
  },
}));

jest.mock('@/lib/utils/image', () => ({
  proxyReplicateUrl: jest.fn((url: string) => url),
}));

jest.mock('@/lib/db/persist', () => ({
  saveJob: jest.fn().mockResolvedValue(undefined),
}));

import { POST } from '@/app/api/jewelry-tryon/route';
import { applyJewelry, applyJewelryDisplay } from '@/lib/processing/jewelry';

// ---- Helpers ----
function createJsonRequest(body: unknown) {
  const { NextRequest } = jest.requireMock('next/server');
  return new NextRequest('http://localhost/api/jewelry-tryon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createFormDataRequest(fields: Record<string, string | File | null>) {
  const { NextRequest } = jest.requireMock('next/server');
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v !== null) fd.append(k, v);
  }
  return new NextRequest('http://localhost/api/jewelry-tryon', {
    method: 'POST',
    headers: { 'Content-Type': 'multipart/form-data; boundary=----boundary' },
    _formData: fd,
  } as any);
}

function makeFile(name: string, type = 'image/png', size = 1024): File {
  const buffer = new Uint8Array(size);
  return new File([buffer], name, { type });
}

// ---- Tests ----
describe('POST /api/jewelry-tryon', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---- FormData: missing jewelryFile ----
  it('returns 400 when jewelryFile is missing from FormData', async () => {
    const req = createFormDataRequest({ type: 'earrings', mode: 'modelo' });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/jewelryFile/i);
  });

  // ---- JSON: missing jewelryImage ----
  it('returns 400 when jewelryImage is missing from JSON body', async () => {
    const req = createJsonRequest({
      modelImage: 'https://example.com/model.jpg',
      type: 'earrings',
      mode: 'modelo',
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  // ---- JSON: invalid jewelryImage URL ----
  it('returns 400 when jewelryImage is not a valid URL or data URI', async () => {
    const req = createJsonRequest({
      jewelryImage: 'not-a-valid-url',
      modelImage: 'https://example.com/model.jpg',
      type: 'earrings',
      mode: 'modelo',
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/URL|data URI/i);
  });

  // ---- Invalid mode ----
  it('returns 400 for invalid mode (not exhibidor/flotante/modelo)', async () => {
    const req = createJsonRequest({
      jewelryImage: 'https://example.com/jewelry.jpg',
      modelImage: 'https://example.com/model.jpg',
      type: 'earrings',
      mode: 'invisible', // invalid
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/mode|exhibidor|flotante|modelo/i);
  });

  it('returns 400 for empty string mode', async () => {
    const req = createJsonRequest({
      jewelryImage: 'https://example.com/jewelry.jpg',
      type: 'earrings',
      mode: '',
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  // ---- Modelo mode requires modelImage ----
  it('returns 400 when mode is modelo but modelImage is missing', async () => {
    const req = createJsonRequest({
      jewelryImage: 'https://example.com/jewelry.jpg',
      type: 'necklace',
      mode: 'modelo',
      // modelImage intentionally omitted
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/modelImage|modelo/i);
  });

  // ---- exhibidor / flotante do NOT require modelImage ----
  it('returns 200 for exhibidor mode without modelImage', async () => {
    const req = createJsonRequest({
      jewelryImage: 'https://example.com/jewelry.jpg',
      type: 'earrings',
      mode: 'exhibidor',
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(applyJewelryDisplay).toHaveBeenCalledTimes(1);
    expect(applyJewelry).not.toHaveBeenCalled();
  });

  it('returns 200 for flotante mode without modelImage', async () => {
    const req = createJsonRequest({
      jewelryImage: 'https://example.com/jewelry.jpg',
      type: 'bracelet',
      mode: 'flotante',
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(applyJewelryDisplay).toHaveBeenCalledTimes(1);
  });

  // ---- bgStyle is passed for modelo mode ----
  it('passes bgStyle to applyJewelry for modelo mode', async () => {
    const req = createJsonRequest({
      jewelryImage: 'https://example.com/jewelry.jpg',
      modelImage: 'https://example.com/model.jpg',
      type: 'ring',
      mode: 'modelo',
      bgStyle: 'marble',
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(applyJewelry).toHaveBeenCalledWith(
      'https://example.com/model.jpg',
      'https://example.com/jewelry.jpg',
      'ring',
      expect.objectContaining({ bgStyle: 'marble' }),
    );
  });

  // ---- garment_des NoneType bug: metalType defaults to non-null ----
  // The route passes metalType/finish to the jewelry lib. When not provided,
  // they are undefined (not null/None), preventing the Python NoneType crash.
  it('passes undefined (not null) for metalType when not provided - prevents NoneType bug', async () => {
    const req = createJsonRequest({
      jewelryImage: 'https://example.com/jewelry.jpg',
      modelImage: 'https://example.com/model.jpg',
      type: 'necklace',
      mode: 'modelo',
      // metalType and finish intentionally omitted
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const call = (applyJewelry as jest.Mock).mock.calls[0];
    const opts = call[3]; // { metalType, finish, bgStyle }
    // Must NOT be null (which would serialize as "None" in Python)
    expect(opts.metalType).not.toBe(null);
    expect(opts.finish).not.toBe(null);
  });

  // ---- Valid FormData request ----
  it('returns 200 for valid FormData request with jewelryFile and modelFile', async () => {
    const jewelryFile = makeFile('ring.png', 'image/png');
    const modelFile = makeFile('model.jpg', 'image/jpeg');
    const req = createFormDataRequest({
      jewelryFile,
      modelFile,
      type: 'ring',
      mode: 'modelo',
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('url');
    expect(body.data).toHaveProperty('type', 'ring');
    expect(body.data).toHaveProperty('mode', 'modelo');
  });

  // ---- exhibidor/flotante: metalType and finish are forwarded ----
  it('passes metalType and finish to applyJewelryDisplay for exhibidor mode', async () => {
    const req = createJsonRequest({
      jewelryImage: 'https://example.com/jewelry.jpg',
      type: 'watch',
      mode: 'exhibidor',
      metalType: 'gold',
      finish: 'polished',
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(applyJewelryDisplay).toHaveBeenCalledWith(
      'https://example.com/jewelry.jpg',
      'watch',
      'exhibidor',
      expect.objectContaining({ metalType: 'gold', finish: 'polished' }),
    );
  });

  // ---- Invalid type ----
  it('returns 400 for invalid jewelry type', async () => {
    const req = createJsonRequest({
      jewelryImage: 'https://example.com/jewelry.jpg',
      type: 'hat', // not a valid type
      mode: 'exhibidor',
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/type|earrings/i);
  });
});
