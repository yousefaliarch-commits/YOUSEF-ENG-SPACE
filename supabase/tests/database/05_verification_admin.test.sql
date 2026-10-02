-- Verification lifecycle, 7-day expiry, document bucket policies, admin-only controls.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../_fixtures.psql
select plan(24);

select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
select throws_ok($$ select public.submit_verification('{card}', '{00000000-0000-0000-0000-00000000000e/a.jpg}') $$, '42501', null, 'employer accounts are not verified');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select throws_ok($$ select public.submit_verification('{card}', '{00000000-0000-0000-0000-00000000000b/a.jpg}') $$, '42501', null, 'documents must be in your own folder');
select lives_ok($$ select public.submit_verification('{card,cert}', '{00000000-0000-0000-0000-00000000000a/card.jpg,00000000-0000-0000-0000-00000000000a/cert.jpg}') $$, 'submit');
select throws_ok($$ select public.submit_verification('{card}', '{00000000-0000-0000-0000-00000000000a/x.jpg}') $$, '23505', null, 'one pending request at a time');
select throws_ok($$ select public.decide_verification((select ref from public.verification_requests), true) $$, '42501', null, 'a member cannot decide');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.verification_requests), 0, 'other members never see a request');

select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.verification_requests where status = 'pending'), 1, 'the reviewer sees the queue');
select is(public.decide_verification((select ref from public.verification_requests), true, null, 'structural'),
  '{00000000-0000-0000-0000-00000000000a/card.jpg,00000000-0000-0000-0000-00000000000a/cert.jpg}'::text[], 'the decision returns the documents to delete');
select is((select doc_paths from public.verification_requests), '{}'::text[], 'the record keeps no document');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select is((select verified from public.profiles), true, 'the badge is on');
insert into public.posts (room, type, body) values ('tech', 'question', 'بعد التوثيق');
select is((select author ->> 'verified' from public.posts where body = 'بعد التوثيق'), 'true', 'the badge reaches the anonymous snapshot');

-- an unreviewed request expires after 7 days
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select public.submit_verification('{cert}', '{00000000-0000-0000-0000-00000000000c/cert.jpg}');
reset role;
update public.verification_requests set created_at = now() - interval '8 days' where status = 'pending';
select is(private.expire_verifications(), 1, 'one request expired');
select is((select status::text || ':' || cardinality(doc_paths) from public.verification_requests where name = 'كريم علي'), 'expired:0', 'expired and emptied');

-- the hourly sweep: documents of a pending request stay; decided, stray or 7-day-old ones go
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
select public.submit_verification('{cert}', '{00000000-0000-0000-0000-00000000000d/keep.jpg}');
reset role;
insert into storage.objects (bucket_id, name, created_at) values
  ('verification', '00000000-0000-0000-0000-00000000000d/keep.jpg', now() - interval '1 hour'),
  ('verification', '00000000-0000-0000-0000-00000000000a/card.jpg', now() - interval '1 hour'),
  ('verification', '00000000-0000-0000-0000-00000000000d/fresh.jpg', now());
select is(array(select public.verification_orphans() order by 1), '{00000000-0000-0000-0000-00000000000a/card.jpg}'::text[], 'the sweep targets decided documents only');
update storage.objects set created_at = now() - interval '8 days' where name like '%keep.jpg';
select ok('00000000-0000-0000-0000-00000000000d/keep.jpg' = any(array(select public.verification_orphans())), 'anything older than 7 days goes too');
select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
select throws_ok($$ select public.verification_orphans() $$, '42501', null, 'only the service role runs the sweep');

-- admin controls
select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
select throws_ok($$ select public.admin_set_config('{"readOnly": true}') $$, '42501', null, 'moderators cannot change platform settings');
select throws_ok($$ select public.admin_set_staff((select mod_ref from public.profiles), 'admin') $$, '42501', null, 'moderators cannot grant roles');
select pg_temp.as_user('00000000-0000-0000-0000-000000000002');
select is((public.admin_set_config('{"announce": {"on": true, "text": "صيانة الليلة", "tone": "warn"}}') -> 'announce' ->> 'text'), 'صيانة الليلة', 'admins publish an announcement');
select throws_ok($$ select public.admin_set_staff((select mod_ref from public.profiles where id = auth.uid()), 'member') $$, null, null, 'the last admin cannot be removed');

reset role;
create temp table bref as select mod_ref from public.profiles where id = '00000000-0000-0000-0000-00000000000b';
grant select on bref to authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000002');
select lives_ok($$ select public.admin_warn((select mod_ref from bref), 'التزم بالقواعد') $$, 'admins warn a member');
select throws_ok($$ select public.bootstrap_admin('a@example.com') $$, '42501', null, 'bootstrap_admin is not callable from the app');
reset role;
select throws_ok($$ select public.bootstrap_admin('a@example.com') $$, null, null, 'bootstrap_admin refuses once an admin exists');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select throws_ok($$ select public.admin_set_hidden('post', gen_random_uuid(), true) $$, '42501', null, 'members cannot hide content');

select * from finish();
rollback;
