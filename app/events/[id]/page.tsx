import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatRange, parseSchedule } from '@/lib/schedule';
import { EditIcon } from '@/components/icons';
import DeleteEventButton from '@/components/DeleteEventButton';
import { displayStatus } from '@/lib/status';
import { dayPlanFilled, parseDayPlans } from '@/lib/dayPlans';
import type { Event } from '@/lib/types';

// Fields shown on the detail page, in order. Add or remove entries here.
const DETAIL_FIELDS = [
  { key: 'responsible_person', label: 'الشخص المسؤول' },
  { key: 'phone', label: 'رقم التليفون', format: (v: string) => v && <a href={`tel:${v}`} dir="ltr">{v}</a> },
  { key: 'email', label: 'البريد الإلكتروني', format: (v: string) => v && <a href={`mailto:${v}`} dir="ltr">{v}</a> },
  { key: 'day_name', label: 'اسم اليوم' },
  { key: 'event_date', label: 'تاريخ' },
  { key: 'goal', label: 'الهدف' },
  { key: 'participants_count', label: 'عدد المشاركين' },
  { key: 'location', label: 'المكان' },
  { key: 'remarks', label: 'ملاحظات' },
  // Older events saved before the date/time rows: number of hours.
  { key: 'games_time', label: 'الوقت المحدد للالعاب', format: (v: string) => v && `${v} ساعة` },
];

const STATUS_LABEL: Record<string, string> = {
  pending: 'بانتظار الموافقة',
  approved: 'تمت الموافقة',
  completed: 'مكتمل',
  declined: 'مرفوض',
};

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.from('events').select('*').eq('id', id).maybeSingle();

  if (error) return <p className="error">{error.message} <Link href="/calendar">Back to calendar</Link></p>;
  if (!data) return <p className="error">Event not found. <Link href="/calendar">Back to calendar</Link></p>;

  const event = data as unknown as Event;
  const schedule = parseSchedule(event.schedule);
  // "completed" is automatic: approved and its last date has passed.
  const status = displayStatus(event);
  // Games plan per day; days with nothing filled in are left out.
  const plans = parseDayPlans(event)
    .map((plan, i) => ({ plan, i, day: schedule[i] }))
    .filter(({ plan }) => dayPlanFilled(plan));
  const multiDay = schedule.length > 1 || plans.some(({ i }) => i > 0);

  return (
    <article className="card" dir="rtl">
      <div dir="ltr">
        <Link href="/calendar" className="back-link">← Back</Link>
      </div>
      <div className="detail-header">
        <div>
          <h1>{event.title}</h1>
          <span className={`status-badge ${status}`}>{STATUS_LABEL[status] ?? status}</span>
        </div>
        <div className="detail-actions">
          <Link href={`/events/${event.id}/edit`} className="btn btn-primary">
            <EditIcon size={17} /> Edit
          </Link>
          <DeleteEventButton eventId={event.id} eventTitle={event.title} />
        </div>
      </div>
      {event.status === 'declined' && (
        <div className="decline-note" dir="auto">
          <strong>سبب الرفض:</strong> {event.decline_reason || '—'}
          {event.declined_at && (
            <small className="muted" dir="ltr">
              {' '}
              ({new Date(event.declined_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})
            </small>
          )}
        </div>
      )}
      <dl className="details">
        {DETAIL_FIELDS.map(({ key, label, format }) => {
          const raw = event[key as keyof Event];
          const value = format ? format(String(raw ?? '')) : (raw != null ? String(raw) : null);
          if (value == null || value === '') return null;
          return (
            <div key={key}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          );
        })}
        {schedule.length > 0 && (
          <div>
            <dt>الوقت المحدد للالعاب</dt>
            <dd>
              <ul className="schedule-list">
                {schedule.map((s, i) => (
                  <li key={i}>
                    {s.title ? `${s.title} — ` : ''}{formatDate(s.date)}: <span dir="ltr">{formatRange(s)}</span>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        )}
      </dl>

      <section dir="ltr" className="plan">
        <h2>Games plan</h2>
        {plans.length || event.day_details ? (
          <>
            {plans.map(({ plan, i, day }) => (
              <div key={i} className="day-plan-view">
                {multiDay && (
                  <h3>
                    Day {i + 1}
                    {day && (
                      <small className="muted">
                        {day.title ? ` · ${day.title}` : ''} · <span dir="rtl">{formatDate(day.date)}</span> · {formatRange(day)}
                      </small>
                    )}
                  </h3>
                )}
                <dl className="details">
                  {plan.leader && <div><dt>Leader</dt><dd>{plan.leader}</dd></div>}
                  {plan.co_leader && <div><dt>Co-Leader</dt><dd>{plan.co_leader}</dd></div>}
                </dl>
                {plan.games.map((g, j) => (
                  <div key={j} className="game">
                    <h3>{g.name || `Game ${j + 1}`}</h3>
                    <dl className="details">
                      {g.leader && <div><dt>Game Leader</dt><dd>{g.leader}</dd></div>}
                      {g.description && <div><dt>Description</dt><dd>{g.description}</dd></div>}
                      {g.tools && <div><dt>Tools / Material</dt><dd>{g.tools}</dd></div>}
                    </dl>
                  </div>
                ))}
              </div>
            ))}
            {event.day_details && (
              <dl className="details">
                <div><dt>Details of the Day</dt><dd>{event.day_details}</dd></div>
              </dl>
            )}
            <p><Link href={`/event-management?event=${event.id}`}>Edit games plan</Link></p>
          </>
        ) : (
          <p className="muted">
            No games plan yet. <Link href={`/event-management?event=${event.id}`}>Add one with One 99 Event Management</Link>
          </p>
        )}
      </section>
    </article>
  );
}