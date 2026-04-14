// =============================================================================
// Tests: lib/utils/rate-limit.ts
// Covers: checkOrigin always true, checkRateLimit allow/block/reset,
//         getClientIp from x-forwarded-for and x-real-ip headers
// =============================================================================

import { checkOrigin, checkRateLimit, getClientIp } from '@/lib/utils/rate-limit';

// Use unique IPs per test to avoid sharing state from the module-level Map
let testCounter = 0;
function uniqueIp(prefix = 'test') {
  testCounter++;
  return `${prefix}-${testCounter}-${Math.random().toString(36).slice(2)}`;
}

describe('checkOrigin', () => {
  it('always returns true (origin check removed — rate limiting is the protection layer)', () => {
    const mockRequest = new Request('http://localhost/api/video', {
      headers: { Origin: 'https://evil.example.com' },
    });
    expect(checkOrigin(mockRequest)).toBe(true);
  });

  it('returns true even for requests without an Origin header', () => {
    const mockRequest = new Request('http://localhost/api/video');
    expect(checkOrigin(mockRequest)).toBe(true);
  });

  it('returns true for same-origin requests', () => {
    const mockRequest = new Request('http://localhost/api/video', {
      headers: { Origin: 'http://localhost:3000' },
    });
    expect(checkOrigin(mockRequest)).toBe(true);
  });
});

describe('checkRateLimit', () => {
  it('allows the first request from a new IP', () => {
    const ip = uniqueIp();
    expect(checkRateLimit(ip, 10)).toBe(true);
  });

  it('allows subsequent requests up to the max', () => {
    const ip = uniqueIp();
    const MAX = 5;
    for (let i = 0; i < MAX; i++) {
      expect(checkRateLimit(ip, MAX)).toBe(true);
    }
  });

  it('blocks the request after max requests are consumed', () => {
    const ip = uniqueIp();
    const MAX = 3;
    for (let i = 0; i < MAX; i++) {
      checkRateLimit(ip, MAX); // consume all slots
    }
    expect(checkRateLimit(ip, MAX)).toBe(false);
  });

  it('continues to block once the limit is hit', () => {
    const ip = uniqueIp();
    const MAX = 2;
    checkRateLimit(ip, MAX);
    checkRateLimit(ip, MAX);
    expect(checkRateLimit(ip, MAX)).toBe(false);
    expect(checkRateLimit(ip, MAX)).toBe(false); // still blocked
  });

  it('allows exactly max requests before blocking', () => {
    const ip = uniqueIp();
    const MAX = 4;
    const results: boolean[] = [];
    for (let i = 0; i <= MAX; i++) {
      results.push(checkRateLimit(ip, MAX));
    }
    // First MAX should be true, last one should be false
    expect(results.slice(0, MAX).every(Boolean)).toBe(true);
    expect(results[MAX]).toBe(false);
  });

  it('resets the counter after the time window expires', () => {
    const ip = uniqueIp();
    const MAX = 2;

    // Fill up the limit
    checkRateLimit(ip, MAX);
    checkRateLimit(ip, MAX);
    expect(checkRateLimit(ip, MAX)).toBe(false); // now blocked

    // Mock Date.now to simulate time passing past the 1-hour window
    const realDateNow = Date.now;
    const futureTime = realDateNow() + 3_600_001; // just past 1 hour
    jest.spyOn(Date, 'now').mockReturnValue(futureTime);

    try {
      // After window reset, should be allowed again
      expect(checkRateLimit(ip, MAX)).toBe(true);
    } finally {
      jest.restoreAllMocks();
    }
  });

  it('different IPs have independent counters', () => {
    const MAX = 1;
    const ip1 = uniqueIp('ip1');
    const ip2 = uniqueIp('ip2');

    checkRateLimit(ip1, MAX); // exhausts ip1
    // ip2 should still be allowed
    expect(checkRateLimit(ip2, MAX)).toBe(true);
    // ip1 should now be blocked
    expect(checkRateLimit(ip1, MAX)).toBe(false);
  });

  it('handles maxPerHour = 1 correctly', () => {
    const ip = uniqueIp();
    expect(checkRateLimit(ip, 1)).toBe(true);
    expect(checkRateLimit(ip, 1)).toBe(false);
  });

  it('handles large maxPerHour values', () => {
    const ip = uniqueIp();
    // First call should always succeed regardless of limit
    expect(checkRateLimit(ip, 10_000)).toBe(true);
  });
});

describe('getClientIp', () => {
  it('extracts the first IP from x-forwarded-for header', () => {
    const req = new Request('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '203.0.113.42, 10.0.0.1, 172.16.0.5' },
    });
    expect(getClientIp(req)).toBe('203.0.113.42');
  });

  it('trims whitespace from x-forwarded-for IP', () => {
    const req = new Request('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '  198.51.100.7 , 10.0.0.1' },
    });
    expect(getClientIp(req)).toBe('198.51.100.7');
  });

  it('uses x-forwarded-for when both headers are present', () => {
    const req = new Request('http://localhost/api/test', {
      headers: {
        'x-forwarded-for': '203.0.113.42',
        'x-real-ip': '10.0.0.1',
      },
    });
    // x-forwarded-for takes priority
    expect(getClientIp(req)).toBe('203.0.113.42');
  });

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    const req = new Request('http://localhost/api/test', {
      headers: { 'x-real-ip': '198.51.100.99' },
    });
    expect(getClientIp(req)).toBe('198.51.100.99');
  });

  it('returns "unknown" when no IP headers are present', () => {
    const req = new Request('http://localhost/api/test');
    expect(getClientIp(req)).toBe('unknown');
  });

  it('returns "unknown" when x-forwarded-for is empty string', () => {
    const req = new Request('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '' },
    });
    // Empty string is falsy, falls through to x-real-ip (absent) → 'unknown'
    expect(getClientIp(req)).toBe('unknown');
  });

  it('handles single IP in x-forwarded-for without comma', () => {
    const req = new Request('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '203.0.113.1' },
    });
    expect(getClientIp(req)).toBe('203.0.113.1');
  });

  it('handles IPv6 address in x-real-ip', () => {
    const ipv6 = '2001:db8::1';
    const req = new Request('http://localhost/api/test', {
      headers: { 'x-real-ip': ipv6 },
    });
    expect(getClientIp(req)).toBe(ipv6);
  });
});
