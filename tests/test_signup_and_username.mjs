import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

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

test('Signup & Username Availability Verification', async (t) => {
  await t.test('is_username_available returns false for existing user "yash"', async () => {
    const { data, error } = await anon.rpc('is_username_available', { p_username: 'yash' });
    assert.equal(error, null, `RPC failed: ${error?.message}`);
    assert.equal(data, false, 'Expected existing username "yash" to NOT be available');
  });

  await t.test('is_username_available returns true for fresh unique username', async () => {
    const unique = 'user_' + Date.now().toString(36);
    const { data, error } = await anon.rpc('is_username_available', { p_username: unique });
    assert.equal(error, null, `RPC failed: ${error?.message}`);
    assert.equal(data, true, 'Expected unique username to be available');
  });

  await t.test('Real user signup succeeds with 200 and triggers profile creation with code', async () => {
    const timestamp = Date.now();
    const testEmail = `test_signup_${timestamp}@example.com`;
    const testUsername = `user_${timestamp.toString(36)}`;

    // Perform real signup via anon client (simulating browser)
    const { data, error } = await anon.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
      options: {
        data: {
          username: testUsername,
        },
      },
    });

    assert.equal(error, null, `Signup returned error: ${error?.message}`);
    assert.ok(data.user, 'Signup should return created user object');
    assert.equal(data.user.email, testEmail);

    const createdUserId = data.user.id;

    // Verify handle_new_user() trigger created the profile row
    const { data: profile, error: profError } = await admin
      .from('profiles')
      .select('*')
      .eq('id', createdUserId)
      .single();

    assert.equal(profError, null, `Profile query failed: ${profError?.message}`);
    assert.ok(profile, 'Profile should have been created by trigger');
    assert.equal(profile.username, testUsername);
    assert.equal(profile.email, testEmail);
    assert.ok(profile.telegram_link_code, 'telegram_link_code should be populated via gen_random_bytes');
    assert.equal(profile.telegram_link_code.length, 12, '6-byte hex should be 12 characters');

    // Clean up test user
    await admin.auth.admin.deleteUser(createdUserId);
  });
});
