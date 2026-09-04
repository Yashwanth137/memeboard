-- ==============================================================================
-- MEMEBOARD UNIFIED DATABASE SCHEMA (SUPABASE POSTGRESQL)
-- Version: 2.1.0 (Consolidated from v1 through v6 + Security Hardening)
-- Fully Idempotent - Safe to execute on fresh databases or existing instances
-- ==============================================================================

-- ==============================================================================
-- 0. EXTENSIONS & SCHEMAS
-- ==============================================================================
create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;

-- Private schema for internal helper functions (isolated from PostgREST API)
create schema if not exists app_private;
grant usage on schema app_private to authenticated, service_role;

-- ==============================================================================
-- 1. APP_PRIVATE HELPER FUNCTIONS (Non-recursive RLS queries)
-- ==============================================================================
create or replace function app_private.is_board_member(p_board_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.board_members
    where board_id = p_board_id and user_id = p_user_id
  );
$$ language sql security definer set search_path = public, pg_temp;

create or replace function app_private.is_board_owner(p_board_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.boards
    where id = p_board_id and owner_id = p_user_id
  );
$$ language sql security definer set search_path = public, pg_temp;

create or replace function app_private.get_member_profiles(p_user_ids uuid[])
returns table(id uuid, username text) as $$
  select p.id, p.username
  from public.profiles p
  where p.id = any(p_user_ids);
$$ language sql security definer set search_path = public, pg_temp;

revoke execute on function app_private.is_board_member(uuid, uuid) from public, anon;
grant execute on function app_private.is_board_member(uuid, uuid) to authenticated, service_role;

revoke execute on function app_private.is_board_owner(uuid, uuid) from public, anon;
grant execute on function app_private.is_board_owner(uuid, uuid) to authenticated, service_role;

revoke execute on function app_private.get_member_profiles(uuid[]) from public, anon, authenticated;
grant execute on function app_private.get_member_profiles(uuid[]) to service_role;

-- ==============================================================================
-- 2. CORE TABLES & CONSTRAINTS
-- ==============================================================================

-- 2.1 Profiles Table (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  username text,
  telegram_user_id bigint unique,
  telegram_username text,
  telegram_link_code text unique,
  telegram_link_code_expires_at timestamptz,
  created_at timestamptz default now() not null
);

-- Ensure case-insensitive uniqueness on trimmed usernames
create unique index if not exists idx_profiles_username_lower
  on public.profiles (lower(trim(username)))
  where username is not null and trim(username) <> '';

-- 2.2 Boards Table
create table if not exists public.boards (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text not null unique,
  owner_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now() not null
);

-- 2.3 Board Members Table
create table if not exists public.board_members (
  board_id uuid references public.boards(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz default now() not null,
  primary key (board_id, user_id)
);

-- 2.4 Categories Table (global defaults + board-specific categories)
create table if not exists public.categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text not null,
  board_id uuid references public.boards(id) on delete cascade,
  created_at timestamptz default now() not null
);

create unique index if not exists idx_categories_global_slug
  on public.categories (slug)
  where board_id is null;

