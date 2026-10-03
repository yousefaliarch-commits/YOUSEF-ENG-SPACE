-- Push notifications: devices, preferences, the job-matching engine, community / message / support / salary producers,
-- the outbox, and what the Edge Function (service role) may do.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../_fixtures.psql
select plan(79);

-- profiles used by the matching rules: A civil/cairo 6 years · B civil/cairo 10 years · C civil/giza, graduation year unknown · D mechanical
update public.profiles set gov = 'cairo', grad_year = extract(year from now())::int - 6 where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set gov = 'cairo', grad_year = extract(year from now())::int - 10 where id = '00000000-0000-0000-0000-00000000000b';
update public.profiles set gov = 'giza', grad_year = null where id = '00000000-0000-0000-0000-00000000000c';
update public.profiles set gov = 'cairo' where id = '00000000-0000-0000-0000-00000000000d';

-- ---- the kind → category / preference tables
select is(private.notif_category('match'), 'jobs', 'a job match is a jobs notice');
select is(private.notif_category('reply'), 'community', 'a reply is a community notice');
select is(private.notif_category('message'), 'community', 'so is a private message');
select is(private.notif_category('support'), 'support', 'a ticket reply is a support notice');
select is(private.notif_category('team'), 'support', 'and so is a message from the team');
select is(private.notif_category('inflation'), 'system', 'inflation and salary notices are system notices');
select is(private.notif_category('verify'), 'system', 'account notices are system notices');
select is(private.notif_pref('match'), 'jobs', 'job matches follow the jobs switch');
select is(private.notif_pref('mention'), 'replies', 'mentions follow the replies switch');
select ok(private.notif_pref('mod') is null, 'moderation notices have no switch: they are always delivered');
select is(private.disc_title('civil', 'ar'), 'مهندس مدني', 'discipline names are printed in Arabic');
select is(private.gov_name('cairo', 'en'), 'Cairo', 'and governorates in English when asked');

-- ---- devices
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select lives_ok($$ select public.register_push_token('fcm-token-for-member-a-000000001', 'android', 'ar') $$, 'a member registers a device');
select is((select count(*)::int from public.my_push_devices()), 1, 'and sees one device, without its token');
select throws_ok($$ select token from public.user_push_tokens $$, '42501', null, 'tokens cannot be read by a client');
select throws_ok($$ insert into public.user_push_tokens (account_id, token, platform) values ('00000000-0000-0000-0000-00000000000a', 'x-token-written-directly-0000000', 'android') $$, '42501', null, 'nor written directly');
select throws_ok($$ select public.register_push_token('short', 'android') $$, '22023', 'bad token', 'a malformed token is refused');
select throws_ok($$ select public.register_push_token('fcm-token-for-member-a-000000002', 'blackberry') $$, '22023', 'bad platform', 'so is an unknown platform');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.my_push_devices()), 0, 'another member sees none of it');
select lives_ok($$ select public.register_push_token('fcm-token-for-member-a-000000001', 'android', 'en') $$, 'a phone handed to another member moves the token');
select is((select count(*)::int from public.my_push_devices()), 1, 'B now owns it');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select is((select count(*)::int from public.my_push_devices()), 0, 'and A no longer does');
select lives_ok($$ select public.register_push_token('fcm-token-for-member-a-000000001', 'android', 'ar') $$, 'A registers again');
select lives_ok($$ select public.unregister_push_token('fcm-token-for-member-a-000000001') $$, 'signing out drops the device');
select is((select count(*)::int from public.my_push_devices()), 0, 'and it is gone');
do $$ begin for i in 1..10 loop perform public.register_push_token('fcm-token-bulk-' || lpad(i::text, 20, '0'), 'android'); end loop; end $$;
select is((select count(*)::int from public.my_push_devices()), 8, 'a member keeps at most 8 devices');

-- ---- preferences
select is((select (public.my_notification_prefs() ->> 'jobs')::boolean), true, 'everything is on by default');
select throws_ok($$ select public.set_notification_prefs('{"colour":true}') $$, '22023', null, 'an unknown preference is refused');
select throws_ok($$ select public.set_notification_prefs('{"jobs":"no"}') $$, '22023', null, 'so is a non-boolean value');
select is((select (public.set_notification_prefs('{"salary":false}') ->> 'salary')::boolean), false, 'a switch is saved');
select is((select (public.my_notification_prefs() ->> 'jobs')::boolean), true, 'the others stay on');
select public.set_notification_prefs('{"salary":true}');
select throws_ok($$ select * from public.notification_prefs $$, '42501', null, 'the table itself is closed');

