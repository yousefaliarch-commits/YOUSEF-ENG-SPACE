-- Phase 3a: staff two-factor. Off by default (nothing changes); on, staff powers need an aal2 session; only an administrator in
-- an aal2 session can flip it, and each flip is audited; members learn nothing but «not staff».
begin;
create extension if not exists pgtap with schema extensions;
\ir ../_fixtures.psql
select plan(16);

-- act with a given assurance level (the second factor sets aal2 in the JWT)
create or replace function pg_temp.as_level(uid uuid, aal text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', aal)::text, true);
  execute 'set local role authenticated';
end $$;
grant execute on function pg_temp.as_level(uuid, text) to public;

-- the switch is off: staff are staff on a password session, exactly as before
select pg_temp.as_level('00000000-0000-0000-0000-000000000001', 'aal1');
select ok(public.is_staff(), 'switch off: a moderator on a password session is staff');
select ok(not public.is_admin(), 'a moderator is not an administrator');
select is(public.my_staff_security() ->> 'required', 'false', 'the app is told the second factor is not required');
reset role;
select pg_temp.as_level('00000000-0000-0000-0000-000000000002', 'aal1');
select ok(public.is_admin(), 'switch off: the administrator on a password session is an administrator');
select throws_ok($$ select public.admin_set_staff_mfa(true) $$, '42501', 'two-factor session required', 'turning it on needs a two-factor session');
reset role;

select pg_temp.as_level('00000000-0000-0000-0000-000000000001', 'aal2');
select throws_ok($$ select public.admin_set_staff_mfa(true) $$, '42501', 'not allowed', 'a moderator cannot flip it, even with the second factor');
reset role;

select pg_temp.as_level('00000000-0000-0000-0000-000000000002', 'aal2');
select is(public.admin_set_staff_mfa(true), true, 'the administrator in a two-factor session turns it on');
reset role;
select is((select count(*)::int from public.audit_log where action = 'staff_mfa_on'), 1, 'and it is audited');

-- the switch is on: a password session reaches no staff power
select pg_temp.as_level('00000000-0000-0000-0000-000000000001', 'aal1');
select ok(not public.is_staff(), 'switch on: a moderator on a password session is not staff');
select is(public.my_staff_security() ->> 'required', 'true', 'and the app is told to ask for the code');
select is(public.my_staff_security() ->> 'staff', 'moderator', 'with the raw role, so it knows to ask');
reset role;
select pg_temp.as_level('00000000-0000-0000-0000-000000000002', 'aal1');
select ok(not public.is_admin(), 'switch on: the administrator on a password session is not an administrator');
reset role;
select pg_temp.as_level('00000000-0000-0000-0000-000000000001', 'aal2');
select ok(public.is_staff(), 'switch on: the moderator after the second factor is staff');
reset role;

-- members: nothing about the team
select pg_temp.as_level('00000000-0000-0000-0000-00000000000a', 'aal1');
select is(public.my_staff_security() ->> 'staff', null, 'a member learns only that they are not staff');
reset role;

-- nobody reads or calls the internals
select ok(not has_function_privilege('authenticated', 'private.staff_mfa_ok()', 'execute'), 'the check itself is not callable');
select ok(not has_table_privilege('authenticated', 'private.security_config', 'select'), 'the switch is not readable directly');

select * from finish();
rollback;
