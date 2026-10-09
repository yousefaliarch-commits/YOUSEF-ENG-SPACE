-- =====================================================================
--  Phase 1.2 — database armor (docs/SECURITY.md)
--  · Default deny: no function is executable by PUBLIC / anon / authenticated unless a migration grants it explicitly, and
--    signed-in members never hold TRUNCATE / TRIGGER / REFERENCES (none of them is covered by row-level security).
--    Postgres grants EXECUTE to PUBLIC on every new function by default; that default was never revoked, which left 15
--    security-definer functions callable without signing in (count_job_view could be inflated by anyone on the internet).
--  · A member's role (engineer / supervisor / hr / owner) decides money access, so changing it after onboarding is limited to
--    once in 30 days, drops verification, and is written to the audit log (actor and target are the member's mod_ref).
--  · Job views count once per member per day, signed-in only.
--  · Rate limits on every member write path that had none (posts, comments, messages, reviews, jobs, tickets, reports).
--  · Size caps on the jsonb a member can write, and at most 40 synced state keys per member.
--  Pinned by supabase/tests/database/18_security_invariants.test.sql.
-- =====================================================================

-- ---------------------------------------------------------------- default deny
-- the global default (EXECUTE to PUBLIC on new functions) and the schema defaults for public / private
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke truncate, trigger, references on tables from authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon;

-- existing functions: nothing in public / private is callable by PUBLIC or anon; nothing in private by members
-- (extension-owned functions are left alone)
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig, n.nspname as schema
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private') and p.prokind in ('f', 'p')
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    if f.schema = 'private' then execute format('revoke execute on function %s from authenticated', f.sig); end if;
  end loop;
end $$;

-- existing tables, views and sequences in public: anon holds nothing; members hold no TRUNCATE / TRIGGER / REFERENCES
do $$
declare t record;
begin
  for t in select c.oid::regclass as rel, c.relkind from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f', 'S')
  loop
    execute format('revoke all on %s from anon', t.rel);
    if t.relkind <> 'S' then execute format('revoke truncate, trigger, references on %s from authenticated', t.rel); end if;
  end loop;
end $$;

-- ---------------------------------------------------------------- role changes
alter table public.profiles add column if not exists role_changed_at timestamptz;

-- Choosing a role while completing the profile is free. After that: once in 30 days, verification is dropped (it attested
-- a role and a division), and the change is audited by mod_ref only — never a name.
create or replace function private.role_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.role is not distinct from old.role then return new; end if;
  if not coalesce(old.onboarded, false) then return new; end if;
  if auth.uid() is null then new.role_changed_at := now(); return new; end if;   -- service role / maintenance
  -- staff changing someone else's role (admin_set_account) are not limited; that function audits it itself
  if auth.uid() <> old.id and public.is_staff() then new.role_changed_at := now(); return new; end if;
  if old.role_changed_at is not null and old.role_changed_at > now() - interval '30 days' then
    raise exception 'role change cooldown' using errcode = '54000',
      detail = to_char(old.role_changed_at + interval '30 days', 'YYYY-MM-DD');
  end if;
  new.role_changed_at := now();
  new.verified := false; new.verify_kind := null; new.division := null;
  perform private.audit('role_change', old.mod_ref, jsonb_build_object('from', old.role, 'to', new.role));
  return new;
end $$;
-- onboarding only moves forward: a member cannot reopen it to get a free role change
create or replace function private.onboarded_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(old.onboarded, false) and not coalesce(new.onboarded, false) and auth.uid() is not null then
    raise exception 'onboarding is complete' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists profiles_onboarded_guard on public.profiles;
create trigger profiles_onboarded_guard before update of onboarded on public.profiles for each row execute function private.onboarded_guard();
revoke execute on function private.onboarded_guard() from public, anon, authenticated;

drop trigger if exists profiles_role_guard on public.profiles;
create trigger profiles_role_guard before update of role on public.profiles for each row execute function private.role_guard();
revoke execute on function private.role_guard() from public, anon, authenticated;

-- ---------------------------------------------------------------- job views: signed-in, once per member per job per day
create table if not exists private.job_views (
  job_id uuid not null references public.jobs (id) on delete cascade,
  account_id uuid not null references auth.users (id) on delete cascade,
  day date not null default current_date,
  primary key (job_id, account_id, day)
);
create index if not exists job_views_account on private.job_views (account_id);

create or replace function public.count_job_view(p_job uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null or p_job is null then return; end if;
  if not exists (select 1 from public.jobs j where j.id = p_job and not j.hidden) then return; end if;
  insert into private.job_views (job_id, account_id) values (p_job, me) on conflict do nothing;
  if found then update public.jobs set view_count = view_count + 1 where id = p_job; end if;
end $$;
revoke execute on function public.count_job_view(uuid) from public, anon;
grant execute on function public.count_job_view(uuid) to authenticated;

-- ---------------------------------------------------------------- rate limits
-- One event row per counted write; a burst window and a daily ceiling per bucket. Staff and the service role are exempt.
-- Generous for people, a wall for scripts. A refused write raises 54000 «rate limited» (the app shows «انتظر قليلًا»).
create table if not exists private.rate_events (
  account_id uuid not null references auth.users (id) on delete cascade,
  bucket text not null,
  at timestamptz not null default now()
);
create index if not exists rate_events_lookup on private.rate_events (account_id, bucket, at desc);

create or replace function private.rate_limit(p_bucket text, p_burst int, p_window interval, p_daily int) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); n_burst int; n_day int;
begin
  if me is null or public.is_staff() then return; end if;
  -- a database session (tests, maintenance) can switch limits off; the Data API cannot set this
  if current_setting('engspace.rate_limits', true) = 'off' then return; end if;
  select count(*) filter (where e.at > now() - p_window), count(*) into n_burst, n_day
  from private.rate_events e where e.account_id = me and e.bucket = p_bucket and e.at > now() - interval '1 day';
  if n_burst >= p_burst or n_day >= p_daily then
    raise exception 'rate limited' using errcode = '54000', detail = p_bucket;
  end if;
  insert into private.rate_events (account_id, bucket) values (me, p_bucket);
end $$;

-- trigger form: execute function private.limit_writes('<bucket>', '<burst>', '<window>', '<daily>')
create or replace function private.limit_writes() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.rate_limit(tg_argv[0], tg_argv[1]::int, tg_argv[2]::interval, tg_argv[3]::int);
  return new;
end $$;

drop trigger if exists posts_a_rate on public.posts;
create trigger posts_a_rate before insert on public.posts for each row execute function private.limit_writes('post', '8', '10 minutes', '40');
drop trigger if exists comments_a_rate on public.comments;
create trigger comments_a_rate before insert on public.comments for each row execute function private.limit_writes('comment', '20', '10 minutes', '200');
drop trigger if exists messages_a_rate on private.messages;
create trigger messages_a_rate before insert on private.messages for each row execute function private.limit_writes('message', '30', '5 minutes', '400');
drop trigger if exists company_reviews_a_rate on public.company_reviews;
create trigger company_reviews_a_rate before insert on public.company_reviews for each row execute function private.limit_writes('review', '3', '1 hour', '10');
drop trigger if exists jobs_a_rate on public.jobs;
create trigger jobs_a_rate before insert on public.jobs for each row execute function private.limit_writes('job', '5', '1 hour', '20');
drop trigger if exists support_tickets_a_rate on public.support_tickets;
create trigger support_tickets_a_rate before insert on public.support_tickets for each row execute function private.limit_writes('ticket', '3', '1 hour', '10');
drop trigger if exists ticket_messages_a_rate on public.ticket_messages;
create trigger ticket_messages_a_rate before insert on public.ticket_messages for each row execute function private.limit_writes('ticket_msg', '20', '10 minutes', '100');
drop trigger if exists reports_a_rate on public.reports;
create trigger reports_a_rate before insert on public.reports for each row execute function private.limit_writes('report', '10', '1 hour', '40');

revoke execute on function private.rate_limit(text, int, interval, int), private.limit_writes() from public, anon, authenticated;

-- ---------------------------------------------------------------- jsonb size caps (new writes; existing rows are left as they are)
alter table public.posts drop constraint if exists posts_data_size;
alter table public.posts add constraint posts_data_size check (octet_length(data::text) <= 16384) not valid;
alter table public.comments drop constraint if exists comments_data_size;
alter table public.comments add constraint comments_data_size check (octet_length(data::text) <= 4096) not valid;
alter table public.company_reviews drop constraint if exists company_reviews_data_size;
alter table public.company_reviews add constraint company_reviews_data_size check (octet_length(data::text) <= 4096) not valid;
alter table public.profiles drop constraint if exists profiles_settings_size;
alter table public.profiles add constraint profiles_settings_size check (octet_length(settings::text) <= 4096) not valid;
alter table public.member_state drop constraint if exists member_state_value_size;
alter table public.member_state add constraint member_state_value_size check (octet_length(value::text) <= 1048576) not valid;

-- at most 40 synced keys per member (the app uses about a dozen); an existing key can always be rewritten
create or replace function private.member_state_keys() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.member_state s where s.account_id = new.account_id and s.key <> new.key) >= 40 then
    raise exception 'too many state keys' using errcode = '54000';
  end if;
  return new;
end $$;
drop trigger if exists member_state_a_keys on public.member_state;
create trigger member_state_a_keys before insert on public.member_state for each row execute function private.member_state_keys();
revoke execute on function private.member_state_keys() from public, anon, authenticated;

-- ---------------------------------------------------------------- housekeeping
create or replace function private.armor_housekeeping() returns void
language sql security definer set search_path = '' as $$
  delete from private.rate_events where at < now() - interval '1 day';
  delete from private.job_views where day < current_date - 1;
$$;
revoke execute on function private.armor_housekeeping() from public, anon, authenticated;
select cron.unschedule(jobid) from cron.job where jobname = 'engspace-armor-housekeeping';
select cron.schedule('engspace-armor-housekeeping', '41 * * * *', $$ select private.armor_housekeeping() $$);
