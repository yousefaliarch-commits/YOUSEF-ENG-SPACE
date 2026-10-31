-- Live sync of the Tools documents: a write to a member's tool rows or project profiles pings only that member's own channel,
-- carries no document, can never fail the write, and nobody can call the ping function directly.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../_fixtures.psql
select plan(9);

select has_trigger('public', 'member_state', 'member_state_tools_ping', 'member_state has the tools ping trigger');
select matches(
  (select pg_get_triggerdef(t.oid) from pg_trigger t where t.tgname = 'member_state_tools_ping'),
  'AFTER INSERT OR UPDATE ON public.member_state FOR EACH ROW WHEN \(\(\(new.key ~~ ''tool%''::text\) OR \(new.key = ''siteProjects''::text\)\)\)',
  'it fires after a write, only for the tool rows and the project profiles'
);
select ok(not has_function_privilege('authenticated', 'private.tools_ping()', 'execute'), 'members cannot call the ping function');
select ok(not has_function_privilege('anon', 'private.tools_ping()', 'execute'), 'nor anyone signed out');
select matches(pg_get_functiondef('private.tools_ping()'::regprocedure), 'jsonb_build_object\(''key'', new.key, ''at'', new.updated_at\)',
  'the ping names the key and its time — never the document');

-- a member's own writes always succeed, with Realtime present or not
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select lives_ok($$ insert into public.member_state (account_id, key, value) values (auth.uid(), 'toolIndex', '{"docs": [], "tombs": []}'::jsonb) $$,
  'a new tool index is saved');
select lives_ok($$ update public.member_state set value = '{"docs": [{"id": "d1"}]}'::jsonb, updated_at = now() where account_id = auth.uid() and key = 'toolIndex' $$,
  'and rewritten');
select lives_ok($$ insert into public.member_state (account_id, key, value) values (auth.uid(), 'siteProjects', '[]'::jsonb) $$,
  'project profiles too');
select lives_ok($$ insert into public.member_state (account_id, key, value) values (auth.uid(), 'saved', '{}'::jsonb) $$,
  'other keys are untouched by the trigger');
reset role;

select * from finish();
rollback;
