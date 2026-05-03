-- Transactions: every expense the user logs.
-- amount is stored as a positive number representing money spent.

create table public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  amount      numeric(12, 2) not null check (amount >= 0),
  description text,
  category_id uuid references public.categories(id) on delete set null,
  merchant    text,
  date        date not null default current_date,
  created_at  timestamptz not null default now()
);

-- The most common query is "show me my transactions, newest first."
create index transactions_user_date_idx
  on public.transactions (user_id, date desc, created_at desc);

-- Filter-by-category lookups.
create index transactions_category_idx
  on public.transactions (category_id);

-- Row Level Security: only your own transactions, period.
alter table public.transactions enable row level security;

create policy "users can read own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "users can insert own transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "users can update own transactions"
  on public.transactions for update
  using (auth.uid() = user_id);

create policy "users can delete own transactions"
  on public.transactions for delete
  using (auth.uid() = user_id);
