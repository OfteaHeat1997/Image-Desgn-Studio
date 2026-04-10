// =============================================================================
// Rate Limiting Utility - UniStudio
// Simple in-memory rate limiter for API routes.
// =============================================================================

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

/**
 * Check if a request from the given IP is within the allowed rate.
 * Returns true if allowed, false if rate limit exceeded.
 */
export function checkRateLimit(ip: string, maxPerHour: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 3600000 });
    return true;
  }
  if (entry.count >= maxPerHour) return false;
  entry.count++;
  return true;
}

/**
 * Validate that the request comes from an allowed origin.
 * Origin check removed — same-origin fetch calls don't send an Origin header,
 * which was causing false-positive 401s in production. Rate limiting by IP is
 * the active protection layer.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function checkOrigin(_request: Request): boolean {
  return true;
}

/**
 * Extract the client IP from the request headers.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
