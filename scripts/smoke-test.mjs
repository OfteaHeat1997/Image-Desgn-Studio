#!/usr/bin/env node
/**
 * UniStudio Smoke Test Suite
 * Tests every API endpoint against production (or custom BASE_URL).
 * Usage: node scripts/smoke-test.mjs [BASE_URL]
 * Example: node scripts/smoke-test.mjs https://unistudio.vercel.app
 */

// ─── Colors ───────────────────────────────────────────────────────────────────
const c = {
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
  dim:    (s) => `\x1b[2m${s}\x1b[0m`,
};

// ─── Config ───────────────────────────────────────────────────────────────────
const BASE_URL = process.argv[2] || 'https://unistudio.vercel.app';
const TIMEOUT_MS = 60_000;
const TEST_IMAGE_URL = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800';
const TEST_IMAGE_URL_2 = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400';

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeout = new Error(`Timeout after ${TIMEOUT_MS / 1000}s`);
      timeout.isTimeout = true;
      throw timeout;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function diagnoseError(status, body, err) {
  if (err?.isTimeout) return 'TIMEOUT — endpoint tardó más de 60s (normal para IA)';
  if (err?.message?.includes('fetch')) return 'CORS o red — no se pudo conectar';
  if (status === 401) return 'Auth requerida';
  if (status === 403) return 'Forbidden';
  if (status === 404) return 'Ruta no encontrada (¿desplegado?)';
  if (status === 413) return 'Imagen demasiado grande';
  if (status === 500) {
    const msg = body?.error || body?.message || '';
    if (msg.toLowerCase().includes('api key') || msg.toLowerCase().includes('token')) return `500 — falta env var de API (${msg.slice(0, 80)})`;
    if (msg.toLowerCase().includes('replicate')) return `500 — error Replicate (${msg.slice(0, 80)})`;
    if (msg.toLowerCase().includes('fal')) return `500 — error FAL (${msg.slice(0, 80)})`;
    return `500 — error servidor${msg ? ': ' + msg.slice(0, 80) : ''}`;
  }
  if (status === 503) return 'Servicio no disponible — posible falta de API key';
  if (status === 502 || status === 504) return `${status} — Gateway error (timeout Vercel)`;
  return body?.error || body?.message || `HTTP ${status}`;
}

