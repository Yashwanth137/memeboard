import fs from 'fs';
import path from 'path';

// 1. Read .env file to get telegram_bot_key
let botToken = process.env.telegram_bot_key || process.env.TELEGRAM_BOT_KEY;

let webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  for (const line of envContent.split('\n')) {
    const tokenMatch = line.match(/^\s*(telegram_bot_key|TELEGRAM_BOT_KEY|TELEGRAM_BOT_TOKEN)\s*=\s*(.*)\s*$/i);
    if (tokenMatch && !botToken) {
      botToken = tokenMatch[2].trim().replace(/^["']|["']$/g, '');
    }
    const secretMatch = line.match(/^\s*TELEGRAM_WEBHOOK_SECRET\s*=\s*(.*)\s*$/i);
    if (secretMatch && !webhookSecret) {
      webhookSecret = secretMatch[1].trim().replace(/^["']|["']$/g, '');
    }
  }
}

if (!botToken) {
  console.error('❌ Error: telegram_bot_key not found in environment or .env file.');
  process.exit(1);
}

const LOCAL_WEBHOOK_URL = process.env.LOCAL_WEBHOOK_URL || 'http://localhost:3000/api/telegram/webhook';

console.log('🤖 Starting Memeboard Telegram Local Polling Bridge...');
console.log(`📡 Forwarding incoming Telegram messages to: ${LOCAL_WEBHOOK_URL}`);

// Remove active webhook so Telegram allows getUpdates polling
async function init() {
  try {
    const delRes = await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`);
    const delData = await delRes.json();
    if (delData.ok) {
      console.log('✅ Webhook cleared for local polling mode.');
    }

    const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const meData = await meRes.json();
    if (meData.ok) {
      console.log(`🚀 Connected as @${meData.result.username} (${meData.result.first_name})`);
      console.log('⚡ Ready! Send any link to your bot in Telegram — it will hit your localhost immediately.\n');
    }
  } catch (err) {
    console.error('Failed to initialize bot:', err.message);
  }

  poll();
}

let offset = 0;
let isRunning = true;

async function poll() {
  while (isRunning) {
    try {
      const url = `https://api.telegram.org/bot${botToken}/getUpdates?offset=${offset}&timeout=25`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          offset = update.update_id + 1;

          const msg = update.message;
          const sender = msg?.from?.username || msg?.from?.first_name || 'User';
          const preview = msg?.text ? `"${msg.text.slice(0, 50)}${msg.text.length > 50 ? '...' : ''}"` : '[non-text]';

          console.log(`📩 Received from @${sender}: ${preview}`);

          // Forward to local Next.js webhook endpoint
          try {
            const forwardRes = await fetch(LOCAL_WEBHOOK_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(webhookSecret ? { 'x-telegram-bot-api-secret-token': webhookSecret } : {}),
              },
              body: JSON.stringify(update),
            });

            if (forwardRes.ok) {
              console.log(`   ↳ Forwarded to ${LOCAL_WEBHOOK_URL} (200 OK)`);
            } else {
              console.warn(`   ↳ Forward failed: ${forwardRes.status} ${forwardRes.statusText}`);
            }
          } catch (forwardErr) {
            console.error(`   ↳ Could not reach ${LOCAL_WEBHOOK_URL}. Is "npm run dev" running?`);
          }
        }
      }
    } catch (err) {
      if (isRunning) {
        console.error('Polling error:', err.message);
        // Wait 2s before retrying
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }
}

// Graceful exit
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping Telegram local polling bridge...');
  isRunning = false;
  process.exit(0);
});

init();
