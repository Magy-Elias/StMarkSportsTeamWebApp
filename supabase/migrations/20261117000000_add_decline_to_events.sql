-- Event statuses: pending → approved, or pending → declined.
-- "Completed" is no longer stored: the app shows an approved event as completed
-- automatically once its last date has passed.
--
-- 1. Declining events from Events Pending: a 'declined' status, plus the message
--    written when declining and when it happened.

alter table public.events
  add column if not exists decline_reason text,
  add column if not exists declined_at timestamptz;

-- 2. Replace the status check so it also allows 'declined'.
-- (Its name depends on how the column was created, so drop any check on status.)
do $$
declare c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.events'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.events drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.events
  add constraint events_status_check
  check (status in ('pending', 'approved', 'completed', 'declined'));

-- 3. Rows saved as 'completed' (that used to mean "games plan saved") are approved
--    events, so store them as approved. The app works out "completed" from the date.
update public.events set status = 'approved' where status = 'completed';