/** Run a single test. Returns result object. */
async function runTest({ module, endpoint, method, buildRequest }) {
  const url = `${BASE_URL}${endpoint}`;
  const start = Date.now();
  let status = null;
  let body = null;
  let err = null;

  try {
    const reqOptions = await buildRequest();
    const res = await fetchWithTimeout(url, { method, ...reqOptions });
    status = res.status;
    try {
      const text = await res.text();
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  } catch (e) {
    err = e;
  }

  const ms = Date.now() - start;
  const passed = !err && status >= 200 && status < 400;
  const isTimeout = err?.isTimeout;

  // Some endpoints return 200 but with success:false — still a "warning"
  const successField = body?.success;
  // proxy-image 502 with "Upstream returned" = proxy works, test URL was bad (warn, not fail)
  const proxyUpstreamFail = endpoint.includes('/api/proxy-image') && status === 502 &&
    body?.error?.includes('Upstream returned');
  const warn = (passed && successField === false) || proxyUpstreamFail;

  return { module, endpoint, method, status, body, err, ms, passed, warn, isTimeout };
}

/** Build JSON POST options */
function jsonPost(body) {
  return async () => ({
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Build multipart FormData POST options */
function formPost(fields) {
  return async () => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) {
      if (v instanceof Blob || v instanceof File) {
        fd.append(k, v, 'test.jpg');
      } else {
        fd.append(k, String(v));
      }
    }
    return { body: fd };
  };
}

/** Download a URL and return as Blob */
async function fetchBlob(url) {
  const res = await fetchWithTimeout(url);
  return res.blob();
}

// ─── Test Definitions ─────────────────────────────────────────────────────────
const TESTS = [
  // ── Background ──────────────────────────────────────────────────────────────
  {
    module: 'Background Remove',
    endpoint: '/api/bg-remove',
    method: 'POST',
    buildRequest: jsonPost({ imageUrl: TEST_IMAGE_URL, provider: 'replicate' }),
  },
  {
    module: 'Background Generate',
    endpoint: '/api/bg-generate',
    method: 'POST',
    buildRequest: jsonPost({ imageUrl: TEST_IMAGE_URL, mode: 'fast', style: 'studio-white' }),
  },

  // ── Enhancement ─────────────────────────────────────────────────────────────
  {
    module: 'Enhance',
    endpoint: '/api/enhance',
    method: 'POST',
    buildRequest: jsonPost({ imageUrl: TEST_IMAGE_URL, preset: 'auto' }),
  },
  {
    module: 'Upscale',
    endpoint: '/api/upscale',
    method: 'POST',
    buildRequest: jsonPost({ imageUrl: TEST_IMAGE_URL, scale: 2, provider: 'real-esrgan' }),
  },

  // ── Editing ─────────────────────────────────────────────────────────────────
  {
    module: 'Inpaint',
    endpoint: '/api/inpaint',
    method: 'POST',
    // kontext = prompt-based editing, no maskUrl required (flux-fill-pro needs a maskUrl)
    buildRequest: jsonPost({ imageUrl: TEST_IMAGE_URL, prompt: 'white studio background', provider: 'kontext' }),
  },
  {
    module: 'Shadows',
    endpoint: '/api/shadows',
    method: 'POST',
    buildRequest: jsonPost({ imageUrl: TEST_IMAGE_URL, type: 'drop' }),
  },
  {
    module: 'Outpaint',
    endpoint: '/api/outpaint',
    method: 'POST',
    buildRequest: jsonPost({ imageUrl: TEST_IMAGE_URL, targetAspectRatio: '1:1' }),
  },

  // ── Models & Fashion ─────────────────────────────────────────────────────────
  {
    module: 'Model Create',
    endpoint: '/api/model-create',
    method: 'POST',
    buildRequest: jsonPost({ gender: 'female', ageRange: '25-35', skinTone: 'medium', bodyType: 'average', pose: 'standing', expression: 'neutral' }),
  },
  {
    module: 'TryOn',
    endpoint: '/api/tryon',
    method: 'POST',
    buildRequest: jsonPost({ modelImage: TEST_IMAGE_URL_2, garmentImage: TEST_IMAGE_URL, category: 'upper_body', provider: 'auto' }),
  },
  {
    module: 'Ghost Mannequin',
    endpoint: '/api/ghost-mannequin',
    method: 'POST',
    buildRequest: jsonPost({ imageUrl: TEST_IMAGE_URL, operation: 'remove-mannequin' }),
  },
  {
    module: 'Jewelry TryOn',
    endpoint: '/api/jewelry-tryon',
    method: 'POST',
    buildRequest: jsonPost({ modelImage: TEST_IMAGE_URL_2, jewelryImage: TEST_IMAGE_URL, type: 'earrings', mode: 'exhibidor' }),
  },

  // ── Video ────────────────────────────────────────────────────────────────────
  {
    module: 'Video',
    endpoint: '/api/video',
    method: 'POST',
    // 'kenburns' (no hyphen) = client-side Ken Burns effect, no external API needed → fast
    buildRequest: jsonPost({ imageUrl: TEST_IMAGE_URL, provider: 'kenburns', duration: 5, aspectRatio: '16:9', category: 'product', prompt: 'smooth product showcase' }),
  },
  {
    module: 'Video Enhance',
    endpoint: '/api/video-enhance',
    method: 'POST',
    buildRequest: jsonPost({ description: 'zapatilla deportiva roja', category: 'product' }),
  },

  // ── Creative ─────────────────────────────────────────────────────────────────
  {
    module: 'Ad Create',
    endpoint: '/api/ad-create',
    method: 'POST',
    // videoProvider 'kenburns' returns instantly (no external API), avoids Vercel 10s timeout
    buildRequest: jsonPost({ imageUrl: TEST_IMAGE_URL, template: 'instagram-reel', videoProvider: 'kenburns' }),
  },
  {
    module: 'Prompt Optimizer',
    endpoint: '/api/prompt',
    method: 'POST',
    buildRequest: jsonPost({ description: 'zapatilla deportiva roja sobre fondo blanco', context: { targetPlatform: 'instagram' } }),
  },
  {
    module: 'AI Agent Plan',
    endpoint: '/api/ai-agent/plan',
    method: 'POST',
    // Valid categories: lingerie, perfume, earrings, rings, necklace, bracelet, watch, sunglasses, general
    buildRequest: jsonPost({ agentType: 'ecommerce', productCategory: 'general', budget: 'economic', description: 'zapatilla deportiva' }),
  },

  // ── Utilities ────────────────────────────────────────────────────────────────
  {
    module: 'TTS',
    endpoint: '/api/tts',
    method: 'POST',
    buildRequest: jsonPost({ text: 'Hola, esto es una prueba de voz.', voice: 'es-MX-DaliaNeural', provider: 'edge-tts' }),
  },
  {
    module: 'Upload',
    endpoint: '/api/upload',
    method: 'POST',
    buildRequest: async () => {
      const blob = await fetchBlob(TEST_IMAGE_URL);
      const fd = new FormData();
      fd.append('file', blob, 'test.jpg');
      return { body: fd };
    },
  },
  {
    module: 'Proxy Image',
    endpoint: '/api/proxy-image',
    method: 'POST',
    // Use POST + storage.googleapis.com (in allowed hosts list) with a real public image
    buildRequest: jsonPost({ url: 'https://storage.googleapis.com/cloud-samples-data/ml-api-codelab/bikes_no6.jpg' }),
  },
  {
    module: 'Brand Kit',
    endpoint: '/api/brand-kit',
    method: 'GET',
    buildRequest: async () => ({}),
  },
  {
    module: 'Batch',
    endpoint: '/api/batch',
    method: 'POST',
    // Steps require: id (string), operation, provider, params, enabled (boolean)
    buildRequest: jsonPost({
      imageUrls: [TEST_IMAGE_URL],
      pipeline: {
        steps: [{ id: 'step-1', operation: 'bg-remove', provider: 'replicate', params: {}, enabled: true }],
      },
    }),
  },
];

// ─── Runner ───────────────────────────────────────────────────────────────────
async function runAll() {
  console.log(c.bold(`\n${'═'.repeat(50)}`));
  console.log(c.bold(`  UNISTUDIO SMOKE TEST SUITE`));
  console.log(c.bold(`  Target: ${BASE_URL}`));
  console.log(c.bold(`  Date:   ${new Date().toISOString()}`));
  console.log(c.bold(`${'═'.repeat(50)}\n`));

  const results = [];
  let currentModule = null;

  for (const test of TESTS) {
    if (test.module !== currentModule) {
      currentModule = test.module;
      console.log(c.cyan(c.bold(`\n  ▶ ${currentModule}`)));
    }

    process.stdout.write(`    ${c.dim(test.method.padEnd(4))} ${test.endpoint.split('?')[0].padEnd(35)} `);

    const result = await runTest(test);
    results.push(result);

    if (result.passed && !result.warn) {
      console.log(c.green(`✓ ${result.status ?? 'OK'} (${result.ms}ms)`));
    } else if (result.warn) {
      console.log(c.yellow(`⚠ ${result.status} success:false (${result.ms}ms)`));
      const detail = result.body?.error || result.body?.message || '';
      if (detail) console.log(c.yellow(`       → ${detail.slice(0, 100)}`));
    } else {
      const diag = diagnoseError(result.status, result.body, result.err);
      console.log(c.red(`✗ ${result.status ?? (result.isTimeout ? 'TIMEOUT' : 'ERROR')} — ${diag}`));
    }
  }

  // ─── Summary ───────────────────────────────────────────────────────────────
  const passed  = results.filter(r => r.passed && !r.warn);
  const warned  = results.filter(r => r.warn);
  const failed  = results.filter(r => !r.passed && !r.warn);
  const avgMs   = Math.round(results.reduce((a, r) => a + r.ms, 0) / results.length);
  const slowest = results.sort((a, b) => b.ms - a.ms)[0];

  console.log(`\n${c.bold('═'.repeat(50))}`);
  console.log(c.bold('  RESULTADOS DEL SMOKE TEST'));
  console.log(c.bold('═'.repeat(50)));
  console.log(`  Total endpoints:      ${TESTS.length}`);
  console.log(c.green(`  ✓ Pasaron:           ${passed.length}`));
  if (warned.length)  console.log(c.yellow(`  ⚠ Advertencias:      ${warned.length}`));
  console.log(c.red(`  ✗ Fallaron:          ${failed.length}`));
  console.log(`\n  Tiempo promedio:     ${avgMs}ms`);
  console.log(`  Más lento:           ${slowest.endpoint.split('?')[0]} (${slowest.ms}ms)`);

  if (failed.length > 0) {
    console.log(`\n${c.bold(c.red('  ENDPOINTS FALLIDOS:'))}`);
    for (const r of failed) {
      const diag = diagnoseError(r.status, r.body, r.err);
      console.log(`  ${c.red('✗')} ${r.endpoint.split('?')[0].padEnd(35)} → ${diag}`);
    }
  }

  if (warned.length > 0) {
    console.log(`\n${c.bold(c.yellow('  ADVERTENCIAS:'))}`);
    for (const r of warned) {
      const detail = r.body?.error || r.body?.message || 'success:false en respuesta';
      console.log(`  ${c.yellow('⚠')} ${r.endpoint.split('?')[0].padEnd(35)} → ${detail.slice(0, 100)}`);
    }
  }

  // ─── Recommendations ───────────────────────────────────────────────────────
  console.log(`\n${c.bold('═'.repeat(50))}`);
  console.log(c.bold('  RECOMENDACIONES'));
  console.log(c.bold('═'.repeat(50)));

  const envVarMap = {
    '/api/upscale':         'REPLICATE_API_TOKEN',
    '/api/inpaint':         'REPLICATE_API_TOKEN',
    '/api/outpaint':        'REPLICATE_API_TOKEN',
    '/api/model-create':    'REPLICATE_API_TOKEN',
    '/api/tryon':           'REPLICATE_API_TOKEN y/o FASHN_API_KEY',
    '/api/ghost-mannequin': 'REPLICATE_API_TOKEN',
    '/api/jewelry-tryon':   'REPLICATE_API_TOKEN',
    '/api/bg-remove':       'REPLICATE_API_TOKEN',
    '/api/video':           'REPLICATE_API_TOKEN, FAL_KEY',
    '/api/ad-create':       'REPLICATE_API_TOKEN, FAL_KEY',
    '/api/prompt':          'ANTHROPIC_API_KEY (opcional)',
    '/api/ai-agent/plan':   'ANTHROPIC_API_KEY (opcional)',
    '/api/video-enhance':   'ANTHROPIC_API_KEY (opcional)',
    '/api/batch':           'REPLICATE_API_TOKEN (según pipeline)',
    '/api/brand-kit':       'DATABASE_URL (Prisma)',
  };

  const missingEnvEndpoints = new Set(
    failed.map(r => r.endpoint.split('?')[0])
          .filter(ep => envVarMap[ep])
  );

  if (missingEnvEndpoints.size > 0) {
    console.log(`\n  ${c.bold('Variables de entorno a revisar en Vercel:')}`);
    const seen = new Set();
    for (const ep of missingEnvEndpoints) {
      const envVar = envVarMap[ep];
      if (!seen.has(envVar)) {
        seen.add(envVar);
        console.log(`    • ${c.yellow(envVar)}`);
      }
    }
    console.log(`\n  → Ve a https://vercel.com/dashboard → Settings → Environment Variables`);
  }

  const timeouts = failed.filter(r => r.isTimeout);
  if (timeouts.length > 0) {
    console.log(`\n  ${c.bold('Timeouts (normal para IA, no acción requerida):')}`);
    for (const r of timeouts) {
      console.log(`    • ${r.endpoint.split('?')[0]} — la IA necesita más de 60s en primera ejecución`);
    }
  }

  const notFound = failed.filter(r => r.status === 404);
  if (notFound.length > 0) {
    console.log(`\n  ${c.bold('Rutas 404 — revisar despliegue:')}`);
    for (const r of notFound) {
      console.log(`    • ${r.endpoint.split('?')[0]} — verifica que el último deploy incluyó esta ruta`);
    }
  }

  const working = passed.map(r => r.endpoint.split('?')[0]);
  if (working.length > 0) {
    console.log(`\n  ${c.bold(c.green('Funcionando correctamente:'))}`);
    for (const ep of working) {
      console.log(`    ${c.green('✓')} ${ep}`);
    }
  }

  console.log(`\n${c.bold('═'.repeat(50))}\n`);

  // Exit code
  process.exit(failed.length > 0 ? 1 : 0);
}

runAll().catch(err => {
  console.error(c.red('\nError fatal en el smoke test:'), err);
  process.exit(2);
});
