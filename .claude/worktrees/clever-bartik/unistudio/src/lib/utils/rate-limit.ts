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
 * Only enforced in production.
 */
export function checkOrigin(request: Request): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  const origin = request.headers.get('origin') || request.headers.get('referer') || '';
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    'http://localhost:3000',
    'http://localhost:3001',
  ].filter(Boolean) as string[];
  return allowedOrigins.some((o) => origin.startsWith(o));
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
