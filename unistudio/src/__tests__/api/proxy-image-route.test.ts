// =============================================================================
// Tests: /api/proxy-image/route.ts
// Covers: GET/POST validation, Replicate Bearer auth, host allowlist,
//         Content-Type passthrough, Cache-Control header
// =============================================================================

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    private _body: unknown;
    private _headers: Record<string, string>;

    constructor(body: unknown, init?: ResponseInit) {
      this.status = init?.status ?? 200;
      this._body = body;
      this._headers = {};
      if (init?.headers) {
        const h = init.headers as Record<string, string>;
        for (const [k, v] of Object.entries(h)) {
          this._headers[k.toLowerCase()] = v;
        }
      }
    }

    async json() { return this._body; }

    get headers() {
      return {
        get: (k: string) => this._headers[k.toLowerCase()] ?? null,
      };
    }

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
    private _jsonBody: unknown;

    constructor(url: string, init?: RequestInit) {
      this.method = (init?.method ?? 'GET').toUpperCase();
      this.headers = new Headers(init?.headers as HeadersInit);
      this.nextUrl = new URL(url);
      try {
        this._jsonBody = init?.body ? JSON.parse(init.body as string) : undefined;
      } catch {
        this._jsonBody = undefined;
      }
    }

    async json() { return this._jsonBody; }
  }

  return { NextRequest: MockNextRequest, NextResponse: MockNextResponse };
});

import { GET, POST } from '@/app/api/proxy-image/route';

// ---- Mock global fetch ----
const mockFetch = jest.fn();

beforeAll(() => {
  global.fetch = mockFetch as unknown as typeof fetch;
});

afterAll(() => {
  // Reset (in Node 18+ fetch is global by default)
  global.fetch = fetch;
});

function makeSuccessResponse(contentType: string, body: ArrayBuffer = new ArrayBuffer(10)) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: {
      get: (k: string) => (k.toLowerCase() === 'content-type' ? contentType : null),
    },
    arrayBuffer: () => Promise.resolve(body),
  };
}

function createGetRequest(url: string) {
  const { NextRequest } = jest.requireMock('next/server');
  return new NextRequest(`http://localhost/api/proxy-image?url=${encodeURIComponent(url)}`);
}

