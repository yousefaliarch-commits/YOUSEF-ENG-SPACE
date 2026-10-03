-- EngSpace — push notifications, the in-app notification center and per-type preferences.
--
--  · user_push_tokens: one row per device (FCM token on Android, APNs token on iOS, "web" reserved). Unreadable by any client —
--    members register / drop their own device through functions and never read tokens back (not even their own).
--  · notification_prefs + profiles.settings.notify: what a member wants — jobs, replies & mentions, messages, salary alerts,
--    support. «notify» is the master switch (it already gated job matches); the rest default to on.
--  · notifications.category (jobs · community · support · system, generated from the kind) and notifications.en (the English
--    text a push or the center shows to an English interface).
--  · private.push_outbox: every notification that should reach a phone is queued here by a trigger (prefs checked, device
--    required). The Edge Function send-push claims the queue (service role only), sends through FCM / APNs and prunes dead
--    tokens. Nothing in this file contains a secret; the function's URL and secret live in Vault (docs/PUSH.md).
--  · Producers: a new job → matching engineers (discipline, experience, governorate), replies and mentions, direct messages and
--    team messages, support ticket changes, a new inflation month, a salary cell reaching 5 reports.
--  Privacy: a push for a reply, mention or message never carries the text or the sender — a lock screen shows «new reply» and
--  nothing else. Who matched a job is never visible to the employer.

-- ================================ categories and English text ================================
create or replace function private.notif_category(kind text) returns text
language sql immutable set search_path = '' as $$
  select case
    when kind in ('match', 'job', 'contact') then 'jobs'
    when kind in ('reply', 'mention', 'reaction', 'message', 'saved', 'ama', 'company') then 'community'
    when kind in ('support', 'team') then 'support'
    else 'system' end
$$;
-- the preference key that governs a kind (null = always delivered: account, moderation and verification notices)
create or replace function private.notif_pref(kind text) returns text
language sql immutable set search_path = '' as $$
  select case
    when kind = 'match' then 'jobs'
    when kind in ('reply', 'mention', 'reaction') then 'replies'
    when kind = 'message' then 'messages'
    when kind in ('salary', 'inflation') then 'salary'
    when kind in ('support', 'team') then 'support'
    else null end
$$;
alter table public.notifications add column category text generated always as (private.notif_category(kind)) stored;
alter table public.notifications add column en jsonb;
create index notifications_category on public.notifications (account_id, category, created_at desc);

-- names the matching engine prints (kept in step with src/domain/taxonomy.ts ROLE and src/data/geo.ts GOVS — a test pins both)
create or replace function private.disc_title(disc text, lang text) returns text
language sql immutable set search_path = '' as $$
  select case when lang = 'en' then v.en else v.ar end from (values
  ('civil', 'مهندس مدني', 'Civil Engineer'),
  ('architecture', 'مهندس معماري', 'Architect'),
  ('mechanical', 'مهندس ميكانيكا', 'Mechanical Engineer'),
  ('electrical', 'مهندس كهرباء', 'Electrical Engineer'),
  ('survey', 'مهندس مساحة', 'Survey Engineer')
  ) v(id, ar, en) where v.id = disc
