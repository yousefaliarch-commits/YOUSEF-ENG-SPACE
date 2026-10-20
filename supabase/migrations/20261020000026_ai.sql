-- =====================================================================
--  «المهندس الذكي» — the AI backbone (docs/AI.md)
--  · The Gemini key lives only in the ai-chat Edge Function's secrets; the database never sees it.
--  · Quota: one daily allowance per member (Cairo day), configurable here, taken atomically by the Edge Function (service
--    role) before every model call. Usage rows hold counts and token totals per feature — never a prompt or an answer.
--  · Feedback: a member rates an answer (👍 / 👎, optional short reason); staff see aggregates only, never who rated.
--  · Deleting an account deletes its usage and feedback (on delete cascade).
-- =====================================================================

create table if not exists private.ai_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into private.ai_config (key, value) values
  ('enabled', 'true'),
  ('daily_limit', '25'),
  ('model', '"gemini-3.8-flash"'),
  ('model_light', '"gemini-3.8-flash"')
on conflict (key) do nothing;

create table if not exists private.ai_usage (
  account_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  feature text not null,
  n int not null default 0,
  tokens_in int not null default 0,
  tokens_out int not null default 0,
  primary key (account_id, day, feature)
);
create index if not exists ai_usage_day on private.ai_usage (day);

create table if not exists private.ai_feedback (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users (id) on delete cascade,
  feature text not null,
  rating smallint not null check (rating in (-1, 1)),
  reason text check (char_length(reason) <= 200),
  created_at timestamptz not null default now()
);
create index if not exists ai_feedback_created on private.ai_feedback (created_at desc);
create index if not exists ai_feedback_account on private.ai_feedback (account_id, created_at desc);

-- the features the proxy knows; anything else is refused before a model is called
create or replace function private.ai_feature_ok(p text) returns boolean
language sql immutable set search_path = '' as $$
  select p in ('assistant', 'cv-review', 'form-fill', 'salary-insights', 'tool-tip')
$$;

create or replace function private.ai_cfg(p_key text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select value from private.ai_config where key = p_key
$$;

create or replace function private.ai_today() returns date
language sql stable set search_path = '' as $$
  select (now() at time zone 'Africa/Cairo')::date
$$;

-- the member's own allowance today (for the quota chip in the app)
create or replace function public.ai_quota() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); lim int; used int;
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  lim := coalesce((private.ai_cfg('daily_limit'))::int, 25);
  select coalesce(sum(n), 0) into used from private.ai_usage where account_id = uid and day = private.ai_today();
  return jsonb_build_object('enabled', coalesce((private.ai_cfg('enabled'))::boolean, true), 'limit', lim, 'used', used,
    'remaining', greatest(0, lim - used));
end $$;

-- taken by the Edge Function (service role) before a model call: one unit, or { ok: false } when the day is spent
create or replace function public.ai_take(p_account uuid, p_feature text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare lim int; used int; on_ boolean;
begin
  if p_account is null or not private.ai_feature_ok(p_feature) then
    return jsonb_build_object('ok', false, 'reason', 'feature');
  end if;
  on_ := coalesce((private.ai_cfg('enabled'))::boolean, true);
  if not on_ then return jsonb_build_object('ok', false, 'reason', 'disabled'); end if;
  lim := coalesce((private.ai_cfg('daily_limit'))::int, 25);
  -- one member's units are serialised, so two parallel requests can't both take the last one
  perform pg_advisory_xact_lock(hashtextextended('ai:' || p_account::text, 0));
  select coalesce(sum(n), 0) into used from private.ai_usage where account_id = p_account and day = private.ai_today();
  if used >= lim then return jsonb_build_object('ok', false, 'reason', 'quota', 'limit', lim, 'remaining', 0); end if;
  insert into private.ai_usage (account_id, day, feature, n) values (p_account, private.ai_today(), p_feature, 1)
  on conflict (account_id, day, feature) do update set n = private.ai_usage.n + 1;
  -- «money»: a site supervisor's assistant never talks pay (the proxy tells the model so — the app's flag is not trusted)
  return jsonb_build_object('ok', true, 'limit', lim, 'remaining', lim - used - 1,
    'model', private.ai_cfg('model'), 'model_light', private.ai_cfg('model_light'),
    'money', not exists (select 1 from public.profiles p where p.id = p_account and p.role = 'supervisor'));
end $$;

