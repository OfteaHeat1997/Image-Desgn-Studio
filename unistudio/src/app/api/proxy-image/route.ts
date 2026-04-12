// =============================================================================
// Proxy Image API Route - UniStudio
// GET:  ?url=<encoded> — proxy a remote image URL server-side (for <img src>)
// POST: { url: string } — same, but via JSON body (legacy, for fetch() calls)
// Both methods add Replicate Bearer auth for api.replicate.com/v1/files/* URLs.
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

async function proxyUrl(url: string): Promise<NextResponse> {
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
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Missing "url" query parameter.' }, { status: 400 });
  }
  try {
    return await proxyUrl(url);
  } catch (error) {
    console.error('[API /proxy-image GET] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Proxy failed.' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body as { url?: string };

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid "url" field.' }, { status: 400 });
    }

    return await proxyUrl(url);
  } catch (error) {
    console.error('[API /proxy-image POST] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Proxy failed.' },
      { status: 500 },
    );
  }
}
