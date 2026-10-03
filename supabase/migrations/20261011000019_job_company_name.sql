-- EngSpace — a job names its company. Until now the company on a job was whatever the posting account's profile said, and a recruiter
-- posting for a client (or a company outside the registry) could not say so. jobs.co_name is the company as the poster typed it
-- (the app links it to the registry's company scorecard when the name matches, through jobs.co); the matching notification and the
-- job card use it before the profile's name.

alter table public.jobs add column co_name text check (co_name is null or char_length(btrim(co_name)) between 2 and 80);
grant insert (co_name) on public.jobs to authenticated;

-- the job-match notification names the job's company (the discipline, experience and place rules are unchanged: the discipline
-- is a hard requirement — see 13_push_notifications.test.sql and 14_strict_discipline.test.sql)
create or replace function private.job_match_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare lo int := coalesce(lower(new.years), 0); hi int := case when new.years is null or upper_inf(new.years) then 99 else upper(new.years) - 1 end;
  co text := coalesce(nullif(btrim(new.co_name), ''), nullif(new.author ->> 'companyName', ''), 'شركة'); co_en text := coalesce(nullif(btrim(new.co_name), ''), nullif(new.author ->> 'companyName', ''), 'A company');
  d_ar text := coalesce(private.disc_title(new.disc, 'ar'), 'مهندس'); d_en text := coalesce(private.disc_title(new.disc, 'en'), 'engineer');
  g_ar text := coalesce(private.gov_name(new.gov, 'ar'), new.gov); g_en text := coalesce(private.gov_name(new.gov, 'en'), new.gov);
begin
  if new.hidden then return null; end if;
  insert into public.notifications (account_id, kind, title, body, target, en)
  select p.id, 'match', 'فرصة هندسية جديدة تناسب تخصصك: ' || new.title,
    co || ' تبحث عن ' || d_ar || ' في ' || g_ar || '. اضغط للاطلاع على التفاصيل والتقديم.',
    jsonb_build_object('type', 'job', 'id', new.id),
    jsonb_build_object('title', 'A new engineering opportunity for your discipline: ' || new.title,
      'body', co_en || ' is hiring a ' || d_en || ' in ' || g_en || '. Tap to see the details and apply.')
  from public.profiles p
  where p.role = 'engineer'
    -- 1. the discipline: a hard requirement. A civil engineer is never matched with a mechanical, electrical or architectural job.
    and p.disc is not null and p.disc = new.disc
    -- 2. only then: the track, the experience and the place
    and (new.sub is null or p.track = new.sub)
    and (p.gov = new.gov or new.mode = 'remote')
    and (new.years is null or private.member_years(p.grad_year) between lo - 1 and hi + 1)
    and p.id is distinct from auth.uid()
    and not (p.suspended_forever or coalesce(p.suspended_until > now(), false))
    and private.master_on(p.id) and private.pref_on(p.id, 'jobs')
    and (select count(*) from public.notifications n where n.account_id = p.id and n.kind = 'match' and n.created_at > now() - interval '1 day') < 3
  order by (p.city is not distinct from new.city) desc, p.created_at
  limit 1000;
  return null;
end $$;
