-- Size limits, per-user row caps, and category ownership.
--
-- The app checks all of this before writing (lib/utils/limits.ts and the
-- validators that use it), but the anon key is public and RLS only asks who
-- owns a row, so anyone signed in can skip the app and call PostgREST with
-- whatever they like. These are the same rules, enforced where that can't
-- happen.
--
-- The CHECK constraints are added NOT VALID: every insert and update is
-- checked from here on, but rows already stored aren't re-read, so one old
-- oversized note can't stop the migration. Once a query confirms nothing
-- breaks them, `alter table ... validate constraint ...` makes them full
-- constraints.

-- ---------------------------------------------------------------- transactions

-- 003 allowed a zero amount. The app has always rejected one ("Amount must
-- be greater than zero"), so this tightens the database to match. The upper
-- bound is what numeric(12, 2) can hold anyway; it's stated so the rule
-- reads the same here as in the app.
alter table public.transactions
  add constraint transactions_amount_range
    check (amount > 0 and amount <= 9999999999.99) not valid,
  add constraint transactions_description_length
    check (char_length(description) <= 200) not valid,
  add constraint transactions_merchant_length
    check (char_length(merchant) <= 100) not valid;

-- -------------------------------------------------------------- income_sources

-- amount > 0 is already enforced by 006.
alter table public.income_sources
  add constraint income_sources_amount_max
    check (amount <= 9999999999.99) not valid,
  add constraint income_sources_name_length
    check (char_length(name) <= 100) not valid;

-- ------------------------------------------------------------------ categories

-- The app stops at 32; this is a looser backstop so it doesn't have to
-- change in lockstep with the form.
alter table public.categories
  add constraint categories_name_length
    check (char_length(name) <= 50) not valid;

-- -------------------------------------------------------------------- profiles

-- validateProfileInput has always said a negative balance isn't allowed and
-- claimed the database agreed. Now it does.
alter table public.profiles
  add constraint profiles_savings_balance_range
    check (savings_balance >= 0 and savings_balance <= 9999999999.99) not valid;

-- -------------------------------------------------------------- per-user caps

-- Far above anything a person logs by hand, low enough that a script with a
-- session can't fill the database. The cap is passed in by each trigger.
--
-- Runs as the caller (no security definer): the RLS select policies already
-- let a user count their own rows, which is all this needs. Preset
-- categories have no user_id and aren't counted or capped.
create or replace function public.enforce_row_cap()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  cap   integer := tg_argv[0]::integer;
  total integer;
begin
  if new.user_id is null then
    return new;
  end if;

  -- Two inserts racing could both see cap - 1 and both succeed. Serialise
  -- inserts per user and table for the rest of the transaction.
  perform pg_advisory_xact_lock(hashtext(tg_table_name), hashtext(new.user_id::text));

  execute format(
    'select count(*) from %I.%I where user_id = $1',
    tg_table_schema,
    tg_table_name
  )
  into total
  using new.user_id;

  if total >= cap then
    raise exception 'row limit reached: % allows % rows per user', tg_table_name, cap
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger transactions_row_cap
  before insert on public.transactions
  for each row
  execute function public.enforce_row_cap(10000);

create trigger income_sources_row_cap
  before insert on public.income_sources
  for each row
  execute function public.enforce_row_cap(50);

create trigger categories_row_cap
  before insert on public.categories
  for each row
  execute function public.enforce_row_cap(100);

-- ------------------------------------------------------- category ownership

-- transactions.category_id is a plain foreign key (003), and foreign key
-- checks don't go through RLS, so a direct PostgREST call could file an
-- expense under another user's category. canUseCategory stops that in the
-- app; this stops it for everyone else.
--
-- Runs as the caller (no security definer), so RLS on categories already
-- hides other users' custom categories from this lookup and they come back
-- as "not found". Not found is rejected, which is what makes that safe. The
-- explicit owner comparison is for callers that bypass RLS (the service
-- role, a future security definer), where the row would be visible.
create or replace function public.enforce_category_ownership()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  category public.categories%rowtype;
begin
  if new.category_id is null then
    return new;
  end if;

  -- Neither the category nor the owner changed on this update, so there is
  -- nothing new to check.
  if tg_op = 'UPDATE'
     and new.category_id is not distinct from old.category_id
     and new.user_id is not distinct from old.user_id then
    return new;
  end if;

  select * into category from public.categories where id = new.category_id;

  if not found or not (category.is_preset or category.user_id = new.user_id) then
    raise exception 'category is not available to this user'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger transactions_category_ownership
  before insert or update on public.transactions
  for each row
  execute function public.enforce_category_ownership();
