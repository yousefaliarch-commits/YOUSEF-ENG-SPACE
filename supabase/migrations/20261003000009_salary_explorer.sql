-- EngSpace — Sprint 1: the live salary explorer and give-to-get.
--  · Give-to-get: an engineer who shared a salary in the last 12 months reads the full explorer and the individual
--    reports; one who has not sees the headline median only. Enforced here, on the function and on the table's RLS.
--  · No cell, breakdown row or company line is shown below 5 reports (the same floor as salary_bands).
--  · HR and owners keep aggregates only (no individual reports); field staff see no money.
--  · At most 3 shares per member per 30 days, so unlocking cannot be bought with a burst of invented numbers.

create index if not exists salary_shares_recent on public.salary_shares (created_at desc) where not hidden;

-- did this member share a salary in the last 12 months?
create or replace function private.has_shared(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.authorship a join public.salary_shares s on s.id = a.item_id
    where a.kind = 'salary_shares' and a.account_id = uid and s.created_at > now() - interval '12 months')
$$;

-- what the member may see of pay right now: 'none' (field staff) · 'teaser' (engineer who has not shared) ·
-- 'aggregate' (HR, owner) · 'full' (engineer who shared)
create or replace function public.salary_access() returns text
language sql stable security definer set search_path = '' as $$
  select case public.money_access()
    when 'none' then 'none' when 'aggregate' then 'aggregate'
    else case when private.has_shared((select auth.uid())) then 'full' else 'teaser' end end
$$;

-- individual reports: only engineers who shared (and always one's own)
drop policy if exists "salaries: engineers read" on public.salary_shares;
create policy "salaries: contributors read" on public.salary_shares for select to authenticated
  using ((not hidden and public.salary_access() = 'full') or public.is_staff() or public.is_mine('salary_shares', id));

-- the anti-gaming limit
create or replace function private.share_rate_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from private.authorship a join public.salary_shares s on s.id = a.item_id
      where a.kind = 'salary_shares' and a.account_id = auth.uid() and s.created_at > now() - interval '30 days') >= 3 then
    raise exception 'share limit reached' using errcode = '42501';
  end if;
  return new;
end $$;
-- runs before salary_shares_author (alphabetical order), so the limit counts only earlier shares
create trigger salary_shares_a_limit before insert on public.salary_shares for each row execute function private.share_rate_limit();

-- percentiles of a set of salaries, as one jsonb
create or replace function private.pct(vals int[]) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('n', cardinality(vals),
    'p10', (select percentile_cont(0.10) within group (order by v)::int from unnest(vals) v),
    'p25', (select percentile_cont(0.25) within group (order by v)::int from unnest(vals) v),
    'p50', (select percentile_cont(0.50) within group (order by v)::int from unnest(vals) v),
    'p75', (select percentile_cont(0.75) within group (order by v)::int from unnest(vals) v),
    'p90', (select percentile_cont(0.90) within group (order by v)::int from unnest(vals) v))
$$;

-- The explorer: one cell (discipline · optional track · years range · optional governorate) and its breakdowns.
create or replace function public.salary_explorer(p_disc text, p_track text default null, p_years_min int default 0,
  p_years_max int default 50, p_gov text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare acc text := public.salary_access(); cell int[]; total int; out jsonb;
begin
  if acc = 'none' then return jsonb_build_object('access', 'none'); end if;
  select array_agg(salary), count(*) into cell, total from public.salary_shares
   where not hidden and disc = p_disc and (p_track is null or track = p_track) and years between p_years_min and p_years_max
     and (p_gov is null or gov = p_gov);
  total := coalesce(total, 0);
  out := jsonb_build_object('access', acc, 'n', total, 'min', 5,
    'platform', (select count(*) from public.salary_shares where not hidden));
  if total < 5 then return out; end if;
  if acc = 'teaser' then return out || jsonb_build_object('p50', (private.pct(cell) ->> 'p50')::int); end if;
  out := out || private.pct(cell);
  -- breakdowns, each row from 5 reports up
  out := out || jsonb_build_object(
    'byTrack', (select coalesce(jsonb_agg(jsonb_build_object('key', track) || private.pct(v) order by cardinality(v) desc), '[]') from
      (select track, array_agg(salary) v from public.salary_shares where not hidden and disc = p_disc and years between p_years_min and p_years_max
         and (p_gov is null or gov = p_gov) and track is not null group by track having count(*) >= 5) t),
    'byGov', (select coalesce(jsonb_agg(jsonb_build_object('key', gov) || private.pct(v) order by cardinality(v) desc), '[]') from
      (select gov, array_agg(salary) v from public.salary_shares where not hidden and disc = p_disc and (p_track is null or track = p_track)
         and years between p_years_min and p_years_max and gov is not null group by gov having count(*) >= 5) t),
    'byCompany', (select coalesce(jsonb_agg(jsonb_build_object('key', company) || private.pct(v) order by cardinality(v) desc), '[]') from
      (select company, array_agg(salary) v from public.salary_shares where not hidden and disc = p_disc and (p_track is null or track = p_track)
         and years between p_years_min and p_years_max and (p_gov is null or gov = p_gov) and company is not null
       group by company having count(*) >= 5 limit 12) t));
  return out;
end $$;

-- the platform's give-to-get progress for the member's own screen
create or replace function public.my_salary_status() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('access', public.salary_access(),
    'lastShare', (select max(s.created_at) from private.authorship a join public.salary_shares s on s.id = a.item_id
                  where a.kind = 'salary_shares' and a.account_id = (select auth.uid())),
    'sharesThisMonth', (select count(*) from private.authorship a join public.salary_shares s on s.id = a.item_id
                  where a.kind = 'salary_shares' and a.account_id = (select auth.uid()) and s.created_at > now() - interval '30 days'))
$$;

revoke execute on function private.has_shared(uuid), private.pct(int[]) from public, anon, authenticated;
grant execute on function public.salary_access(), public.salary_explorer(text, text, int, int, text), public.my_salary_status() to authenticated;
