-- EngSpace — community content, salaries, reviews, jobs, notifications, per-member state.
-- Every authored row: author_mode chosen by the client; author snapshot + authorship stamped by private.stamp_author().
-- hidden / counters / tallies are server-set (moderation and triggers); clients get column-level insert grants only.

-- ---- rooms closed by an administrator (app_config.mod.closedRooms) ----
create or replace function private.room_closed(room text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select (c.value -> 'closedRooms' ->> room)::boolean from public.app_config c where c.key = 'mod'), false)
$$;

-- ================================ posts ================================
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  room text not null,
  type text not null check (type in ('question', 'reveal', 'vote', 'poll', 'text')),
  body text not null default '' check (char_length(body) <= 5000),
  -- reveal { title, years, salary, company, employer, extras } · vote/poll { options[] } · image
  data jsonb not null default '{}'::jsonb,
  author_mode public.author_mode not null default 'anon',
  author jsonb not null,
  dm boolean not null default true,
  best_comment uuid,
  reactions jsonb not null default '{"agree":0,"disagree":0,"useful":0}'::jsonb,
  tally jsonb not null default '{}'::jsonb,
  comment_count int not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index posts_feed on public.posts (created_at desc) where not hidden;
create index posts_room on public.posts (room, created_at desc);

create or replace function private.posts_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if private.room_closed(new.room) and not public.is_staff() then
    raise exception 'room closed' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger posts_room_open before insert on public.posts for each row execute function private.posts_before_insert();
create trigger posts_author before insert on public.posts for each row execute function private.stamp_author();

-- ================================ comments (replies are comments with a parent) ================================
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  parent_id uuid references public.comments (id) on delete cascade,
  type text not null default 'text' check (type in ('text', 'number', 'exp')),
  text text not null default '' check (char_length(text) <= 3000),
  data jsonb not null default '{}'::jsonb,
  author_mode public.author_mode not null default 'anon',
  author jsonb not null,
  reactions jsonb not null default '{"agree":0,"disagree":0,"useful":0}'::jsonb,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index comments_post on public.comments (post_id, created_at);
create index comments_parent on public.comments (parent_id);
create trigger comments_author before insert on public.comments for each row execute function private.stamp_author();

create or replace function private.comment_count() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  else update public.posts set comment_count = greatest(0, comment_count - 1) where id = old.post_id; end if;
  return null;
end $$;
create trigger comments_count after insert or delete on public.comments for each row execute function private.comment_count();

-- the post's author picks the best answer
create or replace function public.mark_best(post uuid, comment uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_mine('posts', post) then raise exception 'not your post' using errcode = '42501'; end if;
  if comment is not null and not exists (select 1 from public.comments c where c.id = comment and c.post_id = post) then
    raise exception 'comment not on this post';
  end if;
  update public.posts set best_comment = comment where id = post;
end $$;

-- ================================ reactions: agree / disagree exclude each other; useful stands alone ================================
create table public.reactions (
  account_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('posts', 'comments')),
  item_id uuid not null,
  agree boolean not null default false,
  disagree boolean not null default false,
  useful boolean not null default false,
  primary key (account_id, kind, item_id),
  check (not (agree and disagree))
);
create index reactions_item on public.reactions (kind, item_id);

create or replace function private.reaction_counts() returns trigger
language plpgsql security definer set search_path = '' as $$
declare k text := coalesce(new.kind, old.kind); i uuid := coalesce(new.item_id, old.item_id); counts jsonb;
begin
  select jsonb_build_object('agree', count(*) filter (where agree), 'disagree', count(*) filter (where disagree),
    'useful', count(*) filter (where useful)) into counts from public.reactions where kind = k and item_id = i;
  if k = 'posts' then update public.posts set reactions = counts where id = i;
  else update public.comments set reactions = counts where id = i; end if;
  return null;
end $$;
create trigger reactions_counts after insert or update or delete on public.reactions for each row execute function private.reaction_counts();

-- ================================ poll / vote ballots (private; the post carries the tally) ================================
create table public.ballots (
  account_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  choice int not null check (choice between 0 and 11),
  author_mode public.author_mode not null default 'anon',
  primary key (account_id, post_id)
);
create or replace function private.ballot_tally() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p uuid := coalesce(new.post_id, old.post_id);
begin
  update public.posts set tally = coalesce((select jsonb_object_agg(choice::text, n) from
    (select choice, count(*) n from public.ballots where post_id = p group by choice) t), '{}'::jsonb) where id = p;
  return null;
