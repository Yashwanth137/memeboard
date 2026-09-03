import { NextRequest, NextResponse } from 'next/server';
import { TELEGRAM_BOT_TOKEN } from '@/lib/telegram';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');

  if (!TELEGRAM_BOT_TOKEN) {
    return NextResponse.json(
      { error: 'telegram_bot_key is not set in environment' },
      { status: 500 }
    );
  }

  if (!url) {
    // Return current webhook status
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`
      );
      const data = await res.json();
      return NextResponse.json({
        message: 'Pass ?url=https://your-domain.com to set webhook',
        webhookInfo: data,
      });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  // Set the webhook
  const webhookEndpoint = `${url.replace(/\/$/, '')}/api/telegram/webhook`;
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(
        webhookEndpoint
      )}`
    );
    const data = await res.json();
    return NextResponse.json({
      success: data.ok,
      webhookEndpoint,
      telegramResponse: data,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
