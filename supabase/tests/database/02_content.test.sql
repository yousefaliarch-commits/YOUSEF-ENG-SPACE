-- Reactions, polls, money access by role, jobs and job-match notifications, closed rooms.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../_fixtures.psql
select plan(16);

select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.posts (room, type, body, data) values ('tech', 'poll', 'أي برنامج؟', '{"options":["Revit","AutoCAD"]}');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.reactions (kind, item_id, agree, useful) select 'posts', id, true, true from public.posts where body = 'أي برنامج؟';
select throws_ok($$ update public.reactions set disagree = true $$, '23514', null, 'agree and disagree exclude each other');
select is((select reactions from public.posts where body = 'أي برنامج؟'), '{"agree":1,"disagree":0,"useful":1}'::jsonb, 'reaction counts follow');
insert into public.ballots (post_id, choice) select id, 0 from public.posts where body = 'أي برنامج؟';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select is((select count(*)::int from public.reactions), 0, 'reactions are private to the member');
insert into public.ballots (post_id, choice) select id, 0 from public.posts where body = 'أي برنامج؟';
select is((select tally from public.posts where body = 'أي برنامج؟'), '{"0":2}'::jsonb, 'the poll tally counts ballots');

-- salaries: engineers share and read; HR sees bands only; field staff see no money
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.salary_shares (disc, years, salary, gov) values ('civil', 4, 17000, 'cairo'), ('civil', 4, 18000, 'cairo'), ('civil', 4, 16000, 'cairo');
select is((select contributions from public.profiles), 3, 'contributions are counted');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
insert into public.salary_shares (disc, years, salary, gov) values ('civil', 4, 21000, 'cairo'), ('civil', 4, 19000, 'cairo');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
insert into public.salary_shares (disc, years, salary, gov) values ('civil', 9, 40000, 'cairo');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select is((select count(*)::int from public.salary_shares), 6, 'engineers who shared read individual salaries');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
select is((select count(*)::int from public.salary_shares), 0, 'HR reads no individual salary');
select is((select median from public.salary_bands('civil') where years = 4), 18000, 'HR reads the aggregate band');
select is((select count(*)::int from public.salary_bands('civil') where years = 9), 0, 'a cell under 5 reports is not shown');
select throws_ok($$ insert into public.salary_shares (disc, years, salary) values ('civil', 3, 9000) $$, '42501', null, 'HR cannot share a salary');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000f');
select is((select count(*)::int from public.salary_bands('civil')), 0, 'field staff see no money at all');

-- jobs: employers only; matching members are notified
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select throws_ok($$ insert into public.jobs (title, gov, disc) values ('مهندس موقع', 'cairo', 'civil') $$, '42501', null, 'engineers cannot post jobs');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
insert into public.jobs (title, gov, disc, sub, contact) values ('مهندس مكتب فني', 'cairo', 'civil', 'tech', '{"email":"jobs@example.com"}');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select is((select count(*)::int from public.notifications where kind = 'match'), 1, 'a matching engineer is notified');
insert into public.job_contacts (job_id) select id from public.jobs;
select is((select contact_count from public.jobs), 1, 'opening the contact is counted for the employer');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
select is((select count(*)::int from public.notifications), 0, 'a non-matching engineer is not');

-- closed rooms
reset role;
update public.app_config set value = jsonb_set(value, '{closedRooms}', '{"nego": true}') where key = 'mod';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select throws_ok($$ insert into public.posts (room, type, body) values ('nego', 'question', 'x') $$, '42501', null, 'a closed room takes no posts');

select * from finish();
rollback;
