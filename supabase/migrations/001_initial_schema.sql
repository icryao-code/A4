create extension if not exists "pgcrypto";

create type public.user_role as enum ('student', 'admin');
create type public.question_status as enum ('published', 'draft', 'offline');
create type public.content_status as enum ('curated', 'imported', 'demo');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nickname text not null default '备考者',
  role public.user_role not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.idioms (
  id text primary key,
  name text not null,
  pinyin text not null,
  meaning text not null,
  example text not null,
  category text not null,
  source_ref text not null,
  review_status text not null default '待校审',
  created_at timestamptz not null default now()
);

create table public.questions (
  id text primary key,
  stem text not null,
  options jsonb not null,
  answer smallint not null check (answer between 0 and 3),
  explanation text not null default '',
  source text not null,
  source_ref text not null,
  difficulty text not null check (difficulty in ('基础', '进阶')),
  status public.question_status not null default 'draft',
  content_status public.content_status not null default 'curated',
  reviewed_at text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  daily_minutes smallint not null default 60 check (daily_minutes in (30, 60, 120)),
  target_date date not null default '2028-11-26',
  region text not null default '全国',
  updated_at timestamptz not null default now()
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id text not null references public.questions(id) on delete restrict,
  correct boolean not null,
  seconds integer not null default 0 check (seconds >= 0),
  selected_answer smallint not null check (selected_answer between 0 and 3),
  created_at timestamptz not null default now()
);

create table public.mistakes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id text not null references public.questions(id) on delete restrict,
  count integer not null default 1 check (count > 0),
  reasons jsonb not null default '[]'::jsonb,
  last_wrong_at date not null default current_date,
  due_at date not null default current_date,
  mastered boolean not null default false,
  primary key (user_id, question_id)
);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  total integer not null check (total >= 0),
  correct integer not null check (correct >= 0 and correct <= total),
  seconds integer not null default 0 check (seconds >= 0)
);

create table public.favorite_idioms (
  user_id uuid not null references public.profiles(id) on delete cascade,
  idiom_id text not null references public.idioms(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, idiom_id)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, nickname)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'nickname', split_part(new.email, '@', 1)));
  insert into public.user_preferences (user_id) values (new.id);
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- SQL Editor runs without auth.uid(); only authenticated client requests need the self-escalation guard.
  if old.role is distinct from new.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'role changes require an administrator';
  end if;
  return new;
end;
$$;

create or replace trigger profiles_role_guard
  before update on public.profiles
  for each row execute procedure public.prevent_role_escalation();

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

alter table public.profiles enable row level security;
alter table public.idioms enable row level security;
alter table public.questions enable row level security;
alter table public.user_preferences enable row level security;
alter table public.attempts enable row level security;
alter table public.mistakes enable row level security;
alter table public.study_sessions enable row level security;
alter table public.favorite_idioms enable row level security;

create policy "profiles own read" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles own update" on public.profiles for update using (id = auth.uid());

create policy "idioms authenticated read" on public.idioms for select to authenticated using (true);
create policy "idioms admin write" on public.idioms for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "published questions read" on public.questions for select to authenticated using (status = 'published' or public.is_admin());
create policy "questions admin write" on public.questions for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "preferences own" on public.user_preferences for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "attempts own" on public.attempts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "mistakes own" on public.mistakes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "sessions own" on public.study_sessions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "favorites own" on public.favorite_idioms for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create index attempts_user_created_idx on public.attempts (user_id, created_at desc);
create index mistakes_user_due_idx on public.mistakes (user_id, due_at);
create index questions_status_idx on public.questions (status);