-- ---- a new job → the engineers it fits (HR posts; the job asks for 8–11 years, Cairo)
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
insert into public.jobs (title, gov, city, disc, years, contact) values ('مهندس مدني أول', 'cairo', 'nasr', 'civil', '[8,12)', '{"email":"jobs@example.com"}');
reset role;
select is((select count(*)::int from public.notifications where kind = 'match'), 1, 'only the engineer whose experience fits is notified (B, 10 years; not A, 6; C has no governorate; not D, not the supervisor)');
select is((select account_id::text from public.notifications where kind = 'match'), '00000000-0000-0000-0000-00000000000b', 'it is B');
select is((select title from public.notifications where kind = 'match'), 'فرصة هندسية جديدة تناسب تخصصك: مهندس مدني أول', 'the title names the job');
select is((select body from public.notifications where kind = 'match'), 'ريدكون تبحث عن مهندس مدني في القاهرة. اضغط للاطلاع على التفاصيل والتقديم.', 'the body names the company, the discipline and the place');
select is((select target ->> 'type' from public.notifications where kind = 'match'), 'job', 'tapping it opens a job');
select is((select target ->> 'id' from public.notifications where kind = 'match'), (select id::text from public.jobs limit 1), 'that job');
select is((select en ->> 'body' from public.notifications where kind = 'match'), 'ريدكون is hiring a Civil Engineer in Cairo. Tap to see the details and apply.', 'with English text for an English interface');

-- a remote job without a range fits every civil engineer who is switched on
update public.profiles set settings = settings || '{"notify":false}' where id = '00000000-0000-0000-0000-00000000000b';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.set_notification_prefs('{"jobs":false}');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
insert into public.jobs (title, gov, disc, mode, contact) values ('مهندس موقع عن بعد', 'cairo', 'civil', 'remote', '{"email":"jobs@example.com"}');
reset role;
select is((select count(*)::int from public.notifications where kind = 'match' and title like '%عن بعد'), 1, 'A (jobs off) and B (everything off) are skipped; C, in Giza, gets a remote job');
select is((select account_id::text from public.notifications where kind = 'match' and title like '%عن بعد'), '00000000-0000-0000-0000-00000000000c', 'it is C');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.set_notification_prefs('{"jobs":true}');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
insert into public.jobs (title, gov, disc, years, contact) values ('مهندس لا يطابق أحدًا', 'aswan', 'civil', '[1,3)', '{"email":"jobs@example.com"}');
reset role;
select is((select count(*)::int from public.notifications where kind = 'match' and title like '%لا يطابق%'), 0, 'a governorate nobody is in matches nobody');
update public.profiles set settings = settings - 'notify' where id = '00000000-0000-0000-0000-00000000000b';
-- three job alerts a day, no more
insert into public.notifications (account_id, kind, title, body) select '00000000-0000-0000-0000-00000000000a', 'match', 'x', 'x' from generate_series(1, 3);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
insert into public.jobs (title, gov, disc, years, contact) values ('مهندس بعد الحد اليومي', 'cairo', 'civil', '[4,8)', '{"email":"jobs@example.com"}');
reset role;
select is((select count(*)::int from public.notifications where account_id = '00000000-0000-0000-0000-00000000000a' and title like '%بعد الحد اليومي'), 0, 'a member who already had 3 job alerts today gets no fourth');

