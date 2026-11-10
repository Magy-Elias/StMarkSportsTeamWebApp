import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

// Fields shown on the detail page, in order. Add or remove entries here.
const DETAIL_FIELDS = [
  { key: 'responsible_person', label: 'الشخص المسؤول' },
  { key: 'phone', label: 'رقم التليفون', format: (v) => v && <a href={`tel:${v}`} dir="ltr">{v}</a> },
  { key: 'day_name', label: 'اسم اليوم' },
  { key: 'event_date', label: 'تاريخ' },
  { key: 'goal', label: 'الهدف' },
  { key: 'participants_count', label: 'عدد المشاركين' },
  { key: 'location', label: 'المكان' },
  { key: 'games_time', label: 'الوقت المحدد للالعاب', format: (v) => v?.slice(0, 5) },
]

export default function EventDetail() {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else if (!data) setError('Event not found.')
        else setEvent(data)
      })
  }, [id])

  if (error) return <p className="error">{error} <Link to="/">Back to calendar</Link></p>
  if (!event) return <p className="muted">Loading…</p>

  return (
    <article className="card" dir="rtl">
      <Link to="/">→ الرجوع للتقويم</Link>
      <h1>{event.title}</h1>
      <dl className="details">
        {DETAIL_FIELDS.map(({ key, label, format }) => {
          const value = format ? format(event[key]) : event[key]
          if (value == null || value === '') return null
          return (
            <div key={key}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          )
        })}
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
            <p><Link to={`/form-2?event=${event.id}`}>Edit games plan</Link></p>
          </>
        ) : (
          <p className="muted">
            No games plan yet. <Link to={`/form-2?event=${event.id}`}>Add one with Form 2</Link>
          </p>
        )}
      </section>
    </article>
  )
}
