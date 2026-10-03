-- EngSpace — the platform speaks NET (الصافي): what reaches the account after income tax and social insurance, the way
-- Egyptian engineers discuss and negotiate pay. From this release every salary a member shares is net.
--  · private.net_of_gross() mirrors netPay() in src/domain/pay.ts (a regular month; Law 175/2023 brackets, 20,000
--    exemption, high-earner bracket loss, 11% insurance up to the 16,700 cap). A test keeps the two in step.
--  · Shares stored before this release were entered as gross: they are converted once, the original kept in gross_original,
--    so the explorer, the bands and the admin figures never mix gross with net.

create or replace function private.net_of_gross(g numeric) returns int
language plpgsql immutable set search_path = '' as $$
declare
  lims numeric[] := array[40000, 55000, 70000, 200000, 400000, 1200000, 1e15];
  rates numeric[] := array[0, 0.10, 0.15, 0.20, 0.225, 0.25, 0.275];
  ins numeric := least(g, 16700) * 0.11;
  taxable numeric := greatest(0, g * 12 - ins * 12 - 20000);
  start int := case when taxable > 1200000 then 7 when taxable > 900000 then 5 when taxable > 800000 then 4
                    when taxable > 700000 then 3 when taxable > 600000 then 2 else 1 end;
  tax numeric := 0; prev numeric := 0;
begin
  if g is null or g <= 0 then return 0; end if;
  for i in 1 .. 7 loop
    if taxable > prev then tax := tax + (least(taxable, lims[i]) - prev) * (case when i < start then rates[start] else rates[i] end); end if;
    prev := lims[i];
  end loop;
  return round(g - ins - tax / 12)::int;
end $$;
revoke execute on function private.net_of_gross(numeric) from public, anon, authenticated;

alter table public.salary_shares add column basis text not null default 'net' check (basis in ('net', 'converted'));
alter table public.salary_shares add column gross_original int;
comment on column public.salary_shares.salary is 'EGP per month, NET (take-home after income tax and social insurance)';
comment on column public.salary_shares.gross_original is 'the gross figure a pre-net share was entered with (basis = converted)';

-- every share before this release was gross: convert it once (the new columns are server-set — no client grant)
update public.salary_shares set gross_original = salary, salary = private.net_of_gross(salary), basis = 'converted';
