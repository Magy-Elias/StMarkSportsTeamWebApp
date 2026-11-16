'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';

// Our own date picker (instead of the browser's), so days before `min` can be
// shown as faded numbers on a clear background, matching the app's style.
// Values are "YYYY-MM-DD" strings, like a native <input type="date">.

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const todayISO = () => {
  const t = new Date();
  return toISO(t.getFullYear(), t.getMonth(), t.getDate());
};
/** "2026-11-30" -> "30/11/2026" */
const display = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : '';
};

export default function DatePicker({
  value,
  onChange,
  min,
  label,
  invalid = false,
  name,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Earliest day that can be picked ("YYYY-MM-DD"). */
  min?: string;
  label: string;
  invalid?: boolean;
  name?: string;
}) {
  const [open, setOpen] = useState(false);
  const start = value || min || todayISO();
  const [view, setView] = useState(() => ({ y: Number(start.slice(0, 4)), m: Number(start.slice(5, 7)) - 1 }));
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popupId = useId();

  // When opening, show the month of the picked date (or the first allowed one).
  const openPicker = () => {
    const s = value || min || todayISO();
    setView({ y: Number(s.slice(0, 4)), m: Number(s.slice(5, 7)) - 1 });
    setOpen(true);
  };

  // Close on outside click or Escape.
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
    // Put keyboard focus on the picked day (or first allowed day) when opening.
    requestAnimationFrame(() => {
      const el = wrap.current?.querySelector<HTMLButtonElement>('.dp-day.is-selected, .dp-day:not(:disabled)');
      el?.focus();
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
  const today = todayISO();
  // No point going back to a month where every day is before `min`.
  const prevMonthLast = toISO(m === 0 ? y - 1 : y, (m + 11) % 12, new Date(y, m, 0).getDate());
  const prevDisabled = Boolean(min && prevMonthLast < min);
  const move = (delta: number) => {
    const d = new Date(y, m + delta, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };

  return (
    <div className="dp" ref={wrap} dir="ltr">
      <button
        ref={trigger}
        type="button"
        className={`dp-trigger${invalid ? ' is-invalid' : ''}`}
        onClick={() => (open ? setOpen(false) : openPicker())}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={popupId}
        aria-label={`${label}: ${value ? display(value) : 'not set'}`}
        aria-invalid={invalid || undefined}
        data-name={name}
      >
        <span className={value ? '' : 'dp-placeholder'}>{value ? display(value) : 'dd/mm/yyyy'}</span>
        <CalendarIcon size={18} />
      </button>

      {open && (
        <div className="dp-popup" id={popupId} role="dialog" aria-label={label}>
          <div className="dp-head">
            <button type="button" className="dp-nav" onClick={() => move(-1)} disabled={prevDisabled} aria-label="Previous month">
              <ChevronLeftIcon size={18} />
            </button>
            <span className="dp-title">
              {new Date(y, m).toLocaleString('en-GB', { month: 'long', year: 'numeric' })}
            </span>
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
              const disabled = Boolean(min && iso < min);
              const cls = ['dp-day', iso === value && 'is-selected', iso === today && 'is-today'].filter(Boolean).join(' ');
              return (
                <button
                  key={iso}
                  type="button"
                  className={cls}
                  disabled={disabled}
                  aria-label={`${day} ${new Date(y, m).toLocaleString('en-GB', { month: 'long' })} ${y}`}
                  aria-pressed={iso === value}
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                    trigger.current?.focus();
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
