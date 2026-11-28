'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon } from '@/components/icons';

// "Filter by date" button for the Events page. Opens a calendar where days that
// have approved events are highlighted (other days can't be picked). Picking a
// day opens /events?date=YYYY-MM-DD; the × clears it (all events).

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const label = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export default function EventsDateFilter({ date, eventDates, today }: { date: string; eventDates: string[]; today: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popupId = useId();
  const has = new Set(eventDates);

  // Month to show when opening: the picked date, else the next day with events, else today.
  const startDate = () => date || eventDates.find((d) => d >= today) || eventDates.at(-1) || today;
  const [view, setView] = useState(() => ({ y: Number(startDate().slice(0, 4)), m: Number(startDate().slice(5, 7)) - 1 }));
  const openPicker = () => {
    const s = startDate();
    setView({ y: Number(s.slice(0, 4)), m: Number(s.slice(5, 7)) - 1 });
    setOpen(true);
  };

  // Close on outside click or Escape; focus the picked (or first highlighted) day.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    requestAnimationFrame(() => {
      wrap.current?.querySelector<HTMLButtonElement>('.dp-day.is-selected, .dp-day:not(:disabled)')?.focus();
    });
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const { y, m } = view;
  const firstWeekday = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells = [...Array<null>(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const monthEvents = eventDates.filter((d) => d.startsWith(`${y}-${pad(m + 1)}`)).length;
  const move = (delta: number) => {
    const d = new Date(y, m + delta, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };

  return (
    <div className="events-dp dp" ref={wrap}>
      <div className="events-dp-buttons">
        <button
          ref={trigger}
          type="button"
          className={`btn ${date ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => (open ? setOpen(false) : openPicker())}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={popupId}
        >
          <CalendarIcon size={17} /> {date ? label(date) : 'Filter by date'}
        </button>
        {date && (
          <button type="button" className="btn btn-ghost events-dp-clear" onClick={() => router.push('/events')} aria-label="Clear date filter (show all events)" title="Show all events">
            <CloseIcon size={16} />
          </button>
        )}
      </div>

      {open && (
        <div className="dp-popup" id={popupId} role="dialog" aria-label="Filter by date">
          <div className="dp-head">
            <button type="button" className="dp-nav" onClick={() => move(-1)} aria-label="Previous month">
              <ChevronLeftIcon size={18} />
            </button>
            <span className="dp-title">{new Date(y, m).toLocaleString('en-GB', { month: 'long', year: 'numeric' })}</span>
            <button type="button" className="dp-nav" onClick={() => move(1)} aria-label="Next month">
              <ChevronRightIcon size={18} />
            </button>
          </div>
          <div className="dp-grid">
            {WEEKDAYS.map((w) => (
              <span key={w} className="dp-weekday">{w}</span>
            ))}
            {cells.map((day, i) => {
              if (!day) return <span key={`b${i}`} />;
              const iso = toISO(y, m, day);
              const hasEvents = has.has(iso);
              const cls = ['dp-day', hasEvents && 'has-events', iso === date && 'is-selected', iso === today && 'is-today']
                .filter(Boolean)
                .join(' ');
              return (
                <button
                  key={iso}
                  type="button"
                  className={cls}
                  disabled={!hasEvents}
                  aria-label={`${label(iso)}${hasEvents ? ', has events' : ''}`}
                  aria-pressed={iso === date}
                  onClick={() => {
                    setOpen(false);
                    router.push(`/events?date=${iso}`);
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <p className="events-dp-note">{monthEvents ? 'Highlighted days have events.' : 'No events this month.'}</p>
        </div>
      )}
    </div>
  );
}
