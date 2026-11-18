'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DatePicker from '@/components/DatePicker';
import ScheduleInput from '@/components/ScheduleInput';
import { emptyFormSlot, fromFormSlots, parseSchedule, toFormSlots, type FormSlot, type ScheduleRules } from '@/lib/schedule';
import { supabase } from '@/lib/supabase/client';

// 'schedule' = rows of date + from + to (see components/ScheduleInput.tsx).
export type FieldType = 'text' | 'date' | 'time' | 'textarea' | 'select' | 'number' | 'tel' | 'email' | 'schedule';

export type Field = {
  name: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  options?: string[];
  min?: number;
  suffix?: string;
  /** Date fields: earliest allowed date is today + this many days. */
  minDaysAhead?: number;
  /** Small note shown under the field. */
  hint?: string;
  /**
   * Schedule fields: show a "number of days" dropdown (1…maxDays) with this
   * field's label; the date/time rows appear only after a number is picked.
   */
  maxDays?: number;
  /** Schedule fields with maxDays: title of the date/time rows section. */
  sectionLabel?: string;
  /** Schedule fields: also save Day 1's date into this field (the event's main date). */
  dateField?: string;
};

// Local calendar dates as "YYYY-MM-DD" (the browser's own day, not UTC).
const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toISODate(d);
};

// Database error -> message for the form. 23505 = the unique "name + date" rule
// (supabase/migrations/20261117000001_unique_event_title_date.sql).
const saveErrorMessage = (error: { code?: string; message: string }) =>
  error.code === '23505'
    ? 'يوجد حدث بنفس الاسم في نفس التاريخ بالفعل. من فضلك غيّر اسم الخدمة او الاجتماع أو التاريخ.'
    : `Could not save: ${error.message}`;

const TOO_SOON = 'يجب أن يكون تاريخ الحدث بعد أسبوعين على الأقل من اليوم.';

type EventFormProps = {
  title: string;
  fields: Field[];
  dir: string;
  submitLabel?: string;
  defaults?: Record<string, unknown>;
  /** Edit mode: update this existing event instead of adding a new one. */
  eventId?: string;
  /** Edit mode: the event's current values, to fill in the form. */
  initialValues?: Record<string, string>;
  /** Optional info/hint box shown in the form. */
  hint?: string;
  /** Logo URL shown top-left above the title (e.g. "/logo.svg"). */
  logoLeft?: string;
  /** Logo URL shown top-right above the title (e.g. "/logo.svg"). */
  logoRight?: string;
  /** New events: page to go to after saving (gets ?id=<new event id>). */
  submittedPath?: string;
};

