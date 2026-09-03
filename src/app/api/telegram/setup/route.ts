import { NextRequest, NextResponse } from 'next/server';
import { TELEGRAM_BOT_TOKEN } from '@/lib/telegram';

export async function GET(req: NextRequest) {
  // Authorization check: require ADMIN_SECRET or admin header
  const adminSecret = process.env.ADMIN_SECRET;
  const authHeader = req.headers.get('authorization');
  const secretParam = req.nextUrl.searchParams.get('secret');

  const providedSecret = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : secretParam;

  if (adminSecret && providedSecret !== adminSecret) {
    return NextResponse.json({ error: 'Unauthorized: invalid admin secret' }, { status: 401 });
  }

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

  // Set the webhook with secret_token if configured
  const webhookEndpoint = `${url.replace(/\/$/, '')}/api/telegram/webhook`;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  let setUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(
    webhookEndpoint
  )}`;
  if (webhookSecret) {
    setUrl += `&secret_token=${encodeURIComponent(webhookSecret)}`;
  }

  try {
    const res = await fetch(setUrl);
    const data = await res.json();
    return NextResponse.json({
      success: data.ok,
      webhookEndpoint,
      secretConfigured: Boolean(webhookSecret),
      telegramResponse: data,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