$$;
create or replace function private.gov_name(gov text, lang text) returns text
language sql immutable set search_path = '' as $$
  select case when lang = 'en' then v.en else v.ar end from (values
  ('cairo', 'القاهرة', 'Cairo'),
  ('giza', 'الجيزة', 'Giza'),
  ('qalyubia', 'القليوبية', 'Qalyubia'),
  ('alexandria', 'الإسكندرية', 'Alexandria'),
  ('matrouh', 'مطروح', 'Matrouh'),
  ('beheira', 'البحيرة', 'Beheira'),
  ('dakahlia', 'الدقهلية', 'Dakahlia'),
  ('gharbia', 'الغربية', 'Gharbia'),
  ('menoufia', 'المنوفية', 'Monufia'),
  ('kafr', 'كفر الشيخ', 'Kafr El Sheikh'),
  ('damietta', 'دمياط', 'Damietta'),
  ('sharqia', 'الشرقية', 'Sharqia'),
  ('portsaid', 'بورسعيد', 'Port Said'),
  ('ismailia', 'الإسماعيلية', 'Ismailia'),
  ('suez', 'السويس', 'Suez'),
  ('benisuef', 'بني سويف', 'Beni Suef'),
  ('fayoum', 'الفيوم', 'Fayoum'),
  ('minya', 'المنيا', 'Minya'),
  ('assiut', 'أسيوط', 'Assiut'),
  ('sohag', 'سوهاج', 'Sohag'),
  ('qena', 'قنا', 'Qena'),
  ('luxor', 'الأقصر', 'Luxor'),
  ('aswan', 'أسوان', 'Aswan'),
  ('redsea', 'البحر الأحمر', 'Red Sea'),
  ('southsinai', 'جنوب سيناء', 'South Sinai'),
  ('northsinai', 'شمال سيناء', 'North Sinai'),
  ('newvalley', 'الوادي الجديد', 'New Valley')
  ) v(id, ar, en) where v.id = gov
$$;

