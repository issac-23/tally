-- Ending a recurring commitment.
--
-- A commitment is the newest row in a series, and nothing said it could stop:
-- a cancelled subscription kept counting toward burn rate and runway until
-- every row in the series was deleted, history included.
--
-- ends_on is set on a series' newest row. From that day the series no longer
-- counts. Logging the expense again later makes a newer row with no end date,
-- which starts the commitment up again, so nothing needs un-ending.

alter table public.transactions
  add column ends_on date;

-- A one-off has nothing to end, and a commitment can't end before its last
-- logged row. Not valid: existing rows are all null, so there is nothing to
-- check, and it skips a full-table scan.
alter table public.transactions
  add constraint transactions_ends_on_check
  check (ends_on is null or (recurrence <> 'once' and ends_on >= date)) not valid;
