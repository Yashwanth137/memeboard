import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// Load env
let envStr = '';
try {
  envStr = fs.readFileSync('.env.local', 'utf8');
} catch {
  envStr = fs.readFileSync('.env', 'utf8');
}

const env = {};
envStr.split('\n').forEach((line) => {
  const idx = line.indexOf('=');
  if (idx > 0) {
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
});

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

test('Security Boundaries: Database Schema & Isolation', async (t) => {
  await t.test('Admin client has full access to profiles with private columns', async () => {
    const { data, error } = await admin.from('profiles').select('*').limit(1);
    assert.equal(error, null, `Admin query failed: ${error?.message}`);
    assert.ok(Array.isArray(data), 'Expected array of profiles');
    if (data.length > 0) {
      const keys = Object.keys(data[0]);
      assert.ok(keys.includes('id'), 'Profile should have id');
      assert.ok(keys.includes('email'), 'Profile should have email in admin view');
      assert.ok(keys.includes('telegram_user_id'), 'Profile should have telegram_user_id in admin view');
      assert.ok(keys.includes('telegram_link_code'), 'Profile should have telegram_link_code in admin view');
    }
  });

  await t.test('public_profiles view exposes ONLY safe columns (id, username, created_at)', async () => {
    const { data, error } = await admin.from('public_profiles').select('*').limit(1);
    assert.equal(error, null, `public_profiles query failed: ${error?.message}`);
    assert.ok(Array.isArray(data));
    if (data.length > 0) {
      const keys = Object.keys(data[0]);
      assert.deepEqual(keys.sort(), ['created_at', 'id', 'username'].sort(), 'public_profiles must only contain safe columns');
      assert.ok(!keys.includes('email'), 'public_profiles must NEVER include email');
      assert.ok(!keys.includes('telegram_user_id'), 'public_profiles must NEVER include telegram_user_id');
      assert.ok(!keys.includes('telegram_username'), 'public_profiles must NEVER include telegram_username');
      assert.ok(!keys.includes('telegram_link_code'), 'public_profiles must NEVER include telegram_link_code');
    }
  });

  await t.test('public_profiles rejects selection of private columns at SQL view level', async () => {
    const { data, error } = await admin.from('public_profiles').select('email');
    assert.ok(error !== null, 'Querying email on public_profiles must fail');
    assert.match(error.message, /column.*does not exist|Could not find/i);
  });

  await t.test('public_profiles rejects selection of telegram_link_code at SQL view level', async () => {
    const { data, error } = await admin.from('public_profiles').select('telegram_link_code');
    assert.ok(error !== null, 'Querying telegram_link_code on public_profiles must fail');
    assert.match(error.message, /column.*does not exist|Could not find/i);
  });

  await t.test('anon client is strictly blocked from reading profiles table', async () => {
    const { data, error } = await anon.from('profiles').select('id, email').limit(5);
    // Anon query must return empty array (RLS filtered) or error
    if (data) {
      assert.equal(data.length, 0, 'Anon must see 0 rows from profiles');
    } else {
      assert.ok(error !== null, 'Anon query was blocked with error');
    }
  });

  await t.test('Foreign Key Integrity: all board_members.user_id exist in profiles', async () => {
    const { data: members, error: mErr } = await admin.from('board_members').select('user_id');
    assert.equal(mErr, null);
    const { data: profiles, error: pErr } = await admin.from('profiles').select('id');
    assert.equal(pErr, null);

    const profileIdSet = new Set(profiles.map((p) => p.id));
    const orphans = members.filter((m) => !profileIdSet.has(m.user_id));
    assert.equal(orphans.length, 0, `Found ${orphans.length} orphan board members`);
  });
});
