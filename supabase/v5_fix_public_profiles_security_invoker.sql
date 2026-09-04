-- ============================================================
-- MEMEBOARD V5: Fix public_profiles SECURITY DEFINER & Column Grants
-- Resolves Supabase Linter 0010 (security_definer_view)
-- Fully Idempotent - Safe to run in Supabase SQL Editor
-- ============================================================

-- 1. Ensure private schema exists for internal helper functions
create schema if not exists app_private;
grant usage on schema app_private to authenticated, service_role;

-- 2. Drop obsolete functions/views
drop function if exists public.get_member_profiles(uuid[]) cascade;
drop view if exists public.public_profiles cascade;

-- 3. Update Profiles RLS Policies
alter table public.profiles add column if not exists telegram_link_code_expires_at timestamptz;
alter table public.profiles enable row level security;

drop policy if exists "Allow read profiles" on public.profiles;
drop policy if exists "Allow reading profiles of board members" on public.profiles;
drop policy if exists "Allow user to read own full profile" on public.profiles;
drop policy if exists "Allow user to update own profile" on public.profiles;
drop policy if exists "Allow user to insert own profile" on public.profiles;

-- Own profile read
create policy "Allow user to read own full profile" on public.profiles
  for select using (auth.uid() = id);

-- Board co-members read (combined with column grants, only safe columns are returned)
create policy "Allow reading profiles of board members" on public.profiles
  for select using (
    exists (
      select 1 from public.board_members bm1
      join public.board_members bm2 on bm1.board_id = bm2.board_id
      where bm1.user_id = auth.uid() and bm2.user_id = profiles.id
    )
  );

-- Own profile update
create policy "Allow user to update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Own profile insert (for client-side signup flow)
create policy "Allow user to insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- 4. Column-level privilege grants on profiles
-- Authenticated users are ONLY granted access to (id, username, created_at).
-- Private columns (email, telegram_user_id, telegram_username, telegram_link_code,
-- telegram_link_code_expires_at) are physically unreachable for authenticated clients.
revoke all on public.profiles from anon, authenticated;
grant select (id, username, created_at) on public.profiles to authenticated;
grant update (username, email) on public.profiles to authenticated;
grant insert (id, email, username) on public.profiles to authenticated;

-- Service role retains full access for backend routes (e.g. /api/me/profile, webhook)
grant all on public.profiles to service_role;

-- 5. Internal Member Profile Resolver in app_private schema (service_role only)
create or replace function app_private.get_member_profiles(p_user_ids uuid[])
returns table(id uuid, username text) as $$
  select p.id, p.username
  from public.profiles p
  where p.id = any(p_user_ids);
$$ language sql security definer set search_path = public, pg_temp;

revoke execute on function app_private.get_member_profiles(uuid[]) from public, anon, authenticated;
grant execute on function app_private.get_member_profiles(uuid[]) to service_role;

-- 6. Safe Member Display View: SECURITY INVOKER = true (satisfies Supabase Linter 0010)
-- Row filtering is enforced by profiles RLS.
-- Column access is enforced by column-level grants.
create or replace view public.public_profiles with (security_invoker = true) as
  select p.id, p.username, p.created_at
  from public.profiles p;

-- Granted to authenticated users and service_role; revoked from anon/public
revoke all on public.public_profiles from public, anon;
grant select on public.public_profiles to authenticated, service_role;

-- 7. Foreign key integrity: link board_members.user_id -> public.profiles(id)
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'board_members_user_id_profiles_fkey'
    and table_name = 'board_members'
  ) then
    alter table public.board_members
      add constraint board_members_user_id_profiles_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
end $$;
