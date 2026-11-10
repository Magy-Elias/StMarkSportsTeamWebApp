-- One row per event. Form 1 creates the row; Form 2 fills in the
-- games plan for an existing row.
create table if not exists public.events (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  -- Form 1
  title              text not null,          -- اسم الخدمة او الاجتماع
  responsible_person text,                   -- الشخص المسؤول
  phone              text,                   -- رقم التليفون
  day_name           text,                   -- اسم اليوم
  goal               text,                   -- الهدف
  event_date         date not null,          -- تاريخ
  participants_count integer check (participants_count >= 0), -- عدد المشاركين
  location           text,                   -- المكان
  games_time         integer,                -- الوقت المحدد للالعاب (بالساعات)

  -- Form 2
  leader             text,
  co_leader          text,
  -- Array of games: [{ "leader", "name", "description", "tools" }]
  games              jsonb not null default '[]'::jsonb
                       check (jsonb_typeof(games) = 'array'),
  day_details        text
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

alter table public.events enable row level security;

-- Public app with no login: anyone can read, add and update events.
-- Tighten these once you add authentication.
create policy "Public can read events"
  on public.events for select
  to anon, authenticated
  using (true);

create policy "Public can insert events"
  on public.events for insert
  to anon, authenticated
  with check (true);

create policy "Public can update events"
  on public.events for update
  to anon, authenticated
  using (true)
  with check (true);
