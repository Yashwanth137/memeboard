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

    // Rate-limit invite creation
    const rl = await rateLimit(`invite-gen:${user.id}`, 10, 60);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded: Please wait before generating another invite' },
        { status: 429 }
      );
    }

    // Verify user is owner or member of this board
    const admin = createAdminClient();
    const { data: board } = await admin
      .from('boards')
      .select('id, name, slug, owner_id')
      .eq('slug', slug)
      .single();

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    const { data: membership } = await admin
      .from('board_members')
      .select('role')
      .eq('board_id', board.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership && board.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You must be a member of this board to invite others' },
        { status: 403 }
      );
    }

    // Generate cryptographically secure random token (24 bytes = 32 base64url chars)
    const rawToken = crypto.randomBytes(24).toString('base64url');
    // Compute SHA-256 hash to store in DB
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Default expiration: 7 days
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error: insertErr } = await admin.from('board_invites').insert({
      board_id: board.id,
      token_hash: tokenHash,
      created_by: user.id,
      expires_at: expiresAt,
      max_uses: null, // unlimited within 7 days
      uses_count: 0,
      is_revoked: false,
    });

    if (insertErr) {
      return NextResponse.json({ error: 'Failed to create invite token' }, { status: 500 });
    }

    // Return the raw token ONLY once upon creation
    const origin = req.headers.get('origin') || 'https://memeboard.app';
    const inviteUrl = `${origin}/b/${board.slug}/join?token=${rawToken}`;

    return NextResponse.json({
      success: true,
      token: rawToken,
      inviteUrl,
      expiresAt,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
