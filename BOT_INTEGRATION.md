# Memeboard Bot Integration Guide: Telegram & WhatsApp

This guide details how to configure, test, and deploy both **Telegram** and **WhatsApp** bots for Memeboard. Both bots connect to Memeboard's **Unified Ingestion Pipeline** (`src/lib/ingestion/pipeline.ts`), ensuring consistent classification, SSRF protection, database persistence, and asynchronous media enrichment.

---

## 🏗 Ingestion Architecture

```
                    ┌─────────────────────────┐
                    │     User / Group Chat   │
                    │  (Telegram or WhatsApp) │
                    └────────────┬────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
      ┌──────────────────────┐       ┌──────────────────────┐
      │   Telegram Webhook   │       │   WhatsApp Webhook   │
      │/api/telegram/webhook │       │/api/whatsapp/webhook │
      └──────────┬───────────┘       └──────────┬───────────┘
                 │ (Secret-Token Guard)         │ (HMAC-SHA256 Guard)
                 └───────────────┬──────────────┘
                                 ▼
                 ┌───────────────────────────────┐
                 │    Unified Ingestion Core     │
                 │ (src/lib/ingestion/pipeline.ts│
                 └───────────────┬───────────────┘
                                 │
                   ┌─────────────┴─────────────┐
                   ▼                           ▼
        ┌──────────────────────┐    ┌──────────────────────┐
        │  Supabase PostgreSQL │    │ Async Meta Scraper   │
        │  (Fast Initial Save) │    │ (X, Reddit, YouTube) │
        └──────────────────────┘    └──────────────────────┘
```

---

## 1. Telegram Bot Integration (Production-Ready)

Telegram support is built directly into Memeboard.

