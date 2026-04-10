// =============================================================================
// Processing History API Route - UniStudio
// GET: Returns processing jobs and uploaded images from the database.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    if (!prisma) {
      return NextResponse.json({
        success: true,
        data: { jobs: [], images: [], totalCost: 0, jobCount: 0, imageCount: 0 },
      });
    }

    const { searchParams } = new URL(request.url);
    const rawLimit = Number(searchParams.get('limit') || 100);
    if (isNaN(rawLimit) || rawLimit < 1) {
      return NextResponse.json(
        { success: false, error: 'Invalid "limit" parameter. Must be a positive number.' },
        { status: 400 },
      );
    }
    const limit = Math.min(rawLimit, 500);
    const operation = searchParams.get('operation'); // optional filter

    const where = operation ? { operation } : {};

    const jobs = await prisma.processingJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        operation: true,
        provider: true,
        model: true,
        status: true,
        inputParams: true,
        outputUrl: true,
        cost: true,
        processingTime: true,
        createdAt: true,
      },
    });

    const images = await prisma.image.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        filename: true,
        originalUrl: true,
        processedUrl: true,
        width: true,
        height: true,
        fileSize: true,
        mimeType: true,
        createdAt: true,
      },
    });

    const totalCost = jobs.reduce((sum, j) => sum + j.cost, 0);

    return NextResponse.json({
      success: true,
      data: {
        jobs,
        images,
        totalCost: Math.round(totalCost * 100) / 100,
        jobCount: jobs.length,
        imageCount: images.length,
      },
    });
  } catch (error) {
    console.error('[API /db/history] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch processing history.',
      },
      { status: 500 },
    );
  }
}
