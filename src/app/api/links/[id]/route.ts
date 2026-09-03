import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: linkId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, category_id } = body;

    // Verify ownership
    const { data: link, error: fetchErr } = await supabase
      .from('links')
      .select('id, submitted_by')
      .eq('id', linkId)
      .single();

    if (fetchErr || !link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    if (link.submitted_by !== user.id) {
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
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: linkId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is submitter or board owner
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
