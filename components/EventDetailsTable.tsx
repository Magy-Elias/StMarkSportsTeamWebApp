import { formatRange, parseSchedule } from '@/lib/schedule';

/** The Event Registration details of an event (what the table shows). */
export type EventDetails = {
  title: string;
  event_date: string;
  day_name?: string | null;
  location?: string | null;
  goal?: string | null;
  participants_count?: number | null;
  responsible_person?: string | null;
  phone?: string | null;
  email?: string | null;
  remarks?: string | null;
  schedule?: unknown;
};

/** Columns to load from the events table for this component. */
export const EVENT_DETAILS_COLUMNS =
  'title, event_date, day_name, location, goal, participants_count, responsible_person, phone, email, remarks, schedule';

const arDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const filled = (v: unknown) => v !== null && v !== undefined && String(v).trim() !== '';

/**
 * Read-only table of an event's details (as entered in Event Registration),
 * in Arabic, right-to-left. Empty fields are left out.
 */
export default function EventDetailsTable({ event }: { event: EventDetails }) {
  const days = parseSchedule(event.schedule);
  const rows: { label: string; value: React.ReactNode }[] = [];
  const add = (label: string, value: React.ReactNode, raw: unknown = value) => {
    if (filled(raw)) rows.push({ label, value });
  };

  add('اسم الخدمة او الاجتماع', event.title);
  add('اسم اليوم', event.day_name);
  add('المكان', event.location);
  add('الهدف', event.goal);
  add('عدد المشاركين', event.participants_count);
  add('الشخص المسؤول', event.responsible_person);
  add('رقم التليفون', event.phone && <a href={`tel:${event.phone}`} dir="ltr">{event.phone}</a>, event.phone);
  add('البريد الإلكتروني', event.email && <a href={`mailto:${event.email}`} dir="ltr">{event.email}</a>, event.email);
  if (days.length) {
    days.forEach((d, i) => {
      const title = d.title ? `${d.title} — ` : '';
      rows.push({
        label: days.length > 1 ? `اليوم ${i + 1}` : 'التاريخ والوقت',
        value: (
          <>
            {title}{arDate(d.date)}
            <span className="event-table-time" dir="ltr">{formatRange(d)}</span>
          </>
        ),
      });
    });
  } else {
    add('التاريخ', arDate(event.event_date), event.event_date);
  }
  add('ملاحظات', event.remarks);

  return (
    <section className="event-table" dir="rtl" aria-label="Event details">
      <h2>تفاصيل الحدث</h2>
      <table>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <th scope="row">{r.label}</th>
              <td>{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
