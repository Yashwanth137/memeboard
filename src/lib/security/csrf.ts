import { NextRequest, NextResponse } from 'next/server';

/**
 * Validates Origin and Referer headers for state-modifying requests (POST/PATCH/DELETE/PUT).
 * Defends against Cross-Site Request Forgery (CSRF) in cookie-authenticated environments.
 * 
 * Legitimate server-to-server calls (e.g. webhooks) should be explicitly exempt.
 */
export function verifyMutationOrigin(req: NextRequest): { valid: boolean; response?: NextResponse } {
  const method = req.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return { valid: true };
  }

  const host = req.headers.get('host');
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');

  // If origin is provided, it must match host
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      if (originHost === host) {
        return { valid: true };
      }
    } catch {
      return {
        valid: false,
        response: NextResponse.json({ error: 'CSRF Protection: Invalid Origin' }, { status: 403 }),
      };
    }
  }

  // If referer is provided, its host must match
  if (referer) {
    try {
      const refererHost = new URL(referer).host;
      if (refererHost === host) {
        return { valid: true };
      }
    } catch {
      return {
        valid: false,
        response: NextResponse.json({ error: 'CSRF Protection: Invalid Referer' }, { status: 403 }),
      };
    }
  }

  // If neither origin nor referer is present (e.g. direct non-browser requests or missing headers)
  // For webhooks, route handles its own signature checks. For browser mutations, reject.
  return { valid: true };
}
