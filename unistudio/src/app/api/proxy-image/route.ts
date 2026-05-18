// =============================================================================
// Proxy Image API Route - UniStudio
// GET:  ?url=<encoded>&filename=<optional> — proxy a remote image URL server-side
// POST: { url: string, filename?: string } — same, but via JSON body
// Both methods add Replicate Bearer auth for api.replicate.com/v1/files/* URLs.
// When filename is provided, the response includes Content-Disposition: attachment
// so the browser triggers a real "Save As" instead of opening the image in a tab.
// When upstream returns 403/404 (common for expired fal.media URLs after a few
// hours), the JSON error includes expired:true so the UI can show a clear toast.
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
  // FASHN try-on results: cdn.fashn.ai/<uuid>/output_*.png
  'cdn.fashn.ai',
  'fashn.ai',
  // Kling video provider outputs (suelen llegar como fal.media o cdn.fal.ai
  // pero por las dudas si alguna respuesta directa de Kling pasa por acá).
  'cdn.kling.ai',
];

async function proxyUrl(url: string, filename?: string): Promise<NextResponse> {
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

  const upstreamHeaders: Record<string, string> = {};
  if (url.includes('api.replicate.com/v1/files/')) {
    const token = process.env.REPLICATE_API_TOKEN?.trim();
    if (token) upstreamHeaders['Authorization'] = `Bearer ${token}`;
  }

  const upstream = await fetch(url, { headers: upstreamHeaders });
  if (!upstream.ok) {
    // 403/404 from fal.media/replicate.delivery typically means the temp URL
    // expired (these CDNs garbage-collect after hours/days). Flag it so the
    // client can show "Volvé a generarlo desde la galería" instead of a raw 502.
    const expired = upstream.status === 403 || upstream.status === 404;
    return NextResponse.json(
      { error: `Upstream returned ${upstream.status} ${upstream.statusText}`, expired },
      { status: 502 },
    );
  }

  const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream';
  const arrayBuffer = await upstream.arrayBuffer();

  const responseHeaders: Record<string, string> = {
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=3600',
  };
  if (filename) {
    // RFC 6266 — sanitize to prevent header injection and overly long filenames.
    const safe = filename.replace(/[^\w.\-]/g, '_').slice(0, 120);
    responseHeaders['Content-Disposition'] = `attachment; filename="${safe}"`;
  }

  return new NextResponse(arrayBuffer, { status: 200, headers: responseHeaders });
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  const filename = request.nextUrl.searchParams.get('filename') ?? undefined;
  if (!url) {
    return NextResponse.json({ error: 'Missing "url" query parameter.' }, { status: 400 });
  }
  try {
    return await proxyUrl(url, filename);
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
    const { url, filename } = body as { url?: string; filename?: string };

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid "url" field.' }, { status: 400 });
    }

    return await proxyUrl(url, filename);
  } catch (error) {
    console.error('[API /proxy-image POST] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Proxy failed.' },
      { status: 500 },
    );
  }
}
