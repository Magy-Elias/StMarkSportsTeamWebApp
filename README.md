# St. Mark Sports Team Web App

A web app for planning ONE99 Sports Team events, built with Next.js and Supabase.

## Tech stack
- **TypeScript** with **React 19**
- **Next.js 16** (App Router, Turbopack)
- **Tailwind CSS v4**, plus plain CSS in [`app/globals.css`](app/globals.css)
- **Supabase**: Postgres database (schema and access rules written in **SQL**) and Supabase Auth for login
- **ESLint** (typescript-eslint) for linting, **Vitest** + Testing Library for tests

The interface is in **English**, except Form 1 and the event details, which are in **Arabic** (right-to-left).

## Pages
Every page requires logging in, except Form 1 and the login screen.

- `/login`: sign in with email and password
- `/`: home page with links to each section
- `/calendar`: monthly calendar of events that have a games plan (saved through Form 2)
- `/pending`: events waiting for approval; approve them, then open Form 2
- `/events/[id]`: event details plus the games plan
- `/form-1`: submit a new event (service/meeting, responsible person, date, place, ...). **Public**: no login needed. New events start as pending.
- `/form-2`: add or edit the games plan (leaders, list of games, details of the day) for an existing event

All data lives in a single Supabase table, `events`. See [`supabase/migrations/`](supabase/migrations/).

## Setup
1. Create a Supabase project.
2. Run the migrations in [`supabase/migrations/`](supabase/migrations/) in order, in the Supabase SQL Editor. Or use `supabase link --project-ref <ref>` and then `supabase db push`.
3. In the Supabase dashboard:
   - Add team members under **Authentication → Users → Add user**.
   - Turn off **Authentication → Sign In / Providers → Allow new users to sign up**, so only people you add can log in.
4. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. `npm install` and then `npm run dev`. The app runs at http://localhost:3000.

## Scripts
- `npm run dev`: start the development server
- `npm run build` / `npm start`: production build and server
- `npm run lint`: run ESLint
- `npm run typecheck`: check TypeScript types
- `npm test`: run tests with Vitest

## Access rules
- Logged-out visitors can only submit Form 1. The database lets them add a pending event, but not read or change any events.
- Logged-in team members can read, approve and edit all events.
