import { parseSchedule } from '@/lib/schedule';

// Event statuses stored in the database: pending → approved (or declined).
// "Completed" is NOT stored: it's worked out automatically — an approved event
// whose last date has passed.

/** The team is in the UAE, so "today" is the UAE date wherever the code runs. */
export const TEAM_TIME_ZONE = 'Asia/Dubai';

/** Today's date in the UAE as "YYYY-MM-DD". */
export const teamToday = () => new Date().toLocaleDateString('en-CA', { timeZone: TEAM_TIME_ZONE });

type DatedEvent = { status: string; event_date: string; schedule?: unknown };

/** The event's last day: its تاريخ or its latest date row, whichever is later. */
export function lastEventDate(e: Pick<DatedEvent, 'event_date' | 'schedule'>): string {
  return [e.event_date, ...parseSchedule(e.schedule).map((s) => s.date)].sort().at(-1) ?? e.event_date;
}

/**
 * Status to show: "completed" once an approved event's last day is over.
 * (Older rows saved as "completed" count as approved until their date passes.)
 */
export function displayStatus(e: DatedEvent, today = teamToday()): string {
  if (e.status !== 'approved' && e.status !== 'completed') return e.status;
  return lastEventDate(e) < today ? 'completed' : 'approved';
}

/** Whether Form 2 (games plan) has been filled in for this event. */
export const hasGamesPlan = (e: { leader?: string | null; games?: unknown }) =>
  Boolean(e.leader) || (Array.isArray(e.games) && e.games.length > 0);
