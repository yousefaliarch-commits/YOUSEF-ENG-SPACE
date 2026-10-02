-- Profiles, author snapshots, authorship privacy, signed-out access.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../_fixtures.psql
select plan(21);

-- every table in public has RLS on
select is((select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity), 0, 'RLS is enabled on every public table');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select is((select count(*)::int from public.profiles), 1, 'a member reads only their own profile');
select is((select name from public.profiles), 'أحمد سامي', 'sign-up metadata became the profile');
select throws_ok($$ update public.profiles set verified = true $$, '42501', null, 'a member cannot verify themselves');
select throws_ok($$ update public.profiles set staff = 'admin' $$, '42501', null, 'a member cannot make themselves staff');
select lives_ok($$ update public.profiles set city = 'newcairo' $$, 'a member updates their own data');
select throws_ok($$ select * from private.authorship $$, '42501', null, 'authorship is not readable');

-- a forged author snapshot is replaced by the server's
insert into public.posts (room, type, body, author_mode) values ('tech', 'question', 'سؤال مجهول', 'anon');
select is((select author ->> 'as' from public.posts where body = 'سؤال مجهول'), 'anon', 'anonymous post');
select ok((select not (author ? 'name') and not (author ? 'pid') and not (author ? 'gradYear') and not (author ? 'city') from public.posts where body = 'سؤال مجهول'),
  'an anonymous snapshot carries no name, pid, graduation year or city');
select is((select (author ->> 'verified')::boolean from public.posts where body = 'سؤال مجهول'), false, 'no badge without verification');
select throws_ok($$ insert into public.posts (room, type, body, author) values ('tech', 'question', 'x', '{"as":"public","name":"Fake","verified":true}') $$,
  '42501', null, 'the author column is not client-writable');
insert into public.posts (room, type, body, author_mode) values ('tech', 'question', 'سؤال علني', 'public');
select is((select author ->> 'name' from public.posts where body = 'سؤال علني'), 'أحمد سامي', 'a public post carries the real name');
select ok(public.is_mine('posts', (select id from public.posts where body = 'سؤال مجهول')), 'is_mine: my post');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select ok(not public.is_mine('posts', (select id from public.posts where body = 'سؤال مجهول')), 'is_mine: someone else''s post');
select is((select count(*)::int from public.posts), 2, 'members read the feed');
delete from public.posts where body = 'سؤال مجهول';
select is((select count(*)::int from public.posts where body = 'سؤال مجهول'), 1, 'a member cannot delete someone else''s post');

reset role;
-- renaming a verified account drops the badge
update public.profiles set verified = true, verify_kind = 'syndicate' where id = '00000000-0000-0000-0000-00000000000b';
update public.profiles set name = 'منى خالد محمد' where id = '00000000-0000-0000-0000-00000000000b';
select is((select verified from public.profiles where id = '00000000-0000-0000-0000-00000000000b'), false, 'renaming drops the badge');

-- deleting an account deletes what it wrote
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.delete_my_account();
reset role;
select is((select count(*)::int from public.posts), 0, 'the deleted member''s posts are gone');
select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-00000000000a'), 0, 'and the profile');

select pg_temp.as_anon();
select throws_ok($$ select * from public.posts $$, '42501', null, 'signed-out visitors read nothing');
select throws_ok($$ select public.is_staff() $$, '42501', null, 'signed-out visitors call nothing');

select * from finish();
rollback;
