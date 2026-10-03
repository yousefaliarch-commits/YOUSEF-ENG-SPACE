-- The job-matching engine: the discipline is a hard requirement. Experience, track and place are only looked at after it matches.
-- And a job names its company (jobs.co_name).
begin;
create extension if not exists pgtap with schema extensions;
\ir ../_fixtures.psql
select plan(14);

-- members of every discipline, all in Cairo, all with 6 years — everything but the discipline fits the job below
select pg_temp.mkuser('00000000-0000-0000-0000-0000000000a1', 'arch@example.com', '{"name":"معماري","role":"engineer","disc":"architecture","track":"tech","gradYear":"2020","gov":"cairo"}');
select pg_temp.mkuser('00000000-0000-0000-0000-0000000000a2', 'elec@example.com', '{"name":"كهرباء","role":"engineer","disc":"electrical","track":"tech","gradYear":"2020","gov":"cairo"}');
select pg_temp.mkuser('00000000-0000-0000-0000-0000000000a3', 'surv@example.com', '{"name":"مساحة","role":"engineer","disc":"survey","track":"tech","gradYear":"2020","gov":"cairo"}');
update public.profiles set gov = 'cairo', track = 'tech', grad_year = extract(year from now())::int - 6 where role = 'engineer' and disc is not null;
update public.profiles set disc = null where id = '00000000-0000-0000-0000-00000000000c';   -- a civil engineer who never chose: matches nothing

select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
insert into public.jobs (title, gov, city, disc, sub, years, co_name, contact) values ('مهندس مدني مكتب فني', 'cairo', 'nasr', 'civil', 'tech', '[4,8)', 'شركة الأفق للمقاولات', '{"email":"jobs@example.com"}');
reset role;
select is((select count(*)::int from public.notifications where kind = 'match' and account_id = '00000000-0000-0000-0000-00000000000a'), 1, 'a civil engineer (6 years, Cairo, technical office) is matched with a civil job');
select is((select count(*)::int from public.notifications where kind = 'match' and account_id = '00000000-0000-0000-0000-0000000000a1'), 0, 'an architect with the same experience, city and track is not');
select is((select count(*)::int from public.notifications where kind = 'match' and account_id = '00000000-0000-0000-0000-0000000000a2'), 0, 'an electrical engineer is not');
select is((select count(*)::int from public.notifications where kind = 'match' and account_id = '00000000-0000-0000-0000-00000000000d'), 0, 'a mechanical engineer is not');
select is((select count(*)::int from public.notifications where kind = 'match' and account_id = '00000000-0000-0000-0000-0000000000a3'), 0, 'a survey engineer is not');
select is((select count(*)::int from public.notifications where kind = 'match' and account_id = '00000000-0000-0000-0000-00000000000c'), 0, 'a profile without a discipline matches nothing');
select is((select array_agg(account_id::text order by account_id) from public.notifications where kind = 'match'), array['00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b'], 'exactly the two civil engineers were notified');
select ok((select body from public.notifications where kind = 'match' limit 1) like 'شركة الأفق للمقاولات تبحث عن مهندس مدني في القاهرة.%', 'the notice names the job''s company, not the profile''s');

-- a mechanical job: only the mechanical engineer
delete from public.notifications;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
insert into public.jobs (title, gov, disc, sub, years, contact) values ('مهندس تكييف', 'cairo', 'mechanical', 'tech', '[4,8)', '{"email":"jobs@example.com"}');
reset role;
select is((select array_agg(account_id::text order by account_id) from public.notifications where kind = 'match'), array['00000000-0000-0000-0000-00000000000d'], 'a mechanical job reaches only the mechanical engineer');
select ok((select body from public.notifications where kind = 'match') like 'ريدكون تبحث عن مهندس ميكانيكا%', 'without co_name the profile''s company is used');

-- the company name is validated, and only employers can post
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
select throws_ok($$ insert into public.jobs (title, gov, disc, co_name, contact) values ('مهندس موقع', 'cairo', 'civil', 'x', '{"email":"a@b.co"}') $$, '23514', null, 'a one-letter company name is refused');
select lives_ok($$ insert into public.jobs (title, gov, disc, co_name, contact) values ('مهندس موقع', 'cairo', 'civil', '  شركة النيل  ', '{"email":"a@b.co"}') $$, 'a normal name is accepted');
select is((select co_name from public.jobs where title = 'مهندس موقع'), '  شركة النيل  ', 'and stored as typed (the app trims it)');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select throws_ok($$ insert into public.jobs (title, gov, disc, co_name, contact) values ('مهندس موقع', 'cairo', 'civil', 'شركة', '{"email":"a@b.co"}') $$, '42501', null, 'an engineer account still cannot post jobs');
select * from finish();
rollback;
