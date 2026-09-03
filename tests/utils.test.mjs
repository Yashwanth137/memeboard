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

test('extractUrls extracts single clean URL', () => {
  const text = 'https://www.instagram.com/reel/C7XYZ123/';
  const urls = extractUrls(text);
  assert.deepStrictEqual(urls, ['https://www.instagram.com/reel/C7XYZ123/']);
});

test('extractUrls extracts URLs embedded in conversational text with punctuation', () => {
  const text = 'Bro you have to see this https://youtu.be/dQw4w9WgXcQ! It is insane, also check https://reddit.com/r/memes/comments/123.';
  const urls = extractUrls(text);
  assert.deepStrictEqual(urls, [
    'https://youtu.be/dQw4w9WgXcQ',
    'https://reddit.com/r/memes/comments/123',
  ]);
});

test('extractUrls handles empty or non-URL messages', () => {
  assert.deepStrictEqual(extractUrls('hello world'), []);
  assert.deepStrictEqual(extractUrls(''), []);
  assert.deepStrictEqual(extractUrls(null), []);
});

test('slugify generates clean URL slugs', () => {
  assert.strictEqual(slugify('The Boys'), 'the-boys');
  assert.strictEqual(slugify('Weekend Chaos!!! 2026'), 'weekend-chaos-2026');
  assert.strictEqual(slugify('Movie & Gaming Night'), 'movie-gaming-night');
});
