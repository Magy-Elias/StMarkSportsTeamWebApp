# St. Mark Sports Team Web App

A React + Vite app backed by Supabase for planning sports team events.

## Pages
- `/`: monthly calendar of events (blue = Form 1 only, green = games plan added)
- `/events/:id`: event details plus the games plan
- `/form-1`: create an event (service/meeting, responsible person, date, place, ...)
- `/form-2`: add or edit the games plan (leaders, list of games, details of the day) for an existing event

All data lives in a single Supabase table, `events`. See
[`supabase/migrations/20261110000000_create_events.sql`](supabase/migrations/20261110000000_create_events.sql).

## Setup
1. Create a Supabase project.
2. Run the migration SQL in the Supabase SQL Editor, or use `supabase link --project-ref <ref>` and then `supabase db push`.
3. Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. `npm install` and then `npm run dev`.

> There's no login yet: anyone with the link can read, add and edit events.
