'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import EventDetailsTable, { EVENT_DETAILS_COLUMNS, type EventDetails } from '@/components/EventDetailsTable';
import { DAY_PLAN_COLUMNS, parseDayPlans, type DayPlan } from '@/lib/dayPlans';
import { formatRange, parseSchedule, type ScheduleSlot } from '@/lib/schedule';
import { BoxIcon, DumbbellIcon, EditIcon, TrashIcon, UserIcon } from '@/components/icons';

/** `saved` is UI-only: a saved game shows as a card, an unsaved one as its form. */
type GameForm = { leader: string; name: string; description: string; tools: string; saved: boolean };
type PlanForm = { leader: string; co_leader: string; games: GameForm[] };

const emptyGame = (): GameForm => ({ leader: '', name: '', description: '', tools: '', saved: false });
const isEmptyGame = (g: GameForm) => [g.leader, g.name, g.description, g.tools].every((v) => v.trim() === '');
const emptyPlan = (): PlanForm => ({ leader: '', co_leader: '', games: [emptyGame()] });
const clean = (v: string) => (v.trim() === '' ? null : v.trim());

/** Saved plan -> form fields (empty strings instead of nulls, at least one game). */
const toForm = (p?: DayPlan): PlanForm =>
  p
    ? {
        leader: p.leader ?? '',
        co_leader: p.co_leader ?? '',
        games: p.games.length
          ? p.games.map((g) => ({ leader: g.leader ?? '', name: g.name ?? '', description: g.description ?? '', tools: g.tools ?? '', saved: true }))
          : [emptyGame()],
      }
    : emptyPlan();

/** Form fields -> plan to save (only saved games; empty ones left out). */
const fromForm = (p: PlanForm) => ({
  leader: clean(p.leader),
  co_leader: clean(p.co_leader),
  games: p.games
    .filter((g) => g.saved)
    .map((g) => ({ leader: clean(g.leader), name: clean(g.name), description: clean(g.description), tools: clean(g.tools) }))
    .filter((g) => Object.values(g).some((v) => v !== null)),
});

const enDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

/** "Day 2 · Reflection 2 · Tue, 15 Dec 2026 · 3:00 PM – 5:00 PM" */
const dayHeading = (i: number, d?: ScheduleSlot) =>
  [`Day ${i + 1}`, d?.title, d && enDate(d.date), d && formatRange(d)].filter(Boolean).join(' · ');

type EventOption = { id: string; title: string; event_date: string };

function EventManagementContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get('event') ?? '';
  const [events, setEvents] = useState<EventOption[]>([]);
  // One plan per day of the event (same order as its schedule).
  const [plans, setPlans] = useState<PlanForm[]>([emptyPlan()]);
  // The selected event's Event Registration details, shown read-only above the plan.
  const [details, setDetails] = useState<EventDetails | null>(null);
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
    setDetails(null);
    if (!eventId) return setPlans([emptyPlan()]);
    supabase
      .from('events')
      .select(`${DAY_PLAN_COLUMNS}, ${EVENT_DETAILS_COLUMNS}`)
      .eq('id', eventId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) return setStatus({ state: 'error', message: error.message });
        if (!data) return setStatus({ state: 'error', message: 'Event not found.' });
        setDetails(data);
        const saved = parseDayPlans(data);
        const dayCount = Math.max(parseSchedule(data.schedule).length, 1);
        setPlans(Array.from({ length: dayCount }, (_, i) => toForm(saved[i])));
      });
  }, [eventId]);

  const days = parseSchedule(details?.schedule);

  const updatePlan = (d: number, change: (p: PlanForm) => PlanForm) =>
    setPlans((all) => all.map((p, j) => (j === d ? change(p) : p)));

  const set = (d: number, key: 'leader' | 'co_leader') => (e: React.ChangeEvent<HTMLInputElement>) =>
    updatePlan(d, (p) => ({ ...p, [key]: e.target.value }));

  const setGame = (d: number, i: number, key: keyof GameForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    updatePlan(d, (p) => ({ ...p, games: p.games.map((g, j) => (j === i ? { ...g, [key]: e.target.value } : g)) }));

  const addGame = (d: number) => updatePlan(d, (p) => ({ ...p, games: [...p.games, emptyGame()] }));

  /** Writes the plans to the DB (only games marked saved are stored). */
  const persist = async (next: PlanForm[]) => {
    setPlans(next);
    setStatus({ state: 'saving' as const, message: null });
    const { error } = await supabase
      .from('events')
      // Only the games plan; the status isn't changed ("completed" is automatic, see lib/status.ts).
      // The old event-wide columns are cleared: the plan now lives in day_plans.
      .update({ day_plans: next.map(fromForm), leader: null, co_leader: null, games: [] })
      .eq('id', eventId);
    setStatus(error ? { state: 'error', message: error.message } : { state: 'saved' as const, message: null });
  };

  const withGames = (d: number, change: (games: GameForm[]) => GameForm[]) =>
    plans.map((p, j) => (j === d ? { ...p, games: change(p.games) } : p));

  /** Save one game: it turns into a card and the plan is stored. */
  const saveGame = (d: number, i: number) => {
    const g = plans[d].games[i];
    if (!g.name.trim() && !g.leader.trim()) {
      return setStatus({ state: 'error', message: 'Enter at least the game name or the game leader.' });
    }
    void persist(withGames(d, (games) => games.map((x, j) => (j === i ? { ...x, saved: true } : x))));
  };

  const editGame = (d: number, i: number) =>
    updatePlan(d, (p) => ({ ...p, games: p.games.map((g, j) => (j === i ? { ...g, saved: false } : g)) }));

  const removeGame = (d: number, i: number) => {
    const g = plans[d].games[i];
    if (!g.saved) return updatePlan(d, (p) => ({ ...p, games: p.games.filter((_, j) => j !== i) }));
    if (!confirm(`Delete game "${g.name || `Game ${i + 1}`}"?`)) return;
    void persist(withGames(d, (games) => games.filter((_, j) => j !== i)));
  };

  // The main Save button also saves every filled-in game form.
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void persist(plans.map((p) => ({ ...p, games: p.games.map((g) => (isEmptyGame(g) ? g : { ...g, saved: true })) })));
  };

  const updateSearchParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    router.push(`/event-management?${params.toString()}`);
  };

  return (
    <section className="card card-wide">
      <h1>One 99 Event Management</h1>
      <form onSubmit={onSubmit} className="form">
        <label>
          <span>Event</span>
          <select
            value={eventId}
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
            {details && <EventDetailsTable event={details} />}
            {plans.map((plan, d) => (
              <section key={d} className="day-plan">
                {plans.length > 1 && <h2 className="day-plan-title">{dayHeading(d, days[d])}</h2>}
                <label>
                  <span>Leader</span>
                  <input value={plan.leader} onChange={set(d, 'leader')} />
                </label>
                <label>
                  <span>Co-Leader</span>
                  <input value={plan.co_leader} onChange={set(d, 'co_leader')} />
                </label>

                <div className="games-grid">
                  {plan.games.map((g, i) =>
                    g.saved ? (
                      <article key={i} className="game-card">
                        <header className="game-card-head">
                          <span className="game-card-label">
                            <DumbbellIcon size={18} /> Game {String(i + 1).padStart(2, '0')}
                          </span>
                          <span className="game-card-actions">
                            <button type="button" className="icon-btn" onClick={() => editGame(d, i)} aria-label={`Edit game ${i + 1}`} title="Edit">
                              <EditIcon size={20} />
                            </button>
                            <button type="button" className="icon-btn danger" onClick={() => removeGame(d, i)} aria-label={`Delete game ${i + 1}`} title="Delete">
                              <TrashIcon size={20} />
                            </button>
                          </span>
                        </header>
                        <div className="game-card-body">
                          {g.name && <h3 dir="auto">{g.name}</h3>}
                          {g.leader && (
                            <p className="game-card-leader"><UserIcon size={18} /> {g.leader}</p>
                          )}
                          {/* Always shown, so every card has the same layout; "—" when empty. */}
                          <div>
                            <p className="game-card-label">Description</p>
                            {g.description.trim() ? (
                              <p className="game-card-text" dir="auto">{g.description}</p>
                            ) : (
                              <p className="game-card-text game-card-empty">—</p>
                            )}
                          </div>
                          {g.tools && (
                            <div className="game-card-tools">
                              <p className="game-card-label"><BoxIcon size={16} /> Tools / Materials</p>
                              <p className="game-card-text" dir="auto">{g.tools}</p>
                            </div>
                          )}
                        </div>
                      </article>
                    ) : (
                      <fieldset key={i} className="game-edit">
                        <legend>Game {i + 1}</legend>
                        <label>
                          <span>Game Leader</span>
                          <input value={g.leader} onChange={setGame(d, i, 'leader')} />
                        </label>
                        <label>
                          <span>Game Name</span>
                          <input value={g.name} onChange={setGame(d, i, 'name')} />
                        </label>
                        <label>
                          <span>Game Description <small className="optional">(optional)</small></span>
                          <textarea rows={3} value={g.description} onChange={setGame(d, i, 'description')} />
                        </label>
                        <label>
                          <span>Game Tools / Material <small className="optional">(optional)</small></span>
                          <textarea rows={2} value={g.tools} onChange={setGame(d, i, 'tools')} />
                        </label>
                        <div className="game-edit-actions">
                          <button type="button" onClick={() => saveGame(d, i)} disabled={status.state === 'saving'}>
                            {status.state === 'saving' ? 'Saving…' : 'Save game'}
                          </button>
                          {(plan.games.length > 1 || g.saved) && (
                            <button type="button" className="link" onClick={() => removeGame(d, i)}>Remove game</button>
                          )}
                        </div>
                      </fieldset>
                    ),
                  )}
                  <button type="button" className="secondary games-add" onClick={() => addGame(d)}>+ Add another game</button>
                </div>
              </section>
            ))}

            <button type="submit" disabled={status.state === 'saving'}>
              {status.state === 'saving' ? 'Saving…' : 'Save'}
            </button>
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

export default function EventManagementPage() {
  return (
    <Suspense fallback={<div className="card">Loading events…</div>}>
      <EventManagementContent />
    </Suspense>
  );
}