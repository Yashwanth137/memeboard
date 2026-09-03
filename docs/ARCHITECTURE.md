# Memeboard v2.0.0 Architecture & Security Specification

## 1. System Overview

Memeboard is a high-performance content curation platform designed for friend groups to aggregate, categorize, and revisit links, videos, and media shared across group chats.

```
                  ┌──────────────────────┐
                  │    Ingestion Layer   │
                  │ (Telegram / Web / WA)│
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │  SSRF & CSRF Shield  │
                  │   (DNS & Origins)    │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │ Unified Pipeline     │
                  │ (Fast Classify+Save) │
                  └──────────┬───────────┘
                             │
                 ┌───────────┴───────────┐
                 ▼                       ▼
      ┌──────────────────────┐ ┌──────────────────────┐
      │  Supabase Postgres   │ │ Async Meta Enrichment│
      │  (Row-Level Security)│ │ (oEmbed/OG/vx/Fx)    │
      └──────────────────────┘ └──────────────────────┘
```

---

## 2. Security Architecture

### Row-Level Security (RLS) & Profile Privacy
- **Profiles Column Isolation**: PostgreSQL RLS filters rows rather than columns. To protect sensitive authentication tokens (`telegram_link_code`, `telegram_user_id`, `email`), `public.profiles` direct `SELECT` is restricted to `auth.uid() = id`. Public queries consume the `public_profiles` view (`id`, `username`, `created_at`).
- **Board Membership Verification**: Every mutation (`INSERT`, `UPDATE`, `DELETE`) on boards, board members, and links is authenticated both at the application route level and enforced cryptographically by Supabase RLS.
- **Search Path Hardening**: All `SECURITY DEFINER` functions explicitly enforce `SET search_path = public, pg_temp;` to protect against search_path hijacking.

### SSRF Protection (`src/lib/security/ssrf.ts`)
- **DNS Pre-Flight Resolution**: Resolves all IPv4 and IPv6 records for target hostnames via `dns.promises.lookup({ all: true })`.
- **IP Blocklisting**: Prohibits loopback (`127.0.0.0/8`, `::1`), private ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), cloud metadata endpoints (`169.254.169.254`, `metadata.google.internal`), multicast, and carrier-grade NAT.
- **Strict Fetch Guard**: Manual redirect handling (max 3 hops) re-verifying every target IP, 512KB response stream cutoff, and 4-second hard timeout.

### Invite Link Cryptography & Anti-Enumeration
- **SHA-256 Hashing**: Invite links contain high-entropy 24-byte random tokens (`crypto.randomBytes(24)`). Only the SHA-256 hash is persisted in `board_invites.token_hash`. The raw token is returned once to the creator and never stored in plaintext.
- **Atomic Redemption**: Invites are redeemed atomically via `UPDATE board_invites SET uses_count = uses_count + 1 WHERE ... RETURNING board_id`, eliminating race conditions.
- **Generic Error Responses**: Redemption failures (invalid, expired, revoked, max uses reached) return identical generic error messages (`"Invalid or expired invite link"`) to prevent token enumeration.

### CSRF & Rate Limiting
- **CSRF Defense**: Enforces strict `Origin` and `Referer` matching on browser mutations (POST/PATCH/DELETE) while allowing authenticated server-to-server webhooks.
- **Dual Rate Limiting**: Distributed rate limiting via Upstash Redis REST API with an in-memory sliding-window token bucket fallback for development and automated testing.

---

## 3. Media Ingestion & Classification

The ingestion pipeline (`src/lib/ingestion/pipeline.ts`) standardizes all submissions:
1. **SSRF Pre-Flight Check**: URL protocol, scheme, and DNS resolved IPs are validated.
2. **Fast Pre-Classification**: YouTube, TikTok, Reddit `v.redd.it`, and direct media extensions (`.mp4`, `.mov`, `.m3u8`, `/reel/`, `/shorts/`) are flagged as `video` immediately for zero-latency UI rendering.
3. **Database Persistence**: Link record is created with author and board references.
4. **Async Enrichment**:
   - **X / Twitter**: Enriched via `api.fxtwitter.com` (extracts video thumbnails vs photo galleries).
   - **Reddit**: Enriched via `vxreddit.com` (extracts `video.other` / `twitter:player` and direct MP4/m3u8 metadata without hitting Reddit's 403 blocks) with fallback to Reddit oEmbed.
   - **YouTube / Instagram**: Enriched with direct oEmbed and responsive embed parameters.

---

## 4. Known Platform Limitations & Security Advisor Notes

- **Leaked Password Protection (`auth_leaked_password_protection`)**:
  Supabase's Security Advisor flags this warning when checking against the HaveIBeenPwned leaked credentials database is disabled. In Supabase, this feature is restricted to paid plans (Pro/Team tiers). For open-source and free-tier environments, this remains disabled by design as an upstream platform tier constraint; no redundant custom replacement is implemented simply to make the advisor green.
- **Function Execution Privileges (`SECURITY DEFINER` RPCs)**:
  All internal `SECURITY DEFINER` functions (`join_board_with_token`, `link_telegram_account`, `check_rate_limit`, `handle_new_user`, `handle_new_board`) have their `EXECUTE` privileges revoked from client roles (`anon`, `authenticated`). They are executed strictly by `service_role` via Next.js server-side API routes, preventing direct client invocation via PostgREST `/rest/v1/rpc/`.
