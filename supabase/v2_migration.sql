-- ============================================================
-- MEMEBOARD V2 MIGRATION SCRIPT (POSTGRESQL / SUPABASE)
-- Fully Idempotent - Safe to run repeatedly
-- ============================================================

-- 1. Categories Table (global defaults + board-specific categories)
create table if not exists public.categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text not null,
  board_id uuid references public.boards(id) on delete cascade,
  created_at timestamptz default now() not null
);

create index if not exists idx_categories_board on public.categories(board_id);
create unique index if not exists idx_categories_global_slug on public.categories(slug) where board_id is null;

-- 2. Seed Default Global Categories
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

-- 3. Extend Links Table
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'links' and column_name = 'platform') then
    alter table public.links add column platform text not null default 'other';
  end if;

  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'links' and column_name = 'title') then
    alter table public.links add column title text;
  end if;

  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'links' and column_name = 'description') then
    alter table public.links add column description text;
  end if;

  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'links' and column_name = 'thumbnail_url') then
    alter table public.links add column thumbnail_url text;
  end if;

  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'links' and column_name = 'category_id') then
    alter table public.links add column category_id uuid references public.categories(id) on delete set null;
  end if;

  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'links' and column_name = 'embed_type') then
    alter table public.links add column embed_type text;
  end if;

  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'links' and column_name = 'external_id') then
    alter table public.links add column external_id text;
  end if;

  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'links' and column_name = 'resolved_url') then
    alter table public.links add column resolved_url text;
  end if;

  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'links' and column_name = 'updated_at') then
    alter table public.links add column updated_at timestamptz default now() not null;
  end if;
end $$;

-- 4. Assign default 'Random' category to existing links with null category_id
do $$
declare
  v_random_id uuid;
begin
  select id into v_random_id from public.categories where slug = 'random' and board_id is null limit 1;
  if v_random_id is not null then
    update public.links set category_id = v_random_id where category_id is null;
  end if;
end $$;

-- 5. Backfill platform for existing links based on URL domain
update public.links
set platform = case
  when url ilike '%youtube.com%' or url ilike '%youtu.be%' then 'youtube'
  when url ilike '%instagram.com%' or url ilike '%instagr.am%' then 'instagram'
  when url ilike '%reddit.com%' or url ilike '%redd.it%' then 'reddit'
  when url ilike '%twitter.com%' or url ilike '%x.com%' then 'x'
  else 'other'
end
where platform = 'other' or platform is null;

-- 5. Additional Indexes for Composite Filtering & Search
create index if not exists idx_links_board_platform on public.links(board_id, platform, created_at desc);
create index if not exists idx_links_board_category on public.links(board_id, category_id, created_at desc);
create index if not exists idx_links_board_submitted on public.links(board_id, submitted_by, created_at desc);

-- 6. Row Level Security Updates
alter table public.categories enable row level security;

drop policy if exists "Allow read categories" on public.categories;
create policy "Allow read categories" on public.categories
  for select using (
    board_id is null or
    exists (
      select 1 from public.board_members bm
      where bm.board_id = categories.board_id and bm.user_id = auth.uid()
    )
  );

drop policy if exists "Allow link owner to update title and category" on public.links;
create policy "Allow link owner to update title and category" on public.links
  for update using (auth.uid() = submitted_by);

drop policy if exists "Allow link owner or board owner to delete link" on public.links;
create policy "Allow link owner or board owner to delete link" on public.links
  for delete using (
    auth.uid() = submitted_by or
    exists (
      select 1 from public.boards b
      where b.id = links.board_id and b.owner_id = auth.uid()
    )
  );

-- 7. Schema Grants
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;

-- 8. Updated RPC Function for Telegram Submission with Default 'Random' Category
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
  v_target_category_id uuid;
  v_new_link_id uuid;
begin
  -- 1. Find profile by Telegram ID
  select * into v_profile
  from public.profiles
  where telegram_user_id = p_telegram_user_id;

  if not found then
    return json_build_object('success', false, 'error', 'Telegram account not linked');
  end if;

  -- 2. Find active board
  select b.* into v_board
  from public.board_members bm
  join public.boards b on b.id = bm.board_id
  where bm.user_id = v_profile.id
  order by bm.joined_at desc
  limit 1;

  if not found then
    return json_build_object('success', false, 'error', 'No boards found for user');
  end if;

  -- 3. Resolve category (default to global 'Random' if none provided)
  if p_category_id is not null then
    v_target_category_id := p_category_id;
  else
    select id into v_target_category_id
    from public.categories
    where slug = 'random' and board_id is null
    limit 1;
  end if;

  -- 4. Insert link record
  insert into public.links (
    board_id,
    submitted_by,
    url,
    platform,
    title,
    category_id
  )
  values (
    v_board.id,
    v_profile.id,
    p_url,
    coalesce(p_platform, 'other'),
    p_title,
    v_target_category_id
  )
  returning id into v_new_link_id;

  return json_build_object(
    'success', true,
    'board_name', v_board.name,
    'link_id', v_new_link_id,
    'category_id', v_target_category_id
  );
end;
$$ language plpgsql security definer;
