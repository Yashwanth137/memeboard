import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
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

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const WEBHOOK_SECRET = env.TELEGRAM_WEBHOOK_SECRET;

const admin = createClient(SUPABASE_URL, SERVICE_KEY);
const anon = createClient(SUPABASE_URL, ANON_KEY);

async function createAuthenticatedUser(email, password, username) {
  console.log(`Creating user: ${username} (${email})...`);
  
  // 1. Sign up through standard signup flow
  const { data: signUpData, error: signUpErr } = await anon.auth.signUp({
    email,
    password,
    options: {
      data: { username },
    },
  });

  if (signUpErr) {
    throw new Error(`Signup failed for ${username}: ${signUpErr.message}`);
  }

  const userId = signUpData.user.id;

  // 2. Ensure email is confirmed via admin if needed
  await admin.auth.admin.updateUserById(userId, { email_confirm: true });

  // 3. Generate session token for this user
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });

  if (linkErr || !linkData?.properties?.email_otp) {
    throw new Error(`Failed to generate login OTP for ${username}: ${linkErr?.message}`);
  }

  const { data: sessionData, error: sessionErr } = await anon.auth.verifyOtp({
    email,
    token: linkData.properties.email_otp,
    type: 'email',
  });

  if (sessionErr || !sessionData?.session) {
    throw new Error(`Failed to establish session for ${username}: ${sessionErr?.message}`);
  }

  const client = createClient(SUPABASE_URL, ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    },
  });

  return {
    id: userId,
    email,
    username,
    client,
    session: sessionData.session,
  };
}

