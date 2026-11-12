import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatRange, parseSchedule } from '@/lib/schedule';
import type { Event } from '@/lib/types';

// Fields shown on the detail page, in order. Add or remove entries here.
const DETAIL_FIELDS = [
  { key: 'responsible_person', label: 'الشخص المسؤول' },
  { key: 'phone', label: 'رقم التليفون', format: (v: string) => v && <a href={`tel:${v}`} dir="ltr">{v}</a> },
  { key: 'day_name', label: 'اسم اليوم' },
  { key: 'event_date', label: 'تاريخ' },
  { key: 'goal', label: 'الهدف' },
  { key: 'participants_count', label: 'عدد المشاركين' },
  { key: 'location', label: 'المكان' },
  // Older events saved before the date/time rows: number of hours.
  { key: 'games_time', label: 'الوقت المحدد للالعاب', format: (v: string) => v && `${v} ساعة` },
];

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.from('events').select('*').eq('id', id).maybeSingle();

  if (error) return <p className="error">{error.message} <Link href="/">Back to calendar</Link></p>;
  if (!data) return <p className="error">Event not found. <Link href="/">Back to calendar</Link></p>;

  const event = data as unknown as Event;
  const schedule = parseSchedule(event.schedule);

  return (
    <article className="card" dir="rtl">
      <Link href="/">→ الرجوع للتقويم</Link>
      <div className="detail-header">
        <h1>{event.title}</h1>
        <Link href={`/events/${event.id}/edit`} className="btn-edit">
          تعديل
        </Link>
      </div>
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
                    {formatDate(s.date)}: <span dir="ltr">{formatRange(s)}</span>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        )}
      </dl>

      <section dir="ltr" className="plan">
        <h2>Games plan</h2>
        {event.leader || event.co_leader || event.games?.length || event.day_details ? (
          <>
            <dl className="details">
              {event.leader && <div><dt>Leader</dt><dd>{event.leader}</dd></div>}
              {event.co_leader && <div><dt>Co-Leader</dt><dd>{event.co_leader}</dd></div>}
            </dl>
            {event.games?.map((g, i) => (
              <div key={i} className="game">
                <h3>{g.name || `Game ${i + 1}`}</h3>
                <dl className="details">
                  {g.leader && <div><dt>Game Leader</dt><dd>{g.leader}</dd></div>}
                  {g.description && <div><dt>Description</dt><dd>{g.description}</dd></div>}
                  {g.tools && <div><dt>Tools / Material</dt><dd>{g.tools}</dd></div>}
                </dl>
              </div>
            ))}
            {event.day_details && (
              <dl className="details">
                <div><dt>Details of the Day</dt><dd>{event.day_details}</dd></div>
              </dl>
            )}
            <p><Link href={`/form-2?event=${event.id}`}>Edit games plan</Link></p>
          </>
        ) : (
          <p className="muted">
            No games plan yet. <Link href={`/form-2?event=${event.id}`}>Add one with Form 2</Link>
          </p>
        )}
      </section>
    </article>
  );
}