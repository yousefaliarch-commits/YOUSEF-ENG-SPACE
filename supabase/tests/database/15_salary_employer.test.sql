-- A salary report carries its employer type in its own column, validated; `company` stays a company name.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../_fixtures.psql
select plan(6);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select lives_ok($$ insert into public.salary_shares (disc, years, salary, gov, employer, title) values ('civil', 4, 15000, 'cairo', 'consulting', 'مهندس') $$, 'a report with an employer type');
select lives_ok($$ insert into public.salary_shares (disc, years, salary, gov, employer, company, title) values ('civil', 4, 16000, 'cairo', 'contracting', 'أوراسكوم', 'مهندس') $$, 'and one with both a type and a company');
select throws_ok($$ insert into public.salary_shares (disc, years, salary, gov, employer, title) values ('civil', 4, 17000, 'cairo', 'spaceship', 'مهندس') $$, '23514', null, 'an unknown type is refused');
reset role;
select is((select employer from public.salary_shares where salary = 15000), 'consulting', 'the type is stored');
select ok((select company is null from public.salary_shares where salary = 15000), 'and company stays empty');
select is((select count(*)::int from public.salary_shares where company in ('contracting', 'consulting')), 0, 'no row has a type in the company column');
select * from finish();
rollback;
