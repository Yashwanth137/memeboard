export const TELEGRAM_BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN ||
  process.env.telegram_bot_key ||
  process.env.TELEGRAM_BOT_KEY ||
  '';

export const TELEGRAM_BOT_USERNAME = 'memeboard_bot';

export function extractUrls(text: string): string[] {
  if (!text) return [];
  // Match URLs starting with http:// or https://
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const matches = text.match(urlRegex);
  if (!matches) return [];
  // Clean up any trailing punctuation like commas, periods, closing parens that might be attached
  return matches.map((url) => url.replace(/[.,;!?)]+$/, ''));
}

export async function sendTelegramMessage(chatId: number | string, text: string) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('Telegram bot token not configured');
    return false;
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      }
    );

    const data = await res.json();
    return data.ok;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return false;
  }
}
