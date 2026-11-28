import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatRange, parseSchedule, type ScheduleSlot } from '@/lib/schedule';
import { parseDayPlans, type DayPlan } from '@/lib/dayPlans';
import EventsDateFilter from '@/components/EventsDateFilter';
import { displayStatus, hasGamesPlan, lastEventDate, teamToday } from '@/lib/status';
import {
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  CloseIcon,
  EyeIcon,
  GamesIcon,
  MailIcon,
  PhoneIcon,
  PinIcon,
  UserIcon,
} from '@/components/icons';

// Events that have been reviewed: two tabs, Approved and Declined.
// Each tab has its own address (/events and /events?tab=declined).

type Row = {
  id: string;
  title: string;
  event_date: string;
  status: string;
  location?: string | null;
  responsible_person?: string | null;
  phone?: string | null;
  email?: string | null;
  schedule?: unknown;
  day_plans?: unknown;
  leader?: string | null;
  co_leader?: string | null;
  games?: unknown;
  decline_reason?: string | null;
  declined_at?: string | null;
};

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

/** One day of an event on the filtered date, with that day's games plan. */
type Slot = { event: Row; day?: ScheduleSlot; dayIndex: number; plan?: DayPlan };

const NO_TIME = 'none';
const timeKey = (d?: ScheduleSlot) => (d ? `${d.from}-${d.to}` : NO_TIME);
const isDate = (v?: string) => Boolean(v && /^\d{4}-\d{2}-\d{2}$/.test(v));