end $$;
create trigger ballots_tally after insert or update or delete on public.ballots for each row execute function private.ballot_tally();

-- ================================ salary shares ================================
create table public.salary_shares (
  id uuid primary key default gen_random_uuid(),
  disc text not null, track text, pos text, gov text,
  years int not null check (years between 0 and 50),
  salary int not null check (salary between 1000 and 2000000), -- EGP / month
  company text, title text,
  extras text check (char_length(extras) <= 500),
  author_mode public.author_mode not null default 'anon',
  author jsonb not null,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index salary_shares_cell on public.salary_shares (disc, years, gov);
create trigger salary_shares_author before insert on public.salary_shares for each row execute function private.stamp_author();
create or replace function private.count_contribution() returns trigger
language plpgsql security definer set search_path = '' as $$
begin update public.profiles set contributions = contributions + 1 where id = auth.uid(); return null; end $$;
create trigger salary_shares_contrib after insert on public.salary_shares for each row execute function private.count_contribution();

-- money access mirrors moneyAccess(): engineers see individual figures; companies only aggregates; field staff no money
create or replace function public.money_access() returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select case when p.role = 'supervisor' then 'none' when p.role in ('hr', 'owner') then 'aggregate' else 'full' end
    from public.profiles p where p.id = (select auth.uid())), 'none')
$$;

-- aggregate bands for everyone allowed to see money: a cell is shown only from 5 reports up (no single person is exposed)
create or replace function public.salary_bands(p_disc text, p_gov text default null)
returns table (years int, n bigint, p25 int, median int, p75 int)
language sql stable security definer set search_path = '' as $$
  select s.years, count(*), percentile_cont(0.25) within group (order by s.salary)::int,
    percentile_cont(0.5) within group (order by s.salary)::int, percentile_cont(0.75) within group (order by s.salary)::int
  from public.salary_shares s
  where public.money_access() <> 'none' and not s.hidden and s.disc = p_disc and (p_gov is null or s.gov = p_gov)
  group by s.years having count(*) >= 5 order by s.years
$$;

-- ================================ company reviews ================================
create table public.company_reviews (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  rating int not null check (rating between 1 and 5),
  text text not null default '' check (char_length(text) <= 3000),
  data jsonb not null default '{}'::jsonb,
  author_mode public.author_mode not null default 'anon',
  author jsonb not null,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index company_reviews_company on public.company_reviews (company_id, created_at desc);
create trigger company_reviews_author before insert on public.company_reviews for each row execute function private.stamp_author();

-- ================================ jobs (posted by employer accounts; applying happens off-platform) ================================
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 120),
  co text, gov text not null, city text, disc text not null, sub text, pos text,
  years int4range, mode text, type text,
  descr text not null default '' check (char_length(descr) <= 5000),
  reqs text[] not null default '{}', skills text[] not null default '{}',
  contact jsonb not null default '{}'::jsonb,
  author_mode public.author_mode not null default 'public',
  author jsonb not null,
  contact_count int not null default 0,
  view_count int not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index jobs_match on public.jobs (disc, sub, created_at desc) where not hidden;

create or replace function private.jobs_employer_only() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('hr', 'owner')) then
    raise exception 'only employer accounts post jobs' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger jobs_employer before insert on public.jobs for each row execute function private.jobs_employer_only();
create trigger jobs_author before insert on public.jobs for each row execute function private.stamp_author();

create table public.job_contacts (
  account_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  at timestamptz not null default now(),
  primary key (account_id, job_id)
);
create index job_contacts_job on public.job_contacts (job_id);
create or replace function private.job_contact_count() returns trigger
language plpgsql security definer set search_path = '' as $$
begin update public.jobs set contact_count = contact_count + 1 where id = new.job_id; return null; end $$;
create trigger job_contacts_count after insert on public.job_contacts for each row execute function private.job_contact_count();

-- ================================ notifications (written only by the server) ================================
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null default '',
  target jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_inbox on public.notifications (account_id, created_at desc);

-- a new job notifies members of the same discipline and sub-track (never employer accounts, never the poster)
create or replace function private.job_match_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (account_id, kind, title, body, target)
  select p.id, 'match', 'وظيفة مطابقة لملفك', new.title, jsonb_build_object('type', 'job', 'id', new.id)
  from public.profiles p
  where p.role in ('engineer', 'supervisor') and p.disc = new.disc and (new.sub is null or p.track = new.sub)
    and p.id <> auth.uid() and coalesce((p.settings ->> 'notify')::boolean, true);
  return null;
