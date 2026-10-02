-- Sprint 1: the live salary explorer and give-to-get, as real members.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../_fixtures.psql
select plan(16);

-- seven civil engineers in Cairo, 3–5 years, plus a Giza cell under the floor
create or replace function pg_temp.share(uid uuid, salary int, track text, gov text, company text, years int default 4) returns void language plpgsql as $$
begin perform pg_temp.as_user(uid); insert into public.salary_shares (disc, track, years, salary, gov, company) values ('civil', track, years, salary, gov, company); reset role; end $$;
select pg_temp.share('00000000-0000-0000-0000-00000000000a', 16000, 'tech', 'cairo', 'أوراسكوم');
select pg_temp.share('00000000-0000-0000-0000-00000000000a', 17000, 'tech', 'cairo', 'أوراسكوم');
select pg_temp.share('00000000-0000-0000-0000-00000000000a', 18000, 'tech', 'cairo', 'أوراسكوم');
select pg_temp.share('00000000-0000-0000-0000-00000000000c', 19000, 'tech', 'cairo', 'أوراسكوم');
select pg_temp.share('00000000-0000-0000-0000-00000000000c', 20000, 'site', 'cairo', 'أوراسكوم');
select pg_temp.share('00000000-0000-0000-0000-00000000000c', 21000, 'site', 'cairo', 'ريدكون');
select pg_temp.share('00000000-0000-0000-0000-00000000000d', 30000, 'site', 'cairo', 'ريدكون');
select pg_temp.share('00000000-0000-0000-0000-00000000000d', 25000, 'site', 'giza', 'ريدكون');

-- give-to-get
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select is(public.salary_access(), 'teaser', 'an engineer who has not shared gets the teaser');
select is((public.salary_explorer('civil', null, 3, 5, 'cairo') ->> 'p50')::int, 19000, 'the teaser shows the headline median');
select ok(not (public.salary_explorer('civil', null, 3, 5, 'cairo') ? 'p25'), 'but no range');
select ok(not (public.salary_explorer('civil', null, 3, 5, 'cairo') ? 'byCompany'), 'and no breakdowns');
select is((select count(*)::int from public.salary_shares), 0, 'nor individual reports');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select is(public.salary_access(), 'full', 'sharing unlocks the full explorer');
select is((public.salary_explorer('civil', null, 3, 5, 'cairo') ->> 'n')::int, 7, 'the cell counts every report in it');
select is((public.salary_explorer('civil', null, 3, 5, 'cairo') ->> 'p25')::int, 17500, 'with its range');
select is(jsonb_array_length(public.salary_explorer('civil', null, 3, 5, 'cairo') -> 'byCompany'), 1, 'a company shows only from 5 reports');
select is((public.salary_explorer('civil', null, 3, 5, 'cairo') -> 'byCompany' -> 0 ->> 'key'), 'أوراسكوم', 'the company with 5 reports');
select is(jsonb_array_length(public.salary_explorer('civil', null, 3, 5, 'cairo') -> 'byGov'), 1, 'Giza (1 report) stays hidden');
select ok(not (public.salary_explorer('civil', null, 3, 5, 'giza') ? 'p50'), 'a cell under 5 shows no figure at all');
select is((select count(*)::int from public.salary_shares), 8, 'contributors read individual reports');

-- the anti-gaming limit: a 4th share within 30 days is refused
select throws_ok($$ insert into public.salary_shares (disc, years, salary) values ('civil', 4, 99000) $$, '42501', null, 'at most 3 shares per 30 days');

-- employers: aggregates, never individual reports; field staff: nothing
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
select is(public.salary_explorer('civil', null, 3, 5, 'cairo') ->> 'access', 'aggregate', 'HR reads aggregates');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000f');
select is(public.salary_explorer('civil', null, 3, 5, 'cairo'), '{"access": "none"}'::jsonb, 'field staff see no money');

select * from finish();
rollback;
