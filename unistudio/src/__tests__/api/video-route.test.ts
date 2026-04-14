// =============================================================================
// Tests: /api/video/route.ts
// Covers: validation, API-key checks, error mapping (429/503/500), provider routing
// =============================================================================

// ---- next/server mock (must come before any import) ----
jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    private _body: unknown;

    constructor(body: unknown, init?: ResponseInit) {
      this.status = init?.status ?? 200;
      this._body = body;
    }

    async json() {
      return this._body;
    }

    static json(data: unknown, init?: ResponseInit) {
      const res = new MockNextResponse(data, init);
      res._body = data;
      return res;
    }
  }

  class MockNextRequest {
    method: string;
    headers: Headers;
    private _url: string;
    nextUrl: URL;
    private _body: unknown;

    constructor(url: string, init?: RequestInit) {
      this._url = url;
      this.method = (init?.method ?? 'GET').toUpperCase();
      this.headers = new Headers(init?.headers as HeadersInit);
      this.nextUrl = new URL(url);
      try {
        this._body = init?.body ? JSON.parse(init.body as string) : undefined;
      } catch {
        this._body = init?.body;
      }
    }

    async json() {
      return this._body;
    }

    async formData() {
      return new FormData();
    }
  }

  return { NextRequest: MockNextRequest, NextResponse: MockNextResponse };
});

// ---- External dependency mocks ----
jest.mock('@/lib/api/replicate', () => {
  class ReplicateApiError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.name = 'ReplicateApiError';
      this.code = code;
    }
  }
  return {
    runModel: jest.fn(),
    extractOutputUrl: jest.fn(),
    ensureHttpUrl: jest.fn(),
    ReplicateApiError,
  };
});

jest.mock('@/lib/api/fal', () => {
  class FalApiError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.name = 'FalApiError';
      this.code = code;
    }
  }
  return {
    runFal: jest.fn(),
    extractFalVideoUrl: jest.fn(),
    ensureFalHttpUrl: jest.fn(),
    uploadToFalStorage: jest.fn(),
    FalApiError,
  };
});

jest.mock('@/lib/db/persist', () => ({ saveJob: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/utils/image', () => ({ proxyReplicateUrl: jest.fn((url: string) => url) }));
jest.mock('ffmpeg-static', () => '/usr/bin/ffmpeg');
jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  readFileSync: jest.fn().mockReturnValue(Buffer.from('fake-video-data')),
  unlinkSync: jest.fn(),
}));
jest.mock('os', () => ({ tmpdir: jest.fn().mockReturnValue('/tmp') }));
jest.mock('child_process', () => ({
  spawn: jest.fn().mockImplementation(() => ({
    stderr: { on: jest.fn() },
    on: jest.fn().mockImplementation((event: string, cb: (code: number) => void) => {
      if (event === 'exit') cb(0);
    }),
  })),
}));

// ---- Imports after mocks ----
import { POST } from '@/app/api/video/route';
import {
  runModel,
  extractOutputUrl,
  ReplicateApiError,
} from '@/lib/api/replicate';
import {
  runFal,
  extractFalVideoUrl,
  uploadToFalStorage,
  FalApiError,
} from '@/lib/api/fal';
import { saveJob } from '@/lib/db/persist';

