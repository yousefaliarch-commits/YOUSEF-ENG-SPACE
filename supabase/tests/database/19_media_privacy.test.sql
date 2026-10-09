-- Media privacy (Phase 1.3): no account id in anything a member can read, uploads only through the function, and the payslip rule
-- for images decided on the server — HR, owner and supervisor accounts see an image only after staff review it as clean.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../_fixtures.psql
select plan(31);

create or replace function pg_temp.as_service() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  execute 'set local role service_role';
end $$;
grant execute on function pg_temp.as_service() to public;
create or replace function pg_temp.reg(owner uuid, kind text, bucket text, path text) returns void language sql as $$
  select public.media_register(owner, kind, bucket, path, 'image/webp', 180000, 1600, 1200)
$$;
grant execute on function pg_temp.reg(uuid, text, text, text) to public;

-- ---------------------------------------------------------------- the registry belongs to the function
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select throws_ok($$ select public.media_register(auth.uid(), 'post', 'media', 'p/11111111-1111-4111-8111-111111111111.webp', 'image/webp', 1, 1, 1) $$,
  '42501', null, 'members cannot register uploads themselves');
select throws_ok($$ select * from public.post_images $$, '42501', null, 'members cannot read post_images directly');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('media', auth.uid()::text || '/x.jpg') $$,
  '42501', null, 'members cannot upload into the public media bucket any more');
reset role;

select pg_temp.as_service();
select lives_ok($$ select pg_temp.reg('00000000-0000-0000-0000-00000000000a', 'post', 'media', 'p/aaaaaaaa-0000-4000-8000-000000000001.webp') $$, 'the function registers an upload');
select pg_temp.reg('00000000-0000-0000-0000-00000000000b', 'post', 'media', 'p/bbbbbbbb-0000-4000-8000-000000000001.webp');
select pg_temp.reg('00000000-0000-0000-0000-00000000000a', 'post', 'media', 'p/aaaaaaaa-0000-4000-8000-000000000002.webp');
select pg_temp.reg('00000000-0000-0000-0000-00000000000a', 'avatar', 'media', 'a/aaaaaaaa-0000-4000-8000-0000000000a1.webp');
select pg_temp.reg('00000000-0000-0000-0000-00000000000b', 'avatar', 'media', 'a/bbbbbbbb-0000-4000-8000-0000000000b1.webp');
select pg_temp.reg('00000000-0000-0000-0000-00000000000a', 'inspection', 'inspections', '00000000-0000-0000-0000-00000000000a/i1.webp');
do $$ begin for i in 1..30 loop perform public.media_register('00000000-0000-0000-0000-00000000000d', 'post', 'media',
  'p/dddddddd-0000-4000-8000-' || lpad(i::text, 12, '0') || '.webp', 'image/webp', 1000, 10, 10); end loop; end $$;
select throws_ok($$ select pg_temp.reg('00000000-0000-0000-0000-00000000000d', 'post', 'media', 'p/dddddddd-0000-4000-8000-999999999999.webp') $$,
  '54000', 'media rate limited', 'the 31st upload in 10 minutes is refused');
reset role; select set_config('request.jwt.claims', '', true);

-- ---------------------------------------------------------------- posting an image
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select throws_ok($$ insert into public.posts (room, type, body, author_mode, data) values ('general', 'question', 'صورة بالطريقة القديمة',
  'anon', jsonb_build_object('image', jsonb_build_object('path', auth.uid()::text || '/old.jpg', 'src', 'https://x/' || auth.uid()::text || '/old.jpg'))) $$,
  '22023', 'image upload required', 'an old-style path (the account id folder) is refused');
select throws_ok($$ insert into public.posts (room, type, body, author_mode, data) values ('general', 'question', 'صورة عضو آخر',
  'anon', '{"image":{"path":"p/bbbbbbbb-0000-4000-8000-000000000001.webp"}}') $$, '22023', 'image not found', 'someone else''s upload is refused');
select lives_ok($$ insert into public.posts (room, type, body, author_mode, data) values ('general', 'question', 'صورة صب سقف الدور الثالث',
  'anon', '{"image":{"path":"p/aaaaaaaa-0000-4000-8000-000000000001.webp","src":"https://evil.example/pixel.png","w":9999,"h":1,"tone":"rgb(10,20,30)","alt":"سقف","money":false},"evil":{"x":1}}') $$,
  'the author''s own fresh upload is accepted');
select throws_ok($$ insert into public.posts (room, type, body, author_mode, data) values ('general', 'question', 'إعادة استخدام نفس الصورة',
  'anon', '{"image":{"path":"p/aaaaaaaa-0000-4000-8000-000000000001.webp"}}') $$, '22023', 'image not found', 'an upload is used once');
reset role;
create temp table img_post as select id from public.posts where body = 'صورة صب سقف الدور الثالث';
grant select on img_post to public;

