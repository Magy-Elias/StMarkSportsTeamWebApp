'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DatePicker from '@/components/DatePicker';
import ScheduleInput from '@/components/ScheduleInput';
import { fromFormSlots, toFormSlots, type FormSlot } from '@/lib/schedule';
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
  /** Schedule fields: rows can't be before the date in this other field. */
  minDateFrom?: string;
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
  /** Logo image URL shown at the top left of the form header (e.g. "/logo.svg"). */
  logo?: string;
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
  logo,
  submittedPath,
}: EventFormProps) {
  const router = useRouter();
  const editing = Boolean(eventId);
  const empty = Object.fromEntries(fields.map((f) => [f.name, '']));
  const [values, setValues] = useState<Record<string, string>>({ ...empty, ...initialValues });
  // Date + from/to rows, kept separately because each row has several parts.
  const emptySchedules = () =>
    Object.fromEntries(fields.filter((f) => f.type === 'schedule').map((f) => [f.name, toFormSlots([])]));
  const [schedules, setSchedules] = useState<Record<string, FormSlot[]>>(() =>
    Object.fromEntries(
      fields.filter((f) => f.type === 'schedule').map((f) => [f.name, toFormSlots(initialValues?.[f.name] ?? '')]),
    ),
  );
  const reset = () => {
    setValues(empty);
    setSchedules(emptySchedules());
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
  const scheduleMin = (f: Field) => (f.minDateFrom ? values[f.minDateFrom] || undefined : undefined);

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
        const { schedule, error } = fromFormSlots(schedules[f.name] ?? [], scheduleMin(f));
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
        const { schedule, error } = fromFormSlots(schedules[f.name] ?? [], scheduleMin(f));
        if (error) return setStatus({ state: 'error', message: error, id: '' });
        fieldValues[f.name] = schedule;
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
        {/* dir="auto": English titles (e.g. "Form 1") align left, Arabic ones right. */}
        <h1 dir="auto">{title}</h1>
        {logo && (
          <img src={logo} alt="Logo" className="form-logo" />
        )}
      </div>
      <form onSubmit={onSubmit} className="form">
        {fields.map((f) => (
          f.type === 'schedule' ? (
            // Several inputs per row, so a fieldset rather than a single label.
            <fieldset key={f.name} className="schedule-fieldset">
              <legend>{f.label}{f.required && ' *'}</legend>
              <ScheduleInput
                value={schedules[f.name] ?? []}
                onChange={(rows) => setSchedules((s) => ({ ...s, [f.name]: rows }))}
                minDate={scheduleMin(f)}
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