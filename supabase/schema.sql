-- ============================================================
-- MEMEBOARD DATABASE SCHEMA (SUPABASE POSTGRESQL)
-- Fully Idempotent - Safe to run repeatedly
-- ============================================================

-- 1. Profiles Table (extending auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  username text,
  telegram_user_id bigint unique,
  telegram_username text,
  telegram_link_code text unique,
  created_at timestamptz default now() not null
);

-- 2. Boards Table
create table if not exists public.boards (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text not null unique,
  owner_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now() not null
);

-- 3. Board Members Table
create table if not exists public.board_members (
  board_id uuid references public.boards(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz default now() not null,
  primary key (board_id, user_id)
);

-- 4. Links Table
create table if not exists public.links (
  id uuid default gen_random_uuid() primary key,
  board_id uuid references public.boards(id) on delete cascade not null,
  submitted_by uuid references public.profiles(id) on delete set null,
  url text not null,
  created_at timestamptz default now() not null
);

-- Ensure foreign key points to profiles if table was previously created
do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'links_submitted_by_fkey'
    and table_name = 'links'
  ) then
    alter table public.links drop constraint links_submitted_by_fkey;
  end if;
  
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'links_submitted_by_profiles_fkey'
    and table_name = 'links'
  ) then
    alter table public.links 
      add constraint links_submitted_by_profiles_fkey 
      foreign key (submitted_by) references public.profiles(id) on delete set null;
  end if;
exception
  when others then null;
end $$;

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
create index if not exists idx_boards_slug on public.boards(slug);
create index if not exists idx_boards_owner on public.boards(owner_id);
create index if not exists idx_board_members_user on public.board_members(user_id);
create index if not exists idx_links_board_created on public.links(board_id, created_at desc);
create index if not exists idx_profiles_telegram_user_id on public.profiles(telegram_user_id);
create index if not exists idx_profiles_telegram_link_code on public.profiles(telegram_link_code);

-- ============================================================
-- AUTOMATIC PROFILE CREATION TRIGGER
-- ============================================================
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
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- AUTO-ADD OWNER AS BOARD MEMBER TRIGGER
-- ============================================================
create or replace function public.handle_new_board()
returns trigger as $$
begin
  insert into public.board_members (board_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (board_id, user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_board_created on public.boards;
create trigger on_board_created
  after insert on public.boards
  for each row execute function public.handle_new_board();

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================
alter table public.profiles enable row level security;
alter table public.boards enable row level security;
alter table public.board_members enable row level security;
alter table public.links enable row level security;

-- Profiles: Anyone can view usernames/profiles, user can update their own
drop policy if exists "Allow read profiles" on public.profiles;
create policy "Allow read profiles" on public.profiles
  for select using (true);

drop policy if exists "Allow user to update own profile" on public.profiles;
create policy "Allow user to update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Boards: Anyone can view boards (for shared / viral links)
drop policy if exists "Allow read boards" on public.boards;
create policy "Allow read boards" on public.boards
  for select using (true);

drop policy if exists "Allow authenticated users to create boards" on public.boards;
create policy "Allow authenticated users to create boards" on public.boards
  for insert with check (auth.role() = 'authenticated' and auth.uid() = owner_id);

drop policy if exists "Allow owners to update boards" on public.boards;
create policy "Allow owners to update boards" on public.boards
  for update using (auth.uid() = owner_id);

drop policy if exists "Allow owners to delete boards" on public.boards;
create policy "Allow owners to delete boards" on public.boards
  for delete using (auth.uid() = owner_id);

-- Board Members: Anyone can view members of boards
drop policy if exists "Allow read board members" on public.board_members;
create policy "Allow read board members" on public.board_members
  for select using (true);

drop policy if exists "Allow authenticated users to join board" on public.board_members;
create policy "Allow authenticated users to join board" on public.board_members
  for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);

drop policy if exists "Allow members to leave or owner to remove" on public.board_members;
create policy "Allow members to leave or owner to remove" on public.board_members
  for delete using (auth.uid() = user_id or exists (
    select 1 from public.boards b where b.id = board_id and b.owner_id = auth.uid()
  ));

-- Links: Anyone can view links for shareable boards
drop policy if exists "Allow read links" on public.links;
create policy "Allow read links" on public.links
  for select using (true);

drop policy if exists "Allow board members to insert links" on public.links;
create policy "Allow board members to insert links" on public.links
  for insert with check (
    auth.role() = 'authenticated' and
    exists (
      select 1 from public.board_members bm
      where bm.board_id = links.board_id and bm.user_id = auth.uid()
    )
  );

-- ============================================================
-- SUPABASE REALTIME REPLICATION
-- ============================================================
-- Enable Postgres Changes listening on links (only if not already added)
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