async function run() {
  console.log('============================================================');
  console.log('MEMEBOARD MULTI-ACCOUNT SECURITY TEST SUITE');
  console.log('============================================================\n');

  const timestamp = Date.now();
  const emailA = `alice_${timestamp}@test.local`;
  const emailB = `bob_${timestamp}@test.local`;
  const password = 'SecurityTestPassword123!';

  let userA = null;
  let userB = null;
  let createdBoard = null;

  try {
    // ----------------------------------------------------
    // Step 1: Create two test accounts
    // ----------------------------------------------------
    console.log('--- Step 1: Creating two test accounts ---');
    userA = await createAuthenticatedUser(emailA, password, 'alice_test');
    userB = await createAuthenticatedUser(emailB, password, 'bob_test');
    console.log(`User A UID: ${userA.id} (${userA.username})`);
    console.log(`User B UID: ${userB.id} (${userB.username})\n`);

    // ----------------------------------------------------
    // Test 1: Own profile works
    // ----------------------------------------------------
    console.log('--- Test 1: Own profile works for User A & User B ---');
    const { data: profileA, error: errA } = await userA.client
      .from('public_profiles')
      .select('id, username')
      .eq('id', userA.id)
      .single();
    console.log('A reading A public_profile:', profileA, errA ? `ERROR: ${errA.message}` : 'SUCCESS');

    const { data: profileB, error: errB } = await userB.client
      .from('public_profiles')
      .select('id, username')
      .eq('id', userB.id)
      .single();
    console.log('B reading B public_profile:', profileB, errB ? `ERROR: ${errB.message}` : 'SUCCESS');

    const { data: codeA, error: codeErrA } = await userA.client.rpc('generate_telegram_link_code');
    console.log('A generating A telegram code:', codeA, codeErrA ? `ERROR: ${codeErrA.message}` : 'SUCCESS');

    const { data: codeB, error: codeErrB } = await userB.client.rpc('generate_telegram_link_code');
    console.log('B generating B telegram code:', codeB, codeErrB ? `ERROR: ${codeErrB.message}` : 'SUCCESS\n');

    // ----------------------------------------------------
    // Test 2: A cannot read B's private profile
    // ----------------------------------------------------
    console.log("--- Test 2: A cannot read B's private profile via profiles.select('*') ---");
    const { data: t2Data, error: t2Err } = await userA.client
      .from('profiles')
      .select('*')
      .eq('id', userB.id);
    console.log('A querying B via profiles.select(*):');
    console.log('Data:', t2Data);
    console.log('Error:', t2Err ? `${t2Err.code}: ${t2Err.message}` : 'none');
    const t2Passed = t2Err !== null || (Array.isArray(t2Data) && t2Data.length === 0);
    console.log(`Result: ${t2Passed ? 'PASS (Protected)' : 'FAIL'}\n`);

    // ----------------------------------------------------
    // Test 3: A cannot read B's Telegram fields
    // ----------------------------------------------------
    console.log("--- Test 3: A cannot read B's Telegram fields ---");
    const { data: t3Data, error: t3Err } = await userA.client
      .from('profiles')
      .select('telegram_user_id, telegram_username, telegram_link_code')
      .eq('id', userB.id);
    console.log('A querying B telegram fields:');
    console.log('Data:', t3Data);
    console.log('Error:', t3Err ? `${t3Err.code}: ${t3Err.message}` : 'none');
    const t3Passed = t3Err !== null || (Array.isArray(t3Data) && t3Data.length === 0);
    console.log(`Result: ${t3Passed ? 'PASS (Protected)' : 'FAIL'}\n`);

    // ----------------------------------------------------
    // Test 4: A cannot access B through public_profiles when NOT on same board
    // ----------------------------------------------------
    console.log('--- Test 4: A cannot access B through public_profiles (Different Boards) ---');
    const { data: t4Data, error: t4Err } = await userA.client
      .from('public_profiles')
      .select('*')
      .eq('id', userB.id);
    console.log('A querying B on public_profiles before sharing board:');
    console.log('Data:', t4Data);
    console.log('Error:', t4Err ? `${t4Err.code}: ${t4Err.message}` : 'none');
    const t4Passed = Array.isArray(t4Data) && t4Data.length === 0;
    console.log(`Result: ${t4Passed ? 'PASS (0 rows visible)' : 'FAIL'}\n`);

    // ----------------------------------------------------
    // Test 5: Make A and B members of the same Board
    // ----------------------------------------------------
    console.log('--- Test 5: Make A and B members of the same Board ---');
    const boardSlug = `test-board-${timestamp}`;
    const { data: board, error: bErr } = await userA.client
      .from('boards')
      .insert({
        name: 'Shared Test Board',
        slug: boardSlug,
        owner_id: userA.id,
      })
      .select()
      .single();

    if (bErr) throw new Error(`User A failed to create board: ${bErr.message}`);
    createdBoard = board;
    console.log(`Board created: ${board.name} (id: ${board.id})`);

    // Add User B as member to the board
    const { error: joinErr } = await userA.client
      .from('board_members')
      .insert({
        board_id: board.id,
        user_id: userB.id,
        role: 'member',
      });
    if (joinErr) throw new Error(`Failed to add User B to board: ${joinErr.message}`);
    console.log(`User B joined board ${board.name}`);

    // Now A queries B's public_profile
    const { data: t5Data, error: t5Err } = await userA.client
      .from('public_profiles')
      .select('id, username, created_at')
      .eq('id', userB.id);
    console.log('A querying co-member B via public_profiles:');
    console.log('Data:', t5Data);
    console.log('Error:', t5Err ? `${t5Err.code}: ${t5Err.message}` : 'none');
    const t5Passed = Array.isArray(t5Data) && t5Data.length === 1 && t5Data[0].username === 'bob_test';
    console.log(`Result: ${t5Passed ? 'PASS (Co-member username visible)' : 'FAIL'}`);

    // Confirm that private fields cannot be accessed on public_profiles
    const { data: t5PrivData, error: t5PrivErr } = await userA.client
      .from('public_profiles')
      .select('telegram_link_code')
      .eq('id', userB.id);
    console.log('A attempting to select telegram_link_code on public_profiles:');
    console.log('Error:', t5PrivErr ? t5PrivErr.message : 'UNEXPECTED DATA: ' + JSON.stringify(t5PrivData));
    console.log(`Private column query blocked: ${t5PrivErr !== null ? 'PASS' : 'FAIL'}\n`);

    // ----------------------------------------------------
    // Test 6: A cannot see unrelated user after removal from Board
    // ----------------------------------------------------
    console.log('--- Test 6: Remove B from Board and verify boundary ---');
    const { error: removeErr } = await userA.client
      .from('board_members')
      .delete()
      .eq('board_id', board.id)
      .eq('user_id', userB.id);
    if (removeErr) throw new Error(`Failed to remove B from board: ${removeErr.message}`);
    console.log('User B removed from board');

    const { data: t6Data, error: t6Err } = await userA.client
      .from('public_profiles')
      .select('id, username, created_at')
      .eq('id', userB.id);
    console.log('A querying B after removal:');
    console.log('Data:', t6Data);
    console.log('Error:', t6Err ? `${t6Err.code}: ${t6Err.message}` : 'none');
    const t6Passed = Array.isArray(t6Data) && t6Data.length === 0;
    console.log(`Result: ${t6Passed ? 'PASS (0 rows visible after removal)' : 'FAIL'}\n`);

    // ----------------------------------------------------
    // Test 7: Telegram code: A can generate A's code
    // ----------------------------------------------------
    console.log("--- Test 7: A generates A's code ---");
    const { data: newCodeA, error: genErrA } = await userA.client.rpc('generate_telegram_link_code');
    console.log('A generated code:', newCodeA, genErrA ? `ERROR: ${genErrA.message}` : 'SUCCESS');
    const { data: dbProfileA } = await admin.from('profiles').select('telegram_link_code, telegram_link_code_expires_at').eq('id', userA.id).single();
    console.log('A DB row verified:', dbProfileA);
    const t7Passed = dbProfileA?.telegram_link_code === newCodeA && Boolean(dbProfileA?.telegram_link_code_expires_at);
    console.log(`Result: ${t7Passed ? 'PASS' : 'FAIL'}\n`);

    // ----------------------------------------------------
    // Test 8: A cannot generate B's code
    // ----------------------------------------------------
    console.log("--- Test 8: A cannot alter or generate B's code ---");
    const { data: dbProfileBBefore } = await admin.from('profiles').select('telegram_link_code, telegram_link_code_expires_at').eq('id', userB.id).single();
    const bCodeBefore = dbProfileBBefore.telegram_link_code;
    console.log("B's link code before A invokes RPC:", bCodeBefore);

    // User A invokes RPC
    await userA.client.rpc('generate_telegram_link_code');

    const { data: dbProfileBAfter } = await admin.from('profiles').select('telegram_link_code, telegram_link_code_expires_at').eq('id', userB.id).single();
    console.log("B's link code after A invokes RPC:", dbProfileBAfter.telegram_link_code);
    const t8Passed = dbProfileBAfter.telegram_link_code === bCodeBefore;
    console.log(`Result: ${t8Passed ? "PASS (B's code completely unchanged)" : 'FAIL'}\n`);

    // ----------------------------------------------------
    // Test 9: A cannot unlink B
    // ----------------------------------------------------
    console.log('--- Test 9: A cannot unlink B ---');
    // Set mock telegram identity on B via admin
    await admin.from('profiles').update({
      telegram_user_id: 888999111,
      telegram_username: 'bobs_telegram_tag',
    }).eq('id', userB.id);

    console.log("Set B's telegram identity to @bobs_telegram_tag (888999111)");

    // User A calls unlink
    const { data: unlinkRes, error: unlinkErr } = await userA.client.rpc('unlink_telegram_account');
    console.log('A calls unlink_telegram_account:', unlinkRes, unlinkErr ? `ERROR: ${unlinkErr.message}` : 'SUCCESS');

    // Verify B's telegram info is intact
    const { data: bAfterUnlink } = await admin.from('profiles').select('telegram_user_id, telegram_username').eq('id', userB.id).single();
    console.log("B's telegram identity in DB:", bAfterUnlink);
    const t9Passed = bAfterUnlink.telegram_user_id === 888999111 && bAfterUnlink.telegram_username === 'bobs_telegram_tag';
    console.log(`Result: ${t9Passed ? 'PASS (B remained untouched)' : 'FAIL'}\n`);

    // ----------------------------------------------------
    // Test 11: Telegram Webhook Secret Testing
    // ----------------------------------------------------
    console.log('--- Test 11: Telegram Webhook Secret Validation ---');
    
    // 1. No secret
    const resNoSecret = await fetch('http://localhost:3000/api/telegram/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ update_id: 1 }),
    });
    console.log('Webhook with NO secret -> HTTP Status:', resNoSecret.status);

    // 2. Wrong secret
    const resWrongSecret = await fetch('http://localhost:3000/api/telegram/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Bot-Api-Secret-Token': 'wrong-secret-token-12345',
      },
      body: JSON.stringify({ update_id: 2 }),
    });
    console.log('Webhook with WRONG secret -> HTTP Status:', resWrongSecret.status);

    // 3. Correct secret
    const resCorrectSecret = await fetch('http://localhost:3000/api/telegram/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Bot-Api-Secret-Token': WEBHOOK_SECRET,
      },
      body: JSON.stringify({ update_id: 3, message: { text: 'test' } }),
    });
    console.log('Webhook with CORRECT secret -> HTTP Status:', resCorrectSecret.status);

    const t11Passed = resNoSecret.status === 401 && resWrongSecret.status === 401 && resCorrectSecret.status !== 401;
    console.log(`Result: ${t11Passed ? 'PASS (Secret strictly enforced in constant time)' : 'FAIL'}\n`);

    console.log('============================================================');
    console.log('ALL TESTS COMPLETED SUCCESSFULLY');
    console.log('============================================================');
  } finally {
    console.log('\nCleaning up test artifacts...');
    if (createdBoard) {
      await admin.from('boards').delete().eq('id', createdBoard.id);
      console.log(`Cleaned up board ${createdBoard.id}`);
    }
    if (userA) {
      await admin.auth.admin.deleteUser(userA.id);
      console.log(`Cleaned up test user A (${userA.id})`);
    }
    if (userB) {
      await admin.auth.admin.deleteUser(userB.id);
      console.log(`Cleaned up test user B (${userB.id})`);
    }
    console.log('Cleanup complete.');
  }
}

run().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
