import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractUrls, sendTelegramMessage } from '@/lib/telegram';
import { ingestLink } from '@/lib/ingestion/pipeline';
import { rateLimit } from '@/lib/security/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // 1. Webhook Secret Token Verification
    const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (configuredSecret) {
      const incomingSecret = req.headers.get('x-telegram-bot-api-secret-token');
      if (incomingSecret !== configuredSecret) {
        return NextResponse.json({ error: 'Unauthorized: Invalid webhook secret' }, { status: 401 });
      }
    }

    const body = await req.json();

    const message = body?.message;
    if (!message || !message.text || !message.from) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const telegramUserId = message.from.id;
    const telegramUsername = message.from.username || message.from.first_name || 'Friend';
    const text = message.text.trim();

    // 2. Shared Rate Limiting per Telegram chat ID
    const rl = await rateLimit(`tg:${chatId}`, 20, 60);
    if (!rl.success) {
      await sendTelegramMessage(
        chatId,
        '⚠️ <b>Slow down:</b> Too many requests sent recently. Please wait a minute before dropping more links.'
      );
      return NextResponse.json({ ok: true });
    }

    const supabase = createAdminClient();

    // 3. Handle /start command (with or without connect code)
    if (text.startsWith('/start')) {
      const parts = text.split(/\s+/);
      const code = parts[1]?.trim(); // /start <code>

      if (code) {
        // Try RPC first (security definer)
        const { data: rpcRes, error: rpcErr } = await (supabase as any).rpc(
          'link_telegram_account',
          {
            p_code: code,
            p_telegram_user_id: telegramUserId,
            p_telegram_username: telegramUsername,
          }
        );

        if (!rpcErr && rpcRes) {
          if (rpcRes.success) {
            const boardMsg = rpcRes.board_name
              ? `\nActive Board: <b>${rpcRes.board_name}</b>`
              : `\n\n<i>Tip: Create a board on the web dashboard to start collecting links!</i>`;

            await sendTelegramMessage(
              chatId,
              `🎉 <b>Connected to Memeboard!</b>\n\nLinked to account: <b>${rpcRes.username}</b>${boardMsg}\n\nAny link or meme you send here will appear on your board in seconds! 🚀`
            );
            return NextResponse.json({ ok: true });
          } else {
            // Check if user is already linked
            const { data: alreadyLinked } = await supabase
              .from('profiles')
              .select('id, username, email')
              .eq('telegram_user_id', telegramUserId)
              .maybeSingle();

            if (alreadyLinked) {
              await sendTelegramMessage(
                chatId,
                `✅ You are already connected to Memeboard as <b>${alreadyLinked.username || alreadyLinked.email}</b>!\n\nJust send any link here and it will be added to your board.`
              );
              return NextResponse.json({ ok: true });
            }

            await sendTelegramMessage(
              chatId,
              `❌ ${rpcRes.error || 'Invalid or expired connect code.'}\n\nPlease visit your Memeboard dashboard to get a fresh connect link.`
            );
            return NextResponse.json({ ok: true });
          }
        }

        // Direct table fallback
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('telegram_link_code', code)
          .maybeSingle();

        if (profileErr || !profile) {
          const { data: alreadyLinked } = await supabase
            .from('profiles')
            .select('id, username, email')
            .eq('telegram_user_id', telegramUserId)
            .maybeSingle();

          if (alreadyLinked) {
            await sendTelegramMessage(
              chatId,
              `✅ You are already connected to Memeboard as <b>${alreadyLinked.username || alreadyLinked.email}</b>!\n\nSend any link and it will be added to your board.`
            );
            return NextResponse.json({ ok: true });
          }

          await sendTelegramMessage(
            chatId,
            `❌ Invalid or expired connect code.\n\nPlease visit your Memeboard dashboard to get a fresh connect link.`
          );
          return NextResponse.json({ ok: true });
        }

        await supabase
          .from('profiles')
          .update({
            telegram_user_id: telegramUserId,
            telegram_username: telegramUsername,
            telegram_link_code: null,
          })
          .eq('id', profile.id);

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

    // 4. Handle Link Submissions via Unified Ingestion Pipeline
    const urls = extractUrls(text);
    if (urls.length > 0) {
      for (const url of urls) {
        const result = await ingestLink({
          source: 'telegram',
          telegramUserId,
          url,
        });

        if (result.success) {
          await sendTelegramMessage(chatId, `Added to "${result.boardName}" 🚀`);
        } else if (result.error === 'Telegram account not linked to Memeboard') {
          await sendTelegramMessage(
            chatId,
            `⚠️ <b>Telegram Account Not Linked</b>\n\nPlease log in to Memeboard on the web and click "Connect Telegram" to link your account!`
          );
          return NextResponse.json({ ok: true });
        } else if (result.error === 'No active board found for your account') {
          await sendTelegramMessage(
            chatId,
            `⚠️ You don't have any boards yet.\n\nPlease create a board on your Memeboard dashboard first!`
          );
          return NextResponse.json({ ok: true });
        } else {
          await sendTelegramMessage(
            chatId,
            `⚠️ Could not add link: ${result.error || 'Unknown error'}`
          );
        }
      }

      return NextResponse.json({ ok: true });
    }

    // Unrecognized text without URLs
    await sendTelegramMessage(
      chatId,
      `Drop a link (Instagram, YouTube, Reddit, X, etc.) and I'll add it to your board! 🔗`
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error in Telegram webhook handler:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
