-- EngSpace — realtime: new messages and notifications reach the open app at once (Supabase Realtime, private channels).
-- Privacy: each member listens on their own private channel "member:<auth id>" (only they may join it — the policy below).
-- A new message sends only a ping with the thread id, never the text or the sender: the app then reads the thread through
-- thread_messages(), which applies every rule as before. A notification carries the member's own notification row.
-- Every send is best-effort: if Realtime is unavailable, the write itself still succeeds (the app also refreshes on focus).

create or replace function private.ping(member uuid, event text, payload jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform realtime.send(payload, event, 'member:' || member::text, true);
exception when others then null; -- realtime missing or down: never block the message or the notification
end $$;

create or replace function private.message_ping() returns trigger
language plpgsql security definer set search_path = '' as $$
declare th private.threads;
begin
  select * into th from private.threads where id = new.thread_id;
  perform private.ping(case when new.sender = th.a then th.b else th.a end, 'message', jsonb_build_object('thread', new.thread_id));
  return null;
end $$;
create trigger messages_ping after insert on private.messages for each row execute function private.message_ping();

create or replace function private.notification_ping() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.ping(new.account_id, 'notification', jsonb_build_object('id', new.id, 'kind', new.kind, 'title', new.title,
    'body', new.body, 'target', new.target, 'created_at', new.created_at));
  return null;
end $$;
create trigger notifications_ping after insert on public.notifications for each row execute function private.notification_ping();

-- only the member may listen on their own channel (Realtime checks this policy when a client joins a private channel)
do $$ begin
  if to_regclass('realtime.messages') is not null then
    execute $p$ create policy "member channel: own only" on realtime.messages for select to authenticated
      using (realtime.topic() = 'member:' || (select auth.uid())::text) $p$;
  end if;
end $$;

revoke execute on function private.ping(uuid, text, jsonb) from public, anon, authenticated;
