-- EngSpace — core: profiles, staff roles, helpers.
--
-- Privacy model (the same promise the app makes, enforced here):
--  · A member's auth id never leaves the database in a readable column. Content carries a server-built author snapshot;
--    who wrote what lives in private.authorship, which no client role can read.
--  · Moderators work with profiles.mod_ref ("acc-xxxxxx"), never with names or e-mail behind an anonymous identity.
--  · Clients can update only the profile columns a member may change; verification, staff role and standing are server-set.

create extension if not exists pgcrypto with schema extensions;

-- Tables no client role may touch directly (reached only through security-definer functions)
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Supabase grants every new public table to anon/authenticated by default; this app has no signed-out data access.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on functions from anon, public;

create type public.member_role as enum ('engineer', 'supervisor', 'hr', 'owner');
create type public.staff_role as enum ('member', 'moderator', 'admin');
create type public.author_mode as enum ('anon', 'public');

create or replace function private.rand_hex(n int) returns text
language sql volatile set search_path = '' as $$
  select substr(encode(extensions.gen_random_bytes(16), 'hex'), 1, n)
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- public identity id (the "pid" on public items) and the anonymous handle — neither is the auth id
  pid text not null unique default ('u-' || private.rand_hex(10)),
  anon text not null unique default private.rand_hex(6),
  mod_ref text not null unique default ('acc-' || private.rand_hex(6)),
  name text not null check (char_length(name) between 2 and 80),
  gender text not null default 'male' check (gender in ('male', 'female')),
  age int check (age between 16 and 90),
  grad_year int check (grad_year between 1960 and 2100),
  role public.member_role not null default 'engineer',
  disc text,
  track text,
  pos text,
  gov text,
  city text,
  goal text,
  company_name text,
  company_id text,
  avatar text,
  look text,
  photo_path text,
  default_identity public.author_mode not null default 'anon',
  -- notify, dm, hide, rotate, openToRecruiters, showPhoto … — member preferences
  settings jsonb not null default '{}'::jsonb,
  -- server-set
  verified boolean not null default false,
  verify_kind text,
  division text,
  level int not null default 0,
  contributions int not null default 0,
  staff public.staff_role not null default 'member',
  strikes int not null default 0,
  suspended_until timestamptz,
  suspended_forever boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "own profile: read" on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "own profile: create" on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy "own profile: update" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- column-level: members may write their own data, never the server-set columns
revoke insert, update on public.profiles from authenticated;
grant insert (id, name, gender, age, grad_year, role, disc, track, pos, gov, city, goal, company_name, company_id, avatar, look,
  photo_path, default_identity, settings) on public.profiles to authenticated;
grant update (name, gender, age, grad_year, role, disc, track, pos, gov, city, goal, company_name, company_id, avatar, look,
  photo_path, default_identity, settings) on public.profiles to authenticated;

create or replace function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger profiles_touch before update on public.profiles for each row execute function private.touch_updated_at();

-- Renaming a verified account drops the badge (the documents carried the old name); employers never carry one.
create or replace function private.profile_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.role in ('hr', 'owner') then new.verified := false; new.verify_kind := null; new.division := null; end if;
  if tg_op = 'UPDATE' and new.name is distinct from old.name and old.verified then
    new.verified := false; new.verify_kind := null; new.division := null;
  end if;
  return new;
end $$;
create trigger profiles_guard before insert or update on public.profiles for each row execute function private.profile_guard();

-- ---- helpers used by policies (security definer so policies never recurse into profiles' own RLS) ----
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.staff in ('moderator', 'admin') from public.profiles p where p.id = (select auth.uid())), false)
$$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.staff = 'admin' from public.profiles p where p.id = (select auth.uid())), false)
$$;

-- ---- app configuration: moderation thresholds, announcement, closed rooms (one row per key) ----
create table public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_config enable row level security;
create policy "config: members read" on public.app_config for select to authenticated using (true);
create policy "config: admins write" on public.app_config for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.app_config (key, value) values ('mod', jsonb_build_object(
  'autoHideAt', 3, 'strikeLimit', 3, 'slaHours', 24, 'dmDays', 7, 'readOnly', false,
  'announce', jsonb_build_object('on', false, 'text', '', 'tone', 'info'), 'closedRooms', '{}'::jsonb));

