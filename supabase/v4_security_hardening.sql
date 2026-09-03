-- ============================================================
-- MEMEBOARD V4 SECURITY HARDENING MIGRATION (POSTGRESQL / SUPABASE)
-- Fully Idempotent - Safe to run repeatedly
-- ============================================================

-- 1. Profiles Table: Defense-in-depth & public_profiles View
alter table public.profiles enable row level security;

-- Drop insecure open read policy if exists
drop policy if exists "Allow read profiles" on public.profiles;
drop policy if exists "Allow user to read own full profile" on public.profiles;
drop policy if exists "Allow user to update own profile" on public.profiles;
drop policy if exists "Allow reading profiles of board members" on public.profiles;

-- Strict row policy: User can only read their own full profile row
create policy "Allow user to read own full profile" on public.profiles
  for select using (auth.uid() = id);

-- Allow reading public profile data for users who share a board
create policy "Allow reading profiles of board members" on public.profiles
  for select using (
    exists (
      select 1 from public.board_members bm1
      join public.board_members bm2 on bm1.board_id = bm2.board_id
      where bm1.user_id = auth.uid() and bm2.user_id = profiles.id
    ) or
    exists (
      select 1 from public.boards b
      where b.owner_id = auth.uid() or exists (
        select 1 from public.board_members bm where bm.board_id = b.id and bm.user_id = auth.uid()
      )
    )
  );

-- User can update only their own profile
create policy "Allow user to update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Column-level privilege restriction: revoke direct access to sensitive columns from client roles
revoke all on public.profiles from anon, authenticated;
grant select (id, username, created_at) on public.profiles to authenticated, anon;
grant update (username) on public.profiles to authenticated;

-- Create a secure public view with security_invoker = true (satisfies linter rule 0010_security_definer_view)
create or replace view public.public_profiles with (security_invoker = true) as
  select id, username, created_at from public.profiles;

grant select on public.public_profiles to anon, authenticated, service_role;

-- 2. Boards Table: Member/Owner-only Access
alter table public.boards enable row level security;

drop policy if exists "Allow read boards" on public.boards;
drop policy if exists "Allow authenticated users to create boards" on public.boards;
drop policy if exists "Allow owners to update boards" on public.boards;
drop policy if exists "Allow owners to delete boards" on public.boards;
drop policy if exists "Allow members and owners to read boards" on public.boards;

-- Only members and owners can read the board
create policy "Allow members and owners to read boards" on public.boards
  for select using (
    auth.uid() = owner_id or
    exists (
      select 1 from public.board_members bm
      where bm.board_id = boards.id and bm.user_id = auth.uid()
    )
  );

create policy "Allow authenticated users to create boards" on public.boards
  for insert with check (auth.role() = 'authenticated' and auth.uid() = owner_id);

create policy "Allow owners to update boards" on public.boards
  for update using (auth.uid() = owner_id);

create policy "Allow owners to delete boards" on public.boards
  for delete using (auth.uid() = owner_id);

-- 3. Board Members Table: Protected Membership
alter table public.board_members enable row level security;

drop policy if exists "Allow read board members" on public.board_members;
drop policy if exists "Allow authenticated users to join board" on public.board_members;
drop policy if exists "Allow members to leave or owner to remove" on public.board_members;
drop policy if exists "Allow user to leave or owner to remove" on public.board_members;
drop policy if exists "Allow members and owners to read board members" on public.board_members;
drop policy if exists "Allow owners to add board members" on public.board_members;

-- Only members and owner of the board can see other members
create policy "Allow members and owners to read board members" on public.board_members
  for select using (
    exists (
      select 1 from public.board_members bm
      where bm.board_id = board_members.board_id and bm.user_id = auth.uid()
    ) or
    exists (
      select 1 from public.boards b
      where b.id = board_members.board_id and b.owner_id = auth.uid()
    )
  );

-- Direct client insert blocked; only board owner can directly insert (otherwise use atomic invite RPC)
create policy "Allow owners to add board members" on public.board_members
  for insert with check (
    exists (
      select 1 from public.boards b
      where b.id = board_members.board_id and b.owner_id = auth.uid()
    )
  );

create policy "Allow user to leave or owner to remove" on public.board_members
  for delete using (
    auth.uid() = user_id or
    exists (
      select 1 from public.boards b
      where b.id = board_members.board_id and b.owner_id = auth.uid()
    )
  );

-- 4. Links Table: Member-only Read & Write
alter table public.links enable row level security;

drop policy if exists "Allow read links" on public.links;
drop policy if exists "Allow board members to insert links" on public.links;
drop policy if exists "Allow link owner to update title and category" on public.links;
drop policy if exists "Allow link owner or board owner to delete link" on public.links;
drop policy if exists "Allow board members to read links" on public.links;
drop policy if exists "Allow author or board owner to update links" on public.links;
drop policy if exists "Allow author or board owner to delete links" on public.links;

