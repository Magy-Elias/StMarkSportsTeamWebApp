-- Games plan per day (Event Management). One entry per day of the event, in the
-- same order as `schedule`:
--   [{ "leader": "...", "co_leader": "...", "games": [{ "leader", "name", "description", "tools" }] }]
-- Replaces the event-wide leader / co_leader / games columns, which are kept so
-- older data isn't lost. Existing plans are copied in as Day 1.

alter table public.events
  add column if not exists day_plans jsonb not null default '[]'::jsonb
    check (jsonb_typeof(day_plans) = 'array');

update public.events
set day_plans = jsonb_build_array(jsonb_build_object(
  'leader', leader,
  'co_leader', co_leader,
  'games', games
))
where day_plans = '[]'::jsonb
  and (leader is not null or co_leader is not null or jsonb_array_length(games) > 0);
