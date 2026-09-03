-- ============================================================
-- MEMEBOARD V3 MIGRATION SCRIPT (POSTGRESQL / SUPABASE)
-- Fully Idempotent - Safe to run repeatedly
-- ============================================================

-- 1. Add content_type to links table
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'links' and column_name = 'content_type') then
    alter table public.links add column content_type text not null default 'link' check (content_type in ('image', 'video', 'link'));
  end if;
end $$;

-- 2. Backfill content_type for existing links
update public.links
set content_type = case
  when embed_type = 'youtube' then 'video'
  when embed_type = 'instagram' and url ilike '%/reel/%' then 'video'
  when thumbnail_url is not null and thumbnail_url != '' then 'image'
  else 'link'
end
where content_type = 'link';

-- 3. Normalize usernames to be lowercase, URL-safe, and unique
-- Replace spaces and non-alphanumeric characters with hyphens
update public.profiles
set username = lower(regexp_replace(username, '[^a-zA-Z0-9]', '-', 'g'))
where username != lower(regexp_replace(username, '[^a-zA-Z0-9]', '-', 'g'));

-- Remove multiple consecutive hyphens
update public.profiles
set username = regexp_replace(username, '-+', '-', 'g')
where username != regexp_replace(username, '-+', '-', 'g');

-- Trim leading/trailing hyphens
update public.profiles
set username = trim(both '-' from username)
where username != trim(both '-' from username);

-- If username is empty after sanitization, generate a random one
update public.profiles
set username = 'user-' || lower(substr(md5(random()::text || clock_timestamp()::text), 1, 6))
where username = '' or username is null;

-- Ensure uniqueness constraint on username exists
do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'profiles_username_key'
  ) then
    alter table public.profiles add constraint profiles_username_key unique (username);
  end if;
exception
  -- Handle potential existing duplicates before applying constraint
  when unique_violation then null;
end $$;

-- 4. Additional Indexes for filtering
create index if not exists idx_links_board_content_type on public.links(board_id, content_type, created_at desc);
