-- Add email column to events table (Form 1, required)
alter table public.events
  add column if not exists email text;
