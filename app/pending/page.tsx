'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import DeclineDialog from '@/components/DeclineDialog';
import { sendStatusEmail, type EmailResult } from '@/lib/notify';
import { formatRange, parseSchedule, type ScheduleSlot } from '@/lib/schedule';
import { CalendarIcon, CheckIcon, ClockIcon, CloseIcon, EyeIcon, GamesIcon, MailIcon, PhoneIcon, PinIcon, UserIcon } from '@/components/icons';

type PendingEvent = {
  id: string;
  title: string;
  event_date: string;
  location?: string | null;
  responsible_person?: string | null;
  phone?: string | null;
  schedule?: ScheduleSlot[] | null;
};

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export default function Pending() {
  const [events, setEvents] = useState<PendingEvent[]>([]);
  // Approved on this visit: the card stays, marked approved, with Form 2 enabled.
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const [approvingId, setApprovingId] = useState<string | null>(null);
  // Declined on this visit: the card stays, marked declined, showing the message.
  const [declined, setDeclined] = useState<Record<string, string>>({});
  // Result of the status email for each event approved/declined on this visit
  // ('sending' while it's on its way).
  const [emails, setEmails] = useState<Record<string, EmailResult | 'sending'>>({});
  const notify = async (id: string) => {
    setEmails((prev) => ({ ...prev, [id]: 'sending' }));
    const result = await sendStatusEmail(id);
    setEmails((prev) => ({ ...prev, [id]: result }));
  };
  // Event whose "Decline" box is open.
  const [decliningEvent, setDecliningEvent] = useState<PendingEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('events')
      .select('id, title, event_date, location, responsible_person, phone, schedule')
      .eq('status', 'pending')
      .order('event_date', { ascending: true })
      .then(({ data, error }) => {
        if (error) setLoadError(error.message);
        else setEvents(data ?? []);
        setLoading(false);
      });
  }, []);

  const approve = async (id: string) => {
    setApprovingId(id);
    setActionError(null);
    const { error } = await supabase.from('events').update({ status: 'approved' }).eq('id', id);
    setApprovingId(null);
    if (error) return setActionError(`Could not approve: ${error.message}`);
    setApprovedIds((prev) => new Set(prev).add(id));
    void notify(id);
  };

  const decline = async (id: string, message: string) => {
    const { error } = await supabase
      .from('events')
      .update({ status: 'declined', decline_reason: message, declined_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return `Could not decline: ${error.message}`;
    setDeclined((prev) => ({ ...prev, [id]: message }));
    setDecliningEvent(null);
    void notify(id);
    return null;
  };

  const waiting = events.length - approvedIds.size - Object.keys(declined).length;

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>Events Pending</h1>
          <p className="muted">Review new events. Approve them, then add the games plan with Form 2.</p>
        </div>
        {!loading && !loadError && (
          <span className="count-badge">{waiting} waiting</span>
        )}
      </header>

      {loading && <p className="muted">Loading…</p>}
      {loadError && <p className="error">Could not load events: {loadError}</p>}
      {actionError && <p className="error" role="alert">{actionError}</p>}

      {!loading && !loadError && events.length === 0 && (
        <div className="empty-state">
          <CheckIcon size={28} />
          <p>No pending events. You&apos;re all caught up.</p>
        </div>
      )}

      <div className="pending-list">
        {events.map((ev) => {
          const approved = approvedIds.has(ev.id);
          const declineMessage = declined[ev.id];
          const slots = parseSchedule(ev.schedule);
          return (
            <article
              key={ev.id}
              className={`pending-card${approved ? ' is-approved' : ''}${declineMessage ? ' is-declined' : ''}`}
            >
              <div className="pending-head">
                <h2 dir="auto">{ev.title}</h2>
                <span className={`status-badge ${approved ? 'approved' : declineMessage ? 'declined' : 'pending'}`}>
                  {approved ? <><CheckIcon size={14} /> Approved</> : declineMessage ? <><CloseIcon size={14} /> Declined</> : 'Pending'}
                </span>
              </div>

              <ul className="meta-list">
                <li><CalendarIcon size={16} /> {formatDate(ev.event_date)}</li>
                {slots.map((s, i) => (
                  <li key={i}><ClockIcon size={16} /> {formatDate(s.date)} · <span dir="ltr">{formatRange(s)}</span></li>
                ))}
                {ev.location && <li><PinIcon size={16} /> <span dir="auto">{ev.location}</span></li>}
                {ev.responsible_person && <li><UserIcon size={16} /> <span dir="auto">{ev.responsible_person}</span></li>}
                {ev.phone && (
                  <li><PhoneIcon size={16} /> <a href={`tel:${ev.phone}`} dir="ltr">{ev.phone}</a></li>
                )}
              </ul>

              {declineMessage && (
                <p className="decline-note" dir="auto">
                  <strong>Decline message:</strong> {declineMessage}
                </p>
              )}

              {emails[ev.id] && (
                <p
                  className={`email-note${emails[ev.id] === 'sending' ? '' : (emails[ev.id] as EmailResult).ok ? ' is-sent' : ' is-failed'}`}
                  role="status"
                >
                  <MailIcon size={16} />
                  {emails[ev.id] === 'sending'
                    ? 'Sending email…'
                    : (emails[ev.id] as EmailResult).ok
                      ? <>Email sent to <span dir="ltr">{(emails[ev.id] as { to: string }).to}</span></>
                      : <>
                          Email not sent: {(emails[ev.id] as { error: string }).error}{' '}
                          <button type="button" className="link-btn" onClick={() => void notify(ev.id)}>Try again</button>
                        </>}
                </p>
              )}

              <div className="pending-actions">
                <Link href={`/events/${ev.id}`} className="btn btn-ghost">
                  <EyeIcon size={17} /> View details
                </Link>
                {declineMessage ? null : approved ? (
                  <Link href={`/form-2?event=${ev.id}`} className="btn btn-primary">
                    <GamesIcon size={17} /> Open Form 2
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => approve(ev.id)}
                    disabled={approvingId === ev.id}
                    className="btn btn-primary"
                  >
                    <CheckIcon size={17} /> {approvingId === ev.id ? 'Approving…' : 'Approve'}
                  </button>
                )}
                {!approved && !declineMessage && (
                  <button
                    type="button"
                    onClick={() => setDecliningEvent(ev)}
                    disabled={approvingId === ev.id}
                    className="btn btn-danger-ghost"
                  >
                    <CloseIcon size={17} /> Decline
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {decliningEvent && (
        <DeclineDialog
          eventTitle={decliningEvent.title}
          onCancel={() => setDecliningEvent(null)}
          onConfirm={(message) => decline(decliningEvent.id, message)}
        />
      )}
    </section>
  );
}
