-- «تحديث جديد متاح»: the workflow (service role) announces a published bundle once to every member with a phone app; nobody else can.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../_fixtures.psql
select plan(14);

-- A and C have phones, B only a browser slot, D a phone but suspended; E (HR) a phone with the master switch off
insert into public.user_push_tokens (account_id, token, platform, lang) values
  ('00000000-0000-0000-0000-00000000000a', 'fcm-token-update-a-00000000000001', 'android', 'ar'),
  ('00000000-0000-0000-0000-00000000000c', 'apns-token-update-c-0000000000001', 'ios', 'en'),
  ('00000000-0000-0000-0000-00000000000b', 'web-token-update-b-00000000000001', 'web', 'ar'),
  ('00000000-0000-0000-0000-00000000000d', 'fcm-token-update-d-00000000000001', 'android', 'ar'),
  ('00000000-0000-0000-0000-00000000000e', 'fcm-token-update-e-00000000000001', 'android', 'ar');
update public.profiles set suspended_forever = true where id = '00000000-0000-0000-0000-00000000000d';
update public.profiles set settings = settings || '{"notify": false}'::jsonb where id = '00000000-0000-0000-0000-00000000000e';
delete from private.push_outbox;

-- members cannot call it
select pg_temp.as_user('00000000-0000-0000-0000-000000000002');
select throws_ok($$ select public.broadcast_app_update('0.26.0-1', 'x') $$, '42501', null, 'not even an admin from the app');
select pg_temp.as_anon();
select throws_ok($$ select public.broadcast_app_update('0.26.0-1', 'x') $$, '42501', null, 'nor anyone signed out');
reset role;

set local role service_role;
select throws_ok($$ select public.broadcast_app_update('../etc', 'x') $$, '22023', 'bad version', 'a malformed version is refused');
select throws_ok($$ select public.broadcast_app_update('0.26.0-1', '  ') $$, '22023', 'bad text', 'so is an empty title');
select is(public.broadcast_app_update('0.26.0-1791200000', 'تحديث جديد متاح لمنصة EngSpace 🚀', 'اضغط للتحديث الآن!', 'A new EngSpace update is available 🚀', 'Tap to update now!'), 3,
  'one notice for each member with a phone app who is not suspended (A, C, E)');
select is(public.broadcast_app_update('0.26.0-1791200000', 'تحديث جديد متاح لمنصة EngSpace 🚀', 'اضغط للتحديث الآن!'), 0, 'running it again for the same bundle sends nothing');
reset role;

select is((select count(*)::int from public.notifications where kind = 'update' and account_id = '00000000-0000-0000-0000-00000000000b'), 0, 'a browser-only member gets no update notice');
select is((select count(*)::int from public.notifications where kind = 'update' and account_id = '00000000-0000-0000-0000-00000000000d'), 0, 'a suspended account gets none');
select is((select category from public.notifications where kind = 'update' and account_id = '00000000-0000-0000-0000-00000000000a'), 'system', 'it is a system notice');
select is((select target from public.notifications where kind = 'update' and account_id = '00000000-0000-0000-0000-00000000000a'), '{"type": "update", "id": "0.26.0-1791200000"}'::jsonb, 'it opens the update (Home + check)');
select is((select en ->> 'title' from public.notifications where kind = 'update' and account_id = '00000000-0000-0000-0000-00000000000c'), 'A new EngSpace update is available 🚀', 'with its English text');

-- the lock screen: queued for A and C with the full text (no generic line — it names no member); E switched notifications off
select is((select count(*)::int from private.push_outbox where category = 'system'), 2, 'two pushes queued (master switch respected)');
select is((select body_ar from private.push_outbox where account_id = '00000000-0000-0000-0000-00000000000a'), 'اضغط للتحديث الآن!', 'the push carries the announcement');
select is((select data ->> 'type' from private.push_outbox where account_id = '00000000-0000-0000-0000-00000000000c'), 'update', 'and the update target');

select * from finish();
rollback;