-- ---- the outbox: a notice becomes a push only with a device and the switch on
delete from public.notifications;
delete from private.push_outbox;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.register_push_token('fcm-token-for-member-a-000000009', 'android', 'ar');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.posts (room, type, body, author_mode) values ('general', 'question', 'سؤال عن مرتب مهندس تنفيذ', 'anon');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.comments (post_id, type, text, author_mode) select id, 'text', 'رد أول', 'anon' from public.posts where body = 'سؤال عن مرتب مهندس تنفيذ';
reset role;
select is((select count(*)::int from public.notifications where kind = 'reply'), 1, 'B is told about the reply to their post');
select is((select account_id::text from public.notifications where kind = 'reply'), '00000000-0000-0000-0000-00000000000b', 'B, not the replier');
select is((select count(*)::int from private.push_outbox), 0, 'B has no device, so nothing is queued');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select public.register_push_token('fcm-token-for-member-b-000000009', 'ios', 'en');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.comments (post_id, type, text, author_mode) select id, 'text', 'رد ثان', 'anon' from public.posts where body = 'سؤال عن مرتب مهندس تنفيذ';
reset role;
select is((select count(*)::int from public.notifications where kind = 'reply'), 1, 'a burst of replies is one notice');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
update public.notifications set read = true where kind = 'reply';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.comments (post_id, type, text, author_mode) select id, 'text', 'رد ثالث', 'anon' from public.posts where body = 'سؤال عن مرتب مهندس تنفيذ';
reset role;
select is((select count(*)::int from private.push_outbox where account_id = '00000000-0000-0000-0000-00000000000b'), 1, 'once read, the next reply is a new notice and one push');
select is((select body_ar from private.push_outbox where account_id = '00000000-0000-0000-0000-00000000000b'), 'اضغط للعرض', 'a reply push says nothing about the reply');
select is((select body_en from private.push_outbox where account_id = '00000000-0000-0000-0000-00000000000b'), 'Tap to view', 'in English too');
select is((select data ->> 'type' from private.push_outbox where account_id = '00000000-0000-0000-0000-00000000000b'), 'post', 'the push carries where to go');
-- replying to your own post tells nobody; a mention tells the mentioned member
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.comments (post_id, type, text, author_mode) select id, 'text', 'شكرًا', 'anon' from public.posts where body = 'سؤال عن مرتب مهندس تنفيذ';
reset role;
select is((select count(*)::int from public.notifications where account_id = '00000000-0000-0000-0000-00000000000b' and kind = 'reply'), 2, 'answering your own post is not news to you (the two earlier notices stand, no third)');
select set_config('app.a_anon', (select anon from public.profiles where id = '00000000-0000-0000-0000-00000000000a'), true);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
insert into public.comments (post_id, type, text, author_mode) select id, 'text', 'تعليق فيه إشارة @' || current_setting('app.a_anon'), 'anon' from public.posts where body = 'سؤال عن مرتب مهندس تنفيذ';
reset role;
select is((select count(*)::int from public.notifications where account_id = '00000000-0000-0000-0000-00000000000a' and kind = 'mention'), 1, 'an @handle notifies its owner');

-- ---- direct messages and the team
delete from public.notifications; delete from private.push_outbox;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
create temp table th as select public.start_thread('post', (select id from public.posts where body = 'سؤال عن مرتب مهندس تنفيذ'), 'anon') id;
select public.send_message((select id from th), 'السلام عليكم');
select public.send_message((select id from th), 'ممكن أسألك سؤال؟');
reset role;
select is((select count(*)::int from public.notifications where kind = 'message'), 1, 'two messages in a row are one notice');
select is((select body from public.notifications where kind = 'message'), 'اضغط لفتح المحادثة', 'it never carries the message text');
select is((select account_id::text from public.notifications where kind = 'message'), '00000000-0000-0000-0000-00000000000b', 'for the recipient');
select set_config('app.a_pid', (select pid from public.profiles where id = '00000000-0000-0000-0000-00000000000a'), true);
select pg_temp.as_user('00000000-0000-0000-0000-000000000002');
select public.admin_message(current_setting('app.a_pid'), 'مرحبًا من الفريق');
reset role;
select is((select category from public.notifications where kind = 'team'), 'support', 'a message from the team is a support notice');
select is((select title from public.notifications where kind = 'team'), 'رسالة من فريق EngSpace', 'signed «فريق EngSpace», never an admin');

-- ---- support tickets
delete from public.notifications;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
create temp table tk as select public.open_ticket('account', 'لا أستطيع تغيير بريدي', 'حاولت أكثر من مرة وتظهر رسالة خطأ') id;
select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
select public.staff_set_ticket_status((select id from tk), 'review');
reset role;
select is((select count(*)::int from public.notifications where kind = 'support'), 1, 'a status change tells the ticket''s owner');
select is((select body from public.notifications where kind = 'support'), 'لا أستطيع تغيير بريدي — قيد المراجعة', 'which status');
select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
select public.staff_set_ticket_status((select id from tk), 'review');
select public.staff_reply_ticket((select id from tk), 'جرّب الآن', 'answered');
reset role;
select is((select count(*)::int from public.notifications where kind = 'support'), 2, 'the same status again is not news; a reply is');
select is((select en ->> 'title' from public.notifications where title = 'ردّ فريق الدعم على تذكرتك'), 'The support team replied to your ticket', 'a team reply has English text');

