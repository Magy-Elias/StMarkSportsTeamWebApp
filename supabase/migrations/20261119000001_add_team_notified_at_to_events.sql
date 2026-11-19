-- When the ONE99 team was emailed about a new Event Registration submission
-- (Edge Function notify-event-status, kind "submitted"). Set once, so each new
-- request sends exactly one email to the team, even if the website asks twice.

alter table public.events
  add column if not exists team_notified_at timestamptz;
