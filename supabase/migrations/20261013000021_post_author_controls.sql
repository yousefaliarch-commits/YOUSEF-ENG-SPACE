-- EngSpace — the author of a post can edit its text and delete it, and an edited post says so.
--  · posts.edit_count / edited_at are server-set (clients have no update grant on posts): only edit_my_post() moves them, and only
--    when the text really changed, so the number shown is the number of real edits.
--  · edit_my_post(): own post only (public.is_mine — nobody else's account id is ever exposed), not while hidden by moderation,
--    not while suspended, 1–5000 characters. Reactions, ballots, replies, the image and the poll options stay as they are.
--  · delete_my_post(): the same clean removal admins get — replies, reactions, ballots and the private authorship links go with the
--    post, so nothing is left that ties the removed text to a member. The post image path is returned so the app removes it from Storage.
--  · the feed hears about an edit (id only, like every feed event) and re-reads the post through the usual RLS-checked query.

alter table public.posts add column edit_count int not null default 0 check (edit_count >= 0), add column edited_at timestamptz;

create or replace function public.edit_my_post(p_post uuid, p_body text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); cur public.posts%rowtype; nb text := btrim(coalesce(p_body, ''));
begin
  if me is null then raise exception 'not signed in' using errcode = '28000'; end if;
  if not public.is_mine('posts', p_post) then raise exception 'not your post' using errcode = '42501'; end if;
  select * into cur from public.posts where id = p_post;
  if not found then raise exception 'post not found' using errcode = 'P0002'; end if;
  if cur.hidden then raise exception 'post is hidden' using errcode = '42501'; end if;
  if exists (select 1 from public.profiles p where p.id = me and (p.suspended_forever or p.suspended_until > now())) then
    raise exception 'account suspended' using errcode = '42501';
  end if;
  if char_length(nb) < 1 or char_length(nb) > 5000 then raise exception 'body length' using errcode = '22023'; end if;
  if nb <> cur.body then
    update public.posts set body = nb, edit_count = edit_count + 1, edited_at = now() where id = p_post returning * into cur;
  end if;
  return jsonb_build_object('body', cur.body, 'edit_count', cur.edit_count, 'edited_at', cur.edited_at);
end $$;
revoke execute on function public.edit_my_post(uuid, text) from public, anon;
grant execute on function public.edit_my_post(uuid, text) to authenticated;

create or replace function public.delete_my_post(p_post uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare img text; ids uuid[];
begin
  if (select auth.uid()) is null then raise exception 'not signed in' using errcode = '28000'; end if;
  if not public.is_mine('posts', p_post) then raise exception 'not your post' using errcode = '42501'; end if;
  select p.data -> 'image' ->> 'path' into img from public.posts p where p.id = p_post;
  select coalesce(array_agg(c.id), '{}') into ids from public.comments c where c.post_id = p_post;
  delete from public.reactions where (kind = 'posts' and item_id = p_post) or (kind = 'comments' and item_id = any (ids));
  delete from private.authorship where (kind = 'posts' and item_id = p_post) or (kind = 'comments' and item_id = any (ids));
  delete from public.posts where id = p_post;   -- replies and ballots follow (on delete cascade)
  return jsonb_build_object('image', img);
end $$;
revoke execute on function public.delete_my_post(uuid) from public, anon;
grant execute on function public.delete_my_post(uuid) to authenticated;

-- the feed: a post's text changed (id only)
create or replace function private.feed_post_edit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin perform private.broadcast('feed', 'edit', jsonb_build_object('id', new.id)); return null; end $$;
create trigger posts_feed_edit after update of edit_count on public.posts for each row when (new.edit_count is distinct from old.edit_count) execute function private.feed_post_edit();

-- which posts are mine: the app shows edit / delete on those after a reload or on a new phone (ids only — never an account id)
create or replace function public.my_posts() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select a.item_id from private.authorship a where a.kind = 'posts' and a.account_id = (select auth.uid()) limit 1000
$$;
revoke execute on function public.my_posts() from public, anon;
grant execute on function public.my_posts() to authenticated;

-- Storage's remove() reads the object row first; without a select policy it silently removes nothing (the file stayed after a delete).
-- Members may see their own folder (public image URLs never needed this); admins see all, so their deletes work too.
create policy "media: read own" on storage.objects for select to authenticated
  using (bucket_id = 'media' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));
