-- Add status column to events table.
-- Run this only if you already applied the initial migration.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS status text default 'pending'
  check (status in ('pending', 'approved', 'completed'));

-- Backfill any existing rows as pending.
UPDATE public.events
SET status = 'pending'
WHERE status IS NULL;