-- a unit given back when the model failed before answering (so an outage doesn't eat the day)
create or replace function public.ai_refund(p_account uuid, p_feature text) returns void
language sql security definer set search_path = '' as $$
  update private.ai_usage set n = greatest(0, n - 1)
   where account_id = p_account and day = private.ai_today() and feature = p_feature
$$;

-- token totals after the answer (counts only)
create or replace function public.ai_tokens(p_account uuid, p_feature text, p_in int, p_out int) returns void
language sql security definer set search_path = '' as $$
  update private.ai_usage set tokens_in = tokens_in + greatest(0, coalesce(p_in, 0)), tokens_out = tokens_out + greatest(0, coalesce(p_out, 0))
   where account_id = p_account and day = private.ai_today() and feature = p_feature
$$;

-- a member rates an answer (rate limited: 30 an hour)
create or replace function public.ai_rate(p_feature text, p_rating int, p_reason text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if not private.ai_feature_ok(p_feature) or p_rating not in (-1, 1) then raise exception 'invalid' using errcode = '22023'; end if;
  if (select count(*) from private.ai_feedback where account_id = uid and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'rate limited' using errcode = 'P0001';
  end if;
  insert into private.ai_feedback (account_id, feature, rating, reason) values (uid, p_feature, p_rating, nullif(left(btrim(coalesce(p_reason, '')), 200), ''));
end $$;

-- staff: usage and satisfaction per day and feature — no member identity anywhere
create or replace function public.admin_ai_usage(p_days int default 14) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'staff only' using errcode = '42501'; end if;
  return jsonb_build_object(
    'config', (select jsonb_object_agg(key, value) from private.ai_config),
    'days', (select coalesce(jsonb_agg(d order by d->>'day' desc, d->>'feature'), '[]') from (
      select jsonb_build_object('day', day, 'feature', feature, 'requests', sum(n), 'members', count(distinct account_id),
        'tokens_in', sum(tokens_in), 'tokens_out', sum(tokens_out)) d
        from private.ai_usage where day > private.ai_today() - greatest(1, least(p_days, 90)) group by day, feature) t),
    'feedback', (select coalesce(jsonb_agg(f), '[]') from (
      select jsonb_build_object('feature', feature, 'up', count(*) filter (where rating = 1), 'down', count(*) filter (where rating = -1)) f
        from private.ai_feedback where created_at > now() - make_interval(days => greatest(1, least(p_days, 90))) group by feature) t));
end $$;

-- admins: the daily allowance and the on / off switch
create or replace function public.admin_ai_set(p_key text, p_value jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  if p_key not in ('enabled', 'daily_limit', 'model', 'model_light') then raise exception 'unknown setting' using errcode = '22023'; end if;
  if p_key = 'daily_limit' and (jsonb_typeof(p_value) <> 'number' or (p_value)::int not between 0 and 1000) then
    raise exception 'daily_limit must be 0–1000' using errcode = '22023';
  end if;
  if p_key = 'enabled' and jsonb_typeof(p_value) <> 'boolean' then raise exception 'enabled must be true / false' using errcode = '22023'; end if;
  if p_key in ('model', 'model_light') and (jsonb_typeof(p_value) <> 'string' or (p_value #>> '{}') !~ '^gemini-[a-z0-9.-]{1,40}$') then
    raise exception 'not a Gemini model name' using errcode = '22023';
  end if;
  insert into private.ai_config (key, value, updated_at) values (p_key, p_value, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
end $$;

alter table private.ai_config enable row level security;
alter table private.ai_usage enable row level security;
alter table private.ai_feedback enable row level security;

-- ---------------------------------------------------------------- grants
revoke execute on function private.ai_feature_ok(text), private.ai_cfg(text), private.ai_today() from public, anon, authenticated;
revoke execute on function public.ai_take(uuid, text), public.ai_refund(uuid, text), public.ai_tokens(uuid, text, int, int)
  from public, anon, authenticated;
grant execute on function public.ai_take(uuid, text), public.ai_refund(uuid, text), public.ai_tokens(uuid, text, int, int) to service_role;
revoke execute on function public.ai_quota(), public.ai_rate(text, int, text), public.admin_ai_usage(int), public.admin_ai_set(text, jsonb)
  from public, anon;
grant execute on function public.ai_quota(), public.ai_rate(text, int, text), public.admin_ai_usage(int), public.admin_ai_set(text, jsonb)
  to authenticated;
