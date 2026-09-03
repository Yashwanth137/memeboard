export type PlatformId = 'x' | 'reddit' | 'youtube' | 'instagram' | 'tiktok' | 'facebook' | 'other';
export type EmbedType = 'youtube' | 'x' | 'reddit' | 'instagram' | 'card';

export interface PlatformInfo {
  id: PlatformId;
  label: string;
  domain: string;
  accentColor: string;
  badgeBg: string;
}

export interface EmbedDetails {
  platform: PlatformId;
  embedType: EmbedType;
  externalId: string | null;
  permalink?: string | null;
}

export const PLATFORMS_FILTER_LIST: { id: 'all' | PlatformId; label: string }[] = [
  { id: 'all', label: 'All Platforms' },
  { id: 'x', label: 'X' },
  { id: 'reddit', label: 'Reddit' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'facebook', label: 'Facebook' },
];

/**
 * Normalizes platform strings centrally so legacy 'twitter', capitalized names, etc.
 * always resolve to standard normalized identifiers ('x', 'youtube', 'reddit', etc.).
 */
export function normalizePlatform(raw: string | null | undefined): PlatformId {
  if (!raw) return 'other';
  const val = raw.toLowerCase().trim();
  if (val === 'twitter' || val === 'x' || val === 't.co') return 'x';
  if (val === 'youtube' || val === 'yt' || val === 'youtu.be') return 'youtube';
  if (val === 'reddit' || val === 'redd.it' || val === 'v.redd.it' || val.endsWith('.redd.it')) return 'reddit';
  if (val === 'instagram' || val === 'instagr.am' || val === 'ig') return 'instagram';
  if (val === 'tiktok') return 'tiktok';
  if (val === 'facebook' || val === 'fb') return 'facebook';
  return 'other';
}

/**
 * Extracts YouTube video or Shorts ID (11 chars).
 */
export function extractYouTubeVideoId(rawUrl: string): string | null {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

    // youtu.be/VIDEO_ID
    if (host === 'youtu.be') {
      const id = parsed.pathname.slice(1).split('/')[0];
      return id && id.length === 11 ? id : null;
    }

    // youtube.com, m.youtube.com
    if (host.includes('youtube.com')) {
      // /watch?v=VIDEO_ID
      const v = parsed.searchParams.get('v');
      if (v && v.length === 11) return v;

      // /shorts/VIDEO_ID or /embed/VIDEO_ID or /v/VIDEO_ID or /live/VIDEO_ID
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (['shorts', 'embed', 'v', 'live'].includes(parts[0]) && parts[1]) {
        const id = parts[1].split('?')[0];
        if (id && id.length === 11) return id;
      }
    }
  } catch {}
  return null;
}

export function getYouTubeEmbedUrl(url: string): string | null {
  const videoId = extractYouTubeVideoId(url);
  return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0` : null;
}

/**
 * Extracts X / Twitter status ID.
 * Explicitly rejects pic.twitter.com (as it is media, not a status).
 */
export function extractXStatusId(rawUrl: string): string | null {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

    // pic.twitter.com is a media link, never fabricate a status ID from it
    if (host === 'pic.twitter.com') {
      return null;
    }

    if (host === 'x.com' || host === 'twitter.com' || host.endsWith('.x.com') || host.endsWith('.twitter.com')) {
      const match = parsed.pathname.match(/\/(?:status|statuses)\/([0-9]+)/i);
      return match ? match[1] : null;
    }
  } catch {}
  return null;
}

/**
 * Extracts Reddit post ID and permalink.
 */
export function extractRedditPostInfo(rawUrl: string): { postId: string; permalink: string } | null {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

    if (host === 'redd.it') {
      const id = parsed.pathname.slice(1).split('/')[0];
      return id ? { postId: id, permalink: `https://www.reddit.com/comments/${id}` } : null;
    }

    if (host.includes('reddit.com')) {
      // /r/{sub}/comments/{id}/{slug}/
      const match = parsed.pathname.match(/\/comments\/([a-zA-Z0-9]+)/i);
      if (match) {
        return {
          postId: match[1],
          permalink: `https://www.reddit.com${parsed.pathname}`,
        };
      }
    }
  } catch {}
  return null;
}

/**
 * Extracts Instagram shortcode and post type.
 */
