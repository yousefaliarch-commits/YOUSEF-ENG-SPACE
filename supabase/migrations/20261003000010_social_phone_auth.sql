-- EngSpace — sign-in with Google, Apple and phone (SMS code).
-- Those accounts arrive without the registration form: no role, discipline or place, sometimes no name (Apple can withhold
-- it) or no e-mail (phone). The profile is created all the same and marked onboarded = false; the app then shows the
-- «complete your profile» steps before anything else. Accounts made with the registration form are onboarded at once.

alter table public.profiles add column if not exists onboarded boolean not null default true;
grant update (onboarded) on public.profiles to authenticated;

create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb); nm text;
begin
  -- the form sends `name`; Google sends `name` / `full_name`; Apple sends `full_name` once, or nothing; phone sends nothing
  nm := coalesce(nullif(trim(m ->> 'name'), ''), nullif(trim(m ->> 'full_name'), ''), nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'عضو جديد');
  if char_length(nm) < 2 then nm := 'عضو جديد'; end if;
  insert into public.profiles (id, name, gender, age, grad_year, role, disc, track, pos, gov, city, goal, company_name, default_identity, onboarded)
  values (new.id, left(nm, 80),
    coalesce(nullif(m ->> 'gender', ''), 'male'),
    nullif(m ->> 'age', '')::int, nullif(m ->> 'gradYear', '')::int,
    coalesce(nullif(m ->> 'role', ''), 'engineer')::public.member_role,
    m ->> 'disc', m ->> 'track', m ->> 'pos', m ->> 'gov', m ->> 'city', m ->> 'goal', m ->> 'companyName',
    coalesce(nullif(m ->> 'identity', ''), 'anon')::public.author_mode,
    m ? 'role')
  on conflict (id) do nothing;
  return new;
end $$;

-- the directory masks a phone number the way it masks an e-mail
create or replace function public.admin_accounts(p_search text default null, p_limit int default 200)
returns table (mod_ref text, email_masked text, role public.member_role, staff public.staff_role, disc text, gov text,
  verified boolean, strikes int, suspended_until timestamptz, suspended_forever boolean, contributions int, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'staff only' using errcode = '42501'; end if;
  return query
  select p.mod_ref,
    case when u.email is not null then left(u.email, 2) || '•••@' || split_part(u.email, '@', 2)
         when u.phone is not null then '+' || left(u.phone, 4) || '•••' || right(u.phone, 2) end,
    p.role, p.staff, p.disc, p.gov, p.verified, p.strikes, p.suspended_until, p.suspended_forever, p.contributions, p.created_at
  from public.profiles p join auth.users u on u.id = p.id
  where p_search is null or p.mod_ref ilike '%' || p_search || '%' or p.disc ilike p_search or p.gov ilike p_search
  order by p.created_at desc limit least(p_limit, 1000);
end $$;
