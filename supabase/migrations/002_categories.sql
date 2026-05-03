-- Categories: spending buckets. Two flavors:
--   * Presets (user_id IS NULL) — visible to everyone, not editable
--   * Custom (user_id = auth.uid()) — created and owned by one user

create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  name       text        not null,
  color      text        not null,
  icon       text        not null,
  is_preset  boolean     not null default false,
  created_at timestamptz not null default now(),
  -- Prevent duplicate names within the same user (or among presets).
  unique (user_id, name)
);

-- Index for fast per-user lookups.
create index categories_user_id_idx on public.categories (user_id);

-- Row Level Security
alter table public.categories enable row level security;

-- Anyone signed in can read presets + their own custom categories.
create policy "read presets and own categories"
  on public.categories for select
  using (is_preset = true or auth.uid() = user_id);

-- Only insert categories owned by you, never presets.
create policy "users can create their own categories"
  on public.categories for insert
  with check (auth.uid() = user_id and is_preset = false);

-- Only update/delete your own custom ones.
create policy "users can update their own categories"
  on public.categories for update
  using (auth.uid() = user_id and is_preset = false);

create policy "users can delete their own categories"
  on public.categories for delete
  using (auth.uid() = user_id and is_preset = false);

-- Seed preset categories (visible to everyone).
insert into public.categories (user_id, name, color, icon, is_preset) values
  (null, 'Food',          '#D4722A', '🍔', true),
  (null, 'Groceries',     '#3D9A6B', '🛒', true),
  (null, 'Housing',       '#C49A0A', '🏠', true),
  (null, 'Transport',     '#5A8A9A', '🚗', true),
  (null, 'Entertainment', '#A0728A', '🎬', true),
  (null, 'Shopping',      '#E8A55A', '🛍️', true),
  (null, 'Health',        '#B83232', '💊', true),
  (null, 'Bills',         '#7C6A5A', '💡', true),
  (null, 'Subscriptions', '#C75C1A', '📱', true),
  (null, 'Other',         '#B5A090', '📌', true);
