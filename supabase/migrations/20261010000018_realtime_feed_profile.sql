-- EngSpace — realtime, part 2: what changes for a member while the app is open reaches the screen without a restart.
--  · member:<id> (private, as before) gets a «profile» ping when the server changes something about the member — verification
--    approved or withdrawn, role, staff, strikes, suspension — or the status of their verification request.
--  · topic «feed» (every signed-in member): a new post, a new comment, and moderation (hidden / restored / deleted) of posts,
--    comments, reviews and jobs. Payloads are ids only — never an author, never text — and the app then reads the item through
--    the usual RLS-checked queries, so a hidden item stays hidden.
--  · topic «staff» (staff only): reports and moderation decisions, so every open admin console follows the others.
-- Best-effort, like every send here: if Realtime is down the write still succeeds (the app also refreshes on focus).

create or replace function private.broadcast(topic text, event text, payload jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform realtime.send(payload, event, topic, true);
exception when others then null;
end $$;
revoke execute on function private.broadcast(text, text, jsonb) from public, anon, authenticated;

do $$ begin
  if to_regclass('realtime.messages') is not null then
    execute $p$ create policy "feed channel: members" on realtime.messages for select to authenticated
      using (realtime.topic() = 'feed') $p$;
    execute $p$ create policy "staff channel: staff" on realtime.messages for select to authenticated
      using (realtime.topic() = 'staff' and public.is_staff()) $p$;
  end if;
end $$;

-- ---------------------------------------------------------------- the feed
create or replace function private.feed_post_new() returns trigger
language plpgsql security definer set search_path = '' as $$
begin perform private.broadcast('feed', 'post', jsonb_build_object('id', new.id, 'room', new.room, 'type', new.type)); return null; end $$;
create trigger posts_feed_new after insert on public.posts for each row execute function private.feed_post_new();

create or replace function private.feed_comment_new() returns trigger
language plpgsql security definer set search_path = '' as $$
begin perform private.broadcast('feed', 'comment', jsonb_build_object('id', new.id, 'post', new.post_id)); return null; end $$;
create trigger comments_feed_new after insert on public.comments for each row execute function private.feed_comment_new();

-- moderation: one event shape for the four kinds ({ kind, id, hidden | gone }), to the feed and to the staff
create or replace function private.feed_moderation() returns trigger
language plpgsql security definer set search_path = '' as $$
declare k text := case tg_table_name when 'posts' then 'post' when 'comments' then 'comment' when 'company_reviews' then 'review' else 'job' end; p jsonb;
begin
  if tg_op = 'DELETE' then p := jsonb_build_object('kind', k, 'id', old.id, 'gone', true);
  elsif new.hidden is distinct from old.hidden then p := jsonb_build_object('kind', k, 'id', new.id, 'hidden', new.hidden);
  else return null; end if;
  perform private.broadcast('feed', 'moderation', p); perform private.broadcast('staff', 'moderation', p);
  return null;
end $$;
create trigger posts_moderation after update of hidden or delete on public.posts for each row execute function private.feed_moderation();
create trigger comments_moderation after update of hidden or delete on public.comments for each row execute function private.feed_moderation();
create trigger company_reviews_moderation after update of hidden or delete on public.company_reviews for each row execute function private.feed_moderation();
create trigger jobs_moderation after update of hidden or delete on public.jobs for each row execute function private.feed_moderation();

-- ---------------------------------------------------------------- staff: reports
create or replace function private.staff_report_ping() returns trigger
language plpgsql security definer set search_path = '' as $$
begin perform private.broadcast('staff', 'report', jsonb_build_object('id', new.id, 'status', new.status)); return null; end $$;
create trigger reports_staff_ping after insert or update of status on public.reports for each row execute function private.staff_report_ping();

-- ---------------------------------------------------------------- the member: «profile»
create or replace function private.profile_ping() returns trigger
language plpgsql security definer set search_path = '' as $$
begin perform private.ping(new.id, 'profile', jsonb_build_object('verified', new.verified, 'role', new.role, 'staff', new.staff)); return null; end $$;
create trigger profiles_ping after update on public.profiles for each row
  when (old.verified is distinct from new.verified or old.verify_kind is distinct from new.verify_kind or old.division is distinct from new.division
        or old.role is distinct from new.role or old.staff is distinct from new.staff or old.strikes is distinct from new.strikes
        or old.suspended_until is distinct from new.suspended_until or old.suspended_forever is distinct from new.suspended_forever
        or old.level is distinct from new.level)
  execute function private.profile_ping();

create or replace function private.verification_ping() returns trigger
language plpgsql security definer set search_path = '' as $$
begin perform private.ping(new.account_id, 'profile', jsonb_build_object('verification', new.status)); return null; end $$;
create trigger verification_requests_ping after insert or update of status on public.verification_requests for each row execute function private.verification_ping();
revoke execute on function private.feed_post_new(), private.feed_comment_new(), private.feed_moderation(), private.staff_report_ping(),
  private.profile_ping(), private.verification_ping() from public, anon, authenticated;