-- ---- salary and inflation
delete from public.notifications;
update public.profiles set grad_year = extract(year from now())::int - 4 where id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');
select pg_temp.as_user('00000000-0000-0000-0000-000000000002');
insert into public.inflation_rates (month, yoy) values ('2030-02-01', 12.5);
reset role;
select ok((select count(*) from public.notifications where kind = 'inflation') >= 4, 'a new inflation month tells the engineers');
select is((select title from public.notifications where kind = 'inflation' limit 1), 'تحديث التضخم: 12.5٪ سنويًا', 'with the figure');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.set_notification_prefs('{"salary":false}');
select pg_temp.as_user('00000000-0000-0000-0000-000000000002');
insert into public.inflation_rates (month, yoy) values ('2030-03-01', 11.0);
reset role;
select is((select count(*)::int from public.notifications where kind = 'inflation' and title like '%11.0%' and account_id = '00000000-0000-0000-0000-00000000000a'), 0, 'a member with salary alerts off gets none');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.set_notification_prefs('{"salary":true}');
insert into public.salary_shares (disc, years, salary, gov, company, title) values ('civil', 4, 15000, 'cairo', 'أ', 'مهندس'), ('civil', 4, 15500, 'cairo', 'أ', 'مهندس');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.salary_shares (disc, years, salary, gov, company, title) values ('civil', 4, 16000, 'cairo', 'ب', 'مهندس'), ('civil', 4, 16500, 'cairo', 'ب', 'مهندس');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.salary_shares (disc, years, salary, gov, company, title) values ('civil', 4, 17000, 'cairo', 'ج', 'مهندس');
reset role;
select is((select count(*)::int from public.notifications where kind = 'salary'), 2, 'the fifth report in a cell tells the members who have shared there (A and B), once');

-- ---- the Edge Function's side: service role only
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select throws_ok($$ select * from public.push_claim(10) $$, '42501', null, 'a signed-in member cannot claim the queue');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select throws_ok($$ select public.push_finish('[]') $$, '42501', null, 'nor finish it');
reset role;
delete from private.push_outbox;
insert into public.notifications (account_id, kind, title, body, target) values ('00000000-0000-0000-0000-00000000000a', 'match', 'فرصة', 'تفاصيل', '{"type":"job","id":"j1"}');
set local role service_role;
create temp table claimed as select * from public.push_claim(10);
select is((select count(*)::int from claimed), 1, 'the service role claims the queued push');
select is((select jsonb_array_length(tokens) from claimed), 8, 'with the member''s devices');
select is((select count(*)::int from public.push_claim(10)), 0, 'a claimed push is not claimed twice');
select lives_ok($$ select public.push_finish(jsonb_build_array(jsonb_build_object('id', (select id from claimed), 'status', 'sent', 'dead', jsonb_build_array('fcm-token-for-member-a-000000009')))) $$, 'the result is reported');
reset role;
select is((select status from private.push_outbox), 'sent', 'the push is marked sent');
select is((select count(*)::int from public.user_push_tokens where token = 'fcm-token-for-member-a-000000009'), 0, 'a dead token is deleted');
update private.push_outbox set status = 'pending', created_at = now() - interval '2 days';
select private.push_housekeeping();
select is((select status from private.push_outbox), 'skipped', 'a push older than a day is dropped, not sent late');

-- ---- the test button, the dispatcher without secrets, account deletion
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select lives_ok($$ select public.send_test_push() $$, 'a member sends themself a test');
select throws_ok($$ select public.send_test_push() $$, '54000', null, 'but only one a minute');
reset role;
select lives_ok($$ select private.kick_push() $$, 'the dispatcher does nothing, quietly, without Vault secrets');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.delete_my_account();
reset role;
select is((select count(*)::int from public.user_push_tokens where account_id = '00000000-0000-0000-0000-00000000000a'), 0, 'deleting an account deletes its devices');

select * from finish();
rollback;
