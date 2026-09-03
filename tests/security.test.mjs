import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { isPrivateOrReservedIp } from '../src/lib/security/ssrf.ts';

describe('Security: SSRF & IP Validation', () => {
  it('identifies loopback addresses as prohibited', () => {
    assert.equal(isPrivateOrReservedIp('127.0.0.1'), true);
    assert.equal(isPrivateOrReservedIp('127.0.0.254'), true);
    assert.equal(isPrivateOrReservedIp('::1'), true);
    assert.equal(isPrivateOrReservedIp('0:0:0:0:0:0:0:1'), true);
  });

  it('blocks cloud metadata endpoint 169.254.169.254 (AWS, GCP, Azure)', () => {
    assert.equal(isPrivateOrReservedIp('169.254.169.254'), true);
    assert.equal(isPrivateOrReservedIp('169.254.0.1'), true);
  });

  it('blocks RFC 1918 private subnets', () => {
    // 10.0.0.0/8
    assert.equal(isPrivateOrReservedIp('10.0.0.1'), true);
    assert.equal(isPrivateOrReservedIp('10.255.255.255'), true);
    // 172.16.0.0/12
    assert.equal(isPrivateOrReservedIp('172.16.0.1'), true);
    assert.equal(isPrivateOrReservedIp('172.31.255.255'), true);
    // 192.168.0.0/16
    assert.equal(isPrivateOrReservedIp('192.168.1.1'), true);
    assert.equal(isPrivateOrReservedIp('192.168.0.254'), true);
  });

  it('blocks multicast, broadcast, and invalid IPs', () => {
    assert.equal(isPrivateOrReservedIp('224.0.0.1'), true);
    assert.equal(isPrivateOrReservedIp('240.0.0.1'), true);
    assert.equal(isPrivateOrReservedIp('255.255.255.255'), true);
    assert.equal(isPrivateOrReservedIp('0.0.0.0'), true);
    assert.equal(isPrivateOrReservedIp('invalid-ip-string'), true);
  });

  it('allows standard public IP addresses', () => {
    assert.equal(isPrivateOrReservedIp('8.8.8.8'), false);
    assert.equal(isPrivateOrReservedIp('1.1.1.1'), false);
    assert.equal(isPrivateOrReservedIp('142.250.190.46'), false);
  });
});

describe('Security: Token Hashing & Invite Mechanics', () => {
  it('generates 64-character hex SHA-256 hash for raw invite tokens', () => {
    const rawToken = crypto.randomBytes(24).toString('base64url');
    assert.ok(rawToken.length >= 32);

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    assert.equal(tokenHash.length, 64);
    assert.match(tokenHash, /^[a-f0-9]{64}$/);

    // Hash must be deterministic for identical input
    const secondHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    assert.equal(tokenHash, secondHash);

    // Raw token must never match the hash
    assert.notEqual(rawToken, tokenHash);
  });
});
