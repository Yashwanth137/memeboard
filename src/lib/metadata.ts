import dns from 'dns/promises';
import net from 'net';
import {
  detectPlatform,
  extractYouTubeVideoId,
  extractXStatusId,
  extractRedditPostInfo,
  extractInstagramId,
  EmbedType,
} from './platform';
import { createAdminClient } from './supabase/admin';

export interface ExtractedMetadata {
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  platform: string;
  contentType: 'image' | 'video' | 'link';
  embedType: EmbedType;
  externalId: string | null;
  resolvedUrl: string | null;
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
    // 169.254.0.0/16 (Link-local / AWS metadata 169.254.169.254)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 172.16.0.0/12 (Private)
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
    // Unique local address fc00::/7
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
    // Link-local unicast fe80::/10
    if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true;

    return false;
  }

  return true;
}

/**
 * Validates a target URL against SSRF vulnerabilities before fetching.
 */
export async function validateSafeUrl(rawUrl: string): Promise<URL | null> {
  try {
    const parsed = new URL(rawUrl);

    // 1. Only allow http and https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    const hostname = parsed.hostname.toLowerCase();

    // 2. Reject obvious localhost / internal hostnames
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      return null;
    }

    // 3. If hostname is a direct IP address, test it
    if (net.isIP(hostname)) {
      if (isPrivateOrReservedIp(hostname)) return null;
      return parsed;
    }

    // 4. Resolve DNS to inspect the underlying IP address
    const lookup = await dns.lookup(hostname);
    if (isPrivateOrReservedIp(lookup.address)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Clean and decode HTML entities and whitespace
 */
function cleanHtmlString(str: string | null | undefined): string | null {
  if (!str) return null;
  const decoded = str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
  return decoded.length > 0 ? decoded : null;
}

/**
 * Extracts metadata from a URL using a two-phase approach:
 *   Phase 1: oEmbed — structured title/description (fast, reliable)
 *   Phase 2: OG HTML scraper — ALWAYS runs to fill gaps, especially og:image
 *   Phase 3: Merge — best of both sources
 */
export async function extractMetadata(rawUrl: string): Promise<ExtractedMetadata> {
  let targetUrl = rawUrl;
  let resolvedUrl: string | null = null;

  // Follow redirects for pic.twitter.com media URLs
  if (rawUrl.includes('pic.twitter.com')) {
    try {
      const res = await fetch(rawUrl, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(3500),
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      });
      if (res.url && (res.url.includes('/status/') || res.url.includes('/statuses/'))) {
        targetUrl = res.url;
        resolvedUrl = res.url;
      }
    } catch {}
  }

  // Follow redirects for Reddit /s/ shortlinks
  if (targetUrl.includes('reddit.com') && targetUrl.includes('/s/')) {
    try {
      const res = await fetch(targetUrl, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(3500),
        headers: { 'User-Agent': 'Mozilla/5.0 (MemeboardBot/2.0)' },
      });
      if (res.url && res.url.includes('/comments/')) {
        targetUrl = res.url;
        resolvedUrl = res.url;
      }
    } catch {}
  }

  const platform = detectPlatform(targetUrl);
  const fallbackTitle = `${platform.label} Link`;

  // Compute embed details
  let embedType: EmbedType = 'card';
  let externalId: string | null = null;

  if (platform.id === 'youtube') {
    externalId = extractYouTubeVideoId(targetUrl);
    embedType = externalId ? 'youtube' : 'card';
  } else if (platform.id === 'x') {
    externalId = extractXStatusId(targetUrl);
    embedType = externalId ? 'x' : 'card';
  } else if (platform.id === 'reddit') {
    const rInfo = extractRedditPostInfo(targetUrl);
    externalId = rInfo?.postId || null;
    embedType = 'reddit';
  } else if (platform.id === 'instagram') {
    const igInfo = extractInstagramId(targetUrl);
    externalId = igInfo?.shortcode || null;
    embedType = externalId ? 'instagram' : 'card';
  }

  const validUrl = await validateSafeUrl(targetUrl);
  if (!validUrl) {
    return {
      title: fallbackTitle, description: null, thumbnailUrl: null,
      platform: platform.id, embedType, externalId, resolvedUrl, contentType: 'link'
    };
  }

  // ── Phase 1: oEmbed — structured title/description ──
  // oEmbed gives good title/author but X and Reddit return NO thumbnail.
  let oembedTitle: string | null = null;
  let oembedDesc: string | null = null;
  let oembedThumb: string | null = null;

  if (platform.id === 'youtube') {
    try {
      const r = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`,
        { signal: AbortSignal.timeout(3500) },
      );
      if (r.ok) {
        const d = await r.json();
        oembedTitle = cleanHtmlString(d.title);
        oembedDesc = d.author_name ? `By ${d.author_name}` : null;
        oembedThumb = d.thumbnail_url || null;
      }
    } catch {}
  } else if (platform.id === 'x' && externalId) {
    try {
      const r = await fetch(
        `https://publish.twitter.com/oembed?url=${encodeURIComponent(targetUrl)}`,
        { signal: AbortSignal.timeout(3500) },
      );
      if (r.ok) {
        const d = await r.json();
        let snippet: string | null = null;
        if (d.html) {
          const m = d.html.match(/<p[^>]*>(.*?)<\/p>/i);
          if (m?.[1]) snippet = cleanHtmlString(m[1].replace(/<[^>]+>/g, ''));
        }
        const author = cleanHtmlString(d.author_name);
        oembedTitle = snippet || (author ? `Post by ${author}` : null);
        oembedDesc = author ? `Posted by ${author}` : null;
      }
    } catch {}
  } else if (platform.id === 'reddit') {
    try {
      const r = await fetch(
        `https://www.reddit.com/oembed?url=${encodeURIComponent(targetUrl)}`,
        { signal: AbortSignal.timeout(3500) },
      );
      if (r.ok) {
        const d = await r.json();
        oembedTitle = cleanHtmlString(d.title);
        const a = cleanHtmlString(d.author_name);
        oembedDesc = a ? `By u/${a}` : null;
      }
    } catch {}
  }

  // ── Phase 2: OG HTML scraper — ALWAYS runs to fill gaps (especially og:image) ──
  let ogTitle: string | null = null;
  let ogDesc: string | null = null;
  let ogThumb: string | null = null;

  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(validUrl.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'TelegramBot (like TwitterBot)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    clearTimeout(tid);

    if (res.ok) {
      const reader = res.body?.getReader();
      let html = '';
      if (reader) {
        const decoder = new TextDecoder('utf-8');
        let bytesRead = 0;
        while (bytesRead < 150000) {
          const { value, done } = await reader.read();
          if (done || !value) break;
          bytesRead += value.length;
          html += decoder.decode(value, { stream: true });
          if (html.includes('</head>')) break;
        }
        reader.cancel().catch(() => {});
      } else {
        html = await res.text();
      }

      // Title
      ogTitle =
        cleanHtmlString(
          (html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
           html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i))?.[1],
        ) ||
        cleanHtmlString(
          (html.match(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i) ||
           html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:title["']/i))?.[1],
        ) ||
        cleanHtmlString(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]);

      // Description
      ogDesc =
        cleanHtmlString(
          (html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
           html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i))?.[1],
        ) ||
        cleanHtmlString(
          html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1],
        );

      // Image — the critical piece that oEmbed misses for X and Reddit
      const imgMatch =
        html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
        html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);

      ogThumb = imgMatch?.[1] ? cleanHtmlString(imgMatch[1]) : null;

      // If it's Reddit, the generic og:image is often a share.redd.it banner. Try to get the real image from embed.
      if (platform.id === 'reddit') {
        try {
          const embedRes = await fetch(`https://embed.reddit.com${new URL(targetUrl).pathname}`, {
            signal: AbortSignal.timeout(3500)
          });
          if (embedRes.ok) {
            const embedHtml = await embedRes.text();
            const redditImages = embedHtml.match(/https:\/\/(?:preview|i)\.redd\.it\/[^"'\s&]+/g);
            if (redditImages && redditImages.length > 0) {
              ogThumb = cleanHtmlString(redditImages[0].replace(/&amp;/g, '&').replace(/&quot;/g, ''));
            }
          }
        } catch {}
      }

      // Resolve relative URLs
      if (ogThumb && !ogThumb.startsWith('http://') && !ogThumb.startsWith('https://')) {
        try {
          ogThumb = new URL(ogThumb, validUrl).toString();
        } catch {
          ogThumb = null;
        }
      }
    }
  } catch {
    // OG scraper failed — we still have oEmbed data
  }

  // ── Phase 3: Merge — oEmbed wins for title/desc, OG fills the image gap ──
  const finalThumb = oembedThumb || ogThumb || null;
  let contentType: 'image' | 'video' | 'link' = 'link';
  
  if (embedType === 'youtube') {
    contentType = 'video';
  } else if (embedType === 'instagram' && targetUrl.match(/\/(reel|reels)\//i)) {
    contentType = 'video';
  } else if (finalThumb) {
    contentType = 'image';
  }

  return {
    title: oembedTitle || ogTitle || fallbackTitle,
    description: oembedDesc || ogDesc || null,
    thumbnailUrl: finalThumb,
    platform: platform.id,
    contentType,
    embedType,
    externalId,
    resolvedUrl,
  };
}

/**
 * Asynchronously enriches a link record in the database with metadata
 * without blocking the caller.
 */
export async function enrichLinkMetadata(linkId: string, url: string): Promise<void> {
  try {
    const meta = await extractMetadata(url);
    const supabase = createAdminClient();

    await supabase
      .from('links')
      .update({
        platform: meta.platform,
        content_type: meta.contentType,
        title: meta.title,
        description: meta.description,
        thumbnail_url: meta.thumbnailUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', linkId);
  } catch (err) {
    console.error(`Failed to enrich metadata for link ${linkId}:`, err);
  }
}
