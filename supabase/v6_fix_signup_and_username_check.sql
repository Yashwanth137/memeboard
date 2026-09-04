-- ============================================================
-- MEMEBOARD V6: Fix Signup 500 & Username Availability Check
-- Resolves:
-- 1. function gen_random_bytes(integer) does not exist (HTTP 500 on signup)
-- 2. public_profiles 401 on unauthenticated username availability check
-- ============================================================

-- 1. Fix handle_new_user() to explicitly use extensions.gen_random_bytes(6)
-- and include extensions in search_path, granting execute to supabase_auth_admin
create or replace function public.handle_new_user()
returns trigger as $$
declare
  generated_code text;
begin
  generated_code := encode(extensions.gen_random_bytes(6), 'hex');
  insert into public.profiles (id, email, username, telegram_link_code, telegram_link_code_expires_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    generated_code,
    clock_timestamp() + interval '24 hours'
  )
  on conflict (id) do update
  set email = excluded.email;
  return new;
end;
$$ language plpgsql security definer set search_path = public, extensions, pg_temp;

-- Ensure auth worker (supabase_auth_admin) and backend can invoke the trigger function
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin, service_role;

-- 2. Fix generate_telegram_link_code() to explicitly use extensions.gen_random_bytes(6)
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

revoke execute on function public.generate_telegram_link_code() from public, anon;
grant execute on function public.generate_telegram_link_code() to authenticated, service_role;

-- 3. Dedicated anonymous username availability RPC (Resolves 401 safely)
-- Returns ONLY boolean true/false. Zero table enumeration or sensitive data exposure.
create or replace function public.is_username_available(p_username text)
returns boolean as $$
begin
  if p_username is null or length(trim(p_username)) < 3 then
    return false;
  end if;

  return not exists (
    select 1 from public.profiles
    where lower(username) = lower(trim(p_username))
  );
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

revoke execute on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated, service_role;