create policy "Allow board members to read links" on public.links
  for select using (
    exists (
      select 1 from public.board_members bm
      where bm.board_id = links.board_id and bm.user_id = auth.uid()
    ) or
    exists (
      select 1 from public.boards b
      where b.id = links.board_id and b.owner_id = auth.uid()
    )
  );

create policy "Allow board members to insert links" on public.links
  for insert with check (
    auth.role() = 'authenticated' and (
      exists (
        select 1 from public.board_members bm
        where bm.board_id = links.board_id and bm.user_id = auth.uid()
      ) or
      exists (
        select 1 from public.boards b
        where b.id = links.board_id and b.owner_id = auth.uid()
      )
    )
  );

create policy "Allow author or board owner to update links" on public.links
  for update using (
    auth.uid() = submitted_by or
    exists (
      select 1 from public.boards b
      where b.id = links.board_id and b.owner_id = auth.uid()
    )
  );

create policy "Allow author or board owner to delete links" on public.links
  for delete using (
    auth.uid() = submitted_by or
    exists (
      select 1 from public.boards b
      where b.id = links.board_id and b.owner_id = auth.uid()
    )
  );

-- 5. Board Invites Table with SHA-256 Token Hashing
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

create index if not exists idx_board_invites_hash on public.board_invites(token_hash);
create index if not exists idx_board_invites_board on public.board_invites(board_id);

alter table public.board_invites enable row level security;

drop policy if exists "Allow board owner to manage invites" on public.board_invites;
create policy "Allow board owner to manage invites" on public.board_invites
  for all using (
    exists (
      select 1 from public.boards b
      where b.id = board_invites.board_id and b.owner_id = auth.uid()
    )
  );

-- 6. Atomic Invite Token Redemption RPC Function
drop function if exists public.join_board_with_token(text, text);

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
    -- Generic error for defense against token/slug enumeration
    return json_build_object('success', false, 'error', 'Invalid or expired invite link');
  end if;

  select exists (
    select 1 from public.board_members
    where board_id = v_board.id and user_id = v_caller_id
  ) into v_already_member;

  if v_already_member then
    return json_build_object('success', true, 'already_member', true, 'board_name', v_board.name, 'slug', v_board.slug);
  end if;

  -- Atomic increment & verification
  update public.board_invites
  set uses_count = uses_count + 1
  where token_hash = p_token_hash
    and board_id = v_board.id
    and is_revoked = false
    and (expires_at is null or expires_at > now())
    and (max_uses is null or uses_count < max_uses)
  returning * into v_invite;

  if not found then
    -- Generic error for defense against token enumeration
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

-- 7. Shared Database Rate Limiting Table & Stored Procedure
create table if not exists public.rate_limits (
  key text primary key,
  count integer not null default 1,
  reset_at timestamptz not null
);

alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;
grant select, insert, update on public.rate_limits to service_role;

drop policy if exists "Service role manages rate limits" on public.rate_limits;
create policy "Service role manages rate limits" on public.rate_limits
  for all to service_role using (true) with check (true);

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

-- 8. Hardening search_path on ALL existing triggers and functions
create or replace function public.handle_new_user()
returns trigger as $$
declare
  generated_code text;
begin
  generated_code := lower(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
  insert into public.profiles (id, email, username, telegram_link_code)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    generated_code
  )
  on conflict (id) do update
  set email = excluded.email;
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

create or replace function public.handle_new_board()
returns trigger as $$
begin
  insert into public.board_members (board_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (board_id, user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

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
  where telegram_link_code = p_code;

  if not found then
    return json_build_object('success', false, 'error', 'Invalid or expired connect code');
  end if;

  update public.profiles
  set telegram_user_id = p_telegram_user_id,
      telegram_username = p_telegram_username,
      telegram_link_code = null
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

-- 9. Explicit Function Execution Permissions (Resolves Supabase Linter 0028 & 0029)
-- Drop obsolete overloads with mutable search_path (Resolves Supabase Linter 0011)
drop function if exists public.telegram_submit_link(bigint, text);

-- Internal trigger functions: prohibit direct RPC execution by any client role
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_new_board() from public, anon, authenticated;

-- Rate limiter RPC: internal utility called via service_role only
revoke execute on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

-- Invite token redemption: internal utility called via Next.js service_role only
revoke execute on function public.join_board_with_token(text, text, uuid) from public, anon, authenticated;
grant execute on function public.join_board_with_token(text, text, uuid) to service_role;

-- Telegram bot functions: webhook/service_role only
revoke execute on function public.link_telegram_account(text, bigint, text) from public, anon, authenticated;
grant execute on function public.link_telegram_account(text, bigint, text) to service_role;

revoke execute on function public.telegram_submit_link(bigint, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.telegram_submit_link(bigint, text, text, text, uuid) to service_role;
