-- Admins delete content for good; moderators can only hide it. Nothing that tied it to a member is left behind.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../_fixtures.psql
select plan(10);

-- A posts; B replies twice (a reply and a reply to it) and reacts
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.posts (room, type, body, author_mode) values ('general', 'question', 'منشور سيُحذف نهائيًا', 'anon');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.comments (post_id, type, text, author_mode) select id, 'text', 'رد أول', 'anon' from public.posts where body = 'منشور سيُحذف نهائيًا';
insert into public.comments (post_id, parent_id, type, text, author_mode) select post_id, id, 'text', 'رد على الرد', 'anon' from public.comments where text = 'رد أول';
insert into public.reactions (kind, item_id, useful) select 'posts', id, true from public.posts where body = 'منشور سيُحذف نهائيًا';
insert into public.posts (room, type, body, author_mode) values ('general', 'question', 'منشور فيه رد سيُحذف', 'anon');
insert into public.comments (post_id, type, text, author_mode) select id, 'text', 'رد مخالف', 'anon' from public.posts where body = 'منشور فيه رد سيُحذف';
insert into public.comments (post_id, parent_id, type, text, author_mode) select post_id, id, 'text', 'رد تحته', 'anon' from public.comments where text = 'رد مخالف';

-- moderators: hide yes, delete no
select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
select throws_ok($$ select public.admin_delete_content('post', (select id from public.posts where body = 'منشور سيُحذف نهائيًا')) $$, '42501', null, 'moderators cannot delete');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select throws_ok($$ select public.admin_delete_content('post', (select id from public.posts where body = 'منشور سيُحذف نهائيًا')) $$, '42501', null, 'members cannot delete others'' content');

-- an admin deletes the post
select pg_temp.as_user('00000000-0000-0000-0000-000000000002');
create temp table gone as select p.id as post, array(select c.id from public.comments c where c.post_id = p.id) as comments from public.posts p where p.body = 'منشور سيُحذف نهائيًا';
select lives_ok($$ select public.admin_delete_content('post', (select post from gone)) $$, 'an admin deletes a post');
reset role;
select is((select count(*)::int from public.posts where id = (select post from gone)), 0, 'the post is gone');
select is((select count(*)::int from public.comments where id in (select unnest(comments) from gone)), 0, 'and every reply under it');
select is((select count(*)::int from private.authorship where item_id = (select post from gone) or item_id in (select unnest(comments) from gone)), 0,
  'no authorship link survives that could tie the text to a member');
select is((select count(*)::int from public.reactions where item_id = (select post from gone)), 0, 'its reactions are gone');
select is((select target from public.audit_log order by at desc limit 1), 'post:' || (select post from gone), 'the audit log records the deletion by item id');

-- a reply and the replies beneath it
select pg_temp.as_user('00000000-0000-0000-0000-000000000002');
select lives_ok($$ select public.admin_delete_content('comment', (select id from public.comments where text = 'رد مخالف')) $$, 'an admin deletes a reply');
reset role;
select is((select count(*)::int from public.comments where text in ('رد مخالف', 'رد تحته')), 0, 'the reply and the one beneath it are gone; the post stays');

select * from finish();
rollback;
