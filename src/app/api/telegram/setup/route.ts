import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { TELEGRAM_BOT_TOKEN } from '@/lib/telegram';

function verifyAdminAuth(req: NextRequest): { ok: boolean; status?: number; error?: string } {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    console.error('CRITICAL SECURITY ALERT: ADMIN_SECRET is not configured on server.');
    return {
      ok: false,
      status: 500,
      error: 'Server misconfiguration: ADMIN_SECRET is not configured',
    };
  }

  const authHeader = req.headers.get('authorization') || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return {
      ok: false,
      status: 401,
      error: 'Unauthorized: Missing Bearer token in Authorization header',
    };
  }

  const providedSecret = authHeader.replace(/^Bearer\s+/i, '').trim();
  const providedBuf = Buffer.from(providedSecret, 'utf8');
  const adminBuf = Buffer.from(adminSecret, 'utf8');

  if (
    providedBuf.length !== adminBuf.length ||
    !crypto.timingSafeEqual(providedBuf, adminBuf)
  ) {
    return {
      ok: false,
      status: 401,
      error: 'Unauthorized: Invalid admin secret',
    };
  }

  return { ok: true };
}

// 1. GET: Read-only webhook inspection (Authenticated)
export async function GET(req: NextRequest) {
  const auth = verifyAdminAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!TELEGRAM_BOT_TOKEN) {
    return NextResponse.json(
      { error: 'telegram_bot_key / TELEGRAM_BOT_TOKEN is not configured' },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`
    );
    const data = await res.json();
    return NextResponse.json({
      message: 'To set webhook, send a POST request with JSON body { "url": "https://your-domain.com" }',
      webhookInfo: data,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// 2. POST: Mutate Telegram Webhook (Authenticated)
export async function POST(req: NextRequest) {
  const auth = verifyAdminAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!TELEGRAM_BOT_TOKEN) {
    return NextResponse.json(
      { error: 'telegram_bot_key / TELEGRAM_BOT_TOKEN is not configured' },
      { status: 500 }
    );
  }

  let targetUrl: string | null = null;
  try {
    const body = await req.json();
    targetUrl = body?.url;
  } catch {
    targetUrl = req.nextUrl.searchParams.get('url');
  }

  if (!targetUrl || typeof targetUrl !== 'string') {
    return NextResponse.json(
      { error: 'Missing required "url" parameter in request body' },
      { status: 400 }
    );
  }

  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== 'https:') {
      return NextResponse.json(
        { error: 'Telegram webhooks require a public HTTPS URL (https://...)' },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  const webhookEndpoint = `${targetUrl.replace(/\/$/, '')}/api/telegram/webhook`;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'Cannot configure webhook: TELEGRAM_WEBHOOK_SECRET is missing from environment' },
      { status: 500 }
    );
  }

  let setUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(
    webhookEndpoint
  )}&secret_token=${encodeURIComponent(webhookSecret)}`;

  try {
    const res = await fetch(setUrl);
    const data = await res.json();
    return NextResponse.json({
      success: data.ok,
      webhookEndpoint,
      secretConfigured: true,
      telegramResponse: data,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
