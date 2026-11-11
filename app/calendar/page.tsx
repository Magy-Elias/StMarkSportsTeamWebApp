import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n: number) => String(n).padStart(2, '0');
const toKey = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

type EventRow = {
  id: string;
  title: string;
  event_date: string;
  games_time?: string | null;
  leader?: string | null;
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { year: yearParam, month: monthParam } = await searchParams;
  const now = new Date();
  const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();
  const month = monthParam ? parseInt(monthParam, 10) : now.getMonth();

  const supabase = await createClient();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, event_date, games_time, leader')
    .eq('status', 'completed')
    .gte('event_date', toKey(year, month, 1))
    .lte('event_date', toKey(year, month, lastDay))
    .order('event_date')
    .order('games_time', { nullsFirst: true });

  const byDay: Record<string, EventRow[]> = {};
  for (const e of (events ?? [])) (byDay[e.event_date] ??= []).push(e);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const todayKey = toKey(now.getFullYear(), now.getMonth(), now.getDate());

  const prev = new Date(year, month - 1, 1);
  const next = new Date(year, month + 1, 1);

  return (
    <section>
      <div className="cal-header">
        <a href={`/calendar?year=${prev.getFullYear()}&month=${prev.getMonth()}`} className="chip">
          ‹
        </a>
        <h1>
          {new Date(year, month).toLocaleString(undefined, { month: 'long', year: 'numeric' })}
        </h1>
        <a href={`/calendar?year=${next.getFullYear()}&month=${next.getMonth()}`} className="chip">
          ›
        </a>
      </div>

      {error && <p className="error">Could not load events: {error.message}</p>}

      <div className="calendar">
        {WEEKDAYS.map((w) => (
          <div key={w} className="weekday">{w}</div>
        ))}
        {cells.map((day) => {
          if (!day) return <div key={`blank-${day}`} className="day blank" />;
          const key = toKey(year, month, day);
          return (
            <div key={key} className={`day${key === todayKey ? ' today' : ''}`}>
              <span className="day-num">{day}</span>
              {(byDay[key] ?? []).map((e) => (
                <Link key={e.id} href={`/events/${e.id}`} className={`chip${e.leader ? ' planned' : ''}`}>
                  {e.games_time && <b>{e.games_time.slice(0, 5)} </b>}
                  {e.title}
                </Link>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}