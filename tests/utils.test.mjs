import test from 'node:test';
import assert from 'node:assert';

function extractUrls(text) {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const matches = text.match(urlRegex);
  if (!matches) return [];
  return matches.map((url) => url.replace(/[.,;!?)]+$/, ''));
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

function detectPlatform(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

    if (host === 'youtu.be' || host.endsWith('youtube.com')) {
      return 'youtube';
    }
    if (host === 'instagr.am' || host.endsWith('instagram.com')) {
      return 'instagram';
    }
    if (host === 'redd.it' || host.endsWith('reddit.com')) {
      return 'reddit';
    }
    if (host === 'x.com' || host.endsWith('twitter.com')) {
      return 'x';
    }
    return 'other';
  } catch {
    return 'other';
  }
}

function extractYouTubeVideoId(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = parsed.pathname.slice(1).split('/')[0];
      return id && id.length === 11 ? id : null;
    }
    if (host.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v && v.length === 11) return v;
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (['shorts', 'embed', 'v', 'live'].includes(parts[0]) && parts[1]) {
        const id = parts[1].split('?')[0];
        if (id && id.length === 11) return id;
      }
    }
  } catch {}
  return null;
}

function extractXStatusId(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'pic.twitter.com') return null;
    if (host === 'x.com' || host === 'twitter.com' || host.endsWith('.x.com') || host.endsWith('.twitter.com')) {
      const match = parsed.pathname.match(/\/(?:status|statuses)\/([0-9]+)/i);
      return match ? match[1] : null;
    }
  } catch {}
  return null;
}

function extractRedditPostInfo(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'redd.it') {
      const id = parsed.pathname.slice(1).split('/')[0];
      return id ? { postId: id } : null;
    }
    if (host.includes('reddit.com')) {
      const match = parsed.pathname.match(/\/comments\/([a-zA-Z0-9]+)/i);
      if (match) return { postId: match[1] };
    }
  } catch {}
  return null;
}

function extractInstagramId(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'instagr.am' || host.includes('instagram.com')) {
      const match = parsed.pathname.match(/\/(p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/i);
      if (match) {
        return { shortcode: match[2], type: match[1] };
      }
    }
  } catch {}
  return null;
}

function isPrivateOrReservedIp(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return true;
  if (parts[0] === 0) return true;
  if (parts[0] === 10) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  return false;
}

test('extractUrls extracts single clean URL', () => {
  const text = 'https://www.instagram.com/reel/C7XYZ123/';
  const urls = extractUrls(text);
  assert.deepStrictEqual(urls, ['https://www.instagram.com/reel/C7XYZ123/']);
});

test('extractUrls extracts URLs embedded in conversational text with punctuation', () => {
  const text =
    'Bro check https://youtu.be/dQw4w9WgXcQ! Also https://reddit.com/r/memes/123.';
  const urls = extractUrls(text);
  assert.deepStrictEqual(urls, [
    'https://youtu.be/dQw4w9WgXcQ',
    'https://reddit.com/r/memes/123',
  ]);
});

test('slugify generates clean URL slugs', () => {
  assert.strictEqual(slugify('The Boys'), 'the-boys');
  assert.strictEqual(slugify('Weekend Chaos!!! 2026'), 'weekend-chaos-2026');
});

test('detectPlatform accurately detects platforms with domain variations', () => {
  assert.strictEqual(detectPlatform('https://www.youtube.com/watch?v=abc'), 'youtube');
  assert.strictEqual(detectPlatform('https://youtu.be/abc12345678'), 'youtube');
  assert.strictEqual(detectPlatform('https://instagram.com/reel/123'), 'instagram');
  assert.strictEqual(detectPlatform('https://www.reddit.com/r/technology/123'), 'reddit');
  assert.strictEqual(detectPlatform('https://redd.it/xyz'), 'reddit');
  assert.strictEqual(detectPlatform('https://x.com/jack/status/20'), 'x');
  assert.strictEqual(detectPlatform('https://twitter.com/memes/status/123'), 'x');
  assert.strictEqual(detectPlatform('https://github.com/torvalds/linux'), 'other');
});

test('extractYouTubeVideoId supports watch, shorts, and youtu.be URLs', () => {
  assert.strictEqual(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.strictEqual(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.strictEqual(extractYouTubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
});

test('extractXStatusId extracts tweet ID and rejects pic.twitter.com', () => {
  assert.strictEqual(extractXStatusId('https://x.com/lr392860/status/2095422604580659233'), '2095422604580659233');
  assert.strictEqual(extractXStatusId('https://twitter.com/user/status/123456789'), '123456789');
  assert.strictEqual(extractXStatusId('https://pic.twitter.com/Q6ADE6bATq'), null);
});

test('extractRedditPostInfo extracts Reddit comment post ID', () => {
  const info = extractRedditPostInfo('https://www.reddit.com/r/indiameme/comments/1w62dnp/2029_me_modi_khatam_hai/');
  assert.strictEqual(info?.postId, '1w62dnp');
});

test('extractInstagramId extracts post and reel IDs', () => {
  const pInfo = extractInstagramId('https://www.instagram.com/p/C7XYZ123/');
  assert.strictEqual(pInfo?.shortcode, 'C7XYZ123');
  assert.strictEqual(pInfo?.type, 'p');

  const reelInfo = extractInstagramId('https://www.instagram.com/reel/C8ABC999/');
  assert.strictEqual(reelInfo?.shortcode, 'C8ABC999');
  assert.strictEqual(reelInfo?.type, 'reel');
});

test('isPrivateOrReservedIp flags internal IPs for SSRF defense', () => {
  assert.strictEqual(isPrivateOrReservedIp('127.0.0.1'), true);
  assert.strictEqual(isPrivateOrReservedIp('10.0.1.5'), true);
  assert.strictEqual(isPrivateOrReservedIp('192.168.1.1'), true);
  assert.strictEqual(isPrivateOrReservedIp('169.254.169.254'), true);
  assert.strictEqual(isPrivateOrReservedIp('172.20.0.1'), true);
  // Public IP
  assert.strictEqual(isPrivateOrReservedIp('8.8.8.8'), false);
  assert.strictEqual(isPrivateOrReservedIp('1.1.1.1'), false);
});