/** Every day of the given events that falls on `date` (events without dates rows use their main date). */
function slotsOn(events: Row[], date: string): Slot[] {
  return events.flatMap((event) => {
    const days = parseSchedule(event.schedule);
    const plans = parseDayPlans(event);
    if (!days.length) return event.event_date === date ? [{ event, dayIndex: 0, plan: plans[0] }] : [];
    return days.flatMap((day, dayIndex) => (day.date === date ? [{ event, day, dayIndex, plan: plans[dayIndex] }] : []));
  });
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; date?: string; time?: string }>;
}) {
  const { tab, date: dateParam, time } = await searchParams;
  const active = tab === 'declined' ? 'declined' : 'approved';
  // Approved tab only: filter by date, then pick a time to see who leads what.
  const date = active === 'approved' && isDate(dateParam) ? (dateParam as string) : '';

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('events')
    .select(
      'id, title, event_date, status, location, responsible_person, phone, email, schedule, day_plans, leader, co_leader, games, decline_reason, declined_at',
    )
    // "completed" in older rows also means approved.
    .in('status', ['approved', 'completed', 'declined'])
    .order('event_date', { ascending: true });

  const rows = (data ?? []) as Row[];
  const today = teamToday();
  // Approved: upcoming first (soonest at the top), then past (completed) ones, most recent first.
  const approved = rows.filter((e) => e.status !== 'declined');
  const upcoming = approved.filter((e) => lastEventDate(e) >= today);
  const past = approved.filter((e) => lastEventDate(e) < today).reverse();
  // Declined: most recently declined first.
  const declined = rows
    .filter((e) => e.status === 'declined')
    .sort((a, b) => (b.declined_at ?? '').localeCompare(a.declined_at ?? ''));
  const slots = date ? slotsOn(approved, date) : [];
  // The times on that date, earliest first, each with its events.
  const times = [...new Set(slots.map((s) => timeKey(s.day)))].sort((a, b) =>
    a === NO_TIME ? 1 : b === NO_TIME ? -1 : a.localeCompare(b),
  );
  const selectedTime = time && times.includes(time) ? time : '';
  const timeSlots = slots
    .filter((s) => timeKey(s.day) === selectedTime)
    .sort((a, b) => a.event.title.localeCompare(b.event.title));
  const timeLabel = (key: string) => {
    if (key === NO_TIME) return 'No time set';
    const [from, to] = key.split('-');
    return formatRange({ date, from, to });
  };

  // Days with approved events, for the calendar's highlights.
  const eventDates = [
    ...new Set(
      approved.flatMap((e) => {
        const days = parseSchedule(e.schedule);
        return days.length ? days.map((d) => d.date) : [e.event_date];
      }),
    ),
  ].sort();

  const onDate = new Set(slots.map((s) => s.event.id));
  const list = active === 'approved' ? [...upcoming, ...past].filter((e) => !date || onDate.has(e.id)) : declined;

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>Events</h1>
          <p className="muted">Events that have been reviewed: approved or declined.</p>
        </div>
        {active === 'approved' && <EventsDateFilter date={date} eventDates={eventDates} today={today} />}
      </header>

      <nav className="tabs" aria-label="Event status">
        <Link
          href="/events"
          className={`tab${active === 'approved' ? ' is-active' : ''}`}
          aria-current={active === 'approved' ? 'page' : undefined}
        >
          <CheckIcon size={17} /> Approved Events <span className="tab-count">{approved.length}</span>
        </Link>
        <Link
          href="/events?tab=declined"
          className={`tab${active === 'declined' ? ' is-active' : ''}`}
          aria-current={active === 'declined' ? 'page' : undefined}
        >
          <CloseIcon size={17} /> Declined Events <span className="tab-count">{declined.length}</span>
        </Link>
      </nav>

      {error && <p className="error">Could not load events: {error.message}</p>}

      {date && (
        <section className="events-filter" aria-label={`Times on ${formatDate(date)}`}>
          <h2 className="events-filter-title">Times on {formatDate(date)}</h2>
          {(
            times.length ? (
              <div className="time-buttons" role="group" aria-label={`Times on ${formatDate(date)}`}>
                {times.map((key) => (
                  <Link
                    key={key}
                    href={key === selectedTime ? `/events?date=${date}` : `/events?date=${date}&time=${key}`}
                    className={`time-button${key === selectedTime ? ' is-active' : ''}`}
                    aria-current={key === selectedTime ? 'true' : undefined}
                    scroll={false}
                  >
                    <ClockIcon size={16} /> <span dir="ltr">{timeLabel(key)}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="muted">No approved events on {formatDate(date)}.</p>
            )
          )}
        </section>
      )}

      {selectedTime && (
        <section className="leaders-table-wrap" aria-labelledby="leaders-title">
          <h2 id="leaders-title">
            {formatDate(date)} · <span dir="ltr">{timeLabel(selectedTime)}</span>
          </h2>
          <div className="leaders-scroll">
            <table className="leaders-table">
              <thead>
                <tr>
                  <th scope="col">Event</th>
                  <th scope="col">Leader</th>
                  <th scope="col">Co-Leader</th>
                  <th scope="col">Games&apos; Leaders</th>
                </tr>
              </thead>
              <tbody>
                {timeSlots.map(({ event, day, dayIndex, plan }) => {
                  const games = (plan?.games ?? []).filter((g) => g.leader || g.name);
                  return (
                    <tr key={`${event.id}-${dayIndex}`}>
                      <td data-label="Event">
                        <Link href={`/events/${event.id}`} dir="auto">{event.title}</Link>
                        {day?.title && <span className="leaders-sub" dir="auto">{day.title}</span>}
                      </td>
                      <td data-label="Leader" dir="auto">{plan?.leader || <span className="muted">—</span>}</td>
                      <td data-label="Co-Leader" dir="auto">{plan?.co_leader || <span className="muted">—</span>}</td>
                      <td data-label="Games' Leaders">
                        {games.length ? (
                          <ul className="leaders-games">
                            {games.map((g, i) => (
                              <li key={i} dir="auto">
                                {g.leader || <span className="muted">—</span>}
                                {g.name && <span className="leaders-sub"> {g.name}</span>}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <Link href={`/event-management?event=${event.id}`} className="muted">No games plan yet</Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!error && !selectedTime && list.length === 0 && !date && (
        <div className="empty-state">
          {active === 'approved' ? <CheckIcon size={28} /> : <CloseIcon size={28} />}
          <p>{active === 'approved' ? 'No approved events yet.' : 'No declined events.'}</p>
        </div>
      )}

      {!selectedTime && (
      <div className="pending-list">
        {list.map((ev) => {
          const days = parseSchedule(ev.schedule);
          const isDeclined = ev.status === 'declined';
          const completed = !isDeclined && displayStatus(ev, today) === 'completed';
          const planned = hasGamesPlan(ev);
          return (
            <article
              key={ev.id}
              className={`pending-card ${isDeclined ? 'is-declined' : completed ? 'is-completed' : 'is-approved'}`}
            >
              <div className="pending-head">
                <h2 dir="auto">{ev.title}</h2>
                <div className="badge-row">
                  {isDeclined ? (
                    <span className="status-badge declined"><CloseIcon size={14} /> Declined</span>
                  ) : completed ? (
                    <span className="status-badge completed"><CheckIcon size={14} /> Completed</span>
                  ) : (
                    <span className="status-badge approved"><CheckIcon size={14} /> Approved</span>
                  )}
                  {!isDeclined && (
                    <span className={`status-badge ${planned ? 'completed' : 'pending'}`}>
                      {planned ? 'Games plan added' : 'No games plan yet'}
                    </span>
                  )}
                </div>
              </div>

              <ul className="meta-list">
                {days.length ? (
                  days.map((d, i) => (
                    <li key={i}>
                      <ClockIcon size={16} /> {d.title ? `${d.title} · ` : ''}{formatDate(d.date)} · <span dir="ltr">{formatRange(d)}</span>
                    </li>
                  ))
                ) : (
                  <li><CalendarIcon size={16} /> {formatDate(ev.event_date)}</li>
                )}
                {ev.location && <li><PinIcon size={16} /> <span dir="auto">{ev.location}</span></li>}
                {ev.responsible_person && <li><UserIcon size={16} /> <span dir="auto">{ev.responsible_person}</span></li>}
                {ev.phone && <li><PhoneIcon size={16} /> <a href={`tel:${ev.phone}`} dir="ltr">{ev.phone}</a></li>}
                {ev.email && <li><MailIcon size={16} /> <a href={`mailto:${ev.email}`} dir="ltr">{ev.email}</a></li>}
              </ul>

              {isDeclined && (
                <p className="decline-note" dir="auto">
                  <strong>Decline message:</strong> {ev.decline_reason || '—'}
                  {ev.declined_at && (
                    <small className="muted" dir="ltr">
                      {' '}({new Date(ev.declined_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})
                    </small>
                  )}
                </p>
              )}

              <div className="pending-actions">
                <Link href={`/events/${ev.id}`} className="btn btn-ghost">
                  <EyeIcon size={17} /> View details
                </Link>
                {!isDeclined && (
                  <Link href={`/event-management?event=${ev.id}`} className="btn btn-primary">
                    <GamesIcon size={17} /> {planned ? 'Edit games plan' : 'Add games plan'}
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
      )}
    </section>
  );
}
