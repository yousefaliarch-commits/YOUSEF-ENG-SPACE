-- Reports, auto-hide, decisions, suspension, audit, staff-only console functions.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../_fixtures.psql
select plan(18);

select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.posts (room, type, body) values ('tech', 'question', 'محتوى مخالف');
create temp table p as select id from public.posts where body = 'محتوى مخالف';
grant select on p to authenticated;
select throws_ok($$ select public.file_report('post', (select id from p), 'spam') $$, null, null, 'cannot report your own post');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select lives_ok($$ select public.file_report('post', (select id from p), 'harass', 'ملاحظة') $$, 'report filed');
select lives_ok($$ select public.file_report('post', (select id from p), 'harass') $$, 'the same member again counts once');
select is((select count(*)::int from public.reports), 1, 'a reporter sees their own report');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select public.file_report('post', (select id from p), 'spam');
select is((select count(*)::int from public.reports), 1, 'a reporter does not see other reports');
select throws_ok($$ select * from public.mod_cases() $$, '42501', null, 'members cannot open the queue');
select is((select count(*)::int from public.posts where id = (select id from p)), 1, 'still visible under the threshold');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
select public.file_report('post', (select id from p), 'spam');
select is((select count(*)::int from public.posts where id = (select id from p)), 0, 'three distinct reporters hide it');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select is((select count(*)::int from public.posts where id = (select id from p)), 1, 'the author still sees their hidden post');

select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
select is((select reporters from public.mod_cases()), 3::bigint, 'the moderator sees one case with three reporters');
select ok((select account_ref like 'acc-%' and snapshot::text not like '%أحمد%' from public.mod_cases()), 'the case shows a mod_ref, not a name');
select public.decide_case('post', (select id from p), false);
select is((select count(*)::int from public.posts where id = (select id from p) and not hidden), 1, 'dismissed: the post is back');
select is((select count(*)::int from public.notifications), 0, 'reporters'' outcome notices are private to them');

-- reopened, then accepted with a warning and a 3-day suspension
select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
select public.reopen_case('post', (select id from p));
select public.decide_case('post', (select id from p), true, true, 'تحذير: التزم بقواعد المجتمع', 3);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select is((select count(*)::int from public.notifications where kind in ('warn', 'suspend')), 2, 'the author is warned and told about the suspension');
select throws_ok($$ insert into public.posts (room, type, body) values ('tech', 'question', 'x') $$, '42501', null, 'a suspended member cannot post');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.notifications where kind = 'report'), 2, 'every reporter hears each outcome');

select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.audit_log), 3, 'every decision is audited');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.audit_log), 0, 'members cannot read the audit log');

select * from finish();
rollback;
