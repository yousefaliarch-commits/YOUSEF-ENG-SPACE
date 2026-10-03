-- A repeated tap is not a second salary report; a different report still is.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../_fixtures.psql
select plan(6);

select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select lives_ok($$ insert into public.salary_shares (disc, years, salary, gov, track, company, title, author_mode) values ('civil', 4, 14000, 'cairo', 'site', null, 'مهندس موقع', 'anon') $$, 'the first report is recorded');
select throws_ok($$ insert into public.salary_shares (disc, years, salary, gov, track, company, title, author_mode) values ('civil', 4, 14000, 'cairo', 'site', null, 'مهندس موقع', 'anon') $$, '23505', 'duplicate share', 'the same report again is refused as a duplicate');
select is((select (public.my_salary_status() ->> 'sharesThisMonth')::int), 1, 'only one row exists');
select lives_ok($$ insert into public.salary_shares (disc, years, salary, gov, track, company, title, author_mode) values ('civil', 4, 15500, 'cairo', 'site', null, 'مهندس موقع', 'anon') $$, 'a different salary is a new report');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select lives_ok($$ insert into public.salary_shares (disc, years, salary, gov, track, company, title, author_mode) values ('civil', 4, 14000, 'cairo', 'site', null, 'مهندس موقع', 'anon') $$, 'another member can report the same figures');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select is((select public.my_salary_status() ->> 'access'), 'full', 'the member''s own status says the market is unlocked');

select * from finish();
rollback;
