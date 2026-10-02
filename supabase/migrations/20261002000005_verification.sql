-- EngSpace — optional verification (engineers and site supervisors only), reviewed 100 % by hand.
-- The document images exist only while the request waits for review: on approve / reject / withdraw they are deleted, and a
-- request left unreviewed for 7 days expires and its images are deleted too. The record keeps only the decision.
--
-- Postgres cannot delete Storage objects itself (Storage blocks direct SQL deletes), so deletion happens through the Storage API:
--  · decide / withdraw return the paths and the app deletes them at once (the reviewer's or the member's own session);
--  · the `purge-verification` Edge Function (scheduled hourly, service role) sweeps every object whose request is no longer
--    pending and every object older than 7 days — a safety net if a client never finished.

create type public.verify_status as enum ('pending', 'approved', 'rejected', 'withdrawn', 'expired');

create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('V-' || upper(private.rand_hex(6))),
  account_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kinds text[] not null,                 -- card · cert · letter
  doc_paths text[] not null default '{}', -- objects in the verification bucket: <account id>/<file>; emptied at the decision
  -- what the reviewer compares the documents against (copied from the profile at submission)
  name text not null, gender text, role public.member_role not null, disc text, grad_year int, gov text,
  status public.verify_status not null default 'pending',
  decision jsonb,                        -- { reason, division, kind, by }
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  purged_at timestamptz
);
create unique index verification_one_pending on public.verification_requests (account_id) where status = 'pending';
create index verification_queue on public.verification_requests (created_at) where status = 'pending';

alter table public.verification_requests enable row level security;
create policy "verification: own or staff read" on public.verification_requests for select to authenticated
  using (account_id = (select auth.uid()) or public.is_staff());
revoke insert, update, delete on public.verification_requests from authenticated;

create or replace function public.verify_ttl_days() returns int language sql immutable as $$ select 7 $$;

-- submit: documents already uploaded to <my id>/… in the verification bucket
create or replace function public.submit_verification(p_kinds text[], p_paths text[]) returns text
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); p public.profiles; r text; path text;
begin
  select * into p from public.profiles where id = me;
  if p.id is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if p.role not in ('engineer', 'supervisor') then raise exception 'employer accounts are not verified' using errcode = '42501'; end if;
  if coalesce(array_length(p_paths, 1), 0) = 0 or array_length(p_paths, 1) > 4 then raise exception 'one to four documents'; end if;
  foreach path in array p_paths loop
    if split_part(path, '/', 1) <> me::text or path like '%..%' then raise exception 'document outside your folder' using errcode = '42501'; end if;
  end loop;
  insert into public.verification_requests (account_id, kinds, doc_paths, name, gender, role, disc, grad_year, gov)
  values (me, p_kinds, p_paths, p.name, p.gender, p.role, p.disc, p.grad_year, p.gov) returning ref into r;
  return r;
end $$;

-- the reviewer's decision; returns the document paths for the app to delete right away
create or replace function public.decide_verification(p_ref text, p_approve boolean, p_reason text default null,
  p_division text default null, p_kind text default null) returns text[]
language plpgsql security definer set search_path = '' as $$
declare req public.verification_requests;
begin
  if not public.is_staff() then raise exception 'staff only' using errcode = '42501'; end if;
  select * into req from public.verification_requests where ref = p_ref and status = 'pending' for update;
  if req.id is null then raise exception 'no pending request %', p_ref; end if;
  update public.verification_requests set status = case when p_approve then 'approved'::public.verify_status else 'rejected'::public.verify_status end,
    decision = jsonb_strip_nulls(jsonb_build_object('reason', p_reason, 'division', p_division, 'kind', p_kind, 'by', private.my_ref())),
    decided_at = now(), doc_paths = '{}', purged_at = now()
  where id = req.id;
  if p_approve then
    update public.profiles set verified = true, verify_kind = coalesce(p_kind, case when 'card' = any(req.kinds) then 'syndicate' else 'certificate' end),
      division = p_division where id = req.account_id;
  end if;
  insert into public.notifications (account_id, kind, title, body) values (req.account_id, 'verify',
    case when p_approve then 'تم توثيق حسابك' else 'لم يتم توثيق حسابك' end, coalesce(p_reason, ''));
  perform private.audit(case when p_approve then 'verify-approve' else 'verify-reject' end, p_ref, jsonb_strip_nulls(jsonb_build_object('reason', p_reason)));
  return req.doc_paths;
end $$;

create or replace function public.withdraw_verification() returns text[]
language plpgsql security definer set search_path = '' as $$
declare paths text[];
begin
  update public.verification_requests v set status = 'withdrawn', decided_at = now(), purged_at = now(), doc_paths = '{}'
    from (select id, doc_paths from public.verification_requests where account_id = auth.uid() and status = 'pending' for update) old
    where v.id = old.id returning old.doc_paths into paths;
  return coalesce(paths, '{}');
end $$;

-- unreviewed for 7 days → expired (the sweep deletes the files); run hourly by pg_cron
create or replace function private.expire_verifications() returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  with x as (
    update public.verification_requests set status = 'expired', decided_at = now(), purged_at = now(), doc_paths = '{}'
    where status = 'pending' and created_at < now() - make_interval(days => public.verify_ttl_days()) returning account_id, ref)
  insert into public.notifications (account_id, kind, title, body)
  select account_id, 'verify', 'انتهت مهلة طلب التوثيق', 'تم حذف المستندات. يمكنك التقديم مرة أخرى.' from x;
  get diagnostics n = row_count;
  return n;
end $$;

-- the sweep calls this first, so expiry never waits for the cron tick
create or replace function public.expire_verifications_now() returns int
language sql security definer set search_path = '' as $$ select private.expire_verifications() $$;
revoke execute on function public.expire_verifications_now() from public, anon, authenticated;
grant execute on function public.expire_verifications_now() to service_role;

create extension if not exists pg_cron;
select cron.schedule('engspace-expire-verifications', '7 * * * *', $$ select private.expire_verifications() $$);

-- documents the sweep must delete: not part of a pending request, or older than the 7-day limit (service role only)
create or replace function public.verification_orphans() returns setof text
language sql stable security definer set search_path = '' as $$
  select o.name from storage.objects o
  where o.bucket_id = 'verification'
    and (o.created_at < now() - make_interval(days => public.verify_ttl_days())
      or not exists (select 1 from public.verification_requests v where v.status = 'pending' and o.name = any(v.doc_paths)))
    -- give an upload a few minutes to be attached to its request
    and o.created_at < now() - interval '15 minutes'
$$;
revoke execute on function public.verification_orphans() from public, anon, authenticated;
grant execute on function public.verification_orphans() to service_role;

-- ================================ the private bucket ================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verification', 'verification', false, 3145728, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- upload only into my own folder; read: mine or staff; delete: mine or staff
create policy "verification docs: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'verification' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "verification docs: read own or staff" on storage.objects for select to authenticated
  using (bucket_id = 'verification' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_staff()));
create policy "verification docs: delete own or staff" on storage.objects for delete to authenticated
  using (bucket_id = 'verification' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_staff()));

grant execute on function public.submit_verification(text[], text[]), public.decide_verification(text, boolean, text, text, text),
  public.withdraw_verification(), public.verify_ttl_days() to authenticated;
