-- Messages: identities never meet, threads are private to their two members.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../_fixtures.psql
select plan(10);

select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.posts (room, type, body, author_mode) values ('tech', 'question', 'منشور منى', 'anon');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select throws_ok($$ select * from private.threads $$, '42501', null, 'threads are not readable directly');
create temp table t as select public.start_thread('post', (select id from public.posts where body = 'منشور منى'), 'public', '{"type":"post"}', 'زميل فتح باب الرسائل') id;
grant select on t to authenticated;
select is((select public.start_thread('post', (select id from public.posts where body = 'منشور منى'), 'public')), (select id from t), 'the same pair and identities reuse one thread');
select lives_ok($$ select public.send_message((select id from t), 'شكرًا على ردّك') $$, 'send');
select throws_ok($$ select public.set_thread_identity((select id from t), 'anon') $$, null, null, 'my identity is fixed after my first message');
select throws_ok($$ select public.start_thread('post', (select id from public.posts where body = 'منشور منى' and false), 'anon') $$, null, null, 'unknown target');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select is((select with_author ->> 'name' from public.my_threads()), 'أحمد سامي', 'the other side sees the identity I chose');
select is((select with_author::text like '%00000000-0000%' from public.my_threads()), false, 'no account id reaches the other side');
select is((select unread from public.my_threads()), 1::bigint, 'unread count');
select is((select count(*)::int from public.thread_messages((select id from t)) where not from_me), 1, 'the recipient reads the message');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select is((select count(*)::int from public.thread_messages((select id from t))), 0, 'a third member reads nothing');

select * from finish();
rollback;
