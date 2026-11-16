-- Add remarks column to events table (Form 1 "ملاحظات", optional free text).
alter table public.events
  add column if not exists remarks text;