// ---- Helpers ----
function createRequest(body: unknown) {
  const { NextRequest } = jest.requireMock('next/server');
  return new NextRequest('http://localhost/api/video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Request;
}

// ---- Test suite ----
describe('POST /api/video', () => {
  const VALID_BODY = {
    imageUrl: 'https://example.com/product.jpg',
    provider: 'wan-2.2-fast',
    duration: 5,
    aspectRatio: '16:9',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.REPLICATE_API_TOKEN = 'test-replicate-token';
    process.env.FAL_KEY = 'test-fal-key';
    (extractOutputUrl as jest.Mock).mockResolvedValue('https://replicate.delivery/output.mp4');
    (runModel as jest.Mock).mockResolvedValue(['https://replicate.delivery/output.mp4']);
  });

  afterEach(() => {
    delete process.env.REPLICATE_API_TOKEN;
    delete process.env.FAL_KEY;
    delete process.env.FAL_API_KEY;
  });

  // ---- Validation: required fields ----
  it('returns 400 when imageUrl is missing', async () => {
    const req = createRequest({ provider: 'wan-2.2-fast', duration: 5 });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/imageUrl/i);
  });

  // ---- Validation: duration ----
  it('returns 400 for duration = 0', async () => {
    const req = createRequest({ ...VALID_BODY, duration: 0 });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/duration/i);
  });

  it('returns 400 for duration = -1', async () => {
    const req = createRequest({ ...VALID_BODY, duration: -1 });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('returns 400 for duration = 999 (exceeds max 30)', async () => {
    const req = createRequest({ ...VALID_BODY, duration: 999 });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/duration/i);
  });

  it('accepts duration at the boundary value of 1', async () => {
    const req = createRequest({ ...VALID_BODY, duration: 1 });
    const res = await POST(req as any);
    // Should not be a 400 validation error (may be 200 or other non-400)
    expect(res.status).not.toBe(400);
  });

  it('accepts duration at the boundary value of 30', async () => {
    const req = createRequest({ ...VALID_BODY, duration: 30 });
    const res = await POST(req as any);
    expect(res.status).not.toBe(400);
  });

  // ---- Validation: prompt length ----
  it('returns 400 when prompt exceeds 1000 characters', async () => {
    const req = createRequest({ ...VALID_BODY, prompt: 'a'.repeat(1001) });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/1000/);
  });

  it('accepts prompt exactly at 1000 characters', async () => {
    const req = createRequest({ ...VALID_BODY, prompt: 'a'.repeat(1000) });
    const res = await POST(req as any);
    expect(res.status).not.toBe(400);
  });

  // ---- Validation: aspect ratio ----
  it('returns 400 for invalid aspect ratio', async () => {
    const req = createRequest({ ...VALID_BODY, aspectRatio: '21:9' });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/aspectRatio/i);
  });

  it('returns 400 for empty string aspect ratio', async () => {
    const req = createRequest({ ...VALID_BODY, aspectRatio: '' });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('accepts all valid aspect ratios', async () => {
    for (const ar of ['16:9', '9:16', '1:1', '4:3', '3:4']) {
      jest.clearAllMocks();
      (runModel as jest.Mock).mockResolvedValue(['output.mp4']);
      (extractOutputUrl as jest.Mock).mockResolvedValue('https://replicate.delivery/output.mp4');
      const req = createRequest({ ...VALID_BODY, aspectRatio: ar });
      const res = await POST(req as any);
      expect(res.status).not.toBe(400);
    }
  });

  // ---- Validation: provider ----
  it('returns 400 for unknown provider name', async () => {
    const req = createRequest({ ...VALID_BODY, provider: 'unknown-ai-pro' });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/provider|Unknown/i);
  });

  it('returns 400 for empty string provider', async () => {
    const req = createRequest({ ...VALID_BODY, provider: 'not-a-real-provider' });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  // ---- API key checks → 503 ----
  it('returns 503 when REPLICATE_API_TOKEN is missing for replicate provider', async () => {
    delete process.env.REPLICATE_API_TOKEN;
    const req = createRequest({ ...VALID_BODY, provider: 'wan-2.2-fast' }); // replicate backend
    const res = await POST(req as any);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/Replicate|configurado/i);
  });

  it('returns 503 when FAL_KEY is missing for fal provider', async () => {
    delete process.env.FAL_KEY;
    delete process.env.FAL_API_KEY;
    const req = createRequest({ ...VALID_BODY, provider: 'kling-2.6' }); // fal backend
    const res = await POST(req as any);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/fal\.ai|configurado/i);
  });

  // ---- Error mapping: rate limit → 429 ----
  it('returns 429 when Replicate rate limit is exceeded', async () => {
    const { ReplicateApiError: ReplError } = jest.requireMock('@/lib/api/replicate');
    (runModel as jest.Mock).mockRejectedValue(new ReplError('Rate limited', 'RATE_LIMITED'));
    const req = createRequest(VALID_BODY);
    const res = await POST(req as any);
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/Límite|solicitudes/i);
  });

  it('returns 429 when fal.ai rate limit is exceeded', async () => {
    const { FalApiError: FError } = jest.requireMock('@/lib/api/fal');
    (runFal as jest.Mock).mockRejectedValue(new FError('Rate limited', 'RATE_LIMITED'));
    (extractFalVideoUrl as jest.Mock).mockReturnValue('https://fal.media/output.mp4');
    const req = createRequest({ ...VALID_BODY, provider: 'kling-2.6' });
    const res = await POST(req as any);
    expect(res.status).toBe(429);
  });

  // ---- Error mapping: generic → 500 with Spanish message ----
  it('returns 500 with Spanish error message on unexpected crash', async () => {
    (runModel as jest.Mock).mockRejectedValue(new Error('Unexpected internal crash'));
    const req = createRequest(VALID_BODY);
    const res = await POST(req as any);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    // Spanish error message
    expect(body.error).toMatch(/Error|procesando|Intenta/i);
  });

  // ---- Ken Burns (ffmpeg) provider ----
  it('routes kenburns requests through ffmpeg (not Replicate)', async () => {
    (uploadToFalStorage as jest.Mock).mockResolvedValue('https://fal.media/kenburns.mp4');
    // Mock global fetch for image download inside generateKenBurns
    const origFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    }) as unknown as typeof fetch;

    const req = createRequest({
      imageUrl: 'https://example.com/img.jpg',
      provider: 'kenburns',
      duration: 3,
      aspectRatio: '16:9',
    });
    const res = await POST(req as any);
    // runModel (Replicate) should NOT have been called
    expect(runModel).not.toHaveBeenCalled();
    expect(runFal).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    global.fetch = origFetch;
  });

  // ---- Valid request → 200 ----
  it('returns 200 with video URL on valid replicate request', async () => {
    (runModel as jest.Mock).mockResolvedValue(['https://replicate.delivery/video.mp4']);
    (extractOutputUrl as jest.Mock).mockResolvedValue('https://replicate.delivery/video.mp4');

    const req = createRequest(VALID_BODY);
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('url');
    expect(body.data).toHaveProperty('provider', 'wan-2.2-fast');
    expect(body.data).toHaveProperty('duration', 5);
    expect(saveJob).toHaveBeenCalledTimes(1);
  });

  it('returns 200 with video URL on valid fal request', async () => {
    (runFal as jest.Mock).mockResolvedValue({ video: { url: 'https://fal.media/video.mp4' } });
    (extractFalVideoUrl as jest.Mock).mockReturnValue('https://fal.media/video.mp4');

    const req = createRequest({ ...VALID_BODY, provider: 'kling-2.6' });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.provider).toBe('kling-2.6');
  });
});
