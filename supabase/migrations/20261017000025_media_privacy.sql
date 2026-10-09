-- =====================================================================
--  Phase 1.3 — media privacy (docs/SECURITY.md)
--  Before: post images lived at media/<account id>/<random>.jpg and that path sat in posts.data, readable by every member, so
--  one public image post tied a name to all of that person's anonymous image posts. The payslip check (image.money) was
--  decided on the phone and stored as sent.
--  Now:
--  · Every image goes through the upload-media Edge Function: it checks type, size and dimensions, strips metadata, stores
--    the file and records it in private.media_uploads. Members can no longer write to the media bucket directly.
--  · Public images get random names (p/… post images, a/… profile photos). Private ones (support, verification, inspections)
--    stay in the owner's folder of a private bucket.
--  · A post keeps only the image's geometry in posts.data. The path lives in public.post_images, which no member reads
--    directly: post_media() hands a path only to those allowed to see it. HR, owner and supervisor accounts see an image only
--    after staff have reviewed it as free of money figures (strict default); engineers, the author and staff see it at once.
--  · Images already posted are registered here; the media janitor moves their files to random names (old paths are never
--    handed out again).
--  · The janitor (pg_cron → upload-media, every 10 minutes) deletes abandoned uploads, images of deleted posts, and every
--    upload of a deleted account.
--  Pinned by supabase/tests/database/19_media_privacy.test.sql.
-- =====================================================================

