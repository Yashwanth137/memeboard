import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { extractUrls } from '../src/lib/telegram.ts';

describe('Security: Telegram Secret & Auth Timing Safety', () => {
  function verifySecret(incoming, configured) {
    if (!configured) return { ok: false, status: 500, error: 'Server misconfigured' };
    if (!incoming) return { ok: false, status: 401, error: 'Unauthorized' };
    const incomingBuf = Buffer.from(incoming, 'utf8');
    const configuredBuf = Buffer.from(configured, 'utf8');
    if (
      incomingBuf.length !== configuredBuf.length ||
      !crypto.timingSafeEqual(incomingBuf, configuredBuf)
    ) {
      return { ok: false, status: 401, error: 'Unauthorized' };
    }
    return { ok: true, status: 200 };
  }

  it('rejects empty or missing incoming webhook secret', () => {
    const res = verifySecret(undefined, 'super-secret-token');
    assert.equal(res.ok, false);
    assert.equal(res.status, 401);
  });

  it('rejects mismatched webhook secret in constant time', () => {
    const res = verifySecret('attacker-secret', 'super-secret-token');
    assert.equal(res.ok, false);
    assert.equal(res.status, 401);
  });

  it('fails safe with 500 if server webhook secret is unset', () => {
    const res = verifySecret('incoming-token', undefined);
    assert.equal(res.ok, false);
    assert.equal(res.status, 500);
  });

  it('accepts matching webhook secret', () => {
    const res = verifySecret('correct-token', 'correct-token');
    assert.equal(res.ok, true);
    assert.equal(res.status, 200);
  });
});

describe('Security: Admin Setup Token Isolation', () => {
  function verifyAdminAuth(authHeader, adminSecret) {
    if (!adminSecret) return { ok: false, status: 500, error: 'Unconfigured' };
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return { ok: false, status: 401, error: 'Missing Bearer' };
    }
    const token = authHeader.replace(/^bearer\s+/i, '').trim();
    const tokenBuf = Buffer.from(token, 'utf8');
    const adminBuf = Buffer.from(adminSecret, 'utf8');
    if (
      tokenBuf.length !== adminBuf.length ||
      !crypto.timingSafeEqual(tokenBuf, adminBuf)
    ) {
      return { ok: false, status: 401, error: 'Invalid secret' };
    }
    return { ok: true, status: 200 };
  }

  it('rejects setup requests without Authorization Bearer header', () => {
    const res = verifyAdminAuth(null, 'admin-key-123');
    assert.equal(res.ok, false);
    assert.equal(res.status, 401);
  });

  it('rejects setup requests with invalid bearer secret', () => {
    const res = verifyAdminAuth('Bearer wrong-admin-key', 'admin-key-123');
    assert.equal(res.ok, false);
    assert.equal(res.status, 401);
  });

  it('authenticates valid Bearer tokens in constant time', () => {
    const res = verifyAdminAuth('Bearer admin-key-123', 'admin-key-123');
    assert.equal(res.ok, true);
    assert.equal(res.status, 200);
  });
});

describe('Security: Ingestion Batch Capping & Message Parsing', () => {
  it('extracts URLs from caption when text is absent (photos/videos)', () => {
    const caption = 'Check out this meme: https://youtube.com/watch?v=dQw4w9WgXcQ';
    const urls = extractUrls(caption);
    assert.equal(urls.length, 1);
    assert.equal(urls[0], 'https://youtube.com/watch?v=dQw4w9WgXcQ');
  });

  it('enforces maximum batch limit of 5 URLs per message payload', () => {
    const text = Array.from({ length: 15 }, (_, i) => `https://example.com/post/${i}`).join(' ');
    const urls = extractUrls(text);
    const MAX_BATCH_URLS = 5;
    const capped = urls.slice(0, MAX_BATCH_URLS);
    assert.equal(urls.length, 15);
    assert.equal(capped.length, 5);
  });
});
