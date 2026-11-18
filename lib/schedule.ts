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

/** Rules for the date rows (all optional). */
export type ScheduleRules = {
  /** Earliest allowed date ("YYYY-MM-DD"). */
  minDate?: string;
  /** Message when a row is before `minDate`. */
  minDateMessage?: string;
  /** Dates that stay allowed even if before `minDate` (an event's existing dates when editing). */
  allowedDates?: string[];
  /** Every row must be filled in (no skipping empty rows). */
  requireAll?: boolean;
  /** Each row's date must be after the previous row's date. */
  ascending?: boolean;
  /** Word used to name a row in messages, e.g. "اليوم" → "(اليوم 2)". Default "الموعد". */
  rowWord?: string;
};

/** "2026-12-04" -> "2026-12-05" */
export const nextDay = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

/**
 * Form rows -> schedule to save. Completely empty rows are skipped unless
 * `requireAll`. Returns an error message (Arabic, shown in the form) if a row is
 * incomplete, its end time isn't after its start time, or its date breaks the rules.
 */
export function fromFormSlots(rows: FormSlot[], rules: ScheduleRules = {}): { schedule: ScheduleSlot[]; error: string | null } {
  const schedule: ScheduleSlot[] = [];
  const word = rules.rowWord ?? 'الموعد';
  for (const [i, row] of rows.entries()) {
    if (!rules.requireAll && !row.date && partsEmpty(row.from) && partsEmpty(row.to)) continue;
    const from = fromParts(row.from);
    const to = fromParts(row.to);
    const n = rows.length > 1 || rules.requireAll ? ` (${word} ${i + 1})` : '';
    if (!row.date || !from || !to) return { schedule, error: `من فضلك اختر التاريخ ووقت البداية والنهاية${n}.` };
    const allowed = rules.allowedDates?.includes(row.date);
    if (rules.minDate && row.date < rules.minDate && !allowed) {
      return { schedule, error: `${rules.minDateMessage ?? 'تاريخ الموعد لا يمكن أن يكون قبل تاريخ الحدث.'}${n}` };
    }
    const prev = schedule.at(-1);
    if (rules.ascending && prev && row.date <= prev.date) {
      return { schedule, error: `يجب أن يكون تاريخ ${word} ${i + 1} بعد تاريخ ${word} ${i}.` };
    }
    if (to <= from) return { schedule, error: `وقت النهاية يجب أن يكون بعد وقت البداية${n}.` };
    schedule.push({ date: row.date, from, to });
  }
  return { schedule, error: null };
}
