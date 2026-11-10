'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export type FieldType = 'text' | 'date' | 'time' | 'textarea' | 'select' | 'number' | 'tel';

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
};

export default function EventForm({ title, fields, dir, submitLabel = 'Save event', defaults = {} }: EventFormProps) {
  const empty = Object.fromEntries(fields.map((f) => [f.name, '']));
  const [values, setValues] = useState<Record<string, string>>(empty);
  const [status, setStatus] = useState<{ state: 'idle' | 'saving' | 'error' | 'saved'; message: string | null; id: string }>({
    state: 'idle',
    message: null,
    id: '',
  });

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [e.target.name]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ state: 'saving', message: null, id: '' });
    const row: Record<string, unknown> = { ...defaults };
    for (const f of fields) {
      const v = values[f.name];
      row[f.name] = v === '' ? null : f.type === 'number' ? Number(v) : v;
    }

    const { data, error } = await supabase.from('events').insert(row).select('id').single();
    if (error) setStatus({ state: 'error', message: error.message, id: '' });
    else {
      setStatus({ state: 'saved', message: null, id: data.id });
      setValues(empty);
    }
  };

  return (
    <section className="card" dir={dir}>
      <h1>{title}</h1>
      <form onSubmit={onSubmit} className="form">
        {fields.map((f) => (
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
        ))}
        <button type="submit" disabled={status.state === 'saving'}>
          {status.state === 'saving' ? '…' : submitLabel}
        </button>
      </form>
      {status.state === 'saved' && (
        <>
          <p className="success">
            Saved!{' '}
            <Link href={`/events/${status.id}`}>View event</Link>
          </p>
          <button
            type="button"
            onClick={() => {
              setStatus({ state: 'idle', message: null, id: '' });
              setValues(empty);
            }}
          >
            Submit another
          </button>
          <p className="muted">
            <Link href="/">Back to calendar</Link>
          </p>
        </>
      )}
      {status.state === 'error' && <p className="error">Could not save: {status.message}</p>}
    </section>
  );
}