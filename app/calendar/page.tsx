import Link from 'next/link';
import { formatTime, parseSchedule } from '@/lib/schedule';
import { createClient } from '@/lib/supabase/server';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n: number) => String(n).padStart(2, '0');
const toKey = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

// One chip on the calendar: an event on one of its days, with that day's start time.
type DayEntry = { id: string; title: string; leader?: string | null; from: string };

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

  const monthStart = toKey(year, month, 1);
  const monthEnd = toKey(year, month, lastDay);

  // Events whose main date (تاريخ) is this month, plus any with schedule rows,
  // since those rows may fall in this month.
  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, event_date, leader, schedule')
    .eq('status', 'completed')
    .or(`and(event_date.gte.${monthStart},event_date.lte.${monthEnd}),schedule.neq.[]`);

  // An event shows on its تاريخ date and on every date in its schedule.
  const byDay: Record<string, DayEntry[]> = {};
  for (const e of events ?? []) {
    const slots = parseSchedule(e.schedule);
    const days = new Set([e.event_date, ...slots.map((s) => s.date)]);
    for (const day of days) {
      if (day < monthStart || day > monthEnd) continue;
      const from = slots.filter((s) => s.date === day).map((s) => s.from).sort()[0] ?? '';
      (byDay[day] ??= []).push({ id: e.id, title: e.title, leader: e.leader, from });
    }
  }
  // Within a day: timed events in time order, then untimed ones.
  for (const list of Object.values(byDay)) {
    list.sort((a, b) => (a.from || '99').localeCompare(b.from || '99') || a.title.localeCompare(b.title));
  }

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
                  {e.from && <b>{formatTime(e.from)} </b>}
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