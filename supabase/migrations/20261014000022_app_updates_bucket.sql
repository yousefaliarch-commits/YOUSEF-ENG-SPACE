-- EngSpace — live web updates (docs/OTA.md): a public-read bucket that holds the web bundles the phone apps download.
--  · <channel>/<version>.zip   an immutable bundle (index.html at the zip root)
--  · <channel>/manifest.json   what the apps read: { version, build, nativeLine, url, sha256, notes }
-- Nothing here is private (it is the same web app anyone can open in a browser), but only the publish workflow may write: no policy
-- grants insert / update / delete to any client role, and the service key CI uses bypasses RLS. The apps verify the SHA-256 of what
-- they download. 50 MB per object; zip and json only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('app-updates', 'app-updates', true, 52428800, array['application/zip', 'application/x-zip-compressed', 'application/json'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
