'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

const emptyGame = () => ({ leader: '', name: '', description: '', tools: '' });
const emptyPlan = () => ({ leader: '', co_leader: '', games: [emptyGame()] });
const clean = (v: string) => (v.trim() === '' ? null : v.trim());

type EventOption = { id: string; title: string; event_date: string };

function Form2Content() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get('event') ?? '';
  const [events, setEvents] = useState<EventOption[]>([]);
  const [plan, setPlan] = useState(emptyPlan());
  const [status, setStatus] = useState<{ state: 'idle' | 'saving' | 'error' | 'saved'; message: string | null }>({
    state: 'idle',
    message: null,
  });

  useEffect(() => {
    supabase
      .from('events')
      .select('id, title, event_date')
      .order('event_date', { ascending: false })
      .then(({ data, error }) => {
        if (error) setStatus({ state: 'error', message: error.message });
        else setEvents(data);
      });
  }, []);

  useEffect(() => {
    if (!eventId) return setPlan(emptyPlan());
    supabase
      .from('events')
      .select('leader, co_leader, games')
      .eq('id', eventId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) return setStatus({ state: 'error', message: error.message });
        if (!data) return setStatus({ state: 'error', message: 'Event not found.' });
        setPlan({
          leader: data.leader ?? '',
          co_leader: data.co_leader ?? '',
          games: data.games?.length
            ? data.games.map((g: Record<string, unknown>) => ({ ...emptyGame(), ...Object.fromEntries(Object.entries(g).map(([k, v]) => [k, v ?? ''])) }))
            : [emptyGame()],
        });
      });
  }, [eventId]);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setPlan((p) => ({ ...p, [key]: e.target.value }));

  const setGame = (i: number, key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setPlan((p) => ({ ...p, games: p.games.map((g, j) => (j === i ? { ...g, [key]: e.target.value } : g)) }));

  const addGame = () => setPlan((p) => ({ ...p, games: [...p.games, emptyGame()] }));
  const removeGame = (i: number) => setPlan((p) => ({ ...p, games: p.games.filter((_, j) => j !== i) }));

  // Save stays disabled until everything is filled in, except each game's
  // description and tools/material, which are optional.
  const filled = (v: string) => v.trim() !== '';
  const complete =
    Boolean(eventId) &&
    filled(plan.leader) &&
    filled(plan.co_leader) &&
    plan.games.length > 0 &&
    plan.games.every((g) => filled(g.leader) && filled(g.name));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ state: 'saving' as const, message: null });
    const games = plan.games
      .map((g) => ({ leader: clean(g.leader), name: clean(g.name), description: clean(g.description), tools: clean(g.tools) }))
      .filter((g) => Object.values(g).some((v) => v !== null));
    const { error } = await supabase
      .from('events')
      .update({ leader: clean(plan.leader), co_leader: clean(plan.co_leader), games, status: 'completed' })
      .eq('id', eventId);
    setStatus(error ? { state: 'error', message: error.message } : { state: 'saved' as const, message: null });
  };

  const updateSearchParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    router.push(`/form-2?${params.toString()}`);
  };

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
              setStatus({ state: 'idle' as const, message: null });
              updateSearchParams(e.target.value ? { event: e.target.value } : {});
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
              <span>Leader *</span>
              <input value={plan.leader} onChange={set('leader')} required />
            </label>
            <label>
              <span>Co-Leader *</span>
              <input value={plan.co_leader} onChange={set('co_leader')} required />
            </label>

            <div className="games-list">
              {plan.games.map((g, i) => (
                <fieldset key={i}>
                  <legend>Game {i + 1}</legend>
                  <label>
                    <span>Game Leader *</span>
                    <input value={g.leader} onChange={setGame(i, 'leader')} required />
                  </label>
                  <label>
                    <span>Game Name *</span>
                    <input value={g.name} onChange={setGame(i, 'name')} required />
                  </label>
                  <label>
                    <span>Game Description <small className="optional">(optional)</small></span>
                    <textarea rows={3} value={g.description} onChange={setGame(i, 'description')} />
                  </label>
                  <label>
                    <span>Game Tools / Material <small className="optional">(optional)</small></span>
                    <textarea rows={2} value={g.tools} onChange={setGame(i, 'tools')} />
                  </label>
                  {plan.games.length > 1 && (
                    <button type="button" className="link" onClick={() => removeGame(i)}>Remove game</button>
                  )}
                </fieldset>
              ))}
              <button type="button" className="secondary" onClick={addGame}>+ Add another game</button>
            </div>

            <button type="submit" disabled={status.state === 'saving' || !complete}>
              {status.state === 'saving' ? 'Saving…' : 'Save'}
            </button>
            {!complete && (
              <p className="form-hint" role="status">
                Fill in all fields marked * to enable Save.
              </p>
            )}
          </>
        )}
      </form>
      {status.state === 'saved' && (
        <p className="success">Saved! <Link href={`/events/${eventId}`}>View event</Link></p>
      )}
      {status.state === 'error' && <p className="error">Could not save: {status.message}</p>}
    </section>
  );
}

export default function Form2Page() {
  return (
    <Suspense fallback={<div className="card">Loading events…</div>}>
      <Form2Content />
    </Suspense>
  );
}