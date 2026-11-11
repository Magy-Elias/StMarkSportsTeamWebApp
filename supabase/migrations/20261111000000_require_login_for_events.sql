-- Require login for everything except submitting Form 1.
--
-- Logged-out visitors (anon) can only ADD a new pending event, with no
-- games plan. They can't read, approve or edit events.
-- Logged-in team members (authenticated) can read, add and update events.

drop policy if exists "Public can read events"   on public.events;
drop policy if exists "Public can insert events" on public.events;
drop policy if exists "Public can update events" on public.events;

create policy "Members can read events"
  on public.events for select
  to authenticated
  using (true);

create policy "Members can insert events"
  on public.events for insert
  to authenticated
  with check (true);

create policy "Members can update events"
  on public.events for update
  to authenticated
  using (true)
  with check (true);

create policy "Visitors can submit pending events"
  on public.events for insert
  to anon
  with check (
    status = 'pending'
    and leader is null
    and co_leader is null
    and games = '[]'::jsonb
    and day_details is null
  );
