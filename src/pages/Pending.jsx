import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function Pending() {
  const [events, setEvents] = useState([])
  const [approvedIds, setApprovedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    supabase
      .from('events')
      .select('id, title, event_date, location, responsible_person, phone, goal, participants_count, games_time')
      .eq('status', 'pending')
      .order('event_date', { ascending: true })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setEvents(data ?? [])
        setLoading(false)
      })
  }, [])

  const approve = async (id) => {
    const { error } = await supabase
      .from('events')
      .update({ status: 'approved' })
      .eq('id', id)
    if (error) return setError(error.message)
    setApprovedIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }

  if (loading) return <p className="muted">Loading…</p>
  if (error) return <p className="error">Could not load events: {error}</p>

  return (
    <section>
      <h1>Events Pending Approval</h1>
      {events.length === 0 && <p className="muted">No pending events.</p>}

      {events.map((ev) => (
        <div key={ev.id} className="card" style={{ marginBottom: '16px' }}>
          <div style={{ marginBottom: '8px' }}>
            <strong>{ev.title}</strong>
            <span style={{ marginLeft: '8px', color: 'var(--muted)' }}>{ev.event_date}</span>
          </div>
          {ev.location && <div style={{ marginBottom: '4px', color: 'var(--muted)' }}>{ev.location}</div>}
          {ev.responsible_person && <div style={{ marginBottom: '4px', color: 'var(--muted)' }}>{ev.responsible_person}</div>}
          {ev.phone && <div style={{ marginBottom: '8px', color: 'var(--muted)' }}>{ev.phone}</div>}

          <div className="pending-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {!approvedIds.has(ev.id) && (
              <button
                onClick={() => approve(ev.id)}
                disabled={loading}
                className="approve-btn"
              >
                Approve
              </button>
            )}
            <button
              onClick={() => navigate(`/form-2?event=${ev.id}`)}
              disabled={!approvedIds.has(ev.id)}
              className="form2-btn"
            >
              Open Form 2
            </button>
          </div>
        </div>
      ))}
    </section>
  )
}
