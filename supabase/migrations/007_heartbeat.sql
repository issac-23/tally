-- A table whose only job is to be written to.
--
-- The keep-awake workflow used to read from `categories`. That returned 200
-- for weeks and the project paused anyway, three days after a successful
-- ping — so a read was not counting as activity. A write has to reach
-- Postgres, so this gives the cron something to write.
--
-- One row, updated in place, so it never grows.
create table public.heartbeat (
  id        int primary key default 1,
  beat_at   timestamptz not null default now(),
  constraint heartbeat_single_row check (id = 1)
);

insert into public.heartbeat (id) values (1);

alter table public.heartbeat enable row level security;

-- Deliberately open to anon: there is nothing here to protect, and the
-- point is that an unauthenticated cron can write to it. No user data,
-- no foreign keys, one row that only ever holds a timestamp.
create policy "anyone can read the heartbeat"
  on public.heartbeat for select
  using (true);

create policy "anyone can update the heartbeat"
  on public.heartbeat for update
  using (true)
  with check (id = 1);