-- what the member may do right now (mirrors actGate in src/domain/moderation.ts)
create or replace function private.can_act(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and not p.suspended_forever and (p.suspended_until is null or p.suspended_until < now())
  ) and not coalesce((select (c.value ->> 'readOnly')::boolean from public.app_config c where c.key = 'mod'), false)
$$;

-- ---- the author snapshot, built here from the profile: a client cannot claim a badge, a name or a role it does not have ----
-- The anonymous branch carries the handle, the high-level role, experience and the credential — no name, age, city or employer.
-- The client renders the display title from these fields (anonTitle / publicTitle in src/domain/identity.ts).
create or replace function private.author_snapshot(uid uuid, mode public.author_mode) returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when p.id is null then null else
    jsonb_strip_nulls(jsonb_build_object(
      'as', mode, 'gender', p.gender, 'userRole', p.role, 'disc', p.disc, 'level', p.level,
      'look', case when p.gender = 'female' then coalesce(p.look, 'hood') end,
      'verified', p.verified and p.role in ('engineer', 'supervisor'),
      'verifyKind', case when p.verified and p.role in ('engineer', 'supervisor') then coalesce(p.verify_kind, 'syndicate') end,
      'division', case when p.verified then p.division end,
      'years', case when p.role in ('hr', 'owner') then null
                    when p.grad_year is not null then greatest(0, extract(year from now())::int - p.grad_year) end,
      'pos', p.pos,
      'dm', coalesce((p.settings ->> 'dm')::boolean, true)
    ) || case when mode = 'public' then jsonb_strip_nulls(jsonb_build_object(
      'pid', p.pid, 'name', p.name, 'age', p.age, 'gradYear', p.grad_year, 'track', p.track, 'gov', p.gov, 'city', p.city,
      'companyName', p.company_name,
      'photo', case when coalesce((p.settings ->> 'showPhoto')::boolean, true) then p.photo_path end))
    else jsonb_strip_nulls(jsonb_build_object('anon', p.anon, 'avatar', p.avatar)) end)
  end
  from (select 1) one left join public.profiles p on p.id = uid
$$;

-- who wrote what: never readable by a client
create table private.authorship (
  kind text not null,
  item_id uuid not null,
  account_id uuid not null references auth.users (id) on delete cascade,
  mode public.author_mode not null,
  primary key (kind, item_id)
);
create index authorship_account on private.authorship (account_id);

-- BEFORE INSERT on every authored table: the author is the caller, the snapshot comes from the caller's profile
create or replace function private.stamp_author() returns trigger
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if not private.can_act(uid) then raise exception 'account cannot post right now' using errcode = '42501'; end if;
  new.author := private.author_snapshot(uid, coalesce(new.author_mode, 'anon'));
  if new.author is null then raise exception 'profile missing' using errcode = '42501'; end if;
  insert into private.authorship (kind, item_id, account_id, mode) values (tg_table_name, new.id, uid, new.author_mode);
  return new;
end $$;

-- is this item mine? (lets the app show «you» and the delete button without exposing anyone's account id)
create or replace function public.is_mine(kind text, item uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.authorship a where a.kind = $1 and a.item_id = $2 and a.account_id = (select auth.uid()))
$$;

-- New account → profile row from the sign-up metadata (the client sends the registration form as user metadata)
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, name, gender, age, grad_year, role, disc, track, pos, gov, city, goal, company_name, default_identity)
  values (new.id,
    coalesce(nullif(m ->> 'name', ''), split_part(new.email, '@', 1)),
    coalesce(nullif(m ->> 'gender', ''), 'male'),
    nullif(m ->> 'age', '')::int, nullif(m ->> 'gradYear', '')::int,
    coalesce(nullif(m ->> 'role', ''), 'engineer')::public.member_role,
    m ->> 'disc', m ->> 'track', m ->> 'pos', m ->> 'gov', m ->> 'city', m ->> 'goal', m ->> 'companyName',
    coalesce(nullif(m ->> 'identity', ''), 'anon')::public.author_mode)
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

-- A member deletes their own account: auth row → profile, authorship, requests, messages cascade
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  delete from auth.users where id = auth.uid();
end $$;

grant usage on schema public to authenticated;
grant execute on function public.is_staff(), public.is_admin(), public.is_mine(text, uuid), public.delete_my_account() to authenticated;
