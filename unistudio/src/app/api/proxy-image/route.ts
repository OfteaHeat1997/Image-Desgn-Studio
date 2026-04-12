// =============================================================================
// Proxy Image API Route - UniStudio
// POST: Accepts { url: string } JSON.
// Downloads the URL server-side (adding Replicate auth if needed) and streams
// the bytes back to the browser — bypasses browser CORS restrictions on
// api.replicate.com/v1/files/* URLs which require Bearer auth.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_HOSTS = [
  'api.replicate.com',
  'replicate.delivery',
  'pbxt.replicate.delivery',
  'fal.media',
  'v3.fal.media',
  'storage.googleapis.com',
  'cdn.fal.ai',
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body as { url?: string };

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid "url" field.' }, { status: 400 });
    }

    // Only allow proxying from known safe hosts to prevent SSRF
    let hostname: string;
    try {
      hostname = new URL(url).hostname;
    } catch {
      return NextResponse.json({ error: 'Invalid URL.' }, { status: 400 });
    }

    if (!ALLOWED_HOSTS.some(h => hostname === h || hostname.endsWith(`.${h}`))) {
      return NextResponse.json(
        { error: `Host "${hostname}" is not allowed for proxying.` },
        { status: 403 },
      );
    }

    // Add Replicate auth headers for authenticated file URLs
    const headers: Record<string, string> = {};
    if (url.includes('api.replicate.com/v1/files/')) {
      const token = process.env.REPLICATE_API_TOKEN?.trim();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const upstream = await fetch(url, { headers });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${upstream.status} ${upstream.statusText}` },
        { status: 502 },
      );
    }

    const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream';
    const arrayBuffer = await upstream.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Allow the browser to cache the proxied image
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[API /proxy-image] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Proxy failed.' },
      { status: 500 },
    );
  }
}
