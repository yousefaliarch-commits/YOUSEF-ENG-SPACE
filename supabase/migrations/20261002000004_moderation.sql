-- EngSpace — reporting, moderation, audit log, admin console (mirrors src/domain/moderation.ts).
--  · Reports are anonymous: the author never learns who reported; moderators see only the reporter's trust level.
--  · Reports on one item form one case. Distinct reporters reaching the auto-hide threshold hide the item until a decision;
--    a dismissed case doubles that threshold for the item, so a brigade cannot hide it again.
--  · Decisions go to the audit log; every reporter hears the outcome. Staff work with mod_ref, never a name or e-mail.

create type public.report_status as enum ('open', 'accepted', 'dismissed');

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('R-' || upper(private.rand_hex(5))),
  kind text not null check (kind in ('post', 'comment', 'review', 'job', 'message', 'user')),
  item_id uuid not null,
  reason text not null check (char_length(reason) between 2 and 32),
  note text check (char_length(note) <= 1000),
  reporter uuid not null default auth.uid() references auth.users (id) on delete cascade,
  trust int not null default 0,
  status public.report_status not null default 'open',
  snapshot jsonb not null default '{}'::jsonb,  -- the text and author snapshot as they were at report time
  resolution jsonb,
  created_at timestamptz not null default now(),
  unique (reporter, kind, item_id)
);
create index reports_case on public.reports (kind, item_id, status);
create index reports_open on public.reports (created_at) where status = 'open';

-- whose item it is (resolved at filing time from private.authorship), and per-item moderation memory
create table private.report_targets (
  report_id uuid primary key references public.reports (id) on delete cascade,
  account_id uuid references auth.users (id) on delete set null
);
create table private.item_mod (
  kind text not null, item_id uuid not null,
  threshold_mult int not null default 1,
  primary key (kind, item_id)
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor text not null,          -- the staff member's mod_ref
  action text not null,
  target text,                  -- a case key "kind:item", a mod_ref or a request ref
  detail jsonb not null default '{}'::jsonb
);
create index audit_log_at on public.audit_log (at desc);

alter table public.reports enable row level security;
alter table public.audit_log enable row level security;
create policy "reports: reporter reads own" on public.reports for select to authenticated
  using (reporter = (select auth.uid()) or public.is_staff());
create policy "audit: staff read" on public.audit_log for select to authenticated using (public.is_staff());
revoke insert, update, delete on public.reports, public.audit_log from authenticated;

create or replace function private.my_ref() returns text
language sql stable security definer set search_path = '' as $$ select mod_ref from public.profiles where id = auth.uid() $$;

create or replace function private.audit(action text, target text, detail jsonb default '{}'::jsonb) returns void
language sql security definer set search_path = '' as $$
  insert into public.audit_log (actor, action, target, detail) values (coalesce(private.my_ref(), 'system'), action, target, coalesce(detail, '{}'::jsonb))
$$;