end $$;
create trigger jobs_notify after insert on public.jobs for each row execute function private.job_match_notify();

-- ================================ per-member state: saved items, follows, hidden, contacted… ================================
create table public.member_state (
  account_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null check (key ~ '^[a-zA-Z]{1,32}$'),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (account_id, key)
);

-- ================================ RLS ================================
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;
alter table public.ballots enable row level security;
alter table public.salary_shares enable row level security;
alter table public.company_reviews enable row level security;
alter table public.jobs enable row level security;
alter table public.job_contacts enable row level security;
alter table public.notifications enable row level security;
alter table public.member_state enable row level security;

-- visible to members unless moderation hid it; the author and staff still see a hidden item
create policy "posts: read" on public.posts for select to authenticated
  using (not hidden or public.is_staff() or public.is_mine('posts', id));
create policy "posts: write own" on public.posts for insert to authenticated with check (true);
create policy "posts: delete own" on public.posts for delete to authenticated using (public.is_mine('posts', id) or public.is_staff());

create policy "comments: read" on public.comments for select to authenticated
  using (not hidden or public.is_staff() or public.is_mine('comments', id));
create policy "comments: write" on public.comments for insert to authenticated
  with check (exists (select 1 from public.posts p where p.id = post_id and not p.hidden));
create policy "comments: delete own" on public.comments for delete to authenticated using (public.is_mine('comments', id) or public.is_staff());

create policy "reactions: own" on public.reactions for all to authenticated
  using (account_id = (select auth.uid())) with check (account_id = (select auth.uid()));
create policy "ballots: own" on public.ballots for all to authenticated
  using (account_id = (select auth.uid())) with check (account_id = (select auth.uid()));

create policy "salaries: engineers read" on public.salary_shares for select to authenticated
  using ((not hidden and public.money_access() = 'full') or public.is_staff() or public.is_mine('salary_shares', id));
create policy "salaries: write" on public.salary_shares for insert to authenticated with check (public.money_access() = 'full');
create policy "salaries: delete own" on public.salary_shares for delete to authenticated using (public.is_mine('salary_shares', id));

create policy "reviews: read" on public.company_reviews for select to authenticated
  using (not hidden or public.is_staff() or public.is_mine('company_reviews', id));
create policy "reviews: write" on public.company_reviews for insert to authenticated with check (true);
create policy "reviews: delete own" on public.company_reviews for delete to authenticated using (public.is_mine('company_reviews', id) or public.is_staff());

create policy "jobs: read" on public.jobs for select to authenticated
  using (not hidden or public.is_staff() or public.is_mine('jobs', id));
create policy "jobs: write" on public.jobs for insert to authenticated with check (true);
create policy "jobs: delete own" on public.jobs for delete to authenticated using (public.is_mine('jobs', id) or public.is_staff());

create policy "job contacts: own" on public.job_contacts for all to authenticated
  using (account_id = (select auth.uid())) with check (account_id = (select auth.uid()));

create policy "notifications: own read" on public.notifications for select to authenticated using (account_id = (select auth.uid()));
create policy "notifications: own mark read" on public.notifications for update to authenticated
  using (account_id = (select auth.uid())) with check (account_id = (select auth.uid()));
create policy "notifications: own delete" on public.notifications for delete to authenticated using (account_id = (select auth.uid()));

create policy "member state: own" on public.member_state for all to authenticated
  using (account_id = (select auth.uid())) with check (account_id = (select auth.uid()));

-- ---- column grants: server-set columns are never client-writable ----
revoke insert, update on public.posts, public.comments, public.salary_shares, public.company_reviews, public.jobs, public.notifications from authenticated;
grant insert (room, type, body, data, author_mode, dm) on public.posts to authenticated;
grant insert (post_id, parent_id, type, text, data, author_mode) on public.comments to authenticated;
grant insert (disc, track, pos, gov, years, salary, company, title, extras, author_mode) on public.salary_shares to authenticated;
grant insert (company_id, rating, text, data, author_mode) on public.company_reviews to authenticated;
grant insert (title, co, gov, city, disc, sub, pos, years, mode, type, descr, reqs, skills, contact, author_mode) on public.jobs to authenticated;
grant update (read) on public.notifications to authenticated;
-- reactions, ballots, member_state keep the full table grant: upserts rewrite the key columns, and the RLS check
-- (account_id = auth.uid()) already confines every row, new or updated, to its owner.

grant execute on function public.mark_best(uuid, uuid), public.money_access(), public.salary_bands(text, text) to authenticated;
