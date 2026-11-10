import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

const emptyGame = () => ({ leader: '', name: '', description: '', tools: '' })
const emptyPlan = () => ({ leader: '', co_leader: '', games: [emptyGame()], day_details: '' })
const clean = (v) => (v.trim() === '' ? null : v.trim())

// Form 2 adds the games plan to an event created by Form 1.
// Supports /form-2?event=<id> to preselect an event.
export default function Form2() {
  const [params, setParams] = useSearchParams()
  const eventId = params.get('event') ?? ''
  const [events, setEvents] = useState([])
  const [plan, setPlan] = useState(emptyPlan)
  const [status, setStatus] = useState({ state: 'idle' })

  useEffect(() => {
    supabase
      .from('events')
      .select('id, title, event_date')
      .order('event_date', { ascending: false })
      .then(({ data, error }) => {
        if (error) setStatus({ state: 'error', message: error.message })
        else setEvents(data)
      })
  }, [])

  // Load any plan already saved for the chosen event so it can be edited.
  useEffect(() => {
    if (!eventId) return setPlan(emptyPlan())
    supabase
      .from('events')
      .select('leader, co_leader, games, day_details')
      .eq('id', eventId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) return setStatus({ state: 'error', message: error.message })
        if (!data) return setStatus({ state: 'error', message: 'Event not found.' })
        setPlan({
          leader: data.leader ?? '',
          co_leader: data.co_leader ?? '',
          day_details: data.day_details ?? '',
          games: data.games?.length
            ? data.games.map((g) => ({ ...emptyGame(), ...Object.fromEntries(Object.entries(g).map(([k, v]) => [k, v ?? ''])) }))
            : [emptyGame()],
        })
      })
  }, [eventId])

  const set = (key) => (e) => setPlan((p) => ({ ...p, [key]: e.target.value }))
  const setGame = (i, key) => (e) =>
    setPlan((p) => ({ ...p, games: p.games.map((g, j) => (j === i ? { ...g, [key]: e.target.value } : g)) }))
  const addGame = () => setPlan((p) => ({ ...p, games: [...p.games, emptyGame()] }))
  const removeGame = (i) => setPlan((p) => ({ ...p, games: p.games.filter((_, j) => j !== i) }))

  const onSubmit = async (e) => {
    e.preventDefault()
    setStatus({ state: 'saving' })
    const games = plan.games
      .map((g) => ({ leader: clean(g.leader), name: clean(g.name), description: clean(g.description), tools: clean(g.tools) }))
      .filter((g) => Object.values(g).some((v) => v !== null)) // drop fully empty games
    const { error } = await supabase
      .from('events')
      .update({ leader: clean(plan.leader), co_leader: clean(plan.co_leader), games, day_details: clean(plan.day_details) })
      .eq('id', eventId)
    setStatus(error ? { state: 'error', message: error.message } : { state: 'saved' })
  }

  return (
    <section className="card">
      <h1>Form 2</h1>
      <form onSubmit={onSubmit} className="form">
        <label>
          <span>Event *</span>
          <select
            value={eventId}
            required
            onChange={(e) => {
              setStatus({ state: 'idle' })
              setParams(e.target.value ? { event: e.target.value } : {})
            }}
          >
            <option value="">Select an event…</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.event_date} · {ev.title}</option>
            ))}
          </select>
        </label>

        {eventId && (
          <>
            <label>
              <span>Leader</span>
              <input value={plan.leader} onChange={set('leader')} />
            </label>
            <label>
              <span>Co-Leader</span>
              <input value={plan.co_leader} onChange={set('co_leader')} />
            </label>

            <div className="games-list">
              {plan.games.map((g, i) => (
                <fieldset key={i}>
                  <legend>Game {i + 1}</legend>
                  <label>
                    <span>Game Leader</span>
                    <input value={g.leader} onChange={setGame(i, 'leader')} />
                  </label>
                  <label>
                    <span>Game Name</span>
                    <input value={g.name} onChange={setGame(i, 'name')} />
                  </label>
                  <label>
                    <span>Game Description</span>
                    <textarea rows={3} value={g.description} onChange={setGame(i, 'description')} />
                  </label>
                  <label>
                    <span>Game Tools / Material</span>
                    <textarea rows={2} value={g.tools} onChange={setGame(i, 'tools')} />
                  </label>
                  {plan.games.length > 1 && (
                    <button type="button" className="link" onClick={() => removeGame(i)}>Remove game</button>
                  )}
                </fieldset>
              ))}
              <button type="button" className="secondary" onClick={addGame}>+ Add another game</button>
            </div>

            <label>
              <span>Details of the Day</span>
              <textarea rows={4} value={plan.day_details} onChange={set('day_details')} />
            </label>

            <button type="submit" disabled={status.state === 'saving'}>
              {status.state === 'saving' ? 'Saving…' : 'Save'}
            </button>
          </>
        )}
      </form>
      {status.state === 'saved' && (
        <p className="success">Saved! <Link to={`/events/${eventId}`}>View event</Link></p>
      )}
      {status.state === 'error' && <p className="error">Could not save: {status.message}</p>}
    </section>
  )
}
