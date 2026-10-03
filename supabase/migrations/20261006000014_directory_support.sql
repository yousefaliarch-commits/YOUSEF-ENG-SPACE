-- EngSpace — admin member directory, team messages, and support tickets.
--
-- The member directory (admins only) shows who each member is: name, e-mail, phone, role, level, place, join date, sign-in
-- methods, the verification audit (status, kind, division, decision date, reviewer — never the documents, which are
-- deleted at the decision) and activity on PUBLIC items. Anonymity is kept: the directory is keyed by the member's public
-- id (pid — already on their public items) and never shows the moderation reference (mod_ref) that anonymous reports carry,
-- nor moderation state; and the moderation list keyed by mod_ref no longer carries the details that would let the two lists
-- be matched (e-mail, place, discipline, join date, contribution count). Directory actions are audited by pid.
--
-- Team messages: an admin writes to a member as «فريق EngSpace» inside the normal Messages system (the member never sees
-- which admin wrote). Support tickets: members open tickets (category, subject, message, optional image in a private
-- bucket), follow their status (open · in review · answered · closed) and reply; staff see every ticket, reply and set the
-- status; the member is notified of each staff reply.

-- ================================ the moderation list: only what moderation needs ================================
drop function if exists public.admin_accounts(text, int);
create or replace function public.admin_accounts(p_search text default null, p_limit int default 200)
returns table (mod_ref text, role public.member_role, staff public.staff_role, verified boolean, strikes int,
  suspended_until timestamptz, suspended_forever boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'staff only' using errcode = '42501'; end if;
  return query
  select p.mod_ref, p.role, p.staff, p.verified, p.strikes, p.suspended_until, p.suspended_forever
  from public.profiles p
  where p_search is null or p.mod_ref ilike '%' || p_search || '%'
  order by p.mod_ref limit least(p_limit, 1000);
end $$;

-- ================================ the member directory (admins) ================================
create or replace function public.admin_directory(p_search text default null, p_limit int default 300)
returns table (pid text, name text, email text, phone text, gender text, age int, grad_year int, role public.member_role,
  staff public.staff_role, disc text, track text, pos text, gov text, city text, company_name text, onboarded boolean,
  created_at timestamptz, last_sign_in_at timestamptz, sign_in text, verified boolean, verify_kind text, division text,
  verification jsonb, public_posts int, public_comments int, public_reviews int)
language plpgsql stable security definer set search_path = '' as $$
declare q text := nullif(trim(p_search), '');
begin
  if not public.is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  return query
  select p.pid, p.name, u.email::text, u.phone::text, p.gender, p.age, p.grad_year, p.role, p.staff, p.disc, p.track, p.pos,
    p.gov, p.city, p.company_name, p.onboarded, p.created_at, u.last_sign_in_at,
    coalesce((select string_agg(distinct i.provider, ' + ') from auth.identities i where i.user_id = u.id), 'email'),
    p.verified, p.verify_kind, p.division,
    -- the audit record of the latest request: what was decided, when and by whom — the documents themselves are gone
    (select jsonb_build_object('ref', v.ref, 'status', v.status, 'kinds', v.kinds, 'submitted_at', v.created_at, 'decided_at', v.decided_at,
        'kind', v.decision ->> 'kind', 'division', v.decision ->> 'division', 'reason', v.decision ->> 'reason',
        'reviewer', (select r.name from public.profiles r where r.mod_ref = v.decision ->> 'by'), 'documents_deleted_at', v.purged_at)
       from public.verification_requests v where v.account_id = p.id order by v.created_at desc limit 1),
    (select count(*)::int from private.authorship a where a.account_id = p.id and a.kind = 'posts' and a.mode = 'public'),
    (select count(*)::int from private.authorship a where a.account_id = p.id and a.kind = 'comments' and a.mode = 'public'),
    (select count(*)::int from private.authorship a where a.account_id = p.id and a.kind = 'company_reviews' and a.mode = 'public')
  from public.profiles p join auth.users u on u.id = p.id
  where q is null or p.name ilike '%' || q || '%' or u.email ilike '%' || q || '%' or p.pid = q or u.phone ilike '%' || q || '%'
  order by p.created_at desc limit least(p_limit, 2000);
end $$;

-- a member's public posts (what they chose to sign with their name), for the directory's detail sheet
create or replace function public.admin_public_items(p_pid text)
returns table (kind text, id uuid, text text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := (select p.id from public.profiles p where p.pid = p_pid);
begin
  if not public.is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  return query
  select 'post'::text, x.id, x.body, x.created_at from public.posts x join private.authorship a on a.kind = 'posts' and a.item_id = x.id
   where a.account_id = uid and a.mode = 'public'
  union all
  select 'comment'::text, x.id, x.text, x.created_at from public.comments x join private.authorship a on a.kind = 'comments' and a.item_id = x.id
   where a.account_id = uid and a.mode = 'public'
  order by 4 desc limit 100;
end $$;

-- staff role from the directory (audited by pid, so the audit log never pairs a name with a moderation reference)
create or replace function public.admin_directory_set_staff(p_pid text, p_staff public.staff_role) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  if p_staff <> 'admin' and (select staff from public.profiles where pid = p_pid) = 'admin'
     and (select count(*) from public.profiles where staff = 'admin') <= 1 then
    raise exception 'cannot remove the last admin';
  end if;
  update public.profiles set staff = p_staff where pid = p_pid;
  if not found then raise exception 'no such member'; end if;
  perform private.audit('staff', p_pid, jsonb_build_object('staff', p_staff, 'via', 'directory'));
end $$;

-- ================================ team messages ================================
-- the admin side of a team thread: the platform, not the person
create or replace function private.team_snapshot() returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('as', 'public', 'pid', 'team', 'name', 'فريق EngSpace', 'team', true, 'userRole', 'staff', 'verified', true, 'dm', true)
$$;

-- an admin writes to a member as «فريق EngSpace»; returns the thread (reused if this admin already has one with the member)
create or replace function public.admin_message(p_pid text, p_text text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); other uuid := (select id from public.profiles where pid = p_pid); t uuid;
begin
  if not public.is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  if other is null then raise exception 'no such member'; end if;
  if other = me then raise exception 'cannot message yourself'; end if;
  if char_length(coalesce(trim(p_text), '')) = 0 then raise exception 'empty message'; end if;
  select th.id into t from private.threads th where th.a = me and th.b = other and th.ctx ->> 'type' = 'team' limit 1;
  if t is null then
    insert into private.threads (a, b, a_mode, b_mode, a_snap, b_snap, ctx, rule)
    values (me, other, 'public', 'public', private.team_snapshot(), private.author_snapshot(other, 'public'),
            jsonb_build_object('type', 'team', 'label', 'رسالة من فريق EngSpace'), 'team')
    returning id into t;
  end if;
  perform public.send_message(t, p_text);
  perform private.audit('message', p_pid, '{}'::jsonb);
  return t;
end $$;

-- ================================ support tickets ================================
create type public.ticket_status as enum ('open', 'review', 'answered', 'closed');

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('T-' || upper(private.rand_hex(6))),
  account_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category text not null check (category in ('account', 'salary', 'technical', 'verification', 'other')),
  subject text not null check (char_length(subject) between 3 and 120),
  status public.ticket_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index support_tickets_mine on public.support_tickets (account_id, updated_at desc);
create index support_tickets_queue on public.support_tickets (status, updated_at desc);

create table public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  from_staff boolean not null default false,
  body text not null check (char_length(body) between 1 and 4000),
  attachment text check (attachment is null or char_length(attachment) <= 300),
  created_at timestamptz not null default now()
);
create index ticket_messages_ticket on public.ticket_messages (ticket_id, created_at);

alter table public.support_tickets enable row level security;
alter table public.ticket_messages enable row level security;
revoke all on public.support_tickets, public.ticket_messages from anon, authenticated;
grant select on public.support_tickets, public.ticket_messages to authenticated;

create policy "tickets: own or staff" on public.support_tickets for select to authenticated
  using (account_id = (select auth.uid()) or public.is_staff());
create policy "ticket messages: own or staff" on public.ticket_messages for select to authenticated
  using (exists (select 1 from public.support_tickets t where t.id = ticket_id and (t.account_id = (select auth.uid()) or public.is_staff())));

-- a member opens a ticket with its first message (optional image already uploaded to their own folder)
create or replace function public.open_ticket(p_category text, p_subject text, p_body text, p_attachment text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); t uuid;
begin
  if me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if p_attachment is not null and split_part(p_attachment, '/', 1) <> me::text then raise exception 'not your file' using errcode = '42501'; end if;
  if (select count(*) from public.support_tickets where account_id = me and created_at > now() - interval '1 day') >= 5 then
    raise exception 'ticket limit reached' using errcode = '42501';
  end if;
  insert into public.support_tickets (account_id, category, subject) values (me, p_category, trim(p_subject)) returning id into t;
  insert into public.ticket_messages (ticket_id, body, attachment) values (t, trim(p_body), p_attachment);
  return t;
end $$;

-- the member adds to their ticket (re-opens it if it was answered); a closed ticket takes no more messages
create or replace function public.reply_ticket(p_ticket uuid, p_body text, p_attachment text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); t public.support_tickets;
begin
  select * into t from public.support_tickets where id = p_ticket;
  if t.id is null or t.account_id <> me then raise exception 'not your ticket' using errcode = '42501'; end if;
  if t.status = 'closed' then raise exception 'ticket closed' using errcode = '42501'; end if;
  if p_attachment is not null and split_part(p_attachment, '/', 1) <> me::text then raise exception 'not your file' using errcode = '42501'; end if;
  insert into public.ticket_messages (ticket_id, body, attachment) values (p_ticket, trim(p_body), p_attachment);
  update public.support_tickets set status = 'open', updated_at = now() where id = p_ticket;
end $$;

create or replace function public.close_my_ticket(p_ticket uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.support_tickets set status = 'closed', updated_at = now() where id = p_ticket and account_id = auth.uid();
  if not found then raise exception 'not your ticket' using errcode = '42501'; end if;
end $$;

-- staff: every ticket with the member's identity (support is a private exchange with the account, not anonymous content)
create or replace function public.staff_tickets(p_status public.ticket_status default null)
returns table (id uuid, ref text, category text, subject text, status public.ticket_status, created_at timestamptz, updated_at timestamptz,
  member_name text, member_pid text, member_email text, messages int, last_from_staff boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'staff only' using errcode = '42501'; end if;
  return query
  select t.id, t.ref, t.category, t.subject, t.status, t.created_at, t.updated_at, p.name, p.pid,
    case when public.is_admin() then u.email::text else left(split_part(u.email, '@', 1), 2) || '•••@' || split_part(u.email, '@', 2) end,
    (select count(*)::int from public.ticket_messages m where m.ticket_id = t.id),
    (select m.from_staff from public.ticket_messages m where m.ticket_id = t.id order by m.created_at desc limit 1)
  from public.support_tickets t join public.profiles p on p.id = t.account_id join auth.users u on u.id = t.account_id
  where p_status is null or t.status = p_status
  order by case t.status when 'open' then 0 when 'review' then 1 when 'answered' then 2 else 3 end, t.updated_at desc limit 500;
end $$;

-- staff reply: the member is notified; the status becomes «answered» unless another one is given
create or replace function public.staff_reply_ticket(p_ticket uuid, p_body text, p_status public.ticket_status default 'answered') returns void
language plpgsql security definer set search_path = '' as $$
declare t public.support_tickets;
begin
  if not public.is_staff() then raise exception 'staff only' using errcode = '42501'; end if;
  select * into t from public.support_tickets where id = p_ticket;
  if t.id is null then raise exception 'no such ticket'; end if;
  insert into public.ticket_messages (ticket_id, from_staff, body) values (p_ticket, true, trim(p_body));
  update public.support_tickets set status = coalesce(p_status, 'answered'), updated_at = now() where id = p_ticket;
  insert into public.notifications (account_id, kind, title, body, target)
  values (t.account_id, 'support', 'ردّ فريق الدعم على تذكرتك', t.subject, jsonb_build_object('type', 'ticket', 'id', p_ticket));
  perform private.audit('ticket', t.ref, jsonb_build_object('status', coalesce(p_status, 'answered')));
end $$;

create or replace function public.staff_set_ticket_status(p_ticket uuid, p_status public.ticket_status) returns void
language plpgsql security definer set search_path = '' as $$
declare r text;
begin
  if not public.is_staff() then raise exception 'staff only' using errcode = '42501'; end if;
  update public.support_tickets set status = p_status, updated_at = now() where id = p_ticket returning ref into r;
  if r is null then raise exception 'no such ticket'; end if;
  perform private.audit('ticket', r, jsonb_build_object('status', p_status));
end $$;

-- attachments: a private bucket, images only, each member's own folder; staff read them to answer
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('support', 'support', false, 3145728, array['image/jpeg', 'image/png'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
create policy "support files: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'support' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "support files: read own or staff" on storage.objects for select to authenticated
  using (bucket_id = 'support' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_staff()));

revoke execute on function private.team_snapshot() from public, anon, authenticated;
revoke execute on function public.admin_accounts(text, int), public.admin_directory(text, int), public.admin_public_items(text),
  public.admin_directory_set_staff(text, public.staff_role), public.admin_message(text, text), public.open_ticket(text, text, text, text),
  public.reply_ticket(uuid, text, text), public.close_my_ticket(uuid), public.staff_tickets(public.ticket_status),
  public.staff_reply_ticket(uuid, text, public.ticket_status), public.staff_set_ticket_status(uuid, public.ticket_status) from public, anon;
grant execute on function public.admin_accounts(text, int), public.admin_directory(text, int), public.admin_public_items(text),
  public.admin_directory_set_staff(text, public.staff_role), public.admin_message(text, text), public.open_ticket(text, text, text, text),
  public.reply_ticket(uuid, text, text), public.close_my_ticket(uuid), public.staff_tickets(public.ticket_status),
  public.staff_reply_ticket(uuid, text, public.ticket_status), public.staff_set_ticket_status(uuid, public.ticket_status) to authenticated;
