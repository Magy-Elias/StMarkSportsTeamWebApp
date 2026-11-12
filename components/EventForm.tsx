'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ScheduleInput from '@/components/ScheduleInput';
import { fromFormSlots, toFormSlots, type FormSlot } from '@/lib/schedule';
import { supabase } from '@/lib/supabase/client';

// 'schedule' = rows of date + from + to (see components/ScheduleInput.tsx).
export type FieldType = 'text' | 'date' | 'time' | 'textarea' | 'select' | 'number' | 'tel' | 'schedule';

export type Field = {
  name: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  options?: string[];
  min?: number;
  suffix?: string;
};

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
};

export default function EventForm({
  title,
  fields,
  dir,
  submitLabel = 'Save event',
  defaults = {},
  eventId,
  initialValues,
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
  // Visitors who aren't logged in can submit, but can't open event pages.
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setLoggedIn(Boolean(data.session)));
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [e.target.name]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ state: 'saving', message: null, id: '' });

    const fieldValues: Record<string, unknown> = {};
    for (const f of fields) {
      if (f.type === 'schedule') {
        const { schedule, error } = fromFormSlots(schedules[f.name] ?? []);
        if (error) return setStatus({ state: 'error', message: error, id: '' });
        fieldValues[f.name] = schedule;
        continue;
      }
      const v = values[f.name];
      fieldValues[f.name] = v === '' ? null : f.type === 'number' ? Number(v) : v;
    }

    if (eventId) {
      // Only the form's fields are updated; status and the games plan stay as they are.
      const { error } = await supabase.from('events').update(fieldValues).eq('id', eventId);
      if (error) return setStatus({ state: 'error', message: `Could not save: ${error.message}`, id: '' });
      router.push(`/events/${eventId}`);
      router.refresh();
      return;
    }

    // The ID is generated here rather than read back after the insert, because
    // visitors who aren't logged in are allowed to add events but not read them.
    const id = crypto.randomUUID();
    const { error } = await supabase.from('events').insert({ ...defaults, ...fieldValues, id });
    if (error) setStatus({ state: 'error', message: `Could not save: ${error.message}`, id: '' });
    else {
      setStatus({ state: 'saved', message: null, id });
      reset();
    }
  };

  return (
    <section className="card" dir={dir}>
      <h1>{title}</h1>
      <form onSubmit={onSubmit} className="form">
        {fields.map((f) => (
          f.type === 'schedule' ? (
            // Several inputs per row, so a fieldset rather than a single label.
            <fieldset key={f.name} className="schedule-fieldset">
              <legend>{f.label}{f.required && ' *'}</legend>
              <ScheduleInput
                value={schedules[f.name] ?? []}
                onChange={(rows) => setSchedules((s) => ({ ...s, [f.name]: rows }))}
              />
            </fieldset>
          ) : (
          <label key={f.name}>
            <span>{f.label}{f.required && ' *'}</span>
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
                <input type={f.type ?? 'text'} name={f.name} value={values[f.name]} onChange={onChange} required={f.required} min={f.min} />
                {f.suffix && <span className="suffix">{f.suffix}</span>}
              </div>
            )}
          </label>
          )
        ))}
        <button type="submit" disabled={status.state === 'saving'}>
          {status.state === 'saving' ? '…' : submitLabel}
        </button>
        {editing && (
          <Link href={`/events/${eventId}`} className="form-cancel">
            إلغاء
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