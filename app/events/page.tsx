import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatRange, parseSchedule } from '@/lib/schedule';
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
  leader?: string | null;
  games?: unknown;
  decline_reason?: string | null;
  declined_at?: string | null;
};

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const active = tab === 'declined' ? 'declined' : 'approved';

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('events')
    .select(
      'id, title, event_date, status, location, responsible_person, phone, email, schedule, leader, games, decline_reason, declined_at',
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
  const list = active === 'approved' ? [...upcoming, ...past] : declined;

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>Events</h1>
          <p className="muted">Events that have been reviewed: approved or declined.</p>
        </div>
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

      {!error && list.length === 0 && (
        <div className="empty-state">
          {active === 'approved' ? <CheckIcon size={28} /> : <CloseIcon size={28} />}
          <p>{active === 'approved' ? 'No approved events yet.' : 'No declined events.'}</p>
        </div>
      )}

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
                  <Link href={`/form-2?event=${ev.id}`} className="btn btn-primary">
                    <GamesIcon size={17} /> {planned ? 'Edit games plan' : 'Add games plan'}
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
