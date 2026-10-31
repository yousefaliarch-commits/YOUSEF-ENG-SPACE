-- EngSpace — live sync of the Tools documents between a member's own devices (W5: phone ⇄ engspace.org on a desktop).
-- A write to one of the member's tool rows (toolIndex · toolShelfA…L) or to their project profiles (siteProjects) sends a
-- «tools» ping on the member's own private channel «member:<auth id>» (joinable only by them — 20261003000011_realtime.sql).
-- The ping names only the key and its timestamp, never a document: every open app of that member then pulls the changed rows
-- through RLS exactly as on resume. Best-effort like every ping (private.ping swallows a Realtime failure): the write itself
-- always succeeds, and the apps still pull on resume.

create or replace function private.tools_ping() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.ping(new.account_id, 'tools', jsonb_build_object('key', new.key, 'at', new.updated_at));
  return null;
end $$;
revoke execute on function private.tools_ping() from public, anon, authenticated;

drop trigger if exists member_state_tools_ping on public.member_state;
create trigger member_state_tools_ping after insert or update on public.member_state
  for each row when (new.key like 'tool%' or new.key = 'siteProjects') execute function private.tools_ping();
