-- Admin member directory (anonymity kept), team messages and support tickets, as real members.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../_fixtures.psql
select plan(26);

-- A writes one public and one anonymous post
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.posts (room, type, body, author_mode) values ('general', 'question', 'منشور علني باسمي للاختبار', 'public');
insert into public.posts (room, type, body, author_mode) values ('general', 'question', 'منشور مجهول للاختبار فقط', 'anon');

-- ---- the directory: admins only, full identity, never the moderation reference
select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
select throws_ok($$ select * from public.admin_directory() $$, '42501', null, 'moderators do not get the member directory');
select pg_temp.as_user('00000000-0000-0000-0000-000000000002');
select is((select name from public.admin_directory('a@example.com')), 'أحمد سامي', 'admins see the member''s name');
select is((select email from public.admin_directory('أحمد')), 'a@example.com', 'and the full e-mail (search by name)');
select is((select public_posts from public.admin_directory('a@example.com')), 1, 'activity counts public items only');
select ok(not exists (select 1 from public.admin_directory() d join public.profiles p on p.pid = d.pid where to_jsonb(d)::text like '%' || p.mod_ref || '%'),
  'no directory row carries a moderation reference');
select is((select count(*)::int from public.admin_public_items((select pid from public.admin_directory('a@example.com')))), 1,
  'a member''s item list shows their public posts only, never the anonymous one');
select ok(not (select to_jsonb(x) ? 'email_masked' or to_jsonb(x) ? 'gov' or to_jsonb(x) ? 'created_at' from public.admin_accounts() x limit 1),
  'the moderation list (by mod_ref) no longer carries details that would match it to the directory');
select lives_ok(format($$ select public.admin_directory_set_staff(%L, 'moderator') $$, (select pid from public.admin_directory('c@example.com'))),
  'admins set a staff role from the directory');
select is((select target from public.audit_log order by at desc limit 1), (select pid from public.admin_directory('c@example.com')),
  'and the audit log names the member by public id, not by moderation reference');

-- ---- team messages
select lives_ok(format($$ select public.admin_message(%L, 'مرحبًا، نحتاج توضيحًا بخصوص حسابك') $$, (select pid from public.admin_directory('b@example.com'))),
  'an admin writes to a member');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select is((select with_author ->> 'name' from public.my_threads() limit 1), 'فريق EngSpace', 'the member sees «فريق EngSpace», not the admin''s name');
select ok((select (with_author ->> 'team')::boolean from public.my_threads() limit 1), 'marked as a team thread');
select lives_ok($$ select public.send_message((select id from public.my_threads() limit 1), 'شكرًا، هذا التوضيح') $$, 'the member replies in the same thread');
select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
select throws_ok($$ select public.admin_message('u-nobody', 'x') $$, '42501', null, 'moderators cannot send team messages');

-- ---- support tickets
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select lives_ok($$ select public.open_ticket('account', 'لا أستطيع تغيير بريدي', 'حاولت أكثر من مرة وتظهر رسالة خطأ') $$, 'a member opens a ticket');
select throws_ok($$ select public.open_ticket('other', 'مرفق ليس لي', 'نص', '00000000-0000-0000-0000-00000000000a/x.jpg') $$, '42501', null, 'an attachment must be in the member''s own folder');
select is((select status::text from public.support_tickets), 'open', 'it starts open');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select is((select count(*)::int from public.support_tickets), 0, 'other members never see it');
select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
select is((select member_email from public.staff_tickets()), 'b•••@example.com', 'moderators see the ticket with a masked e-mail');
select lives_ok($$ select public.staff_reply_ticket((select id from public.support_tickets), 'تم إصلاح المشكلة — جرّب الآن') $$, 'staff reply');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select is((select status::text from public.support_tickets), 'answered', 'the ticket is answered');
select is((select count(*)::int from public.notifications where kind = 'support'), 1, 'and the member is notified');
select is((select count(*)::int from public.ticket_messages where from_staff), 1, 'the member reads the staff reply');
select lives_ok($$ select public.reply_ticket((select id from public.support_tickets), 'نجح الأمر، شكرًا') $$, 'the member answers back');
select lives_ok($$ select public.close_my_ticket((select id from public.support_tickets)) $$, 'and closes the ticket');
select throws_ok($$ select public.reply_ticket((select id from public.support_tickets), 'رسالة بعد الإغلاق') $$, '42501', null, 'a closed ticket takes no more messages');

select * from finish();
rollback;
