-- «المهندس الذكي»: the daily allowance is taken only by the Edge Function (service role), counted per Cairo day, refunded on
-- failure, configurable by admins only; members read their own allowance and rate answers; staff see aggregates, never who.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../_fixtures.psql
select plan(21);

delete from private.ai_usage; delete from private.ai_feedback;
update private.ai_config set value = '3' where key = 'daily_limit';
update private.ai_config set value = 'true' where key = 'enabled';

-- members can't take or refund units themselves
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select throws_ok($$ select public.ai_take('00000000-0000-0000-0000-00000000000a', 'assistant') $$, '42501', null, 'a member cannot take units directly');
select throws_ok($$ select public.ai_refund('00000000-0000-0000-0000-00000000000a', 'assistant') $$, '42501', null, 'nor refund them');
select is((public.ai_quota() ->> 'remaining')::int, 3, 'a member reads their own allowance');
reset role;
select pg_temp.as_anon();
select throws_ok($$ select public.ai_quota() $$, '42501', null, 'signed-out visitors have no allowance to read');
reset role;

-- the proxy (service role) takes units until the day is spent
set local role service_role;
select is((public.ai_take('00000000-0000-0000-0000-00000000000a', 'assistant') ->> 'remaining')::int, 2, 'first unit taken');
select is((public.ai_take('00000000-0000-0000-0000-00000000000a', 'cv-review') ->> 'remaining')::int, 1, 'units are shared across features');
select is((public.ai_take('00000000-0000-0000-0000-00000000000a', 'assistant') ->> 'ok')::boolean, true, 'third unit taken');
select is(public.ai_take('00000000-0000-0000-0000-00000000000a', 'assistant') ->> 'reason', 'quota', 'the fourth is refused: quota');
select is(public.ai_take('00000000-0000-0000-0000-00000000000a', 'hack') ->> 'reason', 'feature', 'an unknown feature is refused');
select is((public.ai_take('00000000-0000-0000-0000-00000000000b', 'assistant') ->> 'ok')::boolean, true, 'another member has their own allowance');
select is((public.ai_take('00000000-0000-0000-0000-00000000000b', 'assistant') ->> 'money')::boolean, true, 'an engineer may talk pay with the assistant');
select is((public.ai_take('00000000-0000-0000-0000-00000000000f', 'assistant') ->> 'money')::boolean, false, 'a site supervisor never does (the proxy tells the model)');
-- a failed model call gives the unit back
select public.ai_refund('00000000-0000-0000-0000-00000000000a', 'assistant');
select is((public.ai_take('00000000-0000-0000-0000-00000000000a', 'assistant') ->> 'ok')::boolean, true, 'after a refund one more unit is available');
select public.ai_tokens('00000000-0000-0000-0000-00000000000a', 'assistant', 120, 340);
reset role;
select is((select tokens_out from private.ai_usage where account_id = '00000000-0000-0000-0000-00000000000a' and feature = 'assistant'), 340, 'token totals are recorded (counts only)');

-- feedback: members rate; the row carries no prompt or answer
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select lives_ok($$ select public.ai_rate('assistant', 1, 'دقيق') $$, 'a member rates an answer');
select throws_ok($$ select public.ai_rate('assistant', 5) $$, '22023', null, 'ratings are 👍 / 👎 only');
-- only admins change the allowance
select throws_ok($$ select public.admin_ai_set('daily_limit', '100') $$, '42501', null, 'a member cannot change the allowance');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
select throws_ok($$ select public.admin_ai_set('daily_limit', '100') $$, '42501', null, 'nor a moderator');
select ok(jsonb_array_length(public.admin_ai_usage(7) -> 'days') >= 2, 'staff see usage per day and feature');
select ok(public.admin_ai_usage(7)::text !~ '0000000a', 'with no member identity in it');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-000000000002');
select public.admin_ai_set('enabled', 'false');
reset role;
set local role service_role;
select is(public.ai_take('00000000-0000-0000-0000-00000000000c', 'assistant') ->> 'reason', 'disabled', 'the off switch stops every request');
reset role;

select * from finish();
rollback;
