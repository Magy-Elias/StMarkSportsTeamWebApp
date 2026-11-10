import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

// Form that inserts a new row into events (used by Form 1).
// `fields`: [{ name, label, type: 'text'|'date'|'time'|'textarea'|'select'|..., required, options }]
export default function EventForm({ title, fields, dir, submitLabel = 'Save event' }) {
  const empty = Object.fromEntries(fields.map((f) => [f.name, '']))
  const [values, setValues] = useState(empty)
  const [status, setStatus] = useState({ state: 'idle' })

  const onChange = (e) => setValues((v) => ({ ...v, [e.target.name]: e.target.value }))

  const onSubmit = async (e) => {
    e.preventDefault()
    setStatus({ state: 'saving' })
    // Send empty optional fields as null rather than ''.
    const row = {}
    for (const f of fields) {
      const v = values[f.name]
      row[f.name] = v === '' ? null : f.type === 'number' ? Number(v) : v
    }

    const { data, error } = await supabase.from('events').insert(row).select('id').single()
    if (error) setStatus({ state: 'error', message: error.message })
    else {
      setStatus({ state: 'saved', id: data.id })
      setValues(empty)
    }
  }

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
                {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input type={f.type ?? 'text'} name={f.name} value={values[f.name]} onChange={onChange} required={f.required} min={f.min} />
            )}
          </label>
        ))}
        <button type="submit" disabled={status.state === 'saving'}>
          {status.state === 'saving' ? '…' : submitLabel}
        </button>
      </form>
      {status.state === 'saved' && (
        <p className="success">Saved! <Link to={`/events/${status.id}`}>View event</Link></p>
      )}
      {status.state === 'error' && <p className="error">Could not save: {status.message}</p>}
    </section>
  )
}