-- 2.5 Links Table (ingested media, embeds, and URLs)
create table if not exists public.links (
  id uuid default gen_random_uuid() primary key,
  board_id uuid references public.boards(id) on delete cascade not null,
  submitted_by uuid references public.profiles(id) on delete set null,
  url text not null,
  platform text not null default 'other',
  content_type text not null default 'link' check (content_type in ('image', 'video', 'link')),
  title text,
  description text,
  thumbnail_url text,
  category_id uuid references public.categories(id) on delete set null,
  embed_type text,
  external_id text,
  resolved_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 2.6 Board Invites Table (SHA-256 hashed invite tokens)
create table if not exists public.board_invites (
  id uuid default gen_random_uuid() primary key,
  board_id uuid references public.boards(id) on delete cascade not null,
  token_hash varchar(64) not null unique,
  created_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz default (now() + interval '7 days'),
  max_uses integer check (max_uses is null or max_uses > 0),
  uses_count integer not null default 0 check (uses_count >= 0),
  is_revoked boolean not null default false,
  created_at timestamptz default now() not null
);

-- 2.7 Rate Limits Table (database-backed rate limiting)
create table if not exists public.rate_limits (
  key text primary key,
  count integer not null default 1,
  reset_at timestamptz not null
);

-- ==============================================================================
-- 3. INDEXES FOR PERFORMANCE & LOOKUPS
-- ==============================================================================
create index if not exists idx_boards_slug on public.boards(slug);
create index if not exists idx_boards_owner on public.boards(owner_id);
create index if not exists idx_board_members_user on public.board_members(user_id);
create index if not exists idx_categories_board on public.categories(board_id);
create index if not exists idx_links_board_created on public.links(board_id, created_at desc);
create index if not exists idx_links_board_platform on public.links(board_id, platform, created_at desc);
create index if not exists idx_links_board_category on public.links(board_id, category_id, created_at desc);
create index if not exists idx_links_board_submitted on public.links(board_id, submitted_by, created_at desc);
create index if not exists idx_links_board_content_type on public.links(board_id, content_type, created_at desc);
create index if not exists idx_profiles_telegram_user_id on public.profiles(telegram_user_id);
create index if not exists idx_profiles_telegram_link_code on public.profiles(telegram_link_code);
create index if not exists idx_board_invites_hash on public.board_invites(token_hash);
create index if not exists idx_board_invites_board on public.board_invites(board_id);

-- ==============================================================================
-- 4. SEED DEFAULT GLOBAL CATEGORIES
-- ==============================================================================
insert into public.categories (name, slug, board_id)
values
  ('Random', 'random', null),
  ('Memes', 'memes', null),
  ('Videos', 'videos', null),
  ('Gaming', 'gaming', null),
  ('Tech', 'tech', null),
  ('Movies & TV', 'movies-tv', null),
  ('Music', 'music', null),
  ('News', 'news', null),
  ('Interesting', 'interesting', null)
on conflict do nothing;

-- ==============================================================================
-- 5. AUTOMATIC TRIGGERS
-- ==============================================================================

-- 5.1 Profile Auto-Creation Trigger on auth.users
create or replace function public.handle_new_user()
returns trigger as $$
declare
  generated_code text;
  preferred_username text;
  final_username text;
begin
  generated_code := encode(extensions.gen_random_bytes(6), 'hex');

  -- Sanitize desired username
  preferred_username := lower(regexp_replace(
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    '[^a-zA-Z0-9_-]', '', 'g'
  ));

  if preferred_username is null or length(preferred_username) < 3 then
    preferred_username := 'user-' || lower(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  end if;

  final_username := preferred_username;
  -- If collision occurs, append short random suffix
  if exists (
    select 1 from public.profiles
    where lower(trim(username)) = lower(trim(final_username))
  ) then
    final_username := preferred_username || '-' || lower(substr(md5(random()::text || clock_timestamp()::text), 1, 4));
  end if;

  insert into public.profiles (
    id,
    email,
    username,
    telegram_link_code,
    telegram_link_code_expires_at
  )
  values (
    new.id,
    new.email,
    final_username,
    generated_code,
    clock_timestamp() + interval '24 hours'
  )
  on conflict (id) do update
  set email = excluded.email;

  return new;
end;
$$ language plpgsql security definer set search_path = public, extensions, pg_temp;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5.2 Board Owner Auto-Member Trigger on public.boards
create or replace function public.handle_new_board()
returns trigger as $$
begin
  insert into public.board_members (board_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (board_id, user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

drop trigger if exists on_board_created on public.boards;
create trigger on_board_created
  after insert on public.boards
  for each row execute function public.handle_new_board();

-- ==============================================================================
-- 6. RPC FUNCTIONS & STORED PROCEDURES
-- ==============================================================================

-- 6.1 Check Username Availability (unauthenticated check; boolean only)
create or replace function public.is_username_available(p_username text)
returns boolean as $$
begin
  if p_username is null or length(trim(p_username)) < 3 then
    return false;
  end if;

  return not exists (
    select 1 from public.profiles
    where lower(trim(username)) = lower(trim(p_username))
  );
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

-- 6.2 Atomic Invite Redemption
create or replace function public.join_board_with_token(
  p_slug text,
  p_token_hash text,
  p_user_id uuid default null
)
returns json as $$
declare
  v_board public.boards%rowtype;
  v_invite public.board_invites%rowtype;
  v_caller_id uuid := coalesce(p_user_id, auth.uid());
  v_already_member boolean;
begin
  if v_caller_id is null then
    return json_build_object('success', false, 'error', 'Authentication required');
  end if;

  select * into v_board
  from public.boards
  where slug = p_slug;

  if not found then
    return json_build_object('success', false, 'error', 'Invalid or expired invite link');
  end if;

  select exists (
    select 1 from public.board_members
    where board_id = v_board.id and user_id = v_caller_id
  ) into v_already_member;

  if v_already_member then
    return json_build_object(
      'success', true,
      'already_member', true,
      'board_name', v_board.name,
      'slug', v_board.slug
    );
  end if;

  -- Atomic increment and expiration/usage validation
  update public.board_invites
  set uses_count = uses_count + 1
  where token_hash = p_token_hash
    and board_id = v_board.id
    and is_revoked = false
    and (expires_at is null or expires_at > now())
    and (max_uses is null or uses_count < max_uses)
  returning * into v_invite;

  if not found then
    return json_build_object('success', false, 'error', 'Invalid or expired invite link');
  end if;

  insert into public.board_members (board_id, user_id, role)
  values (v_board.id, v_caller_id, 'member')
  on conflict (board_id, user_id) do nothing;

  return json_build_object(
    'success', true,
    'already_member', false,
    'board_name', v_board.name,
    'slug', v_board.slug
  );
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

-- 6.3 Shared Database Rate Limiting
create or replace function public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean as $$
declare
  v_now timestamptz := clock_timestamp();
  v_count integer;
  v_reset timestamptz;
begin
  select count, reset_at into v_count, v_reset
  from public.rate_limits
  where key = p_key for update;

  if not found or v_reset <= v_now then
    insert into public.rate_limits (key, count, reset_at)
    values (p_key, 1, v_now + (p_window_seconds || ' seconds')::interval)
    on conflict (key) do update
    set count = 1, reset_at = excluded.reset_at;
    return true;
  end if;

  if v_count >= p_limit then
    return false;
  end if;

  update public.rate_limits
  set count = count + 1
  where key = p_key;

  return true;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

-- 6.4 Telegram Code Generation for Authenticated Users
create or replace function public.generate_telegram_link_code()
returns text as $$
declare
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  v_code := encode(extensions.gen_random_bytes(6), 'hex');

  update public.profiles
  set telegram_link_code = v_code,
      telegram_link_code_expires_at = clock_timestamp() + interval '15 minutes'
  where id = auth.uid();

  return v_code;
end;
$$ language plpgsql security definer set search_path = public, extensions, pg_temp;

-- 6.5 Telegram Account Unlinking for Authenticated Users
create or replace function public.unlink_telegram_account()
returns boolean as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.profiles
  set telegram_user_id = null,
      telegram_username = null,
      telegram_link_code = null,
      telegram_link_code_expires_at = null
  where id = auth.uid();

  return true;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

-- 6.6 Telegram Webhook Account Linking
create or replace function public.link_telegram_account(
  p_code text,
  p_telegram_user_id bigint,
  p_telegram_username text
)
returns json as $$
declare
  v_profile public.profiles%rowtype;
  v_board json;
begin
  select * into v_profile
  from public.profiles
  where telegram_link_code = p_code
    and (telegram_link_code_expires_at is null or telegram_link_code_expires_at > clock_timestamp());

  if not found then
    return json_build_object('success', false, 'error', 'Invalid or expired connect code');
  end if;

  update public.profiles
  set telegram_user_id = p_telegram_user_id,
      telegram_username = p_telegram_username,
      telegram_link_code = null,
      telegram_link_code_expires_at = null
  where id = v_profile.id;

  select row_to_json(b) into v_board
  from public.board_members bm
  join public.boards b on b.id = bm.board_id
  where bm.user_id = v_profile.id
  order by bm.joined_at desc
  limit 1;

  return json_build_object(
    'success', true,
    'username', coalesce(v_profile.username, v_profile.email),
    'board_name', v_board->>'name'
  );
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

-- 6.7 Telegram Webhook Link Ingestion
create or replace function public.telegram_submit_link(
  p_telegram_user_id bigint,
  p_url text,
  p_platform text default 'other',
  p_title text default null,
  p_category_id uuid default null
)
returns json as $$
declare
  v_profile public.profiles%rowtype;
  v_board public.boards%rowtype;
  v_cat_id uuid;
begin
  select * into v_profile
  from public.profiles
  where telegram_user_id = p_telegram_user_id;

  if not found then
    return json_build_object('success', false, 'error', 'Telegram account not linked');
  end if;

  select b.* into v_board
  from public.board_members bm
  join public.boards b on b.id = bm.board_id
  where bm.user_id = v_profile.id
  order by bm.joined_at desc
  limit 1;

  if not found then
    return json_build_object('success', false, 'error', 'No boards found for user');
  end if;

  v_cat_id := p_category_id;
  if v_cat_id is null then
    select id into v_cat_id
    from public.categories
    where slug = 'random' and board_id is null
    limit 1;
  end if;

  insert into public.links (board_id, submitted_by, url, platform, title, category_id)
  values (v_board.id, v_profile.id, p_url, p_platform, p_title, v_cat_id);

  return json_build_object(
    'success', true,
    'board_name', v_board.name
  );
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

-- ==============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- 7.1 Profiles Table RLS
alter table public.profiles enable row level security;

drop policy if exists "Allow user to read own full profile" on public.profiles;
create policy "Allow user to read own full profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Allow reading profiles of board members" on public.profiles;
create policy "Allow reading profiles of board members" on public.profiles
  for select using (
    exists (
      select 1 from public.board_members bm1
      join public.board_members bm2 on bm1.board_id = bm2.board_id
      where bm1.user_id = auth.uid() and bm2.user_id = profiles.id
    )
  );

drop policy if exists "Allow user to update own profile" on public.profiles;
create policy "Allow user to update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Allow user to insert own profile" on public.profiles;
create policy "Allow user to insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- 7.2 Boards Table RLS
alter table public.boards enable row level security;

drop policy if exists "Allow members and owners to read boards" on public.boards;
create policy "Allow members and owners to read boards" on public.boards
  for select using (
    auth.uid() = owner_id or app_private.is_board_member(id, auth.uid())
  );

drop policy if exists "Allow authenticated users to create boards" on public.boards;
create policy "Allow authenticated users to create boards" on public.boards
  for insert with check (auth.role() = 'authenticated' and auth.uid() = owner_id);

drop policy if exists "Allow owners to update boards" on public.boards;
create policy "Allow owners to update boards" on public.boards
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "Allow owners to delete boards" on public.boards;
create policy "Allow owners to delete boards" on public.boards
  for delete using (auth.uid() = owner_id);

-- 7.3 Board Members Table RLS
alter table public.board_members enable row level security;

drop policy if exists "Allow members and owners to read board members" on public.board_members;
create policy "Allow members and owners to read board members" on public.board_members
  for select using (
    auth.uid() = user_id or
    app_private.is_board_owner(board_id, auth.uid()) or
    app_private.is_board_member(board_id, auth.uid())
  );

drop policy if exists "Allow owners to add board members" on public.board_members;
create policy "Allow owners to add board members" on public.board_members
  for insert with check (app_private.is_board_owner(board_id, auth.uid()));

drop policy if exists "Allow user to leave or owner to remove" on public.board_members;
create policy "Allow user to leave or owner to remove" on public.board_members
  for delete using (
    auth.uid() = user_id or app_private.is_board_owner(board_id, auth.uid())
  );

-- 7.4 Categories Table RLS
alter table public.categories enable row level security;

drop policy if exists "Allow read categories" on public.categories;
create policy "Allow read categories" on public.categories
  for select using (
    board_id is null or
    app_private.is_board_member(board_id, auth.uid()) or
    app_private.is_board_owner(board_id, auth.uid())
  );

drop policy if exists "Allow board members to create categories" on public.categories;
create policy "Allow board members to create categories" on public.categories
  for insert with check (
    board_id is not null and (
      app_private.is_board_owner(board_id, auth.uid()) or
      app_private.is_board_member(board_id, auth.uid())
    )
  );

-- 7.5 Links Table RLS
alter table public.links enable row level security;

drop policy if exists "Allow board members to read links" on public.links;
create policy "Allow board members to read links" on public.links
  for select using (
    app_private.is_board_owner(board_id, auth.uid()) or
    app_private.is_board_member(board_id, auth.uid())
  );

drop policy if exists "Allow board members to insert links" on public.links;
create policy "Allow board members to insert links" on public.links
  for insert with check (
    auth.role() = 'authenticated' and
    (submitted_by is null or submitted_by = auth.uid()) and
    (
      app_private.is_board_owner(board_id, auth.uid()) or
      app_private.is_board_member(board_id, auth.uid())
    )
  );

drop policy if exists "Allow author or board owner to update links" on public.links;
create policy "Allow author or board owner to update links" on public.links
  for update using (
    auth.uid() = submitted_by or app_private.is_board_owner(board_id, auth.uid())
  ) with check (
    auth.uid() = submitted_by or app_private.is_board_owner(board_id, auth.uid())
  );

drop policy if exists "Allow author or board owner to delete links" on public.links;
create policy "Allow author or board owner to delete links" on public.links
  for delete using (
    auth.uid() = submitted_by or app_private.is_board_owner(board_id, auth.uid())
  );

-- 7.6 Board Invites Table RLS
alter table public.board_invites enable row level security;

drop policy if exists "Allow board owner to manage invites" on public.board_invites;
create policy "Allow board owner to manage invites" on public.board_invites
  for all using (
    exists (
      select 1 from public.boards b
      where b.id = board_invites.board_id and b.owner_id = auth.uid()
    )
  );

-- 7.7 Rate Limits Table RLS
alter table public.rate_limits enable row level security;

drop policy if exists "Service role manages rate limits" on public.rate_limits;
create policy "Service role manages rate limits" on public.rate_limits
  for all to service_role using (true) with check (true);

-- ==============================================================================
-- 8. COLUMN-LEVEL PRIVILEGE RESTRICTIONS & SAFE VIEWS
-- ==============================================================================

-- 8.1 Profiles Column-Level Privileges
-- Restrict direct authenticated SELECT on public.profiles to non-sensitive columns only
revoke all on public.profiles from anon, authenticated;
grant select (id, username, created_at) on public.profiles to authenticated;
grant update (username, email) on public.profiles to authenticated;
grant insert (id, email, username) on public.profiles to authenticated;
grant all on public.profiles to service_role;

-- 8.2 Safe Public Profiles View (SECURITY INVOKER = true)
drop view if exists public.public_profiles cascade;
create or replace view public.public_profiles with (security_invoker = true) as
  select p.id, p.username, p.created_at
  from public.profiles p;

revoke all on public.public_profiles from public, anon;
grant select on public.public_profiles to authenticated, service_role;

-- 8.3 Rate Limits Privileges
revoke all on public.rate_limits from anon, authenticated;
grant select, insert, update on public.rate_limits to service_role;

-- 8.4 Tables & Sequences Grants
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.boards to authenticated;
grant select, insert, update, delete on public.board_members to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.links to authenticated;
grant select, insert, update, delete on public.board_invites to authenticated;

grant select on public.categories to anon;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- 8.5 Explicit RPC Function Execution Grants
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin, service_role;

revoke execute on function public.handle_new_board() from public, anon, authenticated;

revoke execute on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated, service_role;

revoke execute on function public.join_board_with_token(text, text, uuid) from public, anon, authenticated;
grant execute on function public.join_board_with_token(text, text, uuid) to service_role;

revoke execute on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

revoke execute on function public.generate_telegram_link_code() from public, anon;
grant execute on function public.generate_telegram_link_code() to authenticated, service_role;

revoke execute on function public.unlink_telegram_account() from public, anon;
grant execute on function public.unlink_telegram_account() to authenticated, service_role;

revoke execute on function public.link_telegram_account(text, bigint, text) from public, anon, authenticated;
grant execute on function public.link_telegram_account(text, bigint, text) to service_role;

revoke execute on function public.telegram_submit_link(bigint, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.telegram_submit_link(bigint, text, text, text, uuid) to service_role;

-- ==============================================================================
-- 9. SUPABASE REALTIME REPLICATION
-- ==============================================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' 
    and schemaname = 'public' 
    and tablename = 'links'
  ) then
    alter publication supabase_realtime add table public.links;
  end if;
end $$;
