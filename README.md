# Memeboard

> **A social web platform for friend groups to collect and revisit memes, videos, posts, and interesting links shared across chats.**

Friends commonly discover content across Instagram, YouTube, Reddit, X, and TikTok, then share links through WhatsApp, Discord, or Telegram. Those links quickly get buried in chat history and lost forever.

**Memeboard gives each friend group a persistent shared Board** — the content layer attached to your existing group conversations.

---

## ⚡ The Core Flow

```text
User discovers a meme/video/link
        ↓
Shares the URL with the Memeboard Telegram Agent (@memeboard_bot)
        ↓
Agent identifies the user's active Board
        ↓
URL is stored in PostgreSQL (Supabase)
        ↓
Link instantly appears on the Board feed (via Supabase Realtime)
        ↓
Friends browse and revisit the group's shared collection on the web
```

---

## 🎯 MVP Acceptance Criteria

The system is designed around one primary loop:

> **Create Board → Connect Telegram → Send URL via Telegram → URL appears on Board in seconds → Share Board with friend.**

---

## 🛠 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack, React 19)
- **Language**: TypeScript
- **Styling**: Vanilla CSS (Custom design system, dark-mode first, micro-animations, zero Tailwind)
- **Database**: PostgreSQL via [Supabase](https://supabase.com/)
- **Authentication**: Supabase Auth (Email / Password or Magic Link)
- **Realtime**: Supabase Realtime (Postgres Changes subscription for zero-latency board updates)
- **Ingestion Channel**: Telegram Bot Agent ([@memeboard_bot](https://t.me/memeboard_bot)) via Next.js Webhook Route Handler

---

## 🗄 Data Model

```text
profiles (extends auth.users)
 ├── id (UUID, PK)
 ├── email (TEXT)
 ├── username (TEXT)
 ├── telegram_user_id (BIGINT, UNIQUE)
 ├── telegram_username (TEXT)
 └── telegram_link_code (TEXT, UNIQUE)

boards
 ├── id (UUID, PK)
 ├── name (TEXT)
 ├── slug (TEXT, UNIQUE)  --> e.g. /b/the-boys
 ├── owner_id (UUID, FK -> profiles.id)
 └── created_at (TIMESTAMPTZ)

board_members
 ├── board_id (UUID, FK -> boards.id)
 ├── user_id (UUID, FK -> profiles.id)
 ├── role ('owner' | 'admin' | 'member')
 └── joined_at (TIMESTAMPTZ)

links
 ├── id (UUID, PK)
 ├── board_id (UUID, FK -> boards.id)
 ├── submitted_by (UUID, FK -> profiles.id)
 ├── url (TEXT)           --> original URL is source of truth
 └── created_at (TIMESTAMPTZ)
```

---

## 🚀 Getting Started

### 1. Prerequisites

- Node.js 18+
- A Supabase Project ([supabase.com](https://supabase.com))
- A Telegram Bot Token from [@BotFather](https://t.me/botfather)

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

1. Go to your Supabase Project's **SQL Editor**.
2. Copy and paste the entire script from [`supabase/schema.sql`](./supabase/schema.sql).
3. Click **Run**. This will create the tables, triggers, indexes, RLS policies, and enable Realtime replication on `public.links`.

### 4. Environment Configuration

Create a `.env` file in the root directory (refer to [`.env.example`](./.env.example)):

```env
# Telegram Bot Token
telegram_bot_key=your_telegram_bot_token

# Supabase Credentials (Project Settings -> API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 5. Run the Local Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🤖 Configuring the Telegram Bot Webhook

To connect the Telegram bot to your local or deployed instance:

1. Expose your local port (e.g. using `ngrok` or deploy to Vercel):
   ```bash
   ngrok http 3000
   ```
2. Visit the built-in setup route in your browser:
   ```text
   https://<your-domain>/api/telegram/setup?url=https://<your-domain>
   ```
3. Telegram will register `https://<your-domain>/api/telegram/webhook` as the active webhook.

---

## 🧪 Testing & Verification

Run the automated test suite and build check:

```bash
# Run URL parsing and slugification tests
npm test

# Verify production build
npm run build
```

---

## 🧭 Product Principles

1. **Board is the core primitive**: A Board feels like a lightweight private community, not a folder.
2. **Telegram is an ingestion channel, not the product**: The Web Board is the primary product experience.
3. **Original URLs are the source of truth**: No permanent hosting of media or fragile scrapers for V1.
4. **V1 solves one problem extremely well**: Instant ingestion from chat to a persistent shared web board.
5. **Sharing a Board is effortless**: Every board has a memorable slug (`memeboard.app/b/the-boys`) and an instant invite flow.

---

## 📄 License

MIT