### A. Create Your Bot
1. Open Telegram and search for [@BotFather](https://t.me/botfather).
2. Send `/newbot`.
3. Follow the prompts to choose a bot name (e.g. `Memeboard Bot`) and a username ending in `bot` (e.g. `my_memeboard_bot`).
4. Copy the **HTTP API Bot Token** provided by BotFather (e.g., `1234567890:ABCdef...`).

### B. Environment Configuration
Add the following keys to your `.env` file:

```env
# Telegram Bot API Token from @BotFather
TELEGRAM_BOT_TOKEN="1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ"

# 32+ character random string for webhook verification header (X-Telegram-Bot-Api-Secret-Token)
TELEGRAM_WEBHOOK_SECRET="your-random-32-char-secret-token"

# Admin secret for calling maintenance routes like /api/telegram/setup
ADMIN_SECRET="your-secure-admin-token"
```

### C. Local Development & Testing (Polling Mode)
You do **not** need a public domain or ngrok tunnel for local testing. Run Memeboard's built-in polling bridge:

```bash
npm run bot:dev
```

* This script uses Telegram's `getUpdates` API to fetch new messages and forwards them directly to `http://localhost:3000/api/telegram/webhook`.
* Any messages sent to your bot in Telegram will appear in your local terminal and save to your local database immediately.

### D. Production Webhook Deployment
When deploying to production (Vercel, Railway, Coolify, VPS):

1. Ensure `NEXT_PUBLIC_APP_URL` is set in your environment (e.g., `https://memeboard.yourdomain.com`).
2. Register the webhook with Telegram by calling the setup endpoint:

```bash
curl -X POST "https://memeboard.yourdomain.com/api/telegram/setup" \
  -H "Authorization: Bearer <YOUR_ADMIN_SECRET>"
```

3. Telegram will return:
   ```json
   { "ok": true, "result": true, "description": "Webhook was set" }
   ```

### E. User Onboarding Flow
1. User logs into Memeboard on the web.
2. In their profile or settings modal, they click **"Connect Telegram"** and copy their 8-character connect code (e.g. `a1b2c3d4`).
3. User opens Telegram, starts a chat with `@your_bot`, and sends:
   ```text
   /start a1b2c3d4
   ```
4. The bot responds:
   ```text
   ✅ Connected to Memeboard as @username!
   All links you share here will be saved to your board: "Sinners".
   ```
5. From then on, any URL the user pastes in the chat is saved immediately.
6. **Group Chats**: Users can also add `@your_bot` to a Telegram group chat. Whenever friends share memes or videos in the group, the bot silently extracts the URLs and saves them to the group's board.

---

## 2. WhatsApp Bot Integration

WhatsApp integration can be accomplished using **Meta's WhatsApp Business Cloud API** (direct and free for up to 1,000 monthly service conversations) or **Twilio WhatsApp API**. Below is the implementation for the official Meta Cloud API.

### A. Database Schema
Run this migration in your Supabase SQL editor to add WhatsApp identifiers to profiles:

```sql
alter table public.profiles
  add column if not exists whatsapp_phone_number text unique,
  add column if not exists whatsapp_link_code text unique;

create index if not exists idx_profiles_whatsapp_phone 
  on public.profiles(whatsapp_phone_number);
```

### B. Meta Developer Portal Setup
1. Go to [developers.facebook.com](https://developers.facebook.com) and create an app (Type: **Business**).
2. Add the **WhatsApp** product to your app.
3. In the WhatsApp sidebar, navigate to **API Setup**:
   * Note your **Phone Number ID**.
   * Note the temporary access token (or generate a permanent System User Token in Meta Business Settings).
4. Add to `.env`:

```env
# Meta WhatsApp Cloud API credentials
WHATSAPP_TOKEN="EAA..."
WHATSAPP_PHONE_NUMBER_ID="123456789012345"
WHATSAPP_VERIFY_TOKEN="choose-a-secure-verification-token"
WHATSAPP_APP_SECRET="meta-app-secret-for-hmac-verification"
```

### C. Webhook Route Handler Implementation
Create `src/app/api/whatsapp/webhook/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { submitLinkUnified } from '@/lib/ingestion/pipeline';
import { extractUrls } from '@/lib/utils';

// 1. Webhook Verification (Required by Meta)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

// 2. Incoming Message Ingestion
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // Verify HMAC-SHA256 signature from Meta
    const signature = req.headers.get('x-hub-signature-256');
    if (process.env.WHATSAPP_APP_SECRET && signature) {
      const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', process.env.WHATSAPP_APP_SECRET)
        .update(rawBody)
        .digest('hex');

      if (signature !== expectedSignature) {
        return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    const message = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) {
      return NextResponse.json({ ok: true });
    }

    const fromNumber = message.from; // Sender's phone number in E.164 format
    const text = message.text?.body || message.caption || '';
    const supabase = createAdminClient();

    // A. Account Linking via "connect <code>"
    if (text.toLowerCase().startsWith('connect ')) {
      const code = text.split(/\s+/)[1]?.trim();
      const { data: profile } = await supabase
        .from('profiles')
        .update({ whatsapp_phone_number: fromNumber, whatsapp_link_code: null })
        .eq('whatsapp_link_code', code)
        .select('username')
        .single();

      if (profile) {
        await sendWhatsAppMessage(fromNumber, `✅ Connected to Memeboard as @${profile.username}!`);
      } else {
        await sendWhatsAppMessage(fromNumber, '❌ Invalid or expired connect code.');
      }
      return NextResponse.json({ ok: true });
    }

    // B. Identify User
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('whatsapp_phone_number', fromNumber)
      .single();

    if (!profile) {
      await sendWhatsAppMessage(fromNumber, '👋 Please connect your Memeboard account first by texting: connect <YOUR_CODE>');
      return NextResponse.json({ ok: true });
    }

    // C. Identify Active Board
    const { data: membership } = await supabase
      .from('board_members')
      .select('board_id, boards(name, slug)')
      .eq('user_id', profile.id)
      .order('joined_at', { ascending: false })
      .limit(1)
      .single();

    if (!membership?.board_id) {
      await sendWhatsAppMessage(fromNumber, "❌ You don't have an active board yet. Create one on the web first!");
      return NextResponse.json({ ok: true });
    }

    // D. Extract URLs & Ingest via Unified Pipeline
    const urls = extractUrls(text);
    if (urls.length === 0) {
      return NextResponse.json({ ok: true });
    }

    let savedCount = 0;
    for (const url of urls) {
      const result = await submitLinkUnified({
        rawUrl: url,
        boardId: membership.board_id,
        authorId: profile.id,
        source: 'whatsapp',
      });
      if (result.success) savedCount++;
    }

    if (savedCount > 0) {
      await sendWhatsAppMessage(
        fromNumber,
        `💾 Saved ${savedCount} link(s) to ${membership.boards?.name || 'your board'}!`
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('WhatsApp webhook processing error:', err);
    // Always return HTTP 200 to Meta to prevent retry storms
    return NextResponse.json({ ok: true });
  }
}

// Helper: Send Text Message via Meta Graph API
async function sendWhatsAppMessage(to: string, messageText: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return;

  await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: messageText },
    }),
  });
}
```

### D. Configure Webhook in Meta Portal
1. Under **WhatsApp** → **Configuration** in Meta Developer Console:
   * **Callback URL**: `https://memeboard.yourdomain.com/api/whatsapp/webhook`
   * **Verify Token**: The same value you set in `WHATSAPP_VERIFY_TOKEN`.
2. Click **Verify and Save**.
3. Under **Webhook Fields**, subscribe to `messages`.

---

## 3. Security Hardening Comparison

| Security Control | Telegram Implementation | WhatsApp Implementation |
| :--- | :--- | :--- |
| **Authentication** | `X-Telegram-Bot-Api-Secret-Token` header validation | `X-Hub-Signature-256` HMAC-SHA256 signature verification |
| **Rate Limiting** | Sliding window rate limiter per user/IP | Sliding window rate limiter per phone number |
| **SSRF Defense** | Full DNS pre-flight check via `safeFetch` | Full DNS pre-flight check via `safeFetch` |
| **User Identification** | Telegram User ID (`BIGINT`) | E.164 Phone Number (`TEXT`) |
| **Database Access** | Isolated `service_role` client | Isolated `service_role` client |
