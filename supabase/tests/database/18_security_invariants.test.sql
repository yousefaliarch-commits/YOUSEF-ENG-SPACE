-- Security invariants (Phase 1.2): rules that every future migration must keep. A new table without RLS, a function callable
-- signed-out, a stray TRUNCATE grant or a privileged profile column made writable fails here.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../_fixtures.psql
select plan(28);

-- ---------------------------------------------------------------- structure
select is((select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity), 0, 'every public table has row-level security');
select is((select count(*)::int from information_schema.role_table_grants where table_schema = 'public' and grantee = 'anon'), 0,
  'signed-out visitors hold no privilege on any public table');
select is((select count(*)::int from information_schema.role_table_grants where table_schema = 'public' and grantee = 'authenticated'
           and privilege_type in ('TRUNCATE', 'TRIGGER', 'REFERENCES')), 0, 'members hold no TRUNCATE / TRIGGER / REFERENCES (not covered by RLS)');
select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname in ('public', 'private') and has_function_privilege('anon', p.oid, 'execute')
             and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')), 0,
  'no function in public / private is callable signed-out');
select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'private' and has_function_privilege('authenticated', p.oid, 'execute')
             and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')), 0,
  'no private function is callable by members');
select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname in ('public', 'private') and p.prosecdef
             and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')), 0,
  'every security-definer function pins search_path');

-- default deny for whatever a later migration creates
create function public.zz_new_fn() returns int language sql as 'select 1';
create table public.zz_new_table (id int);
select ok(not has_function_privilege('anon', 'public.zz_new_fn()', 'execute'), 'a new function is not callable signed-out by default');
select ok(not has_function_privilege('authenticated', 'public.zz_new_fn()', 'execute'), 'nor by members until a migration grants it');
select ok(not has_table_privilege('anon', 'public.zz_new_table', 'select'), 'a new table grants nothing to signed-out visitors');
select ok(not has_table_privilege('authenticated', 'public.zz_new_table', 'truncate'), 'nor TRUNCATE to members');
drop function public.zz_new_fn(); drop table public.zz_new_table;

-- members can write only their own profile fields — never staff, verification, strikes, suspension, references or counters
select is((select string_agg(column_name, ',' order by column_name) from information_schema.column_privileges
           where table_schema = 'public' and table_name = 'profiles' and grantee = 'authenticated' and privilege_type = 'UPDATE'),
  'age,avatar,city,company_id,company_name,default_identity,disc,gender,goal,gov,grad_year,look,name,onboarded,photo_path,pos,role,settings,track',
  'the writable profile columns are exactly the member-owned ones');

-- ---------------------------------------------------------------- role changes
-- (a job posted by the HR account while it is still HR, for the view counter below)
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
insert into public.jobs (title, gov, disc, sub, years, contact) values ('مهندس موقع إنشائي للعدّاد', 'cairo', 'civil', 'site', '[2,6)', '{"email":"jobs@example.com"}');
reset role; select set_config('request.jwt.claims', '', true);
update public.profiles set onboarded = true where id = '00000000-0000-0000-0000-00000000000e';
update public.profiles set verified = true, verify_kind = 'card' where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set onboarded = true where id = '00000000-0000-0000-0000-00000000000a';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
select lives_ok($$ update public.profiles set role = 'engineer' where id = auth.uid() $$, 'HR may switch to engineer once');
select throws_ok($$ update public.profiles set role = 'hr' where id = auth.uid() $$, '54000', 'role change cooldown', 'but not again within 30 days');
reset role;
select isnt((select role_changed_at from public.profiles where id = '00000000-0000-0000-0000-00000000000e'), null, 'the change is time-stamped');
select is((select count(*)::int from public.audit_log where action = 'role_change'
           and target = (select mod_ref from public.profiles where id = '00000000-0000-0000-0000-00000000000e')), 1, 'and audited by mod_ref');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select lives_ok($$ update public.profiles set role = 'supervisor' where id = auth.uid() $$, 'a verified engineer changes role');
reset role;
select is((select verified from public.profiles where id = '00000000-0000-0000-0000-00000000000a'), false, 'and loses the verification badge');
-- before onboarding finishes, choosing a role is free; a finished onboarding cannot be reopened to dodge the limit
select set_config('request.jwt.claims', '', true);   -- maintenance, not a member
update public.profiles set onboarded = false where id = '00000000-0000-0000-0000-00000000000b';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select lives_ok($$ update public.profiles set role = 'hr' where id = auth.uid() $$, 'choosing a role while completing the profile');
select lives_ok($$ update public.profiles set role = 'engineer', onboarded = true where id = auth.uid() $$, 'is not limited');
select throws_ok($$ update public.profiles set onboarded = false where id = auth.uid() $$, '42501', 'onboarding is complete', 'and onboarding cannot be reopened');
reset role;

-- ---------------------------------------------------------------- job views
select pg_temp.as_anon();
select throws_ok($$ select public.count_job_view('5b0d3c1e-0000-4000-8000-000000000001') $$, '42501', null, 'signed-out visitors cannot count views');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select public.count_job_view((select id from public.jobs where title = 'مهندس موقع إنشائي للعدّاد'));
select public.count_job_view((select id from public.jobs where title = 'مهندس موقع إنشائي للعدّاد'));
select public.count_job_view((select id from public.jobs where title = 'مهندس موقع إنشائي للعدّاد'));
reset role;
select is((select view_count from public.jobs where title = 'مهندس موقع إنشائي للعدّاد'), 1, 'a member counts once a day, however often they open it');

-- ---------------------------------------------------------------- rate limits
set local engspace.rate_limits = 'on';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
do $$ begin for i in 1..8 loop insert into public.posts (room, type, body, author_mode) values ('general', 'question', 'سؤال رقم ' || i || ' عن الموقع', 'anon'); end loop; end $$;
select throws_ok($$ insert into public.posts (room, type, body, author_mode) values ('general', 'question', 'السؤال التاسع خلال دقائق', 'anon') $$,
  '54000', 'rate limited', 'the 9th post in 10 minutes is refused');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-000000000001');   -- moderator
select lives_ok($$ do $x$ begin for i in 1..12 loop insert into public.posts (room, type, body, author_mode) values ('general', 'text', 'إعلان من الفريق ' || i, 'anon'); end loop; end $x$ $$,
  'staff are not rate limited');
reset role;

-- ---------------------------------------------------------------- jsonb caps
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select throws_ok($$ insert into public.member_state (account_id, key, value) values (auth.uid(), 'huge', to_jsonb(repeat('x', 1100000))) $$,
  '23514', null, 'a synced value over 1 MB is refused');
do $$ begin for i in 1..40 loop insert into public.member_state (account_id, key, value) values (auth.uid(), 'k' || chr(96 + (i % 26) + 1) || chr(96 + (i / 26) + 1), '1'::jsonb); end loop; end $$;
select throws_ok($$ insert into public.member_state (account_id, key, value) values (auth.uid(), 'oneMore', '1'::jsonb) $$,
  '54000', 'too many state keys', 'a 41st state key is refused');
select lives_ok($$ update public.member_state set value = '2'::jsonb where account_id = auth.uid() and key = 'kba' $$, 'an existing key can still be rewritten');
select throws_ok($$ insert into public.comments (post_id, type, text, data, author_mode)
  select id, 'text', 'تعليق', jsonb_build_object('x', repeat('y', 5000)), 'anon' from public.posts limit 1 $$, '23514', null, 'comment data over 4 KB is refused');
reset role;

select * from finish();
rollback;
