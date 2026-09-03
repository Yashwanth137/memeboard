import dns from 'dns/promises';
import net from 'net';

export interface SafeFetchOptions {
  headers?: Record<string, string>;
  maxRedirects?: number;
  maxBytes?: number;
  timeoutMs?: number;
}

export interface SafeFetchResult {
  ok: boolean;
  status: number;
  url: string;
  text: string;
  contentType: string | null;
}

/**
 * Checks whether an IP address belongs to a private, loopback, link-local,
 * or non-routable range to prevent Server-Side Request Forgery (SSRF).
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  if (!net.isIP(ip)) return true;

  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    // 0.0.0.0/8 (Current network)
    if (parts[0] === 0) return true;
    // 10.0.0.0/8 (Private)
    if (parts[0] === 10) return true;
    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;
    // 169.254.0.0/16 (Link-local / AWS & Cloud metadata 169.254.169.254)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 172.16.0.0/12 (Private 172.16.0.0 – 172.31.255.255)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
    if (parts[0] >= 224) return true;
    // 255.255.255.255 (Broadcast)
    if (ip === '255.255.255.255') return true;

    return false;
  }

  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    // Loopback ::1
    if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') return true;
    // Unspecified ::
    if (lower === '::' || lower === '0:0:0:0:0:0:0:0') return true;
    // Unique local address fc00::/7 (fc00:: to fdff::)
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
    // Link-local unicast fe80::/10
    if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true;

    return false;
  }

  return true;
}

/**
 * Validates a target URL against SSRF vulnerabilities by resolving all DNS
 * records and validating every returned IP against restricted subnets.
 */
export async function validateSafeUrl(rawUrl: string): Promise<URL | null> {
  try {
    const parsed = new URL(rawUrl);

    // 1. Only allow http and https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    // Reject URLs with embedded credentials (e.g., http://user:pass@example.com)
    if (parsed.username || parsed.password) {
      return null;
    }

    const hostname = parsed.hostname.toLowerCase();

    // 2. Reject localhost & obvious internal domains
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname.includes('metadata.google.internal')
    ) {
      return null;
    }

    // 3. Direct IP addresses
    if (net.isIP(hostname)) {
      if (isPrivateOrReservedIp(hostname)) return null;
      return parsed;
    }

    // 4. Resolve ALL DNS A and AAAA records
    const lookupResults = await dns.lookup(hostname, { all: true });
    if (!lookupResults || lookupResults.length === 0) {
      return null;
    }

    for (const record of lookupResults) {
      if (isPrivateOrReservedIp(record.address)) {
        return null;
      }
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Executes a controlled HTTP request with:
 * - Pre-flight DNS & IP address verification
 * - Manual redirect validation (max 3 hops)
 * - Strict response body stream cutoff (max 512KB)
 * - Strict timeout (default 4000ms)
 */
export async function safeFetch(
  targetUrl: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult | null> {
  const maxRedirects = options.maxRedirects ?? 3;
  const maxBytes = options.maxBytes ?? 512 * 1024; // 512 KB
  const timeoutMs = options.timeoutMs ?? 4000;

  let currentUrl = targetUrl;
  let hops = 0;

  while (hops <= maxRedirects) {
    const validUrl = await validateSafeUrl(currentUrl);
    if (!validUrl) {
      return null;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(validUrl.toString(), {
        method: 'GET',
        redirect: 'manual', // Enforce manual step-by-step redirect validation
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
          ...(options.headers || {}),
        },
      });
      clearTimeout(timer);

      // Handle Redirects
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        hops++;
        if (hops > maxRedirects) {
          return null;
        }

        const location = res.headers.get('location');
        if (!location) {
          return null;
        }

        // Resolve relative redirect URL
        currentUrl = new URL(location, validUrl).toString();
        continue;
      }

      // Check Content-Length header upfront
      const contentLengthHeader = res.headers.get('content-length');
      if (contentLengthHeader) {
        const contentLength = parseInt(contentLengthHeader, 10);
        if (!isNaN(contentLength) && contentLength > maxBytes) {
          return null; // Reject oversized payloads upfront
        }
      }

      // Stream cutoff: stream up to maxBytes, abort remainder
      const reader = res.body?.getReader();
      let accumulatedText = '';
      if (reader) {
        const decoder = new TextDecoder('utf-8');
        let totalBytes = 0;

        while (true) {
          const { value, done } = await reader.read();
          if (done || !value) break;

          totalBytes += value.length;
          if (totalBytes > maxBytes) {
            reader.cancel().catch(() => {});
            break;
          }
          accumulatedText += decoder.decode(value, { stream: true });
        }
      } else {
        accumulatedText = await res.text();
        if (accumulatedText.length > maxBytes) {
          accumulatedText = accumulatedText.slice(0, maxBytes);
        }
      }

      return {
        ok: res.ok,
        status: res.status,
        url: currentUrl,
        text: accumulatedText,
        contentType: res.headers.get('content-type'),
      };
    } catch {
      clearTimeout(timer);
      return null;
    }
  }

  return null;
}
