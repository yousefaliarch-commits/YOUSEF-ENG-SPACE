-- Features 3 & 4: company scorecards and the raise & inflation tracker, as real members.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../_fixtures.psql
select plan(27);

-- a member writes a review of a company and attaches factor ratings
create or replace function pg_temp.review(uid uuid, co text, scores jsonb) returns uuid language plpgsql as $$
declare rid uuid;
begin
  perform pg_temp.as_user(uid);
  insert into public.company_reviews (company_id, rating, text) values (co, 4, 'تجربة عمل جيدة بشكل عام') returning id into rid;
  perform public.rate_company(rid, scores);
  reset role; return rid;
end $$;
grant execute on function pg_temp.review(uuid, text, jsonb) to public;  -- default-deny since migration 24

select pg_temp.review('00000000-0000-0000-0000-00000000000a', 'redcon', '{"pay":2,"raises":3,"ontime":5,"overtime":2,"site":4}');
select pg_temp.review('00000000-0000-0000-0000-00000000000a', 'redcon', '{"pay":1,"raises":1,"ontime":1,"overtime":1,"site":1}'); -- A again: only the latest counts
select pg_temp.review('00000000-0000-0000-0000-00000000000b', 'redcon', '{"pay":3,"raises":4,"ontime":5,"overtime":3}');
select pg_temp.review('00000000-0000-0000-0000-00000000000c', 'redcon', '{"pay":4,"raises":2,"ontime":4,"overtime":4,"site":5}');
select pg_temp.review('00000000-0000-0000-0000-00000000000d', 'redcon', '{"pay":2,"raises":3,"ontime":5,"overtime":2,"site":3}');

-- four reviewers: counts only, no score
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select is((public.company_scorecard('redcon') ->> 'n')::int, 4, 'four different reviewers (a member who reviewed twice counts once)');
select ok(not (public.company_scorecard('redcon') -> 'factors' -> 'pay' ? 'avg'), 'under 5 reviewers a factor shows no score');
select is((public.company_scorecard('redcon') -> 'factors' -> 'pay' ->> 'n')::int, 4, 'only how many rated it');

-- the fifth reviewer opens the factors that reached 5 (site has only 4 ratings)
select pg_temp.review('00000000-0000-0000-0000-000000000001', 'redcon', '{"pay":5,"raises":5,"ontime":5,"overtime":5}');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select is((public.company_scorecard('redcon') -> 'factors' -> 'pay' ->> 'avg')::numeric, 3.0, 'pay vs market: the average of the latest ratings (A counted once, as 1)');
select is((public.company_scorecard('redcon') -> 'factors' -> 'ontime' ->> 'good')::int, 80, 'paying on time: share rating it 4 or 5');
select ok(not (public.company_scorecard('redcon') -> 'factors' -> 'site' ? 'avg'), 'a factor with 4 ratings stays closed while others open');
select is((public.company_scorecard('other') ->> 'n')::int, 0, 'a company without ratings');

-- nobody reads individual ratings
select throws_ok($$ select * from public.company_ratings $$, '42501', null, 'members cannot read the ratings table');
select throws_ok($$ insert into public.company_ratings (review_id, company_id, pay) values (gen_random_uuid(), 'redcon', 5) $$, '42501', null, 'nor write it directly');
select throws_ok(format($$ select public.rate_company(%L, '{"pay":5}') $$, (select id from public.company_reviews order by created_at limit 1)), '42501', null, 'nor rate someone else''s review');

-- out-of-range scores are refused
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
insert into public.company_reviews (company_id, rating, text) values ('ksb', 3, 'تقييم للاختبار فقط هنا') ;
select throws_ok(format($$ select public.rate_company(%L, '{"pay":9}') $$, (select id from public.company_reviews where company_id = 'ksb')), '22023', null, 'a score outside 1–5 is refused');

-- employers and field staff
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
select is(public.company_scorecard('redcon') ->> 'access', 'aggregate', 'HR reads the scorecard (aggregates only)');
insert into public.company_reviews (company_id, rating, text) values ('redcon', 5, 'شركة ممتازة جدًا للعمل فيها');
select throws_ok(format($$ select public.rate_company(%L, '{"pay":5}') $$, (select id from public.company_reviews where rating = 5 and company_id = 'redcon')), '42501', null, 'employer accounts cannot rate companies');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000f');
select is(public.company_scorecard('redcon'), '{"access": "none"}'::jsonb, 'field staff see no scorecard');

-- moderation hides a review: its rating leaves the scorecard
reset role;
update public.company_reviews set hidden = true where id in (select review_id from public.company_ratings where pay = 5);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select ok(not (public.company_scorecard('redcon') -> 'factors' -> 'pay' ? 'avg'), 'a hidden review no longer counts');

-- ================= raises =================
create or replace function pg_temp.raise(uid uuid, pct numeric, kind text default 'annual') returns void language plpgsql as $$
begin perform pg_temp.as_user(uid); insert into public.raise_reports (disc, track, pct, kind, month) values ('civil', 'tech', pct, kind, date_trunc('month', now() - interval '2 months')::date); reset role; end $$;
grant execute on function pg_temp.raise(uuid, numeric, text) to public;  -- default-deny since migration 24
select pg_temp.raise('00000000-0000-0000-0000-00000000000a', 10);
select pg_temp.raise('00000000-0000-0000-0000-00000000000a', 25, 'promotion');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select throws_ok($$ insert into public.raise_reports (disc, pct, month) values ('civil', 30, date_trunc('month', now())::date) $$, '42501', null, 'at most 2 raise reports per 180 days');
select is((select count(*)::int from public.raise_reports), 2, 'a member reads their own reports');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.raise_reports), 0, 'but never anyone else''s');
select ok(not (public.market_raises('civil') ? 'p50'), 'one yearly raise: no market rate yet');

select pg_temp.raise('00000000-0000-0000-0000-00000000000b', 15);
select pg_temp.raise('00000000-0000-0000-0000-00000000000c', 20);
select pg_temp.raise('00000000-0000-0000-0000-00000000000d', 30);
select pg_temp.raise('00000000-0000-0000-0000-000000000001', 12);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select is((public.market_raises('civil') ->> 'p50')::numeric, 15.0, 'the market rate is the median yearly raise from 5 reports');
select is(jsonb_array_length(public.market_raises('civil') -> 'byKind'), 0, 'a single promotion stays hidden');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
select throws_ok($$ insert into public.raise_reports (disc, pct, month) values ('civil', 30, date_trunc('month', now())::date) $$, '42501', null, 'employer accounts cannot report raises');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000f');
select is(public.market_raises('civil'), '{"access": "none"}'::jsonb, 'field staff see no raise rates');

-- the inflation series: every member reads it, only staff change it
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select ok((select count(*) from public.inflation_rates) >= 45, 'members read the official inflation series');
select throws_ok($$ insert into public.inflation_rates (month, yoy) values ('2030-01-01', 1) $$, '42501', null, 'members cannot change it');
select pg_temp.as_user('00000000-0000-0000-0000-000000000002');
select lives_ok($$ insert into public.inflation_rates (month, yoy) values ('2025-10-01', 12.5) $$, 'staff add a newly published month');

-- deleting an account deletes its raise reports
reset role;
delete from auth.users where id = '00000000-0000-0000-0000-00000000000d';
select is((select count(*)::int from public.raise_reports), 5, 'an account''s raise reports go with it');

select * from finish();
rollback;
