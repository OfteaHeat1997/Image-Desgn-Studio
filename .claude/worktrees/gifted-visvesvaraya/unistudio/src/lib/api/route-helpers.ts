// =============================================================================
// Shared API Route Helpers — eliminates repeated boilerplate across 15+ routes
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';

/**
 * Wraps an API route handler with consistent error handling.
 * Replaces the identical try-catch block repeated in every route.
 *
 * Usage:
 *   export const POST = withApiErrorHandler('bg-remove', async (request) => {
 *     // ... your logic ...
 *     return NextResponse.json({ success: true, data: {...}, cost });
 *   });
 */
export function withApiErrorHandler(
  routeName: string,
  handler: (request: NextRequest) => Promise<NextResponse>,
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      return await handler(request);
    } catch (error) {
      console.error(`[API /${routeName}] Error:`, error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error
            ? error.message
            : `Error inesperado en ${routeName}.`,
        },
        { status: 500 },
      );
    }
  };
}

/**
 * Validates that required fields exist in a request body.
 * Returns a 400 response if any field is missing, or null if all present.
 *
 * Usage:
 *   const error = requireFields(body, ['imageUrl', 'provider']);
 *   if (error) return error;
 */
export function requireFields(
  body: Record<string, unknown>,
  fields: string[],
): NextResponse | null {
  for (const field of fields) {
    if (!body[field]) {
      return NextResponse.json(
        { success: false, error: `Falta el campo requerido "${field}".` },
        { status: 400 },
      );
    }
  }
  return null;
}
