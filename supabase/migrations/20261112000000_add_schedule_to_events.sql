-- Dates and times for an event (Form 1 "الوقت المحدد للالعاب").
-- Array of { "date": "YYYY-MM-DD", "from": "HH:MM", "to": "HH:MM" } (24-hour times).
-- Replaces games_time (hours) in Form 1. games_time is kept so existing data isn't lost.

alter table public.events
  add column if not exists schedule jsonb not null default '[]'::jsonb
    check (jsonb_typeof(schedule) = 'array');
