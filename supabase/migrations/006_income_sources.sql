-- Income sources: what comes in, and when.
--
-- profiles.monthly_salary assumed one steady paycheck forever, which is
-- wrong for exactly the people who need a runway tracker — freelancers, a
-- household with two incomes, anyone on a contract with an end date.
--
-- Same recurrence vocabulary as transactions, so a fortnightly paycheck and
-- a fortnightly expense are described the same way.

create table public.income_sources (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  amount     numeric(12, 2) not null check (amount > 0),
  recurrence text not null default 'monthly'
    check (recurrence in (
      'weekly',
      'biweekly',
      'monthly',
      'quarterly',
      'semiannual',
      'yearly'
    )),
  -- Null start means "already running". Null end means "no end in sight".
  -- An end date is the whole point: it's how the projection knows a
  -- contract stops paying in March.
  starts_on  date,
  ends_on    date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint income_sources_dates_ordered
    check (starts_on is null or ends_on is null or ends_on >= starts_on)
);

create index income_sources_user_idx on public.income_sources (user_id);

create trigger income_sources_set_updated_at
  before update on public.income_sources
  for each row
  execute function public.set_updated_at();

alter table public.income_sources enable row level security;

create policy "users can read own income sources"
  on public.income_sources for select
  using (auth.uid() = user_id);

create policy "users can insert own income sources"
  on public.income_sources for insert
  with check (auth.uid() = user_id);

create policy "users can update own income sources"
  on public.income_sources for update
  using (auth.uid() = user_id);

create policy "users can delete own income sources"
  on public.income_sources for delete
  using (auth.uid() = user_id);

-- Carry existing salaries over, so nobody opens the app to a $0 income and
-- a runway that suddenly says they're broke.
insert into public.income_sources (user_id, name, amount, recurrence)
select id, 'Salary', monthly_salary, 'monthly'
from public.profiles
where monthly_salary > 0;

-- profiles.monthly_salary is no longer read by the app. It stays for now so
-- this migration is reversible; a later one can drop it once the data above
-- is known good.
comment on column public.profiles.monthly_salary is
  'Superseded by public.income_sources. No longer read by the application.';
