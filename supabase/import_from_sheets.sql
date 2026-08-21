-- OPTIONAL — run this ONCE, only if you want your existing Google Sheet data.
-- Skip it entirely if you're happy starting fresh.
--
-- Step 1 (in Google Sheets): File > Download > CSV, once per tab.
-- Step 2 (in Supabase):      Table Editor > the table > Insert > Import from CSV.
--                            Import into the staging tables below, not the real ones.
-- Step 3:                    run this file in the SQL Editor.

create table if not exists _import_ledger (
  id text, item text, price text, who text, note text, participants text, settled text
);
create table if not exists _import_recurring (
  id text, item text, price text, who text, note text, participants text, "paidMonth" text
);

-- --- Roster -----------------------------------------------------------------
-- The Config tab stored people as one JSON blob. Easiest path is to retype the
-- names in the app's setup screen. If you'd rather not, paste the JSON here:
--
-- insert into people (name, color, position)
-- select p->>'name', p->>'color', (ord - 1)::int
-- from jsonb_array_elements('[{"name":"Irene","color":"#f8a5a5"},
--                            {"name":"Elena","color":"#a5c3f8"}]'::jsonb)
--      with ordinality as t(p, ord);

-- --- Ledger -----------------------------------------------------------------
-- created_at is backfilled from the id, which was Date.now() in milliseconds.
-- (Legacy ids are ~1.7e12; ids minted by the new app are ~1.7e15, so the two
-- generations are unambiguous and this conversion only ever sees legacy rows.)
insert into ledger (id, item, price_cents, who, note, participants, settled, created_at)
select
  i.id::bigint,
  i.item,
  round(i.price::numeric * 100)::int,
  i.who,
  coalesce(i.note, ''),
  coalesce(
    (select array_agg(btrim(x)) from unnest(string_to_array(i.participants, ',')) as x
     where btrim(x) <> ''),
    '{}'
  ),
  lower(coalesce(i.settled, 'false')) in ('true', 'yes', '1'),
  to_timestamp(i.id::bigint / 1000.0)
from _import_ledger i
where i.id is not null and btrim(i.id) <> ''
on conflict (id) do nothing;

-- --- Recurring --------------------------------------------------------------
insert into recurring (id, item, price_cents, who, note, participants, paid_month, created_at)
select
  i.id::bigint,
  i.item,
  round(i.price::numeric * 100)::int,
  i.who,
  coalesce(i.note, ''),
  coalesce(
    (select array_agg(btrim(x)) from unnest(string_to_array(i.participants, ',')) as x
     where btrim(x) <> ''),
    '{}'
  ),
  coalesce(i."paidMonth", ''),
  to_timestamp(i.id::bigint / 1000.0)
from _import_recurring i
where i.id is not null and btrim(i.id) <> ''
on conflict (id) do nothing;

-- --- Check it, then clean up ------------------------------------------------
-- select count(*) from ledger;
-- select count(*) from recurring;
-- drop table _import_ledger;
-- drop table _import_recurring;
