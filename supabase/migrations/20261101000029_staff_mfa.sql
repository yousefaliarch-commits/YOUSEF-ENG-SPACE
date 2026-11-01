-- EngSpace — Phase 3a: two-factor sign-in for the platform team (docs/SECURITY.md 1.4: «staff MFA with aal2 required in
-- is_staff() / is_admin()»).
--  · One switch, private.security_config.staff_mfa, OFF by default: with it off nothing changes. With it on, is_staff() and
--    is_admin() hold only for a session that passed the second factor (JWT aal = aal2) — a stolen password alone then
--    reaches nothing a moderator or an administrator can do (every staff policy, RPC and the «staff» realtime channel go
--    through these two functions).
--  · Turning it on or off is an administrator's act from a two-factor session (admin_set_staff_mfa): an administrator who has
--    not enrolled cannot lock the team out, and a password thief cannot switch it off. Both changes go to the audit log.
--  · my_staff_security() tells the signed-in member's app whether its staff role needs the second factor now, so the console
--    asks for the code before it loads (members get staff = null and nothing else).

create table if not exists private.security_config (
  id boolean primary key default true check (id),
  staff_mfa boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into private.security_config (id) values (true) on conflict (id) do nothing;
revoke all on private.security_config from public, anon, authenticated;

-- the second factor, when the switch asks for it
create or replace function private.staff_mfa_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  select not coalesce((select s.staff_mfa from private.security_config s where s.id), false)
      or coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
$$;
revoke execute on function private.staff_mfa_ok() from public, anon, authenticated;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.staff in ('moderator', 'admin') from public.profiles p where p.id = (select auth.uid())), false)
     and private.staff_mfa_ok()
$$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.staff = 'admin' from public.profiles p where p.id = (select auth.uid())), false)
     and private.staff_mfa_ok()
$$;

-- what the app needs to know before it opens the console: the raw staff role, whether the switch is on, this session's level
create or replace function public.my_staff_security() returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when p.staff in ('moderator', 'admin')
    then jsonb_build_object('staff', p.staff, 'required', coalesce((select s.staff_mfa from private.security_config s where s.id), false),
                            'aal', coalesce((select auth.jwt() ->> 'aal'), 'aal1'))
    else jsonb_build_object('staff', null, 'required', false, 'aal', coalesce((select auth.jwt() ->> 'aal'), 'aal1')) end
  from public.profiles p where p.id = (select auth.uid())
$$;
revoke execute on function public.my_staff_security() from public, anon;
grant execute on function public.my_staff_security() to authenticated;

-- the switch: administrators only, and only from a two-factor session (whatever the switch says now)
create or replace function public.admin_set_staff_mfa(p_on boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not coalesce((select p.staff = 'admin' from public.profiles p where p.id = (select auth.uid())), false) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if coalesce((select auth.jwt() ->> 'aal'), '') <> 'aal2' then
    raise exception 'two-factor session required' using errcode = '42501';
  end if;
  update private.security_config set staff_mfa = coalesce(p_on, false), updated_at = now() where id;
  perform private.audit(case when p_on then 'staff_mfa_on' else 'staff_mfa_off' end, null, '{}'::jsonb);
  return coalesce(p_on, false);
end $$;
revoke execute on function public.admin_set_staff_mfa(boolean) from public, anon;
grant execute on function public.admin_set_staff_mfa(boolean) to authenticated;
