-- EngSpace — Feature 3 (company scorecards) and Feature 4 (raise & inflation tracker).
--  · Factor ratings (pay vs market, raises, paying on time, overtime, site conditions) live in their own table that no
--    member can read. Only aggregates leave the database, and a factor is shown only from 5 different reviewers up
--    (latest rating per member per company, last 24 months, hidden reviews excluded) — the same floor as salaries.
--  · Raise reports carry a percentage and a month only (never a salary), are unreadable to members, and feed the market
--    raise rate per discipline from 5 reports up. At most 2 reports per member per 180 days.
--  · The official inflation series (CAPMAS annual urban headline, y/y) is readable by every member; staff maintain it.
--  · Field staff see no money: both aggregates answer 'none' for them.

-- ================================ company scorecards ================================
create table public.company_ratings (
  review_id uuid primary key references public.company_reviews (id) on delete cascade,
  company_id text not null,
  pay smallint check (pay between 1 and 5),
  raises smallint check (raises between 1 and 5),
  ontime smallint check (ontime between 1 and 5),
  overtime smallint check (overtime between 1 and 5),
  site smallint check (site between 1 and 5),
  -- the moment of the rating itself (not of the transaction), so a member's latest rating is always well defined
  created_at timestamptz not null default clock_timestamp()
);
create index company_ratings_company on public.company_ratings (company_id, created_at desc);
alter table public.company_ratings enable row level security;
-- no policy and no grant: reached only through rate_company() and company_scorecard()
revoke all on public.company_ratings from anon, authenticated;

