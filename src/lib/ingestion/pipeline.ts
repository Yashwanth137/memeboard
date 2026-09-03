import { createAdminClient } from '@/lib/supabase/admin';
import { extractMetadata } from '@/lib/metadata';
import { detectPlatform, normalizePlatform } from '@/lib/platform';
import { validateSafeUrl } from '@/lib/security/ssrf';

export interface IngestionInput {
  source: 'telegram' | 'whatsapp' | 'web';
  userId?: string; // Supabase user ID if authenticated via web
  telegramUserId?: number; // Telegram user ID if from Telegram
  whatsappPhone?: string; // WhatsApp phone if from WhatsApp
  url: string;
  boardId?: string; // Optional explicit board ID
  customTitle?: string;
  categoryId?: string;
}

export interface IngestionResult {
  success: boolean;
  linkId?: string;
  boardName?: string;
  boardSlug?: string;
  title?: string;
  contentType?: 'image' | 'video' | 'link';
  error?: string;
}

/**
 * Unified link ingestion controller.
 * Both Telegram, WhatsApp, and Web submissions funnel through this single pipeline.
 */
export async function ingestLink(input: IngestionInput): Promise<IngestionResult> {
  const supabase = createAdminClient();

  // 1. Strict URL validation & sanitization against SSRF
  const validUrl = await validateSafeUrl(input.url);
  if (!validUrl) {
    return { success: false, error: 'Invalid or prohibited URL' };
  }
  const cleanUrl = validUrl.toString();

  // 2. Resolve User & Board
  let resolvedUserId: string | null = null;
  let resolvedBoardId: string | null = null;
  let resolvedBoardName = 'Board';
  let resolvedBoardSlug = '';

  if (input.source === 'telegram' && input.telegramUserId) {
    // Find profile linked to this Telegram user ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('telegram_user_id', input.telegramUserId)
      .single();

    if (!profile) {
      return { success: false, error: 'Telegram account not linked to Memeboard' };
    }
    resolvedUserId = profile.id;

    // Find user's active board
    const { data: memberRecord } = await supabase
      .from('board_members')
      .select('board_id, boards(name, slug)')
      .eq('user_id', resolvedUserId)
      .order('joined_at', { ascending: false })
      .limit(1)
      .single();

    if (!memberRecord || !memberRecord.boards) {
      return { success: false, error: 'No active board found for your account' };
    }

    resolvedBoardId = memberRecord.board_id;
    const boardMeta = memberRecord.boards as unknown as { name: string; slug: string };
    resolvedBoardName = boardMeta?.name || 'Board';
    resolvedBoardSlug = boardMeta?.slug || '';
  } else if (input.source === 'web' && input.userId && input.boardId) {
    resolvedUserId = input.userId;
    resolvedBoardId = input.boardId;

    // Verify user is an active member or owner of the board
    const { data: member } = await supabase
      .from('board_members')
      .select('board_id, boards(name, slug)')
      .eq('board_id', resolvedBoardId)
      .eq('user_id', resolvedUserId)
      .single();

    if (!member) {
      return { success: false, error: 'Forbidden: You are not a member of this board' };
    }

    const memberBoard = member.boards as unknown as { name: string; slug: string } | null;
    resolvedBoardName = memberBoard?.name || 'Board';
    resolvedBoardSlug = memberBoard?.slug || '';
  } else {
    return { success: false, error: 'Invalid ingestion parameters' };
  }

  // 3. Platform Detection & Content Type Classification
  const detected = detectPlatform(cleanUrl);
  const normalizedPlatform = normalizePlatform(detected.id);

  // Fast pre-classification for instant feedback
  let initialContentType: 'image' | 'video' | 'link' = 'link';
  if (
    detected.id === 'youtube' ||
    detected.id === 'tiktok' ||
    cleanUrl.match(/\.(mp4|webm|mov|m3u8)(\?.*)?$/i) ||
    cleanUrl.match(/\/(reel|reels|shorts|clip|clips)\//i)
  ) {
    initialContentType = 'video';
  } else if (
    cleanUrl.match(/\.(jpg|jpeg|png|gif|webp|avif)(\?.*)?$/i) ||
    cleanUrl.includes('i.redd.it')
  ) {
    initialContentType = 'image';
  }

  // 4. Default Category
  let categoryId = input.categoryId;
  if (!categoryId) {
    const { data: defaultCat } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', 'random')
      .is('board_id', null)
      .limit(1)
      .single();
    if (defaultCat) {
      categoryId = defaultCat.id;
    }
  }

  // 5. Initial Insert with baseline information
  const { data: insertedLink, error: insertErr } = await supabase
    .from('links')
    .insert({
      board_id: resolvedBoardId,
      submitted_by: resolvedUserId,
      url: cleanUrl,
      platform: normalizedPlatform,
      content_type: initialContentType,
      title: input.customTitle || `${detected.label} Link`,
      category_id: categoryId,
    })
    .select('id')
    .single();

  if (insertErr || !insertedLink) {
    return { success: false, error: insertErr?.message || 'Failed to save link' };
  }

  // 6. Asynchronous Metadata Enrichment (Phase 2 & 3)
  (async () => {
    try {
      const meta = await extractMetadata(cleanUrl);
      await supabase
        .from('links')
        .update({
          title: input.customTitle || meta.title,
          description: meta.description,
          thumbnail_url: meta.thumbnailUrl,
          content_type: meta.contentType || initialContentType,
          embed_type: meta.embedType,
          external_id: meta.externalId,
          resolved_url: meta.resolvedUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', insertedLink.id);
    } catch {
      // Enrichment failed gracefully — baseline post remains intact
    }
  })();

  return {
    success: true,
    linkId: insertedLink.id,
    boardName: resolvedBoardName,
    boardSlug: resolvedBoardSlug,
    title: input.customTitle || `${detected.label} Link`,
    contentType: initialContentType,
  };
}
