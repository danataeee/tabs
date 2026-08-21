-- House Finance — initial schema (migrated from Google Sheets / Apps Script)
--
-- Sheet tab -> table:
--   Config    -> people      (roster, one row per person, ordered by position)
--   Ledger    -> ledger      (one-time shared expenses)
--   Recurring -> recurring   (standing monthly bills)
--
-- Money is stored as integer cents. Never store dollars here.

create table if not exists people (
  id       bigserial primary key,
  name     text    not null unique,
  color    text    not null,
  position integer not null
);

create table if not exists ledger (
  id           bigint      primary key,          -- client-generated, see newId() in index.html
  item         text        not null,
  price_cents  integer     not null,
  who          text        not null,             -- payer name, plain text (not an FK; see README)
  note         text        not null default '',
  participants text[]      not null default '{}',
  settled      boolean     not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists recurring (
  id           bigint      primary key,
  item         text        not null,
  price_cents  integer     not null,
  who          text        not null,
  note         text        not null default '',
  participants text[]      not null default '{}',
  paid_month   text        not null default '',  -- '' or 'YYYY-MM'
  created_at   timestamptz not null default now()
);

create index if not exists ledger_created_at_idx    on ledger (created_at);
create index if not exists recurring_created_at_idx on recurring (created_at);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- This is a trusted household app with no per-user login: both roommates share
-- the anon key. RLS is ON (so the tables are never wide open by accident) with
-- one permissive policy per table granting the anon role full access.
--
-- Consequence to be aware of: anyone who obtains the anon key can read and
-- write these three tables. The key ships in the static frontend, so treat the
-- deployed URL as the secret. Do not put anything sensitive in the note field.
-- ---------------------------------------------------------------------------

alter table people    enable row level security;
alter table ledger    enable row level security;
alter table recurring enable row level security;

drop policy if exists people_anon_all    on people;
drop policy if exists ledger_anon_all    on ledger;
drop policy if exists recurring_anon_all on recurring;

create policy people_anon_all    on people    for all to anon, authenticated using (true) with check (true);
create policy ledger_anon_all    on ledger    for all to anon, authenticated using (true) with check (true);
create policy recurring_anon_all on recurring for all to anon, authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Realtime: both roommates see each other's changes live.
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table people;
alter publication supabase_realtime add table ledger;
alter publication supabase_realtime add table recurring;

-- REPLICA IDENTITY FULL so DELETE events carry the old row to subscribers.
alter table people    replica identity full;
alter table ledger    replica identity full;
alter table recurring replica identity full;
