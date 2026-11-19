-- Let logged-in team members delete events (the Delete button on the event
-- details page). Logged-out visitors still can't delete anything.
--
-- All of an event's data lives in its one row in public.events (Form 1 details,
-- date/time rows, the Form 2 games plan, decline message), so deleting the row
-- removes everything related to the event.

drop policy if exists "Members can delete events" on public.events;

create policy "Members can delete events"
  on public.events for delete
  to authenticated
  using (true);
