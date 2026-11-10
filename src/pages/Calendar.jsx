import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const pad = (n) => String(n).padStart(2, '0')
const toKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`

export default function Calendar() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [events, setEvents] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const lastDay = new Date(year, month + 1, 0).getDate()
    setLoading(true)
    supabase
      .from('events')
      .select('id, title, event_date, games_time, leader')
      .eq('status', 'completed')
      .gte('event_date', toKey(year, month, 1))
      .lte('event_date', toKey(year, month, lastDay))
      .order('event_date')
      .order('games_time', { nullsFirst: true })
      .then(({ data, error }) => {
        setError(error?.message ?? null)
        setEvents(data ?? [])
        setLoading(false)
      })
  }, [year, month])

  const byDay = useMemo(() => {
    const map = {}
    for (const e of events) (map[e.event_date] ??= []).push(e)
    return map
  }, [events])

  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  const todayKey = toKey(today.getFullYear(), today.getMonth(), today.getDate())

  const shift = (delta) => {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  return (
    <section>
      <div className="cal-header">
        <button onClick={() => shift(-1)} aria-label="Previous month">‹</button>
        <h1>
          {new Date(year, month).toLocaleString(undefined, { month: 'long', year: 'numeric' })}
        </h1>
        <button onClick={() => shift(1)} aria-label="Next month">›</button>
      </div>

      {error && <p className="error">Could not load events: {error}</p>}
      {loading && <p className="muted">Loading…</p>}

      <div className="calendar">
        {WEEKDAYS.map((w) => (
          <div key={w} className="weekday">{w}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`blank-${i}`} className="day blank" />
          const key = toKey(year, month, day)
          return (
            <div key={key} className={`day${key === todayKey ? ' today' : ''}`}>
              <span className="day-num">{day}</span>
              {(byDay[key] ?? []).map((e) => (
                <Link key={e.id} to={`/events/${e.id}`} className={`chip${e.leader ? ' planned' : ''}`}>
                  {e.games_time && <b>{e.games_time.slice(0, 5)} </b>}
                  {e.title}
                </Link>
              ))}
            </div>
          )
        })}
      </div>
    </section>
  )
}
