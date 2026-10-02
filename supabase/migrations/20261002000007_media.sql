-- EngSpace — post images in Storage instead of inline in the feed rows (a feed page stays a few KB on a phone).
-- Public-read bucket: object names are random (<account id>/<uuid>.jpg) and only reachable from a post that shows them.
-- Upload only into your own folder, 1.5 MB max, images only; the app re-encodes and strips EXIF before upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 1572864, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "media: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "media: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
