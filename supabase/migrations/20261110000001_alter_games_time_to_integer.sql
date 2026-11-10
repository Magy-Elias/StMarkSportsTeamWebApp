-- Change games_time from time to integer (store hours as whole numbers).
-- Run this only if you already applied the initial migration and have data in the table.

-- First, convert existing 'HH:MM:SS' time values to integer hours.
-- If you don't need to preserve existing values, you can skip the UPDATE below.
UPDATE public.events
SET games_time = EXTRACT(HOUR FROM games_time)::integer
WHERE games_time IS NOT NULL;

ALTER TABLE public.events
  ALTER COLUMN games_time TYPE integer
  USING games_time::integer;
