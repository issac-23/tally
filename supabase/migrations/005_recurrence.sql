-- Recurrence: how often an expense repeats.
--
-- 'once' is the default so every existing row keeps its current meaning —
-- a single expense counted in the 30-day window. Anything else is a standing
-- commitment, and the runway maths converts it to a monthly equivalent
-- instead of only counting it in the month it was logged.

alter table public.transactions
  add column recurrence text not null default 'once'
  check (recurrence in (
    'once',
    'daily',
    'weekly',
    'biweekly',
    'monthly',
    'quarterly',
    'semiannual',
    'yearly'
  ));

-- The runway query pulls every standing commitment regardless of date, so
-- it needs its own index rather than riding the user/date one.
create index transactions_recurring_idx
  on public.transactions (user_id, recurrence)
  where recurrence <> 'once';
