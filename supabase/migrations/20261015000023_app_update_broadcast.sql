-- =====================================================================
--  v0.1.14 — «تحديث جديد متاح»: one lock-screen notice per member and per published web bundle (docs/OTA.md, docs/PUSH.md)
--  Called by the "Publish web update" workflow (service role only) right after the bundle and its manifest are live, so a phone
--  that opens from the notice finds the update at once. Goes only to members with a phone app registered (the web is always the
--  latest deploy) and never to a suspended account. Kind 'update' → category system, no preference switch (like account notices),
--  but the master switch still applies (private.notification_push). The text is the team's own announcement — it names no member.
--  The target { type: 'update', id: <bundle version> } makes the app open on Home and run the update check (domain/notifications.ts).
-- =====================================================================
create or replace function public.broadcast_app_update(p_version text, p_title text, p_body text default '', p_title_en text default null, p_body_en text default null)
returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if coalesce(p_version, '') !~ '^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$' then raise exception 'bad version' using errcode = '22023'; end if;
  if coalesce(btrim(p_title), '') = '' or length(p_title) > 120 or length(coalesce(p_body, '')) > 400
     or length(coalesce(p_title_en, '')) > 120 or length(coalesce(p_body_en, '')) > 400 then
    raise exception 'bad text' using errcode = '22023';
  end if;
  insert into public.notifications (account_id, kind, title, body, target, en)
  select p.id, 'update', btrim(p_title), btrim(coalesce(p_body, '')), jsonb_build_object('type', 'update', 'id', p_version),
    jsonb_build_object('title', coalesce(nullif(btrim(p_title_en), ''), btrim(p_title)), 'body', coalesce(nullif(btrim(p_body_en), ''), btrim(coalesce(p_body, ''))))
  from public.profiles p
  where not (p.suspended_forever or coalesce(p.suspended_until > now(), false))
    and exists (select 1 from public.user_push_tokens t where t.account_id = p.id and t.platform in ('android', 'ios'))
    -- once per bundle: running the workflow step again never sends a second notice
    and not exists (select 1 from public.notifications x where x.account_id = p.id and x.kind = 'update' and x.target ->> 'id' = p_version);
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.broadcast_app_update(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.broadcast_app_update(text, text, text, text, text) to service_role;
create index notifications_update_once on public.notifications (account_id, (target ->> 'id')) where kind = 'update';