-- ================================ devices ================================
create table public.user_push_tokens (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users (id) on delete cascade,
  token text not null unique check (char_length(token) between 20 and 4096),
  platform text not null check (platform in ('android', 'ios', 'web')),
  lang text not null default 'ar' check (lang in ('ar', 'en')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index user_push_tokens_account on public.user_push_tokens (account_id);
alter table public.user_push_tokens enable row level security;   -- no policy: nobody reads or writes it directly
revoke all on public.user_push_tokens from anon, authenticated;

create or replace function public.register_push_token(p_token text, p_platform text, p_lang text default 'ar') returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if p_platform not in ('android', 'ios', 'web') then raise exception 'bad platform' using errcode = '22023'; end if;
  if char_length(coalesce(p_token, '')) not between 20 and 4096 then raise exception 'bad token' using errcode = '22023'; end if;
  -- a phone handed to another member moves the token to the new account
  insert into public.user_push_tokens (account_id, token, platform, lang)
  values (me, p_token, p_platform, case when p_lang = 'en' then 'en' else 'ar' end)
  on conflict (token) do update set account_id = me, platform = excluded.platform, lang = excluded.lang, last_seen_at = now();
  -- at most 8 devices per member: the least recently seen go first
  delete from public.user_push_tokens where id in (select id from public.user_push_tokens where account_id = me order by last_seen_at desc offset 8);
end $$;

create or replace function public.unregister_push_token(p_token text) returns void
language sql security definer set search_path = '' as $$
  delete from public.user_push_tokens where token = p_token and account_id = (select auth.uid())
$$;

-- which devices will get pushes (no token ever leaves the server)
create or replace function public.my_push_devices() returns table (platform text, lang text, last_seen_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select t.platform, t.lang, t.last_seen_at from public.user_push_tokens t where t.account_id = (select auth.uid()) order by t.last_seen_at desc
$$;

-- ================================ preferences ================================
create table public.notification_prefs (
  account_id uuid primary key references auth.users (id) on delete cascade,
  prefs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.notification_prefs enable row level security;
revoke all on public.notification_prefs from anon, authenticated;

create or replace function private.master_on(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select (p.settings ->> 'notify')::boolean from public.profiles p where p.id = uid), true)
$$;
create or replace function private.pref_on(uid uuid, key text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select (n.prefs ->> key)::boolean from public.notification_prefs n where n.account_id = uid), true)
$$;

create or replace function public.my_notification_prefs() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('notify', private.master_on((select auth.uid())),
    'jobs', private.pref_on((select auth.uid()), 'jobs'), 'replies', private.pref_on((select auth.uid()), 'replies'),
    'messages', private.pref_on((select auth.uid()), 'messages'), 'salary', private.pref_on((select auth.uid()), 'salary'),
    'support', private.pref_on((select auth.uid()), 'support'))
$$;

create or replace function public.set_notification_prefs(p_prefs jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); k text; v jsonb; clean jsonb := '{}'::jsonb;
begin
  if me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if jsonb_typeof(p_prefs) <> 'object' then raise exception 'bad preferences' using errcode = '22023'; end if;
  for k, v in select * from jsonb_each(p_prefs) loop
    if k not in ('notify', 'jobs', 'replies', 'messages', 'salary', 'support') or jsonb_typeof(v) <> 'boolean' then raise exception 'bad preference %', k using errcode = '22023'; end if;
    if k <> 'notify' then clean := clean || jsonb_build_object(k, v); end if;
  end loop;
  if clean <> '{}'::jsonb then
    insert into public.notification_prefs (account_id, prefs) values (me, clean)
    on conflict (account_id) do update set prefs = public.notification_prefs.prefs || excluded.prefs, updated_at = now();
  end if;
  if p_prefs ? 'notify' then update public.profiles set settings = settings || jsonb_build_object('notify', p_prefs -> 'notify') where id = me; end if;
  return public.my_notification_prefs();
end $$;

-- ================================ the outbox and its dispatcher ================================
create table private.push_outbox (
  id bigint generated always as identity primary key,
  account_id uuid not null references auth.users (id) on delete cascade,
  notification_id uuid references public.notifications (id) on delete set null,
  category text not null,
  title_ar text not null, body_ar text not null default '', title_en text not null, body_en text not null default '',
  data jsonb not null default '{}'::jsonb,
  collapse_key text,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  attempts int not null default 0,
  claimed_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);
create index push_outbox_queue on private.push_outbox (id) where status in ('pending', 'sending');

-- a notification becomes a push when the member wants it and has a device. The text of replies, mentions and messages is
-- replaced by a generic line: a lock screen never shows who wrote or what.
create or replace function private.notification_push() returns trigger
language plpgsql security definer set search_path = '' as $$
declare pref text := private.notif_pref(new.kind); generic boolean := new.kind in ('reply', 'mention', 'reaction', 'message', 'team');
begin
  if not private.master_on(new.account_id) then return null; end if;
  if pref is not null and not private.pref_on(new.account_id, pref) then return null; end if;
  if not exists (select 1 from public.user_push_tokens t where t.account_id = new.account_id) then return null; end if;
  insert into private.push_outbox (account_id, notification_id, category, title_ar, body_ar, title_en, body_en, data, collapse_key)
  values (new.account_id, new.id, new.category, new.title,
    case when generic then 'اضغط للعرض' else new.body end,
    coalesce(new.en ->> 'title', new.title),
    case when generic then 'Tap to view' else coalesce(new.en ->> 'body', new.body) end,
    jsonb_build_object('nid', new.id, 'category', new.category, 'type', new.target ->> 'type', 'id', new.target ->> 'id'),
    coalesce(new.target ->> 'id', new.kind));
  return null;
end $$;
create trigger notifications_push after insert on public.notifications for each row execute function private.notification_push();

-- pg_net sends the call; hosted Supabase has it, a local stack may need it switched on
do $$ begin create extension if not exists pg_net; exception when others then null; end $$;

-- wakes the Edge Function (once per transaction, however many rows a job fan-out queued). The function's address and secret are
-- Vault secrets set by hand (docs/PUSH.md); without them nothing happens here and the every-minute sweep below is the only caller.
create or replace function private.kick_push() returns void
language plpgsql security definer set search_path = '' as $$
declare u text; s text;
begin
  -- once per transaction: a job fanned out to a thousand members queues a thousand rows but wakes the function once
  -- (pg_net sends the request only after the transaction commits, so the function finds all of them)
  if current_setting('engspace.push_kicked', true) = '1' then return; end if;
  perform set_config('engspace.push_kicked', '1', true);
  select decrypted_secret into u from vault.decrypted_secrets where name = 'push_url';
  select decrypted_secret into s from vault.decrypted_secrets where name = 'push_secret';
  if u is null or s is null then return; end if;
  perform net.http_post(url := rtrim(u, '/') || '/functions/v1/send-push', headers := jsonb_build_object('content-type', 'application/json', 'x-push-secret', s), body := '{}'::jsonb);
exception when others then null;   -- vault or pg_net missing, or the call failed: the queue keeps; never block the write
end $$;
create or replace function private.push_outbox_kick() returns trigger
language plpgsql security definer set search_path = '' as $$
begin perform private.kick_push(); return null; end $$;
create trigger push_outbox_kick after insert on private.push_outbox referencing new table as added for each statement execute function private.push_outbox_kick();

-- the Edge Function (service role) claims a batch with its devices, then reports what happened
create or replace function public.push_claim(p_limit int default 100) returns table (id bigint, account_id uuid, category text,
  title_ar text, body_ar text, title_en text, body_en text, data jsonb, collapse_key text, tokens jsonb)
language plpgsql security definer set search_path = '' as $$
begin
  return query
  with c as (
    select o.id from private.push_outbox o
    where (o.status = 'pending' or (o.status = 'sending' and o.claimed_at < now() - interval '5 minutes')) and o.attempts < 3
    order by o.id limit greatest(1, least(p_limit, 500)) for update skip locked),
  u as (
    update private.push_outbox o set status = 'sending', claimed_at = now(), attempts = o.attempts + 1 from c where o.id = c.id returning o.*)
  select u.id, u.account_id, u.category, u.title_ar, u.body_ar, u.title_en, u.body_en, u.data, u.collapse_key,
    (select coalesce(jsonb_agg(jsonb_build_object('token', t.token, 'platform', t.platform, 'lang', t.lang)), '[]'::jsonb)
       from public.user_push_tokens t where t.account_id = u.account_id)
  from u order by u.id;
end $$;

-- results: [{ id, status: sent|failed|skipped|pending, error, dead: [token…] }] — dead tokens (uninstalled apps) are deleted
create or replace function public.push_finish(p_results jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update private.push_outbox o set
    status = case when r.status in ('sent', 'failed', 'skipped', 'pending') then r.status else 'failed' end,
    sent_at = case when r.status = 'sent' then now() else o.sent_at end, last_error = left(r.error, 500)
  from jsonb_to_recordset(p_results) as r(id bigint, status text, error text) where o.id = r.id;
  delete from public.user_push_tokens where token in (select jsonb_array_elements_text(e -> 'dead') from jsonb_array_elements(p_results) e where jsonb_typeof(e -> 'dead') = 'array');
end $$;
revoke execute on function public.push_claim(int), public.push_finish(jsonb) from public, anon, authenticated;
grant execute on function public.push_claim(int), public.push_finish(jsonb) to service_role;

create or replace function private.push_housekeeping() returns void
language sql security definer set search_path = '' as $$
  update private.push_outbox set status = 'skipped', last_error = 'expired' where status in ('pending', 'sending') and created_at < now() - interval '24 hours';
  delete from private.push_outbox where created_at < now() - interval '7 days';
$$;
create extension if not exists pg_cron;
select cron.schedule('engspace-push-sweep', '* * * * *', $$ select private.kick_push() $$);
select cron.schedule('engspace-push-housekeeping', '23 3 * * *', $$ select private.push_housekeeping() $$);

revoke execute on function private.notif_category(text), private.notif_pref(text), private.disc_title(text, text), private.gov_name(text, text),
  private.master_on(uuid), private.pref_on(uuid, text), private.notification_push(), private.kick_push(), private.push_outbox_kick(),
  private.push_housekeeping() from public, anon, authenticated;
grant execute on function public.register_push_token(text, text, text), public.unregister_push_token(text), public.my_push_devices(),
  public.my_notification_prefs(), public.set_notification_prefs(jsonb) to authenticated;

-- the realtime ping carries the category and the English text too
create or replace function private.notification_ping() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.ping(new.account_id, 'notification', jsonb_build_object('id', new.id, 'kind', new.kind, 'category', new.category, 'title', new.title,
    'body', new.body, 'en', new.en, 'target', new.target, 'created_at', new.created_at));
  return null;
end $$;

-- ================================ producers ================================
-- one notice, unless the same member already has an unread one for the same thing within the window (a burst of replies or
-- messages is one notice, one push)
create or replace function private.notify_once(uid uuid, k text, tgt jsonb, t_ar text, b_ar text, t_en text, b_en text, win interval) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.notifications n where n.account_id = uid and n.kind = k and n.target = tgt and not n.read and n.created_at > now() - win) then return; end if;
  insert into public.notifications (account_id, kind, title, body, target, en) values (uid, k, t_ar, b_ar, tgt, jsonb_build_object('title', t_en, 'body', b_en));
end $$;
revoke execute on function private.notify_once(uuid, text, jsonb, text, text, text, text, interval) from public, anon, authenticated;

-- a member's years in the profession (null when the graduation year is unknown)
create or replace function private.member_years(grad int) returns int
language sql stable set search_path = '' as $$ select case when grad is null then null else greatest(0, extract(year from now())::int - grad) end $$;
revoke execute on function private.member_years(int) from public, anon, authenticated;

-- ---- a new job → the engineers it fits: same discipline, a fitting track, experience within a year of the job's range, and
-- the job's governorate (remote jobs fit everywhere). Not suspended, switched on, at most 3 job alerts a day, at most 1000 members.
create or replace function private.job_match_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare lo int := coalesce(lower(new.years), 0); hi int := case when new.years is null or upper_inf(new.years) then 99 else upper(new.years) - 1 end;
  co text := coalesce(nullif(new.author ->> 'companyName', ''), 'شركة'); co_en text := coalesce(nullif(new.author ->> 'companyName', ''), 'A company');
  d_ar text := coalesce(private.disc_title(new.disc, 'ar'), 'مهندس'); d_en text := coalesce(private.disc_title(new.disc, 'en'), 'engineer');
  g_ar text := coalesce(private.gov_name(new.gov, 'ar'), new.gov); g_en text := coalesce(private.gov_name(new.gov, 'en'), new.gov);
begin
  if new.hidden then return null; end if;
  insert into public.notifications (account_id, kind, title, body, target, en)
  select p.id, 'match', 'فرصة هندسية جديدة تناسب تخصصك: ' || new.title,
    co || ' تبحث عن ' || d_ar || ' في ' || g_ar || '. اضغط للاطلاع على التفاصيل والتقديم.',
    jsonb_build_object('type', 'job', 'id', new.id),
    jsonb_build_object('title', 'A new engineering opportunity for your discipline: ' || new.title,
      'body', co_en || ' is hiring a ' || d_en || ' in ' || g_en || '. Tap to see the details and apply.')
  from public.profiles p
  where p.role = 'engineer' and p.disc = new.disc
    and (new.sub is null or p.track = new.sub)
    and (p.gov = new.gov or new.mode = 'remote')
    and (new.years is null or private.member_years(p.grad_year) between lo - 1 and hi + 1)
    and p.id is distinct from auth.uid()
    and not (p.suspended_forever or coalesce(p.suspended_until > now(), false))
    and private.master_on(p.id) and private.pref_on(p.id, 'jobs')
    and (select count(*) from public.notifications n where n.account_id = p.id and n.kind = 'match' and n.created_at > now() - interval '1 day') < 3
  order by (p.city is not distinct from new.city) desc, p.created_at
  limit 1000;
  return null;
end $$;
revoke execute on function private.job_match_notify() from public, anon, authenticated;

-- ---- replies to a post or a comment, and @mentions. Never the replier's identity: «new reply», nothing more.
create or replace function private.comment_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); post_owner uuid; parent_owner uuid; snip text; h text; uid uuid; tgt jsonb := jsonb_build_object('type', 'post', 'id', new.post_id);
begin
  select a.account_id into post_owner from private.authorship a where a.kind = 'posts' and a.item_id = new.post_id;
  select left(regexp_replace(p.body, '\s+', ' ', 'g'), 80) into snip from public.posts p where p.id = new.post_id;
  if new.parent_id is not null then select a.account_id into parent_owner from private.authorship a where a.kind = 'comments' and a.item_id = new.parent_id; end if;
  if post_owner is not null and post_owner is distinct from me then
    perform private.notify_once(post_owner, 'reply', tgt, 'ردّ جديد على منشورك', coalesce(snip, ''), 'A new reply to your post', coalesce(snip, ''), interval '10 minutes');
  end if;
  if parent_owner is not null and parent_owner is distinct from me and parent_owner is distinct from post_owner then
    perform private.notify_once(parent_owner, 'reply', tgt, 'ردّ جديد على تعليقك', coalesce(snip, ''), 'A new reply to your comment', coalesce(snip, ''), interval '10 minutes');
  end if;
  for h in select distinct lower(m[1]) from regexp_matches(new.text, '@([0-9a-fA-F]{4,8})', 'g') m loop
    select p.id into uid from public.profiles p where p.anon = h;
    if uid is not null and uid is distinct from me and uid is distinct from post_owner and uid is distinct from parent_owner then
      perform private.notify_once(uid, 'mention', tgt, 'ذُكرت في نقاش', coalesce(snip, ''), 'You were mentioned in a discussion', coalesce(snip, ''), interval '10 minutes');
    end if;
  end loop;
  return null;
end $$;
create trigger comments_notify after insert on public.comments for each row execute function private.comment_notify();
revoke execute on function private.comment_notify() from public, anon, authenticated;

-- ---- direct messages (one notice per thread while the last one is unread) and messages from «فريق EngSpace»
create or replace function private.message_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare th private.threads; rcpt uuid; tgt jsonb;
begin
  select * into th from private.threads where id = new.thread_id;
  rcpt := case when new.sender = th.a then th.b else th.a end; tgt := jsonb_build_object('type', 'chat', 'id', th.id);
  if th.ctx ->> 'type' = 'team' and rcpt <> th.a then
    perform private.notify_once(rcpt, 'team', tgt, 'رسالة من فريق EngSpace', 'اضغط لقراءتها', 'A message from the EngSpace team', 'Tap to read it', interval '10 minutes');
  else
    perform private.notify_once(rcpt, 'message', tgt, 'رسالة خاصة جديدة', 'اضغط لفتح المحادثة', 'A new private message', 'Tap to open the conversation', interval '10 minutes');
  end if;
  return null;
end $$;
create trigger messages_notify after insert on private.messages for each row execute function private.message_notify();
revoke execute on function private.message_notify() from public, anon, authenticated;

-- ---- support: staff changing a ticket's status tells its owner (a reply already did)
create or replace function public.staff_set_ticket_status(p_ticket uuid, p_status public.ticket_status) returns void
language plpgsql security definer set search_path = '' as $$
declare t public.support_tickets; ar text; en text;
begin
  if not public.is_staff() then raise exception 'staff only' using errcode = '42501'; end if;
  select * into t from public.support_tickets where id = p_ticket;
  if t.id is null then raise exception 'no such ticket'; end if;
  update public.support_tickets set status = p_status, updated_at = now() where id = p_ticket;
  if t.status is distinct from p_status then
    ar := case p_status when 'open' then 'مفتوحة' when 'review' then 'قيد المراجعة' when 'answered' then 'تم الرد' else 'مغلقة' end;
    en := case p_status when 'open' then 'Open' when 'review' then 'Under review' when 'answered' then 'Answered' else 'Closed' end;
    insert into public.notifications (account_id, kind, title, body, target, en)
    values (t.account_id, 'support', 'تحديث على تذكرتك', t.subject || ' — ' || ar, jsonb_build_object('type', 'ticket', 'id', p_ticket),
      jsonb_build_object('title', 'An update on your ticket', 'body', t.subject || ' — ' || en));
  end if;
  perform private.audit('ticket', t.ref, jsonb_build_object('status', p_status));
end $$;

-- a reply from the team: English text for the center and the push (the notice itself is written by staff_reply_ticket)
create or replace function private.notifications_fill_en() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.en is null then
    new.en := case new.title
      when 'ردّ فريق الدعم على تذكرتك' then jsonb_build_object('title', 'The support team replied to your ticket', 'body', new.body)
      when 'تنبيه من الإدارة' then jsonb_build_object('title', 'A notice from the team', 'body', new.body)
      when 'تحذير من فريق المجتمع' then jsonb_build_object('title', 'A warning from the community team', 'body', new.body)
      when 'تم إيقاف حسابك مؤقتًا' then jsonb_build_object('title', 'Your account was suspended for a while', 'body', new.body)
      when 'نتيجة بلاغك' then jsonb_build_object('title', 'The result of your report', 'body', new.body)
      else null end;
  end if;
  return new;
end $$;
create trigger notifications_a_en before insert on public.notifications for each row execute function private.notifications_fill_en();
revoke execute on function private.notifications_fill_en() from public, anon, authenticated;

-- ---- salary: a new inflation month, and a salary cell reaching 5 reports
create or replace function private.inflation_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (account_id, kind, title, body, target, en)
  select p.id, 'inflation', 'تحديث التضخم: ' || new.yoy || '٪ سنويًا',
    'سجّل التضخم السنوي ' || new.yoy || '٪ لشهر ' || to_char(new.month, 'YYYY-MM') || ' — راجع أثره على راتبك في متتبع الزيادات.',
    jsonb_build_object('type', 'market'),
    jsonb_build_object('title', 'Inflation update: ' || new.yoy || '% a year',
      'body', 'Annual inflation was ' || new.yoy || '% in ' || to_char(new.month, 'YYYY-MM') || ' — see what it does to your pay in the raise tracker.')
  from public.profiles p
  where p.role = 'engineer' and private.master_on(p.id) and private.pref_on(p.id, 'salary')
    and not (p.suspended_forever or coalesce(p.suspended_until > now(), false));
  return null;
end $$;
create trigger inflation_notify after insert on public.inflation_rates for each row execute function private.inflation_notify();

create or replace function private.salary_cell_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  select count(*) into n from public.salary_shares s
  where not s.hidden and s.disc = new.disc and s.gov is not distinct from new.gov and abs(s.years - new.years) <= 2;
  if n <> 5 then return null; end if;
  insert into public.notifications (account_id, kind, title, body, target, en)
  select p.id, 'salary', 'أرقام السوق لتخصصك ومحافظتك أصبحت متاحة',
    'وصل عدد التقارير المشابهة لخبرتك إلى ' || n || ' — افتح الرواتب لترى النطاق الحيّ.', jsonb_build_object('type', 'market'),
    jsonb_build_object('title', 'Live market figures for your discipline and governorate are ready',
      'body', 'Reports like your experience reached ' || n || ' — open Salaries to see the live range.')
  from public.profiles p
  where p.role = 'engineer' and p.disc = new.disc and p.gov is not distinct from new.gov
    and abs(coalesce(private.member_years(p.grad_year), new.years) - new.years) <= 2
    and private.has_shared(p.id) and private.master_on(p.id) and private.pref_on(p.id, 'salary');
  return null;
end $$;
create trigger salary_cell_notify after insert on public.salary_shares for each row execute function private.salary_cell_notify();
revoke execute on function private.inflation_notify(), private.salary_cell_notify() from public, anon, authenticated;

-- ---- «send me a test»: proves the whole path (queue → function → device) to the member; one a minute
create or replace function public.send_test_push() returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if exists (select 1 from public.notifications n where n.account_id = me and n.kind = 'test' and n.created_at > now() - interval '1 minute') then
    raise exception 'wait a minute' using errcode = '54000';
  end if;
  insert into public.notifications (account_id, kind, title, body, target, en)
  values (me, 'test', 'إشعار تجريبي', 'وصلتك الإشعارات بنجاح', jsonb_build_object('type', 'notifications'),
    jsonb_build_object('title', 'Test notification', 'body', 'Notifications are working'));
end $$;
revoke execute on function public.send_test_push() from public, anon;
grant execute on function public.send_test_push() to authenticated;
