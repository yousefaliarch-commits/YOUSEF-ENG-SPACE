-- EngSpace — private messages.
-- Threads live in the private schema and are reached only through the functions below, so neither side ever receives the
-- other's account id: a member's public and anonymous identities cannot be linked through the threads they open.
-- Each side's identity in a thread is fixed by its first message (the two identities never meet).

create table private.threads (
  id uuid primary key default gen_random_uuid(),
  a uuid not null references auth.users (id) on delete cascade, -- the member who opened it
  b uuid not null references auth.users (id) on delete cascade,
  a_mode public.author_mode not null,
  b_mode public.author_mode not null,
  a_snap jsonb not null,
  b_snap jsonb not null,
  ctx jsonb not null default '{}'::jsonb,   -- { type, id, label } — where the conversation started
  rule text not null default '',             -- why it was allowed (the relationship rule)
  a_read_at timestamptz not null default now(),
  b_read_at timestamptz not null default 'epoch',
  last_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (a <> b)
);
create index threads_a on private.threads (a, last_at desc);
create index threads_b on private.threads (b, last_at desc);

create table private.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references private.threads (id) on delete cascade,
  sender uuid not null references auth.users (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 4000),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index messages_thread on private.messages (thread_id, created_at);

-- the authored tables a conversation can start from
create or replace function private.item_table(kind text) returns text
language sql immutable set search_path = '' as $$
  select case kind when 'post' then 'posts' when 'posts' then 'posts' when 'comment' then 'comments' when 'comments' then 'comments'
    when 'review' then 'company_reviews' when 'company_reviews' then 'company_reviews' when 'job' then 'jobs' when 'jobs' then 'jobs'
    when 'message' then 'messages' when 'messages' then 'messages' when 'salary' then 'salary_shares' end
$$;

-- Open (or reuse) a thread with the author of an item, as `me_as`. Returns the thread id.
create or replace function public.start_thread(target_kind text, target_id uuid, me_as public.author_mode, ctx jsonb default '{}'::jsonb, rule text default '')
returns uuid
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); other uuid; other_mode public.author_mode; t uuid;
begin
  if me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if not private.can_act(me) then raise exception 'account cannot message right now' using errcode = '42501'; end if;
  select a.account_id, a.mode into other, other_mode from private.authorship a
    where a.kind = private.item_table(target_kind) and a.item_id = target_id;
  if other is null then raise exception 'no such author'; end if;
  if other = me then raise exception 'cannot message yourself'; end if;
  if not coalesce((select (p.settings ->> 'dm')::boolean from public.profiles p where p.id = other), true) then
    raise exception 'member does not accept messages' using errcode = '42501';
  end if;
  select th.id into t from private.threads th
    where ((th.a = me and th.b = other and th.a_mode = me_as and th.b_mode = other_mode)
        or (th.b = me and th.a = other and th.b_mode = me_as and th.a_mode = other_mode))
    limit 1;
  if t is null then
    insert into private.threads (a, b, a_mode, b_mode, a_snap, b_snap, ctx, rule)
    values (me, other, me_as, other_mode, private.author_snapshot(me, me_as), private.author_snapshot(other, other_mode), coalesce(ctx, '{}'::jsonb), coalesce(rule, ''))
    returning id into t;
  end if;
  return t;
end $$;

-- My threads, each with the other side's snapshot only
create or replace function public.my_threads()
returns table (id uuid, with_author jsonb, me_as public.author_mode, ctx jsonb, rule text, unread bigint, last_at timestamptz, last_text text)
language sql stable security definer set search_path = '' as $$
  select th.id,
    case when th.a = auth.uid() then th.b_snap else th.a_snap end,
    case when th.a = auth.uid() then th.a_mode else th.b_mode end,
    th.ctx, th.rule,
    (select count(*) from private.messages m where m.thread_id = th.id and m.sender <> auth.uid() and not m.hidden
       and m.created_at > case when th.a = auth.uid() then th.a_read_at else th.b_read_at end),
    th.last_at,
    (select m.text from private.messages m where m.thread_id = th.id and not m.hidden order by m.created_at desc limit 1)
  from private.threads th
  where auth.uid() in (th.a, th.b)
  order by th.last_at desc
$$;

create or replace function private.in_thread(t uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.threads th where th.id = t and auth.uid() in (th.a, th.b))
$$;

create or replace function public.thread_messages(t uuid)
returns table (id uuid, from_me boolean, text text, at timestamptz)
language sql stable security definer set search_path = '' as $$
  select m.id, m.sender = auth.uid(), m.text, m.created_at from private.messages m
  where m.thread_id = t and private.in_thread(t) and (not m.hidden or m.sender = auth.uid())
  order by m.created_at
$$;

create or replace function public.send_message(t uuid, body text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); mid uuid; th private.threads;
begin
  select * into th from private.threads where id = t;
  if th.id is null or me not in (th.a, th.b) then raise exception 'not your thread' using errcode = '42501'; end if;
  if not private.can_act(me) then raise exception 'account cannot message right now' using errcode = '42501'; end if;
  insert into private.messages (thread_id, sender, text) values (t, me, body) returning id into mid;
  insert into private.authorship (kind, item_id, account_id, mode) values ('messages', mid, me, case when me = th.a then th.a_mode else th.b_mode end);
  update private.threads set last_at = now(),
    a_read_at = case when me = a then now() else a_read_at end,
    b_read_at = case when me = b then now() else b_read_at end where id = t;
  return mid;
end $$;

create or replace function public.mark_thread_read(t uuid) returns void
language sql security definer set search_path = '' as $$
  update private.threads set
    a_read_at = case when a = auth.uid() then now() else a_read_at end,
    b_read_at = case when b = auth.uid() then now() else b_read_at end
  where id = t and auth.uid() in (a, b)
$$;

-- My identity may change only before my first message
create or replace function public.set_thread_identity(t uuid, me_as public.author_mode) returns void
language plpgsql security definer set search_path = '' as $$
declare th private.threads;
begin
  select * into th from private.threads where id = t;
  if th.id is null or auth.uid() not in (th.a, th.b) then raise exception 'not your thread' using errcode = '42501'; end if;
  if exists (select 1 from private.messages m where m.thread_id = t and m.sender = auth.uid()) then
    raise exception 'identity is fixed after your first message';
  end if;
  if auth.uid() = th.a then update private.threads set a_mode = me_as, a_snap = private.author_snapshot(th.a, me_as) where id = t;
  else update private.threads set b_mode = me_as, b_snap = private.author_snapshot(th.b, me_as) where id = t; end if;
end $$;

grant execute on function public.start_thread(text, uuid, public.author_mode, jsonb, text), public.my_threads(),
  public.thread_messages(uuid), public.send_message(uuid, text), public.mark_thread_read(uuid),
  public.set_thread_identity(uuid, public.author_mode) to authenticated;
