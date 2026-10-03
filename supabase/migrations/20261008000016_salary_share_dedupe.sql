-- EngSpace — one tap must be one salary report. A double tap (or a retry on a slow connection) used to land two identical
-- rows and spend two of the member's three monthly shares. The same member sending the same report again within 10 minutes
-- is now refused as a duplicate (23505); the app treats that answer as «already recorded». A different report — another
-- employer, another salary — is still a new share and counts as before.

create or replace function private.share_rate_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from private.authorship a join public.salary_shares s on s.id = a.item_id
             where a.kind = 'salary_shares' and a.account_id = auth.uid() and s.created_at > now() - interval '10 minutes'
               and s.disc = new.disc and s.years = new.years and s.salary = new.salary
               and s.gov is not distinct from new.gov and s.track is not distinct from new.track
               and s.company is not distinct from new.company and s.title is not distinct from new.title) then
    raise exception 'duplicate share' using errcode = '23505';
  end if;
  if (select count(*) from private.authorship a join public.salary_shares s on s.id = a.item_id
      where a.kind = 'salary_shares' and a.account_id = auth.uid() and s.created_at > now() - interval '30 days') >= 3 then
    raise exception 'share limit reached' using errcode = '42501';
  end if;
  return new;
end $$;