-- attach the factor ratings to one's own, just-written review (engineers only — the same people who may review)
create or replace function public.rate_company(p_review uuid, p_scores jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare co text; s jsonb := coalesce(p_scores, '{}'::jsonb);
  f text; v int;
begin
  if not public.is_mine('company_reviews', p_review) then raise exception 'not your review' using errcode = '42501'; end if;
  if public.money_access() <> 'full' then raise exception 'engineers only' using errcode = '42501'; end if;
  foreach f in array array['pay', 'raises', 'ontime', 'overtime', 'site'] loop
    if s ? f and jsonb_typeof(s -> f) <> 'null' then
      v := (s ->> f)::int; if v < 1 or v > 5 then raise exception 'score out of range' using errcode = '22023'; end if;
    end if;
  end loop;
  select r.company_id into co from public.company_reviews r where r.id = p_review;
  insert into public.company_ratings (review_id, company_id, pay, raises, ontime, overtime, site)
  values (p_review, co, (s ->> 'pay')::smallint, (s ->> 'raises')::smallint, (s ->> 'ontime')::smallint, (s ->> 'overtime')::smallint, (s ->> 'site')::smallint)
  on conflict (review_id) do update set created_at = clock_timestamp(), pay = excluded.pay, raises = excluded.raises, ontime = excluded.ontime, overtime = excluded.overtime, site = excluded.site;
end $$;

-- one factor's aggregate, or only its count while under the floor
create or replace function private.factor(vals smallint[]) returns jsonb
language sql immutable set search_path = '' as $$
  select case when cardinality(vals) < 5 then jsonb_build_object('n', cardinality(vals))
    else jsonb_build_object('n', cardinality(vals),
      'avg', round((select avg(v) from unnest(vals) v), 1),
      'good', round(100.0 * (select count(*) from unnest(vals) v where v >= 4) / cardinality(vals))) end
$$;

-- The scorecard of one company: every factor from 5 different reviewers up; each member counts once (their latest rating)
create or replace function public.company_scorecard(p_company text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare r record;
begin
  if public.money_access() = 'none' then return jsonb_build_object('access', 'none'); end if;
  select count(*)::int n,
    array_remove(array_agg(pay), null) pay, array_remove(array_agg(raises), null) raises, array_remove(array_agg(ontime), null) ontime,
    array_remove(array_agg(overtime), null) overtime, array_remove(array_agg(site), null) site
  into r from (
    select distinct on (a.account_id) cr.* from public.company_ratings cr
      join public.company_reviews rv on rv.id = cr.review_id and not rv.hidden
      join private.authorship a on a.kind = 'company_reviews' and a.item_id = cr.review_id
     where cr.company_id = p_company and cr.created_at > now() - interval '24 months'
     order by a.account_id, cr.created_at desc) latest;
  return jsonb_build_object('access', public.money_access(), 'n', coalesce(r.n, 0), 'min', 5, 'factors', jsonb_build_object(
    'pay', private.factor(coalesce(r.pay, '{}')), 'raises', private.factor(coalesce(r.raises, '{}')), 'ontime', private.factor(coalesce(r.ontime, '{}')),
    'overtime', private.factor(coalesce(r.overtime, '{}')), 'site', private.factor(coalesce(r.site, '{}'))));
end $$;

-- ================================ raise reports ================================
create table public.raise_reports (
  id uuid primary key default gen_random_uuid(),
  disc text not null,
  track text,
  pos text,
  pct numeric(5, 1) not null check (pct between -50 and 300),
  kind text not null default 'annual' check (kind in ('annual', 'promotion', 'switch')),
  month date not null check (month = date_trunc('month', month)::date and month <= now()::date and month > '2015-01-01'),
  author_mode public.author_mode not null default 'anon',
  author jsonb not null,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index raise_reports_disc on public.raise_reports (disc, month desc) where not hidden;
alter table public.raise_reports enable row level security;
revoke all on public.raise_reports from anon, authenticated;
grant select, delete on public.raise_reports to authenticated;
grant insert (disc, track, pos, pct, kind, month) on public.raise_reports to authenticated;
-- one's own reports only (so the app can list and withdraw them); nobody reads anyone else's
create policy "raises: own" on public.raise_reports for select to authenticated using (public.is_mine('raise_reports', id));
create policy "raises: engineers write" on public.raise_reports for insert to authenticated with check (public.money_access() = 'full');
create policy "raises: delete own" on public.raise_reports for delete to authenticated using (public.is_mine('raise_reports', id) or public.is_staff());

create or replace function private.raise_rate_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from private.authorship a join public.raise_reports r on r.id = a.item_id
      where a.kind = 'raise_reports' and a.account_id = auth.uid() and r.created_at > now() - interval '180 days') >= 2 then
    raise exception 'raise report limit reached' using errcode = '42501';
  end if;
  return new;
end $$;
-- runs before raise_reports_author (alphabetical order), so the limit counts only earlier reports
create trigger raise_reports_a_limit before insert on public.raise_reports for each row execute function private.raise_rate_limit();
create trigger raise_reports_author before insert on public.raise_reports for each row execute function private.stamp_author();

-- percentiles of a set of percentages
create or replace function private.pct_num(vals numeric[]) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('n', cardinality(vals),
    'p25', (select round(percentile_cont(0.25) within group (order by v)::numeric, 1) from unnest(vals) v),
    'p50', (select round(percentile_cont(0.50) within group (order by v)::numeric, 1) from unnest(vals) v),
    'p75', (select round(percentile_cont(0.75) within group (order by v)::numeric, 1) from unnest(vals) v))
$$;

-- The market raise rate: yearly raises in the last 12 months for a discipline (optionally a track), from 5 reports up
create or replace function public.market_raises(p_disc text, p_track text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare cell numeric[]; total int; out jsonb;
begin
  if public.money_access() = 'none' then return jsonb_build_object('access', 'none'); end if;
  select array_agg(pct), count(*) into cell, total from public.raise_reports
   where not hidden and kind = 'annual' and disc = p_disc and (p_track is null or track = p_track) and month > (now() - interval '12 months')::date;
  total := coalesce(total, 0);
  out := jsonb_build_object('access', public.money_access(), 'n', total, 'min', 5);
  if total >= 5 then out := out || private.pct_num(cell); end if;
  -- promotions and job switches, each from 5 reports up
  out := out || jsonb_build_object('byKind', (select coalesce(jsonb_agg(jsonb_build_object('key', kind) || private.pct_num(v)), '[]') from
    (select kind, array_agg(pct) v from public.raise_reports where not hidden and kind <> 'annual' and disc = p_disc
       and (p_track is null or track = p_track) and month > (now() - interval '12 months')::date group by kind having count(*) >= 5) t));
  return out;
end $$;

-- account deletion removes raise reports too (everything a member wrote goes with the account)
create or replace function private.drop_raise_reports() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.kind = 'raise_reports' then delete from public.raise_reports where id = old.item_id; end if;
  return old;
end $$;
create trigger authorship_drop_raises after delete on private.authorship for each row execute function private.drop_raise_reports();

-- ================================ the official inflation series ================================
create table public.inflation_rates (
  month date primary key check (month = date_trunc('month', month)::date),
  yoy numeric(5, 1) not null check (yoy between -20 and 100),
  source text not null default 'CAPMAS — annual urban headline inflation',
  updated_at timestamptz not null default now()
);
alter table public.inflation_rates enable row level security;
revoke all on public.inflation_rates from anon, authenticated;
grant select, insert, update, delete on public.inflation_rates to authenticated;
create policy "inflation: members read" on public.inflation_rates for select to authenticated using (true);
create policy "inflation: staff write" on public.inflation_rates for insert to authenticated with check (public.is_staff());
create policy "inflation: staff update" on public.inflation_rates for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "inflation: staff delete" on public.inflation_rates for delete to authenticated using (public.is_staff());

-- CAPMAS annual urban headline inflation (y/y %), as published by CAPMAS and the Central Bank of Egypt. Kept identical to
-- src/data/inflation.ts (a test compares them); newer months are added by staff or by a later migration.
insert into public.inflation_rates (month, yoy) values
  ('2022-01-01', 7.3), ('2022-02-01', 8.8), ('2022-03-01', 10.5), ('2022-04-01', 13.1), ('2022-05-01', 13.5), ('2022-06-01', 13.2),
  ('2022-07-01', 13.6), ('2022-08-01', 14.6), ('2022-09-01', 15.0), ('2022-10-01', 16.2), ('2022-11-01', 18.7), ('2022-12-01', 21.3),
  ('2023-01-01', 25.8), ('2023-02-01', 31.9), ('2023-03-01', 32.7), ('2023-04-01', 30.6), ('2023-05-01', 32.7), ('2023-06-01', 35.7),
  ('2023-07-01', 36.5), ('2023-08-01', 37.4), ('2023-09-01', 38.0), ('2023-10-01', 35.8), ('2023-11-01', 34.6), ('2023-12-01', 33.7),
  ('2024-01-01', 29.8), ('2024-02-01', 35.7), ('2024-03-01', 33.3), ('2024-04-01', 32.5), ('2024-05-01', 28.1), ('2024-06-01', 27.5),
  ('2024-07-01', 25.7), ('2024-08-01', 26.2), ('2024-09-01', 26.4), ('2024-10-01', 26.5), ('2024-11-01', 25.5), ('2024-12-01', 24.1),
  ('2025-01-01', 24.0), ('2025-02-01', 12.8), ('2025-03-01', 13.6), ('2025-04-01', 13.9), ('2025-05-01', 16.8), ('2025-06-01', 14.9),
  ('2025-07-01', 13.9), ('2025-08-01', 12.0), ('2025-09-01', 11.7)
on conflict (month) do nothing;

revoke execute on function private.factor(smallint[]), private.pct_num(numeric[]), private.raise_rate_limit(), private.drop_raise_reports() from public, anon, authenticated;
revoke execute on function public.rate_company(uuid, jsonb), public.company_scorecard(text), public.market_raises(text, text) from public, anon;
grant execute on function public.rate_company(uuid, jsonb), public.company_scorecard(text), public.market_raises(text, text) to authenticated;
