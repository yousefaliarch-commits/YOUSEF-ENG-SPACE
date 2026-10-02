-- EngSpace — final lockdown, run after every other migration: signed-out visitors (anon) reach nothing.
-- Postgres grants EXECUTE to PUBLIC on every new function; each function this app exposes is granted to `authenticated`
-- explicitly where it is defined, so PUBLIC and anon lose everything here.
revoke execute on all functions in schema public from public, anon;
revoke execute on all functions in schema private from public, anon, authenticated;
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke execute on functions from public;
