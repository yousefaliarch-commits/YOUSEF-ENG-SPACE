-- Net salaries: the SQL payroll rules match src/domain/pay.ts netPay().netRegular, and new shares are stored as net.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../_fixtures.psql
select plan(7);

-- reference values computed with netPay() in src/domain/pay.ts (tests/net-salary.test.ts pins the same numbers)
select is(private.net_of_gross(8000), 6865, 'below the insurable cap');
select is(private.net_of_gross(16000), 12580, 'near the cap');
select is(private.net_of_gross(25000), 19597, 'above the cap');
select is(private.net_of_gross(60000), 45810, 'higher brackets');
select is(private.net_of_gross(150000), 107877, 'a high earner loses the lower brackets');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.salary_shares (disc, years, salary) values ('civil', 4, 18000);
select is((select basis from public.salary_shares limit 1), 'net', 'a new share is net');
select throws_ok($$ insert into public.salary_shares (disc, years, salary, basis) values ('civil', 4, 18000, 'converted') $$, '42501', null, 'members cannot mark a share as converted');

select * from finish();
rollback;