-- ---------------------------------------------------------------- buckets
-- media: public, WebP / JPEG only, 700 KB ceiling (the app compresses to ~150–250 KB; the function enforces the ceiling)
update storage.buckets set allowed_mime_types = array['image/webp', 'image/jpeg'], file_size_limit = 716800 where id = 'media';
update storage.buckets set allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png'] where id = 'support';
update storage.buckets set allowed_mime_types = array['image/webp', 'image/jpeg'] where id = 'verification';
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('inspections', 'inspections', false, 716800, array['image/webp', 'image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- direct uploads into the public bucket end here (old app versions get an error and the update banner)
drop policy if exists "media: upload own" on storage.objects;
-- inspection photos: only their owner reads them (signed URLs); writes and deletes go through the function
drop policy if exists "inspections: read own" on storage.objects;
create policy "inspections: read own" on storage.objects for select to authenticated
  using (bucket_id = 'inspections' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------- the registry (service role only)
create table if not exists private.media_uploads (
  bucket text not null check (bucket in ('media', 'support', 'verification', 'inspections')),
  path text not null,
  kind text not null check (kind in ('post', 'avatar', 'support', 'verification', 'inspection')),
  owner uuid references auth.users (id) on delete set null,
  mime text not null check (mime in ('image/webp', 'image/jpeg')),
  bytes int not null check (bytes >= 0),
  width int not null, height int not null,
  attached_to uuid,
  attached_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (bucket, path)
);
create index if not exists media_uploads_owner on private.media_uploads (owner, created_at desc);
create index if not exists media_uploads_open on private.media_uploads (created_at) where attached_at is null;

-- the function reserves a path before storing the file (quota checked first, so a refused upload costs no storage)
create or replace function public.media_register(p_owner uuid, p_kind text, p_bucket text, p_path text, p_mime text, p_bytes int, p_w int, p_h int)
returns void language plpgsql security definer set search_path = '' as $$
declare n10 int; nday int; navatar int; total bigint;
begin
  if p_owner is null then raise exception 'owner required' using errcode = '22023'; end if;
  select count(*) filter (where m.created_at > now() - interval '10 minutes'),
         count(*) filter (where m.created_at > now() - interval '1 day'),
         count(*) filter (where m.kind = 'avatar' and m.created_at > now() - interval '1 day'),
         coalesce(sum(m.bytes), 0)
    into n10, nday, navatar, total
  from private.media_uploads m where m.owner = p_owner;
  if n10 >= 30 or nday >= 300 or (p_kind = 'avatar' and navatar >= 10) then
    raise exception 'media rate limited' using errcode = '54000';
  end if;
  if total + p_bytes > 100 * 1024 * 1024 then raise exception 'media quota' using errcode = '54000'; end if;
  insert into private.media_uploads (bucket, path, kind, owner, mime, bytes, width, height, attached_at)
  values (p_bucket, p_path, p_kind, p_owner, p_mime, p_bytes, p_w, p_h,
    -- support, verification and inspection files are owned by their flow from the start; posts and avatars attach later
    case when p_kind in ('support', 'verification', 'inspection') then now() end);
end $$;

create or replace function public.media_unregister(p_bucket text, p_path text) returns void
language sql security definer set search_path = '' as $$ delete from private.media_uploads where bucket = p_bucket and path = p_path $$;

-- ---------------------------------------------------------------- post images
create table if not exists public.post_images (
  post_id uuid primary key references public.posts (id) on delete cascade deferrable initially deferred,
  path text not null unique,
  w int, h int,
  scan text not null default 'unchecked' check (scan in ('unchecked', 'clean', 'money')),   -- decided by staff
  client_scan text check (client_scan in ('clean', 'money', 'failed')),                      -- the phone's reading, a hint for staff
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.post_images enable row level security;   -- no policies: members read through post_media() only
revoke all on public.post_images from anon, authenticated;

-- A new post's image must be an upload the author made through the function and has not used yet. The post keeps only
-- geometry, colour and alt text; the path goes to post_images. Unknown top-level keys in posts.data are dropped.
create or replace function private.post_media_in() returns trigger
language plpgsql security definer set search_path = '' as $$
declare img jsonb; p text; u private.media_uploads; me uuid := auth.uid();
begin
  new.data := (select coalesce(jsonb_object_agg(e.k, e.v), '{}'::jsonb)
               from jsonb_each(case when jsonb_typeof(new.data) = 'object' then new.data else '{}'::jsonb end) as e(k, v)
               where e.k in ('reveal', 'image', 'vote', 'poll'));
  img := new.data -> 'image';
  if img is null then return new; end if;
  if jsonb_typeof(img) <> 'object' then new.data := new.data - 'image'; return new; end if;
  p := img ->> 'path';
  if p is null or p !~ '^p/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg)$' then
    raise exception 'image upload required' using errcode = '22023';
  end if;
  select * into u from private.media_uploads m where m.bucket = 'media' and m.path = p and m.kind = 'post' for update;
  if not found or u.attached_at is not null or (me is not null and u.owner is distinct from me) then
    raise exception 'image not found' using errcode = '22023';
  end if;
  update private.media_uploads set attached_at = now(), attached_to = new.id where bucket = 'media' and path = p;
  insert into public.post_images (post_id, path, w, h, client_scan)
  values (new.id, p, u.width, u.height, case img ->> 'money' when 'true' then 'money' when 'false' then 'clean' else 'failed' end);
  new.data := jsonb_set(new.data, '{image}', jsonb_strip_nulls(jsonb_build_object(
    'w', u.width, 'h', u.height,
    'tone', case when (img ->> 'tone') ~ '^rgb\(\d{1,3},\d{1,3},\d{1,3}\)$' then img ->> 'tone' end,
    'alt', left(nullif(btrim(img ->> 'alt'), ''), 140))));
  return new;
end $$;
drop trigger if exists posts_z_media on public.posts;
create trigger posts_z_media before insert on public.posts for each row execute function private.post_media_in();

-- who may see which image (the same rule as amounts in text: engineers yes; HR / owner aggregates only; supervisors none)
create or replace function private.image_visible(p_post uuid, p_scan text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_staff() or public.is_mine('posts', p_post) or public.money_access() = 'full' or p_scan = 'clean'
$$;

-- paths for up to 200 posts the caller can read; path is null when the caller may not see the image
-- state: shown · unchecked (awaiting staff review) · money (staff found money figures) · moving (old file, being renamed)
create or replace function public.post_media(p_ids uuid[])
returns table (post_id uuid, path text, state text)
language sql stable security definer set search_path = '' as $$
  select i.post_id,
    case when i.path ~ '^p/' and private.image_visible(i.post_id, i.scan) then i.path end,
    case when i.path !~ '^p/' then 'moving' when private.image_visible(i.post_id, i.scan) then 'shown' else i.scan end
  from public.post_images i join public.posts p on p.id = i.post_id
  where i.post_id = any (p_ids[1:200])
    and ((not p.hidden) or public.is_staff() or public.is_mine('posts', p.id))
$$;

-- staff: the images waiting for a decision, and the decision (clean → visible to every role; money → hidden from HR / owner / supervisors)
create or replace function public.staff_image_queue(p_limit int default 50)
returns table (post_id uuid, path text, client_scan text, room text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'staff only' using errcode = '42501'; end if;
  return query
  select i.post_id, i.path, i.client_scan, p.room, i.created_at
  from public.post_images i join public.posts p on p.id = i.post_id
  where i.scan = 'unchecked' and i.path ~ '^p/' and not p.hidden
  order by i.created_at limit greatest(1, least(p_limit, 200));
end $$;

create or replace function public.staff_review_image(p_post uuid, p_verdict text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'staff only' using errcode = '42501'; end if;
  if p_verdict not in ('clean', 'money') then raise exception 'bad verdict' using errcode = '22023'; end if;
  update public.post_images set scan = p_verdict, reviewed_at = now() where post_id = p_post;
  if not found then raise exception 'no such image' using errcode = '22023'; end if;
  perform private.audit('image_review', 'post:' || p_post::text, jsonb_build_object('verdict', p_verdict));
end $$;

-- ---------------------------------------------------------------- profile photos
-- photo_path must be an avatar the member uploaded through the function (a/…); clearing it is always allowed
create or replace function private.photo_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.photo_path is null or (tg_op = 'UPDATE' and new.photo_path is not distinct from old.photo_path) then return new; end if;
  if auth.uid() is null then return new; end if;   -- maintenance
  if not exists (select 1 from private.media_uploads m where m.bucket = 'media' and m.path = new.photo_path and m.kind = 'avatar' and m.owner = new.id) then
    raise exception 'not your photo' using errcode = '42501';
  end if;
  update private.media_uploads set attached_at = coalesce(attached_at, now()), attached_to = new.id where bucket = 'media' and path = new.photo_path;
  return new;
end $$;
drop trigger if exists profiles_photo_guard on public.profiles;
create trigger profiles_photo_guard before insert or update of photo_path on public.profiles for each row execute function private.photo_guard();
-- a photo path written before this release (none in production: the app never synced photos) is dropped rather than trusted
update public.profiles set photo_path = null where photo_path is not null and photo_path !~ '^a/';

-- ---------------------------------------------------------------- images posted before this release
insert into private.media_uploads (bucket, path, kind, owner, mime, bytes, width, height, attached_to, attached_at, created_at)
select 'media', p.data -> 'image' ->> 'path', 'post', a.account_id, 'image/jpeg', 0,
  coalesce((p.data -> 'image' ->> 'w')::int, 0), coalesce((p.data -> 'image' ->> 'h')::int, 0), p.id, p.created_at, p.created_at
from public.posts p left join private.authorship a on a.kind = 'posts' and a.item_id = p.id
where p.data -> 'image' ->> 'path' is not null
on conflict do nothing;
insert into public.post_images (post_id, path, w, h, client_scan, created_at)
select p.id, p.data -> 'image' ->> 'path', (p.data -> 'image' ->> 'w')::int, (p.data -> 'image' ->> 'h')::int,
  case p.data -> 'image' ->> 'money' when 'true' then 'money' when 'false' then 'clean' else 'failed' end, p.created_at
from public.posts p where p.data -> 'image' ->> 'path' is not null
on conflict do nothing;
update public.posts set data = jsonb_set(data, '{image}', (data -> 'image') - 'src' - 'path' - 'money')
where data -> 'image' ->> 'path' is not null;

-- ---------------------------------------------------------------- the janitor (service role, called by upload-media's sweep)
-- what to delete: abandoned post / avatar uploads (a day old, never attached), images of deleted posts, everything of a
-- deleted account (verification files are the verification sweep's job)
create or replace function public.media_orphans(p_limit int default 500)
returns table (bucket text, path text)
language sql stable security definer set search_path = '' as $$
  select m.bucket, m.path from private.media_uploads m
  where (m.kind in ('post', 'avatar') and m.attached_at is null and m.created_at < now() - interval '1 day')
     or (m.kind = 'post' and m.attached_at is not null and not exists (select 1 from public.post_images i where i.path = m.path))
     or (m.owner is null and m.kind <> 'verification')
  limit greatest(1, least(p_limit, 1000))
$$;
create or replace function public.media_forget(p_bucket text, p_paths text[]) returns void
language sql security definer set search_path = '' as $$ delete from private.media_uploads where bucket = p_bucket and path = any (p_paths) $$;

-- files from before this release still at media/<account id>/…: the janitor moves each to p/<random>.<ext>
create or replace function public.media_legacy(p_limit int default 100)
returns table (path text)
language sql stable security definer set search_path = '' as $$
  select m.path from private.media_uploads m where m.bucket = 'media' and m.kind = 'post' and m.path !~ '^p/'
  order by m.created_at limit greatest(1, least(p_limit, 500))
$$;
create or replace function public.media_rename(p_old text, p_new text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_new !~ '^p/[0-9a-f-]{36}\.(webp|jpg)$' then raise exception 'bad path' using errcode = '22023'; end if;
  update private.media_uploads set path = p_new where bucket = 'media' and path = p_old;
  update public.post_images set path = p_new where path = p_old;
end $$;

-- a member removes their own inspection photo, or a post upload they never used
create or replace function public.media_removable(p_owner uuid, p_paths text[])
returns table (bucket text, path text)
language sql stable security definer set search_path = '' as $$
  select m.bucket, m.path from private.media_uploads m
  where m.owner = p_owner and m.path = any (p_paths[1:50])
    and (m.kind = 'inspection' or (m.kind = 'post' and m.attached_at is null))
$$;

-- every 10 minutes the database wakes the janitor (same Vault address as push; secret written by the Deploy database workflow)
create or replace function private.kick_media() returns void
language plpgsql security definer set search_path = '' as $$
declare u text; s text;
begin
  select decrypted_secret into u from vault.decrypted_secrets where name = 'push_url';
  select decrypted_secret into s from vault.decrypted_secrets where name = 'media_secret';
  if u is null or s is null then return; end if;
  perform net.http_post(url := rtrim(u, '/') || '/functions/v1/upload-media',
    headers := jsonb_build_object('content-type', 'application/json', 'x-media-secret', s), body := '{"action":"sweep"}'::jsonb);
exception when others then null;   -- vault or pg_net missing: nothing to do here
end $$;
select cron.unschedule(jobid) from cron.job where jobname = 'engspace-media-janitor';
select cron.schedule('engspace-media-janitor', '*/10 * * * *', $$ select private.kick_media() $$);

-- ---------------------------------------------------------------- grants
revoke execute on function private.post_media_in(), private.image_visible(uuid, text), private.photo_guard(), private.kick_media()
  from public, anon, authenticated;
revoke execute on function public.media_register(uuid, text, text, text, text, int, int, int), public.media_unregister(text, text),
  public.media_orphans(int), public.media_forget(text, text[]), public.media_legacy(int), public.media_rename(text, text),
  public.media_removable(uuid, text[]) from public, anon, authenticated;
grant execute on function public.media_register(uuid, text, text, text, text, int, int, int), public.media_unregister(text, text),
  public.media_orphans(int), public.media_forget(text, text[]), public.media_legacy(int), public.media_rename(text, text),
  public.media_removable(uuid, text[]) to service_role;
revoke execute on function public.post_media(uuid[]), public.staff_image_queue(int), public.staff_review_image(uuid, text) from public, anon;
grant execute on function public.post_media(uuid[]), public.staff_image_queue(int), public.staff_review_image(uuid, text) to authenticated;
