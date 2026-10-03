-- Accounts from Google, Apple and phone sign-in: a profile is always created, and is marked for completion.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../_fixtures.psql
select plan(7);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_user_meta_data, raw_app_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a1', 'authenticated', 'authenticated', 'g@gmail.com', '', '{"full_name":"Mona Khaled","avatar_url":"https://x"}', '{"provider":"google"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a2', 'authenticated', 'authenticated', 'x1@privaterelay.appleid.com', '', '{}', '{"provider":"apple"}', now(), now());
insert into auth.users (instance_id, id, aud, role, phone, encrypted_password, raw_user_meta_data, raw_app_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a3', 'authenticated', 'authenticated', '201001234567', '', '{}', '{"provider":"phone"}', now(), now());

select is((select name from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'), 'Mona Khaled', 'Google: the full name becomes the profile name');
select is((select onboarded from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'), false, 'and the profile waits for completion');
select is((select name from public.profiles where id = '00000000-0000-0000-0000-0000000000a2'), 'x1', 'Apple without a name: the relay address stands in until completion');
select is((select name from public.profiles where id = '00000000-0000-0000-0000-0000000000a3'), 'عضو جديد', 'phone: a placeholder name');
select is((select onboarded from public.profiles where id = '00000000-0000-0000-0000-00000000000a'), true, 'registration-form accounts are onboarded at once');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000a3');
select lives_ok($$ update public.profiles set name = 'هاني سمير', disc = 'civil', gov = 'cairo', onboarded = true $$, 'the member completes their own profile');
select pg_temp.as_user('00000000-0000-0000-0000-000000000002');
select ok((select phone from public.admin_directory('2010') limit 1) like '%2010%', 'a phone-only member is found in the admin directory by number');

select * from finish();
rollback;