select is((select data -> 'image' from public.posts where id = (select id from img_post)),
  '{"w": 1600, "h": 1200, "alt": "سقف", "tone": "rgb(10,20,30)"}'::jsonb,
  'the post keeps only geometry, colour and alt text — the size comes from the upload, not the phone');
select ok(not ((select data from public.posts where id = (select id from img_post)) ? 'evil'), 'unknown keys are dropped');
select ok(position('00000000-0000-0000-0000-00000000000a' in (select data::text || author::text from public.posts where id = (select id from img_post))) = 0,
  'nothing readable on the post carries the author''s account id');
select is((select client_scan from public.post_images where post_id = (select id from img_post)), 'clean', 'the phone''s reading is kept as a hint only');
select is((select scan from public.post_images where post_id = (select id from img_post)), 'unchecked', 'the server decision starts unchecked');

-- ---------------------------------------------------------------- who sees it
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');   -- engineer
select is((select path from public.post_media(array[(select id from img_post)])), 'p/aaaaaaaa-0000-4000-8000-000000000001.webp', 'engineers see it at once');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');   -- HR
select is((select row(path, state)::text from public.post_media(array[(select id from img_post)])), '(,unchecked)', 'HR gets no path until staff review it');
select throws_ok($$ select public.staff_review_image((select id from img_post), 'clean') $$, '42501', 'staff only', 'and cannot review it');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000f');   -- supervisor
select is((select path from public.post_media(array[(select id from img_post)])), null, 'nor does a site supervisor');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');   -- the author
select is((select state from public.post_media(array[(select id from img_post)])), 'shown', 'the author always sees their own');
select pg_temp.as_user('00000000-0000-0000-0000-000000000001');   -- moderator
select is((select count(*)::int from public.staff_image_queue() where post_id = (select id from img_post)), 1, 'staff see it in the review queue');
select public.staff_review_image((select id from img_post), 'clean');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
select is((select state from public.post_media(array[(select id from img_post)])), 'shown', 'once reviewed clean, HR sees it');
select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
select public.staff_review_image((select id from img_post), 'money');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
select is((select row(path, state)::text from public.post_media(array[(select id from img_post)])), '(,money)', 'marked as money: hidden from HR again');
reset role;
select is((select count(*)::int from public.audit_log where action = 'image_review'), 2, 'each review is audited');
update public.posts set hidden = true where id = (select id from img_post);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select is((select count(*)::int from public.post_media(array[(select id from img_post)])), 0, 'a hidden post''s image is not handed out');
reset role; select set_config('request.jwt.claims', '', true);

-- ---------------------------------------------------------------- profile photos
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select throws_ok($$ update public.profiles set photo_path = 'a/bbbbbbbb-0000-4000-8000-0000000000b1.webp' where id = auth.uid() $$,
  '42501', 'not your photo', 'a member cannot use someone else''s photo');
select lives_ok($$ update public.profiles set photo_path = 'a/aaaaaaaa-0000-4000-8000-0000000000a1.webp', default_identity = 'public' where id = auth.uid() $$,
  'their own uploaded photo is accepted');
insert into public.posts (room, type, body, author_mode) values ('general', 'question', 'سؤال باسمي مع الصورة', 'public');
reset role;
select is((select author ->> 'photo' from public.posts where body = 'سؤال باسمي مع الصورة'), 'a/aaaaaaaa-0000-4000-8000-0000000000a1.webp',
  'a public post carries the photo''s random path, never the account id');

-- ---------------------------------------------------------------- inspection photos are private to their owner
insert into storage.objects (bucket_id, name, owner) values ('inspections', '00000000-0000-0000-0000-00000000000a/i1.webp', '00000000-0000-0000-0000-00000000000a');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select is((select count(*)::int from storage.objects where bucket_id = 'inspections'), 0, 'another member cannot see an inspection photo');
reset role;
select pg_temp.as_service();
select is((select count(*)::int from public.media_removable('00000000-0000-0000-0000-00000000000a', array['00000000-0000-0000-0000-00000000000a/i1.webp'])), 1,
  'its owner may remove it');
select is((select count(*)::int from public.media_removable('00000000-0000-0000-0000-00000000000b', array['00000000-0000-0000-0000-00000000000a/i1.webp'])), 0,
  'nobody else may');

-- ---------------------------------------------------------------- the janitor
reset role; select set_config('request.jwt.claims', '', true);
update private.media_uploads set created_at = now() - interval '2 days' where path = 'p/aaaaaaaa-0000-4000-8000-000000000002.webp';
delete from public.posts where id = (select id from img_post);
select pg_temp.as_service();
select set_eq($$ select path from public.media_orphans() where path like 'p/aaaaaaaa%' $$,
  array['p/aaaaaaaa-0000-4000-8000-000000000001.webp', 'p/aaaaaaaa-0000-4000-8000-000000000002.webp'],
  'the janitor finds the deleted post''s image and the abandoned upload');
reset role;

select * from finish();
rollback;
