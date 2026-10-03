-- EngSpace — a salary report's employer TYPE (general contracting, consulting, developer, public…) had no column of its own: the
-- app wrote it into `company`, so a report without a company name showed the raw word «contracting» as the company and the type
-- badge never appeared. salary_shares.employer holds the type; `company` is only ever a company name again.
-- The ids are the app's EMPLOYERS taxonomy (src/domain/taxonomy.ts); tests/salary-employer.test.ts pins both lists.

alter table public.salary_shares add column employer text
  check (employer is null or employer in ('contracting', 'special', 'consulting', 'developer', 'industrial', 'oil', 'public', 'intl', 'backoffice'));
grant insert (employer) on public.salary_shares to authenticated;

-- reports stored before this release: the type was in `company`
update public.salary_shares set employer = company, company = null
where company in ('contracting', 'special', 'consulting', 'developer', 'industrial', 'oil', 'public', 'intl', 'backoffice');
