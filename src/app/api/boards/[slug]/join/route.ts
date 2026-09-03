import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyMutationOrigin } from '@/lib/security/csrf';
import { rateLimit } from '@/lib/security/rate-limit';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const originCheck = verifyMutationOrigin(req);
    if (!originCheck.valid) {
      return originCheck.response!;
    }

    const { slug } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate-limit join attempts to prevent brute-forcing token enumeration
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'anon';
    const rl = await rateLimit(`invite-redeem:${ip}:${user.id}`, 10, 60);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many join attempts. Please wait a minute and try again.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const token = body?.token;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Invite token is required' }, { status: 400 });
    }

    // Compute SHA-256 hash of the presented token
    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    // Attempt atomic redemption via RPC
    const { data: rpcRes, error: rpcErr } = await (supabase as any).rpc(
      'join_board_with_token',
      {
        p_slug: slug,
        p_token_hash: tokenHash,
      }
    );

    if (!rpcErr && rpcRes) {
      if (rpcRes.success) {
        return NextResponse.json({
          success: true,
          boardName: rpcRes.board_name,
          slug: rpcRes.slug,
          alreadyMember: rpcRes.already_member,
        });
      } else {
        // Return generic error for defense against token enumeration
        return NextResponse.json(
          { error: rpcRes.error || 'Invalid or expired invite link' },
          { status: 400 }
        );
      }
    }

    // Fallback: Atomic update via admin client
    const admin = createAdminClient();
    const { data: board } = await admin
      .from('boards')
      .select('id, name, slug')
      .eq('slug', slug)
      .single();

    if (!board) {
      return NextResponse.json(
        { error: 'Invalid or expired invite link' },
        { status: 400 }
      );
    }

    // Check if already a member
    const { data: existingMember } = await admin
      .from('board_members')
      .select('user_id')
      .eq('board_id', board.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json({
        success: true,
        boardName: board.name,
        slug: board.slug,
        alreadyMember: true,
      });
    }

    // Atomic verify & increment on board_invites
    const { data: invite, error: inviteErr } = await admin
      .from('board_invites')
      .select('*')
      .eq('token_hash', tokenHash)
      .eq('board_id', board.id)
      .eq('is_revoked', false)
      .single();

    if (inviteErr || !invite) {
      return NextResponse.json(
        { error: 'Invalid or expired invite link' },
        { status: 400 }
      );
    }

    // Verify expiration and use count
    if (invite.expires_at && new Date(invite.expires_at) <= new Date()) {
      return NextResponse.json(
        { error: 'Invalid or expired invite link' },
        { status: 400 }
      );
    }
    if (invite.max_uses && invite.uses_count >= invite.max_uses) {
      return NextResponse.json(
        { error: 'Invalid or expired invite link' },
        { status: 400 }
      );
    }

    // Increment count
    await admin
      .from('board_invites')
      .update({ uses_count: invite.uses_count + 1 })
      .eq('id', invite.id);

    // Add member
    await admin.from('board_members').insert({
      board_id: board.id,
      user_id: user.id,
      role: 'member',
    });

    return NextResponse.json({
      success: true,
      boardName: board.name,
      slug: board.slug,
      alreadyMember: false,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to join board' },
      { status: 500 }
    );
  }
}