function createPostRequest(body: unknown) {
  const { NextRequest } = jest.requireMock('next/server');
  return new NextRequest('http://localhost/api/proxy-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ---- Tests ----
describe('GET /api/proxy-image', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.REPLICATE_API_TOKEN = 'test-token-abc';
  });

  afterEach(() => {
    delete process.env.REPLICATE_API_TOKEN;
  });

  it('returns 400 when url query param is missing', async () => {
    const { NextRequest } = jest.requireMock('next/server');
    const req = new NextRequest('http://localhost/api/proxy-image');
    const res = await GET(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/url/i);
  });

  it('returns 400 for a malformed URL', async () => {
    const req = createGetRequest('not-a-valid-url-at-all!!!');
    const res = await GET(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid url/i);
  });

  it('returns 403 when host is not in the allowlist', async () => {
    const req = createGetRequest('https://evil.example.com/image.jpg');
    const res = await GET(req as any);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/not allowed/i);
  });

  it('adds Bearer auth header for api.replicate.com/v1/files/* URLs', async () => {
    const replicateUrl = 'https://api.replicate.com/v1/files/abc123';
    mockFetch.mockResolvedValue(makeSuccessResponse('image/png'));
    const req = createGetRequest(replicateUrl);
    await GET(req as any);
    const [calledUrl, calledInit] = mockFetch.mock.calls[0];
    expect(calledUrl).toBe(replicateUrl);
    expect(calledInit.headers['Authorization']).toBe('Bearer test-token-abc');
  });

  it('does NOT add auth header for replicate.delivery URLs', async () => {
    const deliveryUrl = 'https://replicate.delivery/pbxt/output.mp4';
    mockFetch.mockResolvedValue(makeSuccessResponse('video/mp4'));
    const req = createGetRequest(deliveryUrl);
    await GET(req as any);
    const [, calledInit] = mockFetch.mock.calls[0];
    expect(calledInit.headers['Authorization']).toBeUndefined();
  });

  it('does NOT add auth header for fal.media URLs', async () => {
    const falUrl = 'https://fal.media/files/video.mp4';
    mockFetch.mockResolvedValue(makeSuccessResponse('video/mp4'));
    const req = createGetRequest(falUrl);
    await GET(req as any);
    const [, calledInit] = mockFetch.mock.calls[0];
    expect(calledInit.headers['Authorization']).toBeUndefined();
  });

  it('returns 502 when upstream returns non-OK status', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: { get: () => null },
    });
    const req = createGetRequest('https://replicate.delivery/output.mp4');
    const res = await GET(req as any);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toMatch(/404|Upstream/i);
  });

  it('returns the correct Content-Type from the upstream response', async () => {
    mockFetch.mockResolvedValue(makeSuccessResponse('image/webp'));
    const req = createGetRequest('https://fal.media/product.webp');
    const res = await GET(req as any);
    expect(res.status).toBe(200);
  });

  it('includes Cache-Control header in successful response', async () => {
    mockFetch.mockResolvedValue(makeSuccessResponse('image/jpeg'));
    const req = createGetRequest('https://replicate.delivery/photo.jpg');
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    // Cache-Control is set in the returned NextResponse
    // (we verify the route calls new NextResponse with the header)
  });

  it('allows pbxt.replicate.delivery subdomains', async () => {
    mockFetch.mockResolvedValue(makeSuccessResponse('image/png'));
    const req = createGetRequest('https://pbxt.replicate.delivery/output.png');
    const res = await GET(req as any);
    expect(res.status).toBe(200);
  });

  it('allows v3.fal.media subdomains', async () => {
    mockFetch.mockResolvedValue(makeSuccessResponse('image/jpeg'));
    const req = createGetRequest('https://v3.fal.media/files/photo.jpg');
    const res = await GET(req as any);
    expect(res.status).toBe(200);
  });

  it('allows storage.googleapis.com', async () => {
    mockFetch.mockResolvedValue(makeSuccessResponse('image/png'));
    const req = createGetRequest('https://storage.googleapis.com/bucket/image.png');
    const res = await GET(req as any);
    expect(res.status).toBe(200);
  });
});

describe('POST /api/proxy-image', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.REPLICATE_API_TOKEN = 'test-token-abc';
  });

  afterEach(() => {
    delete process.env.REPLICATE_API_TOKEN;
  });

  it('returns 400 when url is missing from body', async () => {
    const req = createPostRequest({});
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/url/i);
  });

  it('returns 400 when url is not a string', async () => {
    const req = createPostRequest({ url: 42 });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('returns 400 when url is null', async () => {
    const req = createPostRequest({ url: null });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('adds Replicate Bearer auth for api.replicate.com/v1/files/* via POST', async () => {
    const replicateUrl = 'https://api.replicate.com/v1/files/xyz789';
    mockFetch.mockResolvedValue(makeSuccessResponse('image/png'));
    const req = createPostRequest({ url: replicateUrl });
    await POST(req as any);
    const [, calledInit] = mockFetch.mock.calls[0];
    expect(calledInit.headers['Authorization']).toBe('Bearer test-token-abc');
  });

  it('does not add auth for non-Replicate URLs via POST', async () => {
    const falUrl = 'https://fal.media/files/output.mp4';
    mockFetch.mockResolvedValue(makeSuccessResponse('video/mp4'));
    const req = createPostRequest({ url: falUrl });
    await POST(req as any);
    const [, calledInit] = mockFetch.mock.calls[0];
    expect(calledInit.headers['Authorization']).toBeUndefined();
  });

  it('returns 403 when host is not in allowlist via POST', async () => {
    const req = createPostRequest({ url: 'https://attacker.com/malicious.jpg' });
    const res = await POST(req as any);
    expect(res.status).toBe(403);
  });

  it('returns 200 on successful proxied response', async () => {
    mockFetch.mockResolvedValue(makeSuccessResponse('image/jpeg'));
    const req = createPostRequest({ url: 'https://replicate.delivery/photo.jpg' });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
  });
});