export function extractInstagramId(rawUrl: string): { shortcode: string; type: 'p' | 'reel' | 'tv' } | null {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

    if (host === 'instagr.am' || host.includes('instagram.com')) {
      const match = parsed.pathname.match(/\/(p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/i);
      if (match) {
        const typeStr = match[1].toLowerCase();
        const type = typeStr === 'reels' ? 'reel' : (typeStr as 'p' | 'reel' | 'tv');
        return { shortcode: match[2], type };
      }
    }
  } catch {}
  return null;
}

/**
 * Detects platform information (label, colors, domain).
 */
export function detectPlatform(rawUrl: string): PlatformInfo {
  if (!rawUrl) {
    return {
      id: 'other',
      label: 'Other',
      domain: 'link',
      accentColor: '#94a3b8',
      badgeBg: 'rgba(148, 163, 184, 0.12)',
    };
  }

  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

    // 1. YouTube
    if (host === 'youtu.be' || host.endsWith('youtube.com')) {
      return {
        id: 'youtube',
        label: 'YouTube',
        domain: host,
        accentColor: '#ff0000',
        badgeBg: 'rgba(255, 0, 0, 0.12)',
      };
    }

    // 2. Instagram
    if (host === 'instagr.am' || host.endsWith('instagram.com')) {
      return {
        id: 'instagram',
        label: 'Instagram',
        domain: host,
        accentColor: '#e1306c',
        badgeBg: 'rgba(225, 48, 108, 0.12)',
      };
    }

    // 3. Reddit
    if (host === 'redd.it' || host.endsWith('.redd.it') || host.endsWith('reddit.com')) {
      return {
        id: 'reddit',
        label: 'Reddit',
        domain: host,
        accentColor: '#ff4500',
        badgeBg: 'rgba(255, 69, 0, 0.12)',
      };
    }

    // 4. X / Twitter
    if (host === 'x.com' || host === 't.co' || host.endsWith('.x.com') || host.endsWith('twitter.com')) {
      return {
        id: 'x',
        label: 'X',
        domain: host,
        accentColor: '#1d9bf0',
        badgeBg: 'rgba(29, 155, 240, 0.12)',
      };
    }

    // 5. TikTok
    if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) {
      return {
        id: 'tiktok',
        label: 'TikTok',
        domain: host,
        accentColor: '#00f2fe',
        badgeBg: 'rgba(0, 242, 254, 0.12)',
      };
    }

    // 6. Facebook
    if (host === 'facebook.com' || host.endsWith('.facebook.com') || host === 'fb.watch' || host === 'fb.com') {
      return {
        id: 'facebook',
        label: 'Facebook',
        domain: host,
        accentColor: '#1877f2',
        badgeBg: 'rgba(24, 119, 242, 0.12)',
      };
    }

    // Other
    return {
      id: 'other',
      label: 'Other',
      domain: host,
      accentColor: '#818cf8',
      badgeBg: 'rgba(129, 140, 248, 0.12)',
    };
  } catch {
    return {
      id: 'other',
      label: 'Other',
      domain: 'link',
      accentColor: '#94a3b8',
      badgeBg: 'rgba(148, 163, 184, 0.12)',
    };
  }
}

/**
 * Resolves full embed details and determines whether an official embed is available.
 */
export function resolveEmbedInfo(rawUrl: string): EmbedDetails {
  const platform = detectPlatform(rawUrl);

  if (platform.id === 'youtube') {
    const videoId = extractYouTubeVideoId(rawUrl);
    if (videoId) {
      return { platform: 'youtube', embedType: 'youtube', externalId: videoId };
    }
  }

  if (platform.id === 'x') {
    const statusId = extractXStatusId(rawUrl);
    if (statusId) {
      return { platform: 'x', embedType: 'x', externalId: statusId };
    }
    // pic.twitter.com or media URL without status ID
    return { platform: 'x', embedType: 'card', externalId: null };
  }

  if (platform.id === 'reddit') {
    const info = extractRedditPostInfo(rawUrl);
    if (info) {
      return {
        platform: 'reddit',
        embedType: 'reddit',
        externalId: info.postId,
        permalink: info.permalink,
      };
    }
    // Reddit shortlink like /s/... that needs resolution
    if (rawUrl.includes('/s/')) {
      return { platform: 'reddit', embedType: 'reddit', externalId: null };
    }
  }

  if (platform.id === 'instagram') {
    const igInfo = extractInstagramId(rawUrl);
    if (igInfo) {
      return { platform: 'instagram', embedType: 'instagram', externalId: igInfo.shortcode };
    }
  }

  return {
    platform: platform.id,
    embedType: 'card',
    externalId: null,
  };
}
