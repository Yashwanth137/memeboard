import {
  detectPlatform,
  extractYouTubeVideoId,
  extractXStatusId,
  extractRedditPostInfo,
  extractInstagramId,
  EmbedType,
} from './platform';
import { createAdminClient } from './supabase/admin';
import { isPrivateOrReservedIp, validateSafeUrl, safeFetch } from './security/ssrf';

export { isPrivateOrReservedIp, validateSafeUrl };

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
  const initialValid = await validateSafeUrl(rawUrl);
  let platform = detectPlatform(rawUrl);
  let fallbackTitle = `${platform.label} Link`;

  // Compute embed details
  let embedType: EmbedType = 'card';
  let externalId: string | null = null;

  if (platform.id === 'youtube') {
    externalId = extractYouTubeVideoId(rawUrl);
    embedType = externalId ? 'youtube' : 'card';
  } else if (platform.id === 'x') {
    externalId = extractXStatusId(rawUrl);
    embedType = externalId ? 'x' : 'card';
  } else if (platform.id === 'reddit') {
    const rInfo = extractRedditPostInfo(rawUrl);
    externalId = rInfo?.postId || null;
    embedType = 'reddit';
  } else if (platform.id === 'instagram') {
    const igInfo = extractInstagramId(rawUrl);
    externalId = igInfo?.shortcode || null;
    embedType = externalId ? 'instagram' : 'card';
  }

  // If initial URL fails SSRF safety checks, reject immediately without touching network
  if (!initialValid) {
    return {
      title: fallbackTitle,
      description: null,
      thumbnailUrl: null,
      platform: platform.id,
      embedType,
      externalId,
      resolvedUrl: null,
      contentType: 'link',
    };
  }

  let targetUrl = rawUrl;
  let resolvedUrl: string | null = null;

  // Follow redirects for pic.twitter.com media URLs safely
  if (rawUrl.includes('pic.twitter.com')) {
    const res = await safeFetch(rawUrl, { timeoutMs: 3500, maxRedirects: 2 });
    if (res?.url && (res.url.includes('/status/') || res.url.includes('/statuses/'))) {
      targetUrl = res.url;
      resolvedUrl = res.url;
    }
  }

  // Follow redirects for Reddit /s/ shortlinks safely
  if (targetUrl.includes('reddit.com') && targetUrl.includes('/s/')) {
    const res = await safeFetch(targetUrl, { timeoutMs: 3500, maxRedirects: 2 });
    if (res?.url && res.url.includes('/comments/')) {
      targetUrl = res.url;
      resolvedUrl = res.url;
    }
  }

  if (targetUrl !== rawUrl) {
    platform = detectPlatform(targetUrl);
    fallbackTitle = `${platform.label} Link`;
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
  }

  // ── Phase 1: Structured metadata & media type extraction ──
  let oembedTitle: string | null = null;
  let oembedDesc: string | null = null;
  let oembedThumb: string | null = null;
  let isDetectedVideo = false;
  let isDetectedImage = false;

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
      // Primary: FxTwitter provides direct structured media (photos vs videos) + MP4 URLs
      const fxRes = await fetch(`https://api.fxtwitter.com/status/${externalId}`, {
        signal: AbortSignal.timeout(3500),
      });
      if (fxRes.ok) {
        const fxData = await fxRes.json();
        const tweet = fxData.tweet;
        if (tweet) {
          if (tweet.text) oembedTitle = cleanHtmlString(tweet.text);
          if (tweet.author?.name) {
            oembedDesc = `Posted by ${cleanHtmlString(tweet.author.name)}${tweet.author.screen_name ? ` (@${tweet.author.screen_name})` : ''}`;
          }

          if (tweet.media?.videos && tweet.media.videos.length > 0) {
            isDetectedVideo = true;
            oembedThumb = tweet.media.videos[0].thumbnail_url || tweet.media.videos[0].url;
          } else if (tweet.media?.photos && tweet.media.photos.length > 0) {
            isDetectedImage = true;
            oembedThumb = tweet.media.photos[0].url;
          }
        }
      }
    } catch {}

    // Fallback: Twitter oEmbed
    if (!oembedTitle) {
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
    }
  } else if (platform.id === 'reddit') {
    // Check if directly a v.redd.it video link
    if (targetUrl.includes('v.redd.it')) {
      isDetectedVideo = true;
    }

    // Primary: vxreddit proxy provides full unauthenticated OG metadata & video tags
    try {
      const vxUrl = targetUrl.replace(/^(https?:\/\/)?(www\.)?(reddit\.com|redd\.it)/i, 'https://vxreddit.com');
      const vxRes = await safeFetch(vxUrl, {
        headers: { 'User-Agent': 'TelegramBot (like TwitterBot)' },
        timeoutMs: 3500,
        maxBytes: 150000,
      });

      if (vxRes && vxRes.ok && vxRes.text) {
        const vxHtml = vxRes.text;

        // Check if post is a video (video.other, player, og:video, v.redd.it)
        if (
          vxHtml.includes('video.other') ||
          vxHtml.includes('name="twitter:card" content="player"') ||
          vxHtml.includes('og:video') ||
          vxHtml.includes('twitter:player') ||
          vxHtml.includes('v.redd.it')
        ) {
          isDetectedVideo = true;
        }

        const titleMatch = vxHtml.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
        if (titleMatch?.[1]) {
          oembedTitle = cleanHtmlString(titleMatch[1]);
        }

        const siteMatch = vxHtml.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
        if (siteMatch?.[1]) {
          oembedDesc = cleanHtmlString(siteMatch[1]);
        }

        const imgMatch = vxHtml.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
        if (imgMatch?.[1]) {
          oembedThumb = cleanHtmlString(imgMatch[1].replace(/&amp;/g, '&'));
          if (!isDetectedVideo) isDetectedImage = true;
        }
      }
    } catch {}

    // Fallback: Reddit native oEmbed if vxreddit didn't resolve title
    if (!oembedTitle) {
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
  }

  // ── Phase 2: OG HTML scraper — ALWAYS runs to fill gaps (especially og:image) ──
  let ogTitle: string | null = null;
  let ogDesc: string | null = null;
  let ogThumb: string | null = null;

  try {
    const res = await safeFetch(targetUrl, {
      headers: {
        'User-Agent': 'TelegramBot (like TwitterBot)',
        Accept: 'text/html,application/xhtml+xml',
      },
      timeoutMs: 4000,
      maxBytes: 150000,
    });

    if (res && res.ok && res.text) {
      const html = res.text;

      // Detect video tags across all platforms (including Reddit, X, etc.)
      if (
        html.includes('v.redd.it') ||
        Boolean(html.match(/<meta[^>]+property=["']og:video/i)) ||
        Boolean(html.match(/<meta[^>]+name=["']twitter:player/i)) ||
        Boolean(html.match(/<meta[^>]+property=["']og:type["'][^>]+content=["']video/i)) ||
        Boolean(html.match(/<video[^>]*>/i))
      ) {
        isDetectedVideo = true;
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

      // Resolve relative URLs
      if (ogThumb && !ogThumb.startsWith('http://') && !ogThumb.startsWith('https://')) {
        try {
          ogThumb = new URL(ogThumb, targetUrl).toString();
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
  
  const isVideoUrl =
    isDetectedVideo ||
    embedType === 'youtube' ||
    platform.id === 'tiktok' ||
    Boolean(targetUrl.match(/\.(mp4|webm|mov|m3u8)(\?.*)?$/i)) ||
    Boolean(targetUrl.match(/\/(reel|reels|shorts|clip|clips)\//i));

  if (isVideoUrl) {
    contentType = 'video';
  } else if (isDetectedImage || finalThumb) {
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
