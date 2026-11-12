// An event's dates and times (Form 1 "الوقت المحدد للالعاب"), stored in the
// `schedule` column as [{ "date": "2026-11-20", "from": "16:30", "to": "18:00" }].
// Times are stored as 24-hour "HH:MM" and shown as 12-hour with AM/PM.

export type ScheduleSlot = { date: string; from: string; to: string };

const isSlot = (v: unknown): v is ScheduleSlot =>
  typeof v === 'object' && v !== null && 'date' in v && 'from' in v && 'to' in v;

/** Reads a schedule from the database (array) or the form (JSON string). */
export function parseSchedule(value: unknown): ScheduleSlot[] {
  let raw = value;
  if (typeof value === 'string') {
    try {
      raw = value ? JSON.parse(value) : [];
    } catch {
      raw = [];
    }
  }
  return Array.isArray(raw)
    ? raw.filter(isSlot).map((s) => ({ date: String(s.date), from: String(s.from), to: String(s.to) }))
    : [];
}

/** "16:30" -> "4:30 PM" */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return '';
  const period = h < 12 ? 'AM' : 'PM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`;
}

/** "4:30 PM – 6:00 PM" */
export const formatRange = (s: ScheduleSlot) => `${formatTime(s.from)} – ${formatTime(s.to)}`;

// ---- Form state ----------------------------------------------------------
// While someone is filling in Form 1, each time is kept as its three parts so
// they can be picked in any order (e.g. minute before hour).

export type TimeParts = { hour: string; minute: string; period: 'AM' | 'PM' };
export type FormSlot = { date: string; from: TimeParts; to: TimeParts };

const emptyParts = (): TimeParts => ({ hour: '', minute: '', period: 'AM' });
export const emptyFormSlot = (): FormSlot => ({ date: '', from: emptyParts(), to: emptyParts() });

/** "16:30" -> { hour: "4", minute: "30", period: "PM" } */
export function toParts(hhmm: string): TimeParts {
  const [h, m] = hhmm.split(':').map(Number);
  if (!hhmm || Number.isNaN(h) || Number.isNaN(m)) return emptyParts();
  return { hour: String(h % 12 || 12), minute: String(m).padStart(2, '0'), period: h < 12 ? 'AM' : 'PM' };
}

/** { hour: "4", minute: "30", period: "PM" } -> "16:30"; "" if not fully picked. */
export function fromParts({ hour, minute, period }: TimeParts): string {
  if (!hour || !minute) return '';
  const h = (Number(hour) % 12) + (period === 'PM' ? 12 : 0);
  return `${String(h).padStart(2, '0')}:${minute}`;
}

const partsEmpty = (p: TimeParts) => !p.hour && !p.minute;

/** Saved schedule -> form rows (always at least one row). */
export function toFormSlots(value: unknown): FormSlot[] {
  const slots = parseSchedule(value).map((s) => ({ date: s.date, from: toParts(s.from), to: toParts(s.to) }));
  return slots.length ? slots : [emptyFormSlot()];
}

/**
 * Form rows -> schedule to save. Completely empty rows are skipped.
 * Returns an error message (Arabic, shown in Form 1) if a row is incomplete
 * or its end time isn't after its start time.
 */
export function fromFormSlots(rows: FormSlot[]): { schedule: ScheduleSlot[]; error: string | null } {
  const schedule: ScheduleSlot[] = [];
  for (const [i, row] of rows.entries()) {
    if (!row.date && partsEmpty(row.from) && partsEmpty(row.to)) continue;
    const from = fromParts(row.from);
    const to = fromParts(row.to);
    const n = rows.length > 1 ? ` (الموعد ${i + 1})` : '';
    if (!row.date || !from || !to) return { schedule, error: `من فضلك اختر التاريخ ووقت البداية والنهاية${n}.` };
    if (to <= from) return { schedule, error: `وقت النهاية يجب أن يكون بعد وقت البداية${n}.` };
    schedule.push({ date: row.date, from, to });
  }
  return { schedule, error: null };
}
