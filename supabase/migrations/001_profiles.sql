-- Profiles: one row per user with their financial baseline.
-- Linked 1:1 with auth.users via shared id (uuid).

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  savings_balance numeric(12, 2) not null default 0,
  monthly_salary  numeric(12, 2) not null default 0,
  onboarded       boolean        not null default false,
  created_at      timestamptz    not null default now(),
  updated_at      timestamptz    not null default now()
);

-- Keep updated_at fresh on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Row Level Security: each user can only see and edit their own profile.
alter table public.profiles enable row level security;

create policy "users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever a new user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
