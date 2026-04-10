// =============================================================================
// Upload API Route - UniStudio
// POST: Accepts multipart FormData with 'file' field.
// Validates file type (png/jpg/webp/gif) and size (max 50MB).
// Uploads to Replicate file hosting for permanent HTTP URLs.
// Falls back to base64 data URL if Replicate upload fails.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { saveUploadedImage } from '@/lib/db/persist';
import { ensureHttpUrl } from '@/lib/api/replicate';

const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided. Include a "file" field in the form data.' },
        { status: 400 },
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported file type "${file.type}". Allowed types: PNG, JPG, WebP, GIF.`,
        },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the 50MB limit.`,
        },
        { status: 400 },
      );
    }

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer();
    let buffer: Buffer = Buffer.from(arrayBuffer);

    // Get image metadata using sharp
    const metadata = await sharp(buffer).metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;

    // Optimize large images (max 2048px, JPEG if over 2.5MB)
    const MAX_BUFFER_SIZE = 2.5 * 1024 * 1024;
    let outputMime = file.type;
    if (buffer.length > MAX_BUFFER_SIZE) {
      buffer = Buffer.from(await sharp(buffer)
        .resize({ width: Math.min(width, 2048), withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer());
      outputMime = 'image/jpeg';
    }

    // Build data URL — used by local processing endpoints (enhance, shadows, upscale)
    // and as a fallback display URL
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${outputMime};base64,${base64}`;

    // Also upload to Replicate file hosting — this URL is passed to Replicate AI models.
    // Note: Replicate file URLs are only accessible by Replicate models, NOT downloadable
    // by our server. So we return BOTH: dataUrl for local processing, replicateUrl for AI.
    let replicateUrl: string | null = null;
    try {
      replicateUrl = await ensureHttpUrl(dataUrl);
    } catch (err) {
      console.warn('[upload] Replicate file upload failed:', err);
    }

    // Save to database
    const imageId = await saveUploadedImage({
      filename: file.name,
      originalUrl: dataUrl,
      width,
      height,
      fileSize: buffer.length,
      mimeType: outputMime,
    });

    return NextResponse.json({
      success: true,
      ...(replicateUrl === null && {
        warning: 'Replicate file upload failed; AI model operations may not work for this image.',
      }),
      data: {
        // Primary URL: data URL (works everywhere — local processing + display)
        url: dataUrl,
        // Replicate URL: for passing to AI models (only Replicate can access)
        replicateUrl,
        filename: file.name,
        width,
        height,
        fileSize: buffer.length,
        imageId,
      },
      cost: 0,
    });
  } catch (error) {
    console.error('[API /upload] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred during upload.',
      },
      { status: 500 },
    );
  }
}
