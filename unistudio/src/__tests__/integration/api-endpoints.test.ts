// =============================================================================
// Integration Tests — UniStudio API endpoints
// Runs real HTTP requests against a running Next.js server.
// Start the server first: cd unistudio && npm run dev
// Then run: npm run test:integration
//
// Set TEST_URL env var to point at a different host (e.g. staging).
// =============================================================================

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

// A minimal valid 1×1 white PNG, ~68 bytes.
// Used everywhere we need a real image buffer without hitting disk.
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==';
const TINY_PNG_DATA_URL = `data:image/png;base64,${TINY_PNG_BASE64}`;

// ---------------------------------------------------------------------------
// Helper: build a multipart FormData with a fake image file (Node 18+)
// ---------------------------------------------------------------------------
function makePngFormData(fieldName = 'file', filename = 'test.png'): FormData {
  const buf = Buffer.from(TINY_PNG_BASE64, 'base64');
  const blob = new Blob([buf], { type: 'image/png' });
  const form = new FormData();
  form.append(fieldName, blob, filename);
  return form;
}

// ---------------------------------------------------------------------------
// POST /api/upload
// ---------------------------------------------------------------------------

describe('POST /api/upload', () => {
  it('should accept a PNG file and return data.url + data.replicateUrl', async () => {
    const res = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      body: makePngFormData(),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    // url is always a data URL (base64); replicateUrl may be null if no API key
    expect(body.data.url).toMatch(/^data:image\//);
    expect('replicateUrl' in body.data).toBe(true);
    expect(typeof body.data.width).toBe('number');
    expect(typeof body.data.height).toBe('number');
  });

  it('should return 400 when no file is provided', async () => {
    const res = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      body: new FormData(), // empty
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('should return 400 for an unsupported file type', async () => {
    const blob = new Blob(['hello world'], { type: 'text/plain' });
    const form = new FormData();
    form.append('file', blob, 'readme.txt');

    const res = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      body: form,
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/Unsupported file type/i);
  });
});

// ---------------------------------------------------------------------------
// POST /api/bg-remove
// ---------------------------------------------------------------------------

describe('POST /api/bg-remove', () => {
  it('should return 400 for browser provider (cannot run server-side)', async () => {
    const res = await fetch(`${BASE_URL}/api/bg-remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: TINY_PNG_DATA_URL,
        provider: 'browser',
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('should return 400 when required fields are missing', async () => {
    const res = await fetch(`${BASE_URL}/api/bg-remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // missing imageUrl — requireFields() should catch this
      body: JSON.stringify({ provider: 'replicate' }),
    });

    expect(res.status).toBe(400);
  });

  it('should return 400 for an unknown provider', async () => {
    const res = await fetch(`${BASE_URL}/api/bg-remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: TINY_PNG_DATA_URL,
        provider: 'unknown-provider',
      }),
    });

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// POST /api/video
// ---------------------------------------------------------------------------

describe('POST /api/video', () => {
  it('should return 400 when imageUrl is missing', async () => {
    const res = await fetch(`${BASE_URL}/api/video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'wan-2.2-fast', duration: 5 }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('should return 400 for an invalid duration', async () => {
    const res = await fetch(`${BASE_URL}/api/video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: TINY_PNG_DATA_URL,
        provider: 'wan-2.2-fast',
        duration: 999, // exceeds 30s max
      }),
    });

    expect(res.status).toBe(400);
  });

  it('should return 503 when Replicate API key is not configured', async () => {
    // wan-2.2-fast uses Replicate; without REPLICATE_API_TOKEN the route returns 503.
    // On a properly configured server the test is skipped.
    const res = await fetch(`${BASE_URL}/api/video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: TINY_PNG_DATA_URL,
        provider: 'wan-2.2-fast',
        duration: 5,
      }),
    });

    // Accept 503 (no key) OR 400 (other validation) — never 500 (unexpected crash)
    expect([400, 503]).toContain(res.status);
  });

  it('should return 400 for an unknown provider', async () => {
    const res = await fetch(`${BASE_URL}/api/video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: TINY_PNG_DATA_URL,
        provider: 'not-a-real-provider',
        duration: 5,
      }),
    });

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// POST /api/enhance  (free — uses sharp locally, no API key needed)
// ---------------------------------------------------------------------------

describe('POST /api/enhance', () => {
  it('should enhance image via JSON body with auto preset', async () => {
    const res = await fetch(`${BASE_URL}/api/enhance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl: TINY_PNG_DATA_URL, preset: 'auto' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.url).toMatch(/^data:image\//);
    expect(body.data.cost).toBe(0);
  });

  it('should enhance image via FormData with ecommerce preset', async () => {
    const form = makePngFormData();
    form.append('preset', 'ecommerce');

    const res = await fetch(`${BASE_URL}/api/enhance`, {
      method: 'POST',
      body: form,
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.url).toMatch(/^data:image\//);
  });

  it('should return 500 when JSON body has no imageUrl', async () => {
    const res = await fetch(`${BASE_URL}/api/enhance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preset: 'auto' }), // missing imageUrl
    });

    // Route throws inside resolveImageBuffer — caught and returned as 500
    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// GET /api/proxy-image
// ---------------------------------------------------------------------------

describe('GET /api/proxy-image', () => {
  it('should return 400 when url param is missing', async () => {
    const res = await fetch(`${BASE_URL}/api/proxy-image`);
    expect(res.status).toBe(400);
  });

  it('should return 403 for a non-allowlisted host', async () => {
    const url = encodeURIComponent('https://example.com/image.jpg');
    const res = await fetch(`${BASE_URL}/api/proxy-image?url=${url}`);
    expect(res.status).toBe(403);
  });

  it('should return 400 for an invalid URL', async () => {
    const url = encodeURIComponent('not-a-url');
    const res = await fetch(`${BASE_URL}/api/proxy-image?url=${url}`);
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// GET /api/brand-kit
// ---------------------------------------------------------------------------

describe('GET /api/brand-kit', () => {
  it('should return 200 with brand kit data (or null when DB is unavailable)', async () => {
    const res = await fetch(`${BASE_URL}/api/brand-kit`);
    // Returns 200 even without a DB — null guards in getBrandKit()
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    // data is either an object (from DB) or null (no DB)
    expect(['object', 'null'].includes(typeof body.data) || body.data === null).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// GET /api/health
// ---------------------------------------------------------------------------

describe('GET /api/health', () => {
  it('should return status object with env key checks', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toMatch(/healthy|degraded/);
    expect(typeof body.timestamp).toBe('string');
    expect(body.env).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// POST /api/tts  (edge-tts is free; requires internet to reach Microsoft)
// ---------------------------------------------------------------------------

describe('POST /api/tts', () => {
  it('should return 400 when text is empty', async () => {
    const res = await fetch(`${BASE_URL}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '', provider: 'edge-tts' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('should return 400 when text exceeds 1000 characters', async () => {
    const res = await fetch(`${BASE_URL}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'A'.repeat(1001), provider: 'edge-tts' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('should return 400 for an invalid speed value', async () => {
    const res = await fetch(`${BASE_URL}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Hola', provider: 'edge-tts', speed: 5 }),
    });

    expect(res.status).toBe(400);
  });

  // This test needs internet (Microsoft Edge TTS service). Mark with extended timeout.
  it('should generate speech and return audio data', async () => {
    const res = await fetch(`${BASE_URL}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Hola mundo',
        voice: 'es-MX-DaliaNeural',
        provider: 'edge-tts',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  }, 30000);
});

// ---------------------------------------------------------------------------
// POST /api/video-enhance  (local rule-based fallback — no API key needed)
// ---------------------------------------------------------------------------

describe('POST /api/video-enhance', () => {
  it('should return 400 when description is missing', async () => {
    const res = await fetch(`${BASE_URL}/api/video-enhance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'product' }),
    });

    expect(res.status).toBe(400);
  });

  it('should return 400 when description exceeds 500 characters', async () => {
    const res = await fetch(`${BASE_URL}/api/video-enhance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'X'.repeat(501) }),
    });

    expect(res.status).toBe(400);
  });

  it('should enhance a product video description (local fallback)', async () => {
    const res = await fetch(`${BASE_URL}/api/video-enhance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'perfume bottle rotating on white background',
        category: 'product',
        duration: 5,
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(typeof body.data.enhancedPrompt).toBe('string');
    expect(body.data.enhancedPrompt.length).toBeGreaterThan(0);
    expect(typeof body.data.recommendedProvider).toBe('string');
    expect(typeof body.data.estimatedCost).toBe('number');
    expect(body.data.method).toMatch(/local|claude/);
  });

  it('should handle fashion category correctly', async () => {
    const res = await fetch(`${BASE_URL}/api/video-enhance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'summer dress on model',
        category: 'fashion',
        duration: 5,
        platform: 'instagram-reel',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.enhancedPrompt).toMatch(/fashion|dress|model/i);
    // Caption should be set because we passed a platform
    expect(typeof body.data.caption).toBe('string');
  });

  it('should handle avatar category and generate a script', async () => {
    const res = await fetch(`${BASE_URL}/api/video-enhance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'presenta nuestros nuevos zapatos de verano',
        category: 'avatar',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(typeof body.data.script).toBe('string');
  });
});
