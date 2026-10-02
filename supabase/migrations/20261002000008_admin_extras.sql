-- EngSpace — console actions outside a case: warn a member, hide / restore an item. Staff only, audited.
create or replace function public.admin_warn(p_ref text, p_text text) returns void
language plpgsql security definer set search_path = '' as $$
declare target uuid := private.id_of_ref(p_ref);
begin
  if not public.is_staff() then raise exception 'staff only' using errcode = '42501'; end if;
  if target is null then raise exception 'no such account'; end if;
  insert into public.notifications (account_id, kind, title, body) values (target, 'mod', 'تحذير من فريق المجتمع', p_text);
  perform private.audit('warn', p_ref, jsonb_build_object('text', p_text));
end $$;

create or replace function public.admin_set_hidden(p_kind text, p_item uuid, p_hidden boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'staff only' using errcode = '42501'; end if;
  perform private.set_hidden(p_kind, p_item, p_hidden);
  perform private.audit(case when p_hidden then 'hide' else 'restore' end, p_kind || ':' || p_item);
end $$;

-- the first administrator is made from the SQL editor (or `npm run db:admin -- <email>` locally):
--   select public.bootstrap_admin('you@example.com');
-- it only works while the platform has no administrator, and only from the database itself (never from the app)
create or replace function public.bootstrap_admin(p_email text) returns text
language plpgsql security definer set search_path = '' as $$
declare r text;
begin
  if exists (select 1 from public.profiles where staff = 'admin') then raise exception 'an administrator already exists — use the console'; end if;
  update public.profiles p set staff = 'admin' from auth.users u where u.id = p.id and lower(u.email) = lower(p_email) returning p.mod_ref into r;
  if r is null then raise exception 'no account with that e-mail — sign up in the app first'; end if;
  return r;
end $$;
revoke execute on function public.bootstrap_admin(text) from public, anon, authenticated;

grant execute on function public.admin_warn(text, text), public.admin_set_hidden(text, uuid, boolean) to authenticated;

-- a member opened a job ad: counted for the employer's reach (the viewer is not recorded)
create or replace function public.count_job_view(p_job uuid) returns void
language sql security definer set search_path = '' as $$ update public.jobs set view_count = view_count + 1 where id = p_job and not hidden $$;
grant execute on function public.count_job_view(uuid) to authenticated;
