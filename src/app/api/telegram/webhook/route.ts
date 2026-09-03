import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractUrls, sendTelegramMessage } from '@/lib/telegram';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const message = body?.message;
    if (!message || !message.text || !message.from) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const telegramUserId = message.from.id;
    const telegramUsername = message.from.username || message.from.first_name || 'Friend';
    const text = message.text.trim();

    const supabase = createAdminClient();

    // 1. Handle /start command (with or without connect code)
    if (text.startsWith('/start')) {
      const parts = text.split(/\s+/);
      const code = parts[1]; // /start <code>

      if (code) {
        // Look up profile by telegram_link_code
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('telegram_link_code', code)
          .maybeSingle();

        if (profileErr || !profile) {
          await sendTelegramMessage(
            chatId,
            `❌ Invalid or expired connect code.\n\nPlease visit your Memeboard dashboard to get a fresh connect link.`
          );
          return NextResponse.json({ ok: true });
        }

        // Link profile to this Telegram account
        await supabase
          .from('profiles')
          .update({
            telegram_user_id: telegramUserId,
            telegram_username: telegramUsername,
            telegram_link_code: null, // Clear single-use code
          })
          .eq('id', profile.id);

        // Find active board
        const { data: memberships } = await supabase
          .from('board_members')
          .select('boards ( id, name, slug )')
          .eq('user_id', profile.id)
          .order('joined_at', { ascending: false })
          .limit(1);

        const activeBoard = (memberships?.[0] as any)?.boards;
        const boardMsg = activeBoard
          ? `\nActive Board: <b>${activeBoard.name}</b>`
          : `\n\n<i>Tip: Create a board on the web dashboard to start collecting links!</i>`;

        await sendTelegramMessage(
          chatId,
          `🎉 <b>Connected to Memeboard!</b>\n\nLinked to account: <b>${profile.username || profile.email}</b>${boardMsg}\n\nAny link or meme you send here will appear on your board in seconds! 🚀`
        );
        return NextResponse.json({ ok: true });
      }

      // /start without code: check if already linked
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('telegram_user_id', telegramUserId)
        .maybeSingle();

      if (existingProfile) {
        const { data: memberships } = await supabase
          .from('board_members')
          .select('boards ( id, name, slug )')
          .eq('user_id', existingProfile.id)
          .order('joined_at', { ascending: false })
          .limit(1);

        const activeBoard = (memberships?.[0] as any)?.boards;
        const boardInfo = activeBoard ? `Active Board: <b>${activeBoard.name}</b>` : 'No active board yet';

        await sendTelegramMessage(
          chatId,
          `👋 Welcome back to Memeboard!\n\n${boardInfo}\n\nSend any link (YouTube, Instagram, Reddit, X, etc.) and it will be added to your board.`
        );
      } else {
        await sendTelegramMessage(
          chatId,
          `👋 <b>Welcome to Memeboard!</b>\n\nTo connect this bot to your account:\n1. Open your Memeboard web dashboard.\n2. Click "Connect Telegram".\n3. Start the bot with your unique link!\n\nOnce connected, any link you drop here goes straight to your group's board.`
        );
      }

      return NextResponse.json({ ok: true });
    }

    // 2. Handle Link Submissions
    const urls = extractUrls(text);
    if (urls.length > 0) {
      // Find profile by telegram_user_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('telegram_user_id', telegramUserId)
        .maybeSingle();

      if (!profile) {
        await sendTelegramMessage(
          chatId,
          `⚠️ <b>Telegram Account Not Linked</b>\n\nPlease log in to Memeboard on the web and click "Connect Telegram" so we know which board to save your links to!`
        );
        return NextResponse.json({ ok: true });
      }

      // Find user's active board (latest joined or created)
      const { data: memberships } = await supabase
        .from('board_members')
        .select('boards ( id, name, slug )')
        .eq('user_id', profile.id)
        .order('joined_at', { ascending: false })
        .limit(1);

      const targetBoard = (memberships?.[0] as any)?.boards;

      if (!targetBoard) {
        await sendTelegramMessage(
          chatId,
          `⚠️ You don't have any boards yet.\n\nPlease create a board on your Memeboard dashboard first!`
        );
        return NextResponse.json({ ok: true });
      }

      // Insert all extracted URLs into public.links
      for (const url of urls) {
        await supabase.from('links').insert({
          board_id: targetBoard.id,
          submitted_by: profile.id,
          url: url,
        });
      }

      // Confirmation matching product spec: Added to "The Boys"
      await sendTelegramMessage(chatId, `Added to "${targetBoard.name}"`);

      return NextResponse.json({ ok: true });
    }

    // Unrecognized text without URLs
    await sendTelegramMessage(
      chatId,
      `Drop a link (Instagram, YouTube, TikTok, Reddit, X, etc.) and I'll add it to your board! 🔗`
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error in Telegram webhook handler:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
