-- EngSpace — admins can delete a post, reply, company review or job ad for good (moderators keep hide / restore).
-- Deletion is the same as when the author deletes their account: the row goes, and with it its replies, reactions, ballots
-- and the private authorship links — nothing is left that could tie the removed text to a member. The audit log keeps
-- what was done and to which item id, never the text or the author. A post's image is returned so the console removes
-- it from Storage (admins may delete in the media bucket for exactly that).

create or replace function public.admin_delete_content(p_kind text, p_item uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare img text; ids uuid[];
begin
  if not public.is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  case p_kind
    when 'post' then
      select p.data -> 'image' ->> 'path' into img from public.posts p where p.id = p_item;
      select coalesce(array_agg(c.id), '{}') into ids from public.comments c where c.post_id = p_item;
      delete from public.reactions where (kind = 'posts' and item_id = p_item) or (kind = 'comments' and item_id = any (ids));
      delete from private.authorship where (kind = 'posts' and item_id = p_item) or (kind = 'comments' and item_id = any (ids));
      delete from public.posts where id = p_item;
    when 'comment' then
      -- the reply and every reply beneath it
      with recursive t as (select c.id from public.comments c where c.id = p_item
                           union all select c.id from public.comments c join t on c.parent_id = t.id)
      select coalesce(array_agg(id), '{}') into ids from t;
      update public.posts set best_comment = null where best_comment = any (ids);
      delete from public.reactions where kind = 'comments' and item_id = any (ids);
      delete from private.authorship where kind = 'comments' and item_id = any (ids);
      delete from public.comments where id = p_item;
    when 'review' then
      delete from private.authorship where kind = 'company_reviews' and item_id = p_item;
      delete from public.company_reviews where id = p_item;
    when 'job' then
      delete from private.authorship where kind = 'jobs' and item_id = p_item;
      delete from public.jobs where id = p_item;
    else raise exception 'unknown kind';
  end case;
  perform private.audit('delete', p_kind || ':' || p_item);
  return jsonb_build_object('image', img);
end $$;
revoke execute on function public.admin_delete_content(text, uuid) from public, anon;
grant execute on function public.admin_delete_content(text, uuid) to authenticated;

create policy "media: admins delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));