-- hide / show an item in its own table
create or replace function private.set_hidden(kind text, item uuid, h boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  case kind
    when 'post' then update public.posts set hidden = h where id = item;
    when 'comment' then update public.comments set hidden = h where id = item;
    when 'review' then update public.company_reviews set hidden = h where id = item;
    when 'job' then update public.jobs set hidden = h where id = item;
    when 'message' then update private.messages set hidden = h where id = item;
    else null;
  end case;
end $$;

-- the reported text + author snapshot, read on the server (a reporter cannot plant a fake snapshot)
create or replace function private.snapshot_of(kind text, item uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s jsonb;
begin
  case kind
    when 'post' then select jsonb_build_object('text', p.body, 'author', p.author, 'where', 'منشور في ' || p.room, 'link', jsonb_build_object('type', 'post', 'id', p.id)) into s from public.posts p where p.id = item;
    when 'comment' then select jsonb_build_object('text', c.text, 'author', c.author, 'where', 'رد على منشور', 'link', jsonb_build_object('type', 'post', 'id', c.post_id)) into s from public.comments c where c.id = item;
    when 'review' then select jsonb_build_object('text', r.text, 'author', r.author, 'where', 'تقييم شركة', 'link', jsonb_build_object('type', 'company', 'id', r.company_id)) into s from public.company_reviews r where r.id = item;
    when 'job' then select jsonb_build_object('text', j.title || E'\n' || j.descr, 'author', j.author, 'where', 'إعلان وظيفة', 'link', jsonb_build_object('type', 'job', 'id', j.id)) into s from public.jobs j where j.id = item;
    when 'message' then select jsonb_build_object('text', m.text, 'author', case when m.sender = th.a then th.a_snap else th.b_snap end, 'where', 'رسالة خاصة', 'link', null)
      into s from private.messages m join private.threads th on th.id = m.thread_id where m.id = item and private.in_thread(th.id);
    else s := null;
  end case;
  return s;
end $$;

-- File a report. Returns the report ref. The same member reporting the same item twice counts once.
create or replace function public.file_report(p_kind text, p_item uuid, p_reason text, p_note text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); snap jsonb; target uuid; rid uuid; rref text; distinct_open int; threshold int; tbl text;
begin
  if me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  -- a profile report names one of that member's items; the case is about the account
  tbl := private.item_table(p_kind);
  if p_kind = 'user' then
    select a.account_id into target from private.authorship a where a.item_id = p_item limit 1;
    snap := jsonb_build_object('text', null, 'sys', 'حساب عضو', 'author', (select private.author_snapshot(target, 'anon')), 'where', 'حساب عضو');
  else
    snap := private.snapshot_of(p_kind, p_item);
    select a.account_id into target from private.authorship a where a.kind = tbl and a.item_id = p_item;
  end if;
  if snap is null or target is null then raise exception 'nothing to report'; end if;
  if target = me then raise exception 'cannot report your own item'; end if;

  insert into public.reports (kind, item_id, reason, note, reporter, trust, snapshot)
  values (p_kind, p_item, p_reason, nullif(p_note, ''), me,
    (select least(3, p.level + case when p.verified then 1 else 0 end) from public.profiles p where p.id = me), snap)
  on conflict (reporter, kind, item_id) do update set reason = excluded.reason, note = excluded.note
  returning id, ref into rid, rref;
  insert into private.report_targets (report_id, account_id) values (rid, target) on conflict (report_id) do nothing;

  select count(distinct r.reporter) into distinct_open from public.reports r where r.kind = p_kind and r.item_id = p_item and r.status = 'open';
  select coalesce((select (c.value ->> 'autoHideAt')::int from public.app_config c where c.key = 'mod'), 3)
       * coalesce((select m.threshold_mult from private.item_mod m where m.kind = p_kind and m.item_id = p_item), 1) into threshold;
  if distinct_open >= threshold then perform private.set_hidden(p_kind, p_item, true); end if;
  return rref;
end $$;

-- The queue: one row per case. Open first, then most severe, most distinct reporters, oldest.
create or replace function public.mod_cases(p_status text default 'open')
returns table (kind text, item_id uuid, status text, reporters bigint, reasons text[], first_at timestamptz, last_at timestamptz,
  snapshot jsonb, account_ref text, account_strikes int, hidden boolean, reports jsonb)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'staff only' using errcode = '42501'; end if;
  return query
  select r.kind, r.item_id,
    case when bool_or(r.status = 'open') then 'open' else (array_agg(r.status::text order by r.created_at desc))[1] end,
    count(distinct r.reporter), array_agg(distinct r.reason), min(r.created_at), max(r.created_at),
    (array_agg(r.snapshot order by r.created_at))[1],
    max(p.mod_ref), max(p.strikes),
    coalesce(max(case r.kind when 'post' then (select po.hidden::int from public.posts po where po.id = r.item_id)
      when 'comment' then (select co.hidden::int from public.comments co where co.id = r.item_id)
      when 'review' then (select rv.hidden::int from public.company_reviews rv where rv.id = r.item_id)
      when 'job' then (select jb.hidden::int from public.jobs jb where jb.id = r.item_id)
      when 'message' then (select ms.hidden::int from private.messages ms where ms.id = r.item_id) end), 0) = 1,
    jsonb_agg(jsonb_build_object('ref', r.ref, 'reason', r.reason, 'note', r.note, 'trust', r.trust, 'at', r.created_at,
      'status', r.status, 'resolution', r.resolution) order by r.created_at)
  from public.reports r
  left join private.report_targets t on t.report_id = r.id
  left join public.profiles p on p.id = t.account_id
  group by r.kind, r.item_id
  having p_status = 'all' or (p_status = 'open') = bool_or(r.status = 'open')
  order by bool_or(r.status = 'open') desc, count(distinct r.reporter) desc, min(r.created_at);
end $$;

-- A decision on a case: accept (optionally hide / warn / suspend) or dismiss.
-- suspend_days: null = no suspension, 0 = permanent, n = n days. Every reporter hears the outcome.
create or replace function public.decide_case(p_kind text, p_item uuid, p_accept boolean, p_hide boolean default true,
  p_warn text default null, p_suspend_days int default null, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare target uuid; res jsonb; strike_limit int;
begin
  if not public.is_staff() then raise exception 'staff only' using errcode = '42501'; end if;
  select t.account_id into target from public.reports r join private.report_targets t on t.report_id = r.id
    where r.kind = p_kind and r.item_id = p_item limit 1;
  res := jsonb_build_object('accept', p_accept, 'hide', p_accept and p_hide, 'warn', p_warn, 'suspendDays', p_suspend_days,
    'note', p_note, 'by', private.my_ref(), 'at', now());
  update public.reports set status = case when p_accept then 'accepted'::public.report_status else 'dismissed'::public.report_status end,
    resolution = res where kind = p_kind and item_id = p_item and status = 'open';

  if p_accept then
    perform private.set_hidden(p_kind, p_item, p_hide);
    if target is not null then
      select coalesce((c.value ->> 'strikeLimit')::int, 3) into strike_limit from public.app_config c where c.key = 'mod';
      update public.profiles set strikes = strikes + 1,
        suspended_forever = suspended_forever or p_suspend_days = 0,
        suspended_until = case when p_suspend_days > 0 then greatest(coalesce(suspended_until, now()), now()) + make_interval(days => p_suspend_days) else suspended_until end
        where id = target;
      if p_warn is not null and p_warn <> '' then
        insert into public.notifications (account_id, kind, title, body) values (target, 'warn', 'تنبيه من الإدارة', p_warn);
      end if;
      if p_suspend_days is not null then
        insert into public.notifications (account_id, kind, title, body) values (target, 'suspend', 'تم إيقاف حسابك مؤقتًا',
          case when p_suspend_days = 0 then 'إيقاف دائم' else p_suspend_days || ' يوم' end);
      end if;
    end if;
  else
    -- dismissed: the item comes back, and the threshold for hiding it doubles
    perform private.set_hidden(p_kind, p_item, false);
    insert into private.item_mod (kind, item_id, threshold_mult) values (p_kind, p_item, 2)
      on conflict (kind, item_id) do update set threshold_mult = private.item_mod.threshold_mult * 2;
  end if;

  insert into public.notifications (account_id, kind, title, body)
  select distinct r.reporter, 'report', 'نتيجة بلاغك', case when p_accept then 'تم اتخاذ إجراء بخصوص ما أبلغت عنه. شكرًا لك.' else 'راجعنا بلاغك ولم نجد مخالفة.' end
  from public.reports r where r.kind = p_kind and r.item_id = p_item and r.resolution = res;

  perform private.audit(case when p_accept then 'accept' else 'dismiss' end, p_kind || ':' || p_item, res);
end $$;

create or replace function public.reopen_case(p_kind text, p_item uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'staff only' using errcode = '42501'; end if;
  update public.reports set status = 'open', resolution = null where kind = p_kind and item_id = p_item;
  perform private.audit('reopen', p_kind || ':' || p_item);
end $$;

-- ================================ admin console ================================
-- The account directory: no names, no full e-mail — mod_ref, masked e-mail, role, discipline, governorate, standing.
create or replace function public.admin_accounts(p_search text default null, p_limit int default 200)
returns table (mod_ref text, email_masked text, role public.member_role, staff public.staff_role, disc text, gov text,
  verified boolean, strikes int, suspended_until timestamptz, suspended_forever boolean, contributions int, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'staff only' using errcode = '42501'; end if;
  return query
  select p.mod_ref, left(u.email, 2) || '•••@' || split_part(u.email, '@', 2), p.role, p.staff, p.disc, p.gov, p.verified,
    p.strikes, p.suspended_until, p.suspended_forever, p.contributions, p.created_at
  from public.profiles p join auth.users u on u.id = p.id
  where p_search is null or p.mod_ref ilike '%' || p_search || '%' or p.disc ilike p_search or p.gov ilike p_search
  order by p.created_at desc limit least(p_limit, 1000);
end $$;

create or replace function private.id_of_ref(ref text) returns uuid
language sql stable security definer set search_path = '' as $$ select id from public.profiles where mod_ref = ref $$;

-- admins only: staff roles (an admin cannot demote the last admin)
create or replace function public.admin_set_staff(p_ref text, p_staff public.staff_role) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  if p_staff <> 'admin' and (select staff from public.profiles where mod_ref = p_ref) = 'admin'
     and (select count(*) from public.profiles where staff = 'admin') <= 1 then
    raise exception 'cannot remove the last admin';
  end if;
  update public.profiles set staff = p_staff where mod_ref = p_ref;
  perform private.audit('staff', p_ref, jsonb_build_object('staff', p_staff));
end $$;

-- member role (Engineer · HR · Owner · Field staff), verification badge, suspension — staff
create or replace function public.admin_set_account(p_ref text, p_role public.member_role default null, p_verified boolean default null,
  p_suspend_days int default null, p_lift boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'staff only' using errcode = '42501'; end if;
  update public.profiles set
    role = coalesce(p_role, role),
    verified = coalesce(p_verified, verified),
    verify_kind = case when p_verified is false then null else verify_kind end,
    suspended_forever = case when p_lift then false when p_suspend_days = 0 then true else suspended_forever end,
    suspended_until = case when p_lift then null when p_suspend_days > 0 then now() + make_interval(days => p_suspend_days) else suspended_until end,
    strikes = case when p_lift then 0 else strikes end
  where mod_ref = p_ref;
  perform private.audit('account', p_ref, jsonb_strip_nulls(jsonb_build_object('role', p_role, 'verified', p_verified, 'suspendDays', p_suspend_days, 'lift', nullif(p_lift, false))));
end $$;

-- moderation settings, the system-wide announcement and closed rooms — admins
create or replace function public.admin_set_config(p_patch jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb;
begin
  if not public.is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  update public.app_config set value = value || p_patch, updated_at = now() where key = 'mod' returning value into v;
  perform private.audit('config', 'mod', p_patch);
  return v;
end $$;

-- live analytics for the dashboard
create or replace function public.admin_analytics(p_days int default 30) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare since timestamptz := now() - make_interval(days => p_days);
begin
  if not public.is_staff() then raise exception 'staff only' using errcode = '42501'; end if;
  return jsonb_build_object(
    'members', (select count(*) from public.profiles),
    'newMembers', (select count(*) from public.profiles where created_at >= since),
    'activeMembers', (select count(distinct account_id) from private.authorship a
       where (a.kind = 'posts' and exists (select 1 from public.posts p where p.id = a.item_id and p.created_at >= since))
          or (a.kind = 'comments' and exists (select 1 from public.comments c where c.id = a.item_id and c.created_at >= since))),
    'byRole', (select coalesce(jsonb_object_agg(role, n), '{}'::jsonb) from (select role, count(*) n from public.profiles group by role) t),
    'verified', (select count(*) from public.profiles where verified),
    'posts', (select count(*) from public.posts where created_at >= since),
    'comments', (select count(*) from public.comments where created_at >= since),
    'salaryShares', (select count(*) from public.salary_shares where created_at >= since),
    'reviews', (select count(*) from public.company_reviews where created_at >= since),
    'jobs', (select count(*) from public.jobs where created_at >= since),
    'jobContacts', (select count(*) from public.job_contacts where at >= since),
    'openCases', (select count(distinct (kind, item_id)) from public.reports where status = 'open'),
    'pendingVerifications', (select count(*) from public.verification_requests where status = 'pending'),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'posts', (select count(*) from public.posts p where p.created_at::date = d::date),
       'members', (select count(*) from public.profiles p where p.created_at::date = d::date)) order by d), '[]'::jsonb)
       from generate_series(since::date, now()::date, interval '1 day') d),
    'trendingDiscs', (select coalesce(jsonb_object_agg(disc, n), '{}'::jsonb) from (select coalesce(author ->> 'disc', 'other') disc, count(*) n from public.posts where created_at >= since group by 1) t),
    'salaryByDisc', (select coalesce(jsonb_object_agg(disc, jsonb_build_object('n', n, 'median', med)), '{}'::jsonb) from
       (select disc, count(*) n, percentile_cont(0.5) within group (order by salary)::int med from public.salary_shares where not hidden group by disc) t)
  );
end $$;

-- Deleting an account deletes what it wrote, everywhere: a public item carries the member's name, and an anonymous one is
-- still theirs. (Replaces the core version, which only removed the account; defined here because it needs every table.)
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  delete from public.posts where id in (select item_id from private.authorship where account_id = me and kind = 'posts');
  delete from public.comments where id in (select item_id from private.authorship where account_id = me and kind = 'comments');
  delete from public.company_reviews where id in (select item_id from private.authorship where account_id = me and kind = 'company_reviews');
  delete from public.salary_shares where id in (select item_id from private.authorship where account_id = me and kind = 'salary_shares');
  delete from public.jobs where id in (select item_id from private.authorship where account_id = me and kind = 'jobs');
  delete from auth.users where id = me; -- profile, authorship, threads, messages, reactions, ballots, requests cascade
end $$;

grant execute on function public.file_report(text, uuid, text, text), public.mod_cases(text), public.decide_case(text, uuid, boolean, boolean, text, int, text),
  public.reopen_case(text, uuid), public.admin_accounts(text, int), public.admin_set_staff(text, public.staff_role),
  public.admin_set_account(text, public.member_role, boolean, int, boolean), public.admin_set_config(jsonb), public.admin_analytics(int),
  public.delete_my_account() to authenticated;