export default function EventForm({
  title,
  fields,
  dir,
  submitLabel = 'Save event',
  defaults = {},
  eventId,
  initialValues,
  hint,
  logoLeft,
  logoRight,
  submittedPath,
}: EventFormProps) {
  const router = useRouter();
  const editing = Boolean(eventId);
  const empty = Object.fromEntries(fields.map((f) => [f.name, '']));
  const [values, setValues] = useState<Record<string, string>>({ ...empty, ...initialValues });
  // Date + from/to rows, kept separately because each row has several parts.
  const emptySchedules = () =>
    Object.fromEntries(fields.filter((f) => f.type === 'schedule').map((f) => [f.name, f.maxDays ? [] : toFormSlots([])]));
  const [schedules, setSchedules] = useState<Record<string, FormSlot[]>>(() =>
    Object.fromEntries(
      fields.filter((f) => f.type === 'schedule').map((f) => {
        const saved = initialValues?.[f.name] ?? '';
        if (!f.maxDays) return [f.name, toFormSlots(saved)];
        // "Days" fields: exactly the saved days (up to maxDays), none for a new event.
        return [f.name, parseSchedule(saved).length ? toFormSlots(saved).slice(0, f.maxDays) : []];
      }),
    ),
  );
  const reset = () => {
    setValues(empty);
    setSchedules(emptySchedules());
    setDayCounts(Object.fromEntries(fields.filter((f) => f.maxDays).map((f) => [f.name, 0])));
  };
  const [status, setStatus] = useState<{ state: 'idle' | 'saving' | 'error' | 'saved'; message: string | null; id: string }>({
    state: 'idle',
    message: null,
    id: '',
  });
  // Earliest allowed dates for fields with `minDaysAhead`. Worked out in the
  // browser (after first render) so it uses the visitor's own "today".
  const [minDates, setMinDates] = useState<Record<string, string>>({});
  useEffect(() => {
    setMinDates(
      Object.fromEntries(fields.filter((f) => f.minDaysAhead != null).map((f) => [f.name, addDays(f.minDaysAhead ?? 0)])),
    );
  }, [fields]);
  // When editing, the event's current date stays allowed even if it's now
  // less than the minimum away; only a newly picked date must meet the rule.
  const dateMin = (f: Field) => {
    const min = minDates[f.name];
    const original = editing ? initialValues?.[f.name] : undefined;
    if (!min) return undefined;
    return original && original < min ? original : min;
  };
  const tooSoon = (f: Field) => {
    const v = values[f.name] ?? '';
    const min = minDates[f.name];
    if (!v || !min || v >= min) return false;
    return !(editing && v === initialValues?.[f.name]);
  };

  // "Number of event days" (schedule fields with maxDays). 0 = not picked yet:
  // the date/time rows stay hidden. When editing, it's the event's saved days.
  const initialDayCounts = () =>
    Object.fromEntries(
      fields
        .filter((f) => f.maxDays)
        .map((f) => [f.name, editing ? Math.min(parseSchedule(initialValues?.[f.name] ?? '').length, f.maxDays ?? 0) : 0]),
    );
  const [dayCounts, setDayCounts] = useState<Record<string, number>>(initialDayCounts);
  const setDayCount = (f: Field, n: number) => {
    setDayCounts((c) => ({ ...c, [f.name]: n }));
    // Keep what's already filled in; add empty rows or drop extra ones.
    setSchedules((s) => {
      const rows = (s[f.name] ?? []).slice(0, n);
      while (rows.length < n) rows.push(emptyFormSlot());
      return { ...s, [f.name]: rows };
    });
  };
  // Rules for each schedule field's date rows.
  const scheduleRules = (f: Field): ScheduleRules =>
    f.maxDays
      ? {
          minDate: minDates[f.name],
          minDateMessage: f.hint,
          // When editing, the event's existing dates stay allowed.
          allowedDates: editing ? parseSchedule(initialValues?.[f.name] ?? '').map((d) => d.date) : [],
          requireAll: true,
          ascending: true,
          rowWord: 'اليوم',
        }
      : {};

  // Visitors who aren't logged in can submit, but can't open event pages.
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setLoggedIn(Boolean(data.session)));
  }, []);

  // What's still missing, if anything. The save button stays disabled until
  // every required field is filled and the date/time rows are complete.
  const problem = (() => {
    for (const f of fields) {
      if (f.type === 'schedule') {
        if (f.maxDays && !dayCounts[f.name]) return f.required ? 'missing' : null;
        const { schedule, error } = fromFormSlots(schedules[f.name] ?? [], scheduleRules(f));
        if (error) return error;
        if (f.required && schedule.length === 0) return 'missing';
      } else if (f.required && !(values[f.name] ?? '').trim()) {
        return 'missing';
      } else if (tooSoon(f)) {
        return TOO_SOON;
      }
    }
    return null;
  })();

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [e.target.name]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ state: 'saving', message: null, id: '' });

    const fieldValues: Record<string, unknown> = {};
    for (const f of fields) {
      if (f.type === 'schedule') {
        const { schedule, error } = fromFormSlots(schedules[f.name] ?? [], scheduleRules(f));
        if (error) return setStatus({ state: 'error', message: error, id: '' });
        fieldValues[f.name] = schedule;
        // The event's main date is Day 1 (the days are in order).
        if (f.dateField && schedule[0]) fieldValues[f.dateField] = schedule[0].date;
        continue;
      }
      if (tooSoon(f)) return setStatus({ state: 'error', message: TOO_SOON, id: '' });
      const v = values[f.name];
      fieldValues[f.name] = v === '' ? null : f.type === 'number' ? Number(v) : v;
    }

    if (eventId) {
      // Only the form's fields are updated; status and the games plan stay as they are.
      const { error } = await supabase.from('events').update(fieldValues).eq('id', eventId);
      if (error) return setStatus({ state: 'error', message: saveErrorMessage(error), id: '' });
      router.push(`/events/${eventId}`);
      router.refresh();
      return;
    }

    // The ID is generated here rather than read back after the insert, because
    // visitors who aren't logged in are allowed to add events but not read them.
    const id = crypto.randomUUID();
    const { error } = await supabase.from('events').insert({ ...defaults, ...fieldValues, id });
    if (error) return setStatus({ state: 'error', message: saveErrorMessage(error), id: '' });
    if (submittedPath) {
      // Like Google Forms: leave the form for a confirmation page. replace() so
      // the browser's Back button doesn't return to the submitted form.
      router.replace(`${submittedPath}?id=${id}`);
      return;
    }
    setStatus({ state: 'saved', message: null, id });
    reset();
  };

  return (
    <section className="card" dir={dir}>
      <div className="form-header">
        <div className="logos-row" dir="ltr">
          {logoLeft && (
            <img src={logoLeft} alt="Left logo" className="form-logo" />
          )}
          {logoRight && (
            <img src={logoRight} alt="Right logo" className="form-logo" />
          )}
        </div>
        {/* dir="auto": English titles (e.g. "Form 1") align left, Arabic ones right. */}
        <h1 dir="auto">{title}</h1>
      </div>
      <form onSubmit={onSubmit} className="form">
        {fields.map((f) => (
          f.type === 'schedule' && f.maxDays ? (
            // "Number of event days" dropdown; the date/time rows appear once it's picked.
            <div key={f.name} className="days-field">
              <label>
                <span>{f.label}{f.required && ' *'}</span>
                <select
                  name={`${f.name}-days`}
                  value={dayCounts[f.name] || ''}
                  onChange={(e) => setDayCount(f, Number(e.target.value) || 0)}
                  required={f.required}
                >
                  <option value="">Select…</option>
                  {Array.from({ length: f.maxDays }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                {f.hint && <small className="field-hint">{f.hint}</small>}
              </label>
              {dayCounts[f.name] > 0 && (
                <fieldset className="schedule-fieldset">
                  <legend>{f.sectionLabel ?? f.label}{f.required && ' *'}</legend>
                  <ScheduleInput
                    value={schedules[f.name] ?? []}
                    onChange={(rows) => setSchedules((s) => ({ ...s, [f.name]: rows }))}
                    rules={scheduleRules(f)}
                    fixedCount
                  />
                </fieldset>
              )}
            </div>
          ) : f.type === 'schedule' ? (
            // Several inputs per row, so a fieldset rather than a single label.
            <fieldset key={f.name} className="schedule-fieldset">
              <legend>{f.label}{f.required && ' *'}</legend>
              <ScheduleInput
                value={schedules[f.name] ?? []}
                onChange={(rows) => setSchedules((s) => ({ ...s, [f.name]: rows }))}
                rules={scheduleRules(f)}
              />
            </fieldset>
          ) : f.type === 'date' ? (
            // Our own calendar (not the browser's), so it isn't wrapped in a <label>:
            // clicks inside the calendar would otherwise re-trigger the open button.
            <div key={f.name} className="form-field">
              <span>{f.label}{f.required && ' *'}</span>
              <DatePicker
                name={f.name}
                label={f.label}
                value={values[f.name] ?? ''}
                onChange={(v) => setValues((s) => ({ ...s, [f.name]: v }))}
                min={dateMin(f)}
                invalid={tooSoon(f)}
              />
              {f.hint && <small className={`field-hint${tooSoon(f) ? ' is-error' : ''}`}>{f.hint}</small>}
            </div>
          ) : (
          <label key={f.name}>
            <span>
              {f.label}
              {f.required ? ' *' : <small className="optional"> (اختياري)</small>}
            </span>
            {f.type === 'textarea' ? (
              <textarea name={f.name} value={values[f.name]} onChange={onChange} required={f.required} rows={4} />
            ) : f.type === 'select' ? (
              <select name={f.name} value={values[f.name]} onChange={onChange} required={f.required}>
                <option value="">Select…</option>
                {(f.options ?? []).map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : (
              <div>
                <input
                  type={f.type ?? 'text'}
                  name={f.name}
                  value={values[f.name]}
                  onChange={onChange}
                  required={f.required}
                  min={f.min}
                />
                {f.suffix && <span className="suffix">{f.suffix}</span>}
              </div>
            )}
            {f.hint && <small className="field-hint">{f.hint}</small>}
          </label>
          )
        ))}
        {hint && (
          <div className="form-info">
            {hint.split('\n').map((line: string, i: number) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        )}
        <button type="submit" disabled={status.state === 'saving' || problem !== null}>
          {status.state === 'saving' ? '…' : submitLabel}
        </button>
        {problem === 'missing' && (
          <p className="form-hint" role="status">
            Fill in all fields to enable Save.
          </p>
        )}
        {editing && (
          <Link href={`/events/${eventId}`} className="form-cancel">
            Cancel
          </Link>
        )}
      </form>
      {status.state === 'saved' && (
        <>
          <p className="success">
            Saved!
            {loggedIn && (
              <>
                {' '}
                <Link href={`/events/${status.id}`}>View event</Link>
              </>
            )}
          </p>
          {hint && (
            <div className="form-info">
              {hint.split('\n').map((line: string, i: number) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setStatus({ state: 'idle', message: null, id: '' });
              reset();
            }}
          >
            Submit another
          </button>
          {loggedIn && (
            <p className="muted">
              <Link href="/">Back to home</Link>
            </p>
          )}
        </>
      )}
      {status.state === 'error' && <p className="error" role="alert">{status.message}</p>}
    </section>
  );
}