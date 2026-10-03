-- The author edits and deletes their own post; every edit that changes the text is counted; nobody else can touch it.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../_fixtures.psql
select plan(25);

select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.posts (room, type, body, author_mode) values ('general', 'question', 'النص الأول للمنشور', 'anon');
insert into public.posts (room, type, body, author_mode) values ('general', 'question', 'منشور سيحذفه صاحبه', 'public');
create temp table mine as select id from public.posts where body = 'النص الأول للمنشور';
create temp table doomed as select id from public.posts where body = 'منشور سيحذفه صاحبه';
select is((select edit_count from public.posts where id = (select id from mine)), 0, 'a new post starts with no edits');
select is((select edited_at from public.posts where id = (select id from mine)), null, 'and no edit time');

-- clients cannot move the counter themselves
select throws_ok($$ update public.posts set edit_count = 9 where id = (select id from mine) $$, '42501', null, 'edit_count is not writable by a client');
select throws_ok($$ update public.posts set body = 'تحايل' where id = (select id from mine) $$, '42501', null, 'neither is the body (only the function edits)');

-- which posts are mine: ids of my own only
select is((select count(*)::int from public.my_posts() x where x = (select id from mine)), 1, 'my_posts() lists my post');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.my_posts() x where x = (select id from mine)), 0, 'and it is not in another member''s list');
select is((select count(*)::int from public.my_posts()), 0, 'a member with no posts gets an empty list');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');

-- the author edits
select is((select (public.edit_my_post((select id from mine), 'النص بعد التعديل الأول'))->>'edit_count')::int, 1, 'the first edit counts 1');
select is((select body from public.posts where id = (select id from mine)), 'النص بعد التعديل الأول', 'the text changed');
select isnt((select edited_at from public.posts where id = (select id from mine)), null, 'the edit time is set');
select is((select (public.edit_my_post((select id from mine), '  النص بعد التعديل الأول  '))->>'edit_count')::int, 1, 'saving the same text (spaces aside) is not an edit');
select is((select (public.edit_my_post((select id from mine), 'النص بعد التعديل الثاني'))->>'edit_count')::int, 2, 'the second edit counts 2');
select throws_ok($$ select public.edit_my_post((select id from mine), '   ') $$, '22023', null, 'an empty text is refused');
select throws_ok($$ select public.edit_my_post((select id from mine), repeat('ك', 5001)) $$, '22023', null, 'so is a text over 5000 characters');
select is((select count from (select count(*)::int from public.posts where id = (select id from mine) and edit_count = 2) t(count)), 1, 'two edits stored');

-- someone else cannot edit or delete it
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select throws_ok($$ select public.edit_my_post((select id from mine), 'سطو') $$, '42501', null, 'another member cannot edit it');
select throws_ok($$ select public.delete_my_post((select id from mine)) $$, '42501', null, 'nor delete it');
select throws_ok($$ select public.edit_my_post((select id from mine), 'سطو') $$, '42501', null, 'including through the function a second time');
reset role;
select is((select body from public.posts where id = (select id from mine)), 'النص بعد التعديل الثاني', 'the text is untouched');

-- moderation: a hidden post cannot be edited by its author
update public.posts set hidden = true where id = (select id from mine);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select throws_ok($$ select public.edit_my_post((select id from mine), 'محاولة بعد الإخفاء') $$, '42501', null, 'a post hidden by moderation cannot be edited');
reset role;
update public.posts set hidden = false where id = (select id from mine);

-- delete: replies, reactions, ballots and authorship go with it
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.comments (post_id, type, text, author_mode) select id, 'text', 'رد على المحذوف', 'anon' from doomed;
insert into public.reactions (kind, item_id, useful) select 'posts', id, true from doomed;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select lives_ok($$ select public.delete_my_post((select id from doomed)) $$, 'the author deletes their post');
reset role;
select is((select count(*)::int from public.posts where id = (select id from doomed)), 0, 'the post is gone');
select is((select count(*)::int from public.comments where text = 'رد على المحذوف'), 0, 'and its replies');
select is((select count(*)::int from public.reactions where item_id = (select id from doomed)), 0, 'and its reactions');
select is((select count(*)::int from private.authorship where item_id = (select id from doomed)), 0, 'and every authorship link');

select * from finish();
rollback;
