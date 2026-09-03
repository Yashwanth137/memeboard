import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyMutationOrigin } from '@/lib/security/csrf';
import { rateLimit } from '@/lib/security/rate-limit';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. CSRF / Origin Verification
    const originCheck = verifyMutationOrigin(req);
    if (!originCheck.valid) {
      return originCheck.response!;
    }

    const { id: linkId } = await params;
    const supabase = await createClient();

    // 2. Authentication Check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Rate Limiting Check
    const rl = await rateLimit(`link-edit:${user.id}`, 30, 60);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded: Too many edit requests' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { title, category_id } = body;

    // 4. Input Validation
    if (title !== undefined && typeof title !== 'string') {
      return NextResponse.json({ error: 'Invalid title format' }, { status: 400 });
    }
    if (typeof title === 'string' && title.trim().length > 250) {
      return NextResponse.json({ error: 'Title cannot exceed 250 characters' }, { status: 400 });
    }
    if (category_id !== undefined && category_id !== null && typeof category_id !== 'string') {
      return NextResponse.json({ error: 'Invalid category format' }, { status: 400 });
    }

    // 5. Verify ownership / board membership
    const { data: link, error: fetchErr } = await supabase
      .from('links')
      .select('id, submitted_by, board_id, boards(owner_id)')
      .eq('id', linkId)
      .single();

    if (fetchErr || !link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    const isAuthor = link.submitted_by === user.id;
    const isBoardOwner = (link.boards as any)?.owner_id === user.id;

    if (!isAuthor && !isBoardOwner) {
      return NextResponse.json(
        { error: 'Forbidden: You can only edit your own posts' },
        { status: 403 }
      );
    }

    const updates: {
      updated_at: string;
      title?: string;
      category_id?: string | null;
    } = {
      updated_at: new Date().toISOString(),
    };
    if (typeof title === 'string') updates.title = title.trim();
    if (category_id !== undefined) updates.category_id = category_id || null;

    const { data: updated, error: updateErr } = await supabase
      .from('links')
      .update(updates)
      .eq('id', linkId)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, link: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. CSRF / Origin Verification
    const originCheck = verifyMutationOrigin(req);
    if (!originCheck.valid) {
      return originCheck.response!;
    }

    const { id: linkId } = await params;
    const supabase = await createClient();

    // 2. Authentication Check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Rate Limiting Check
    const rl = await rateLimit(`link-del:${user.id}`, 30, 60);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded: Too many delete requests' },
        { status: 429 }
      );
    }

    // 4. Check if user is submitter or board owner
    const { data: link, error: fetchErr } = await supabase
      .from('links')
      .select('id, submitted_by, board_id, boards(owner_id)')
      .eq('id', linkId)
      .single();

    if (fetchErr || !link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    const boardOwnerId = (link.boards as any)?.owner_id;
    const isSubmitter = link.submitted_by === user.id;
    const isBoardOwner = boardOwnerId === user.id;

    if (!isSubmitter && !isBoardOwner) {
      return NextResponse.json(
        { error: 'Forbidden: Only the author or board owner can delete this post' },
        { status: 403 }
      );
    }

    const { error: deleteErr } = await supabase
      .from('links')
      .delete()
      .eq('id', linkId);

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
