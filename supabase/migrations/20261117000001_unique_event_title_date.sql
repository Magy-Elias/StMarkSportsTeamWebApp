-- One event per name per date: the event's name (اسم الخدمة او الاجتماع) and its
-- date (تاريخ) together must be unique.
--
-- The `id` column stays the primary key (event pages, Form 2 links and the access
-- rules all use it). This unique index enforces the "name + date" key on top:
--   * spaces before/after the name are ignored ("Name" = "Name "),
--   * declined events don't count, so a declined event can be submitted again.
--
-- Run 20261117000000_add_decline_to_events.sql first.
-- If this fails with "could not create unique index", there are already duplicates;
-- find them with the query at the bottom, fix or delete them, then run this again.

create unique index if not exists events_title_date_key
  on public.events (btrim(title), event_date)
  where status <> 'declined';

-- Find existing duplicates (name + date used more than once):
-- select btrim(title) as title, event_date, count(*)
-- from public.events
-- where status <> 'declined'
-- group by btrim(title), event_date
-- having count(*) > 1;
