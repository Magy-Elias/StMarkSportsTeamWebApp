'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import DatePicker from '@/components/DatePicker';
import { emptyFormSlot, fromFormSlots, type FormSlot, type TimeParts } from '@/lib/schedule';

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const PERIODS = ['AM', 'PM'];

const ITEM = 40; // px height of one row in a wheel
const VISIBLE = 3; // rows visible at once: the chosen one in the middle, one above, one below
const EMPTY = ''; // "not picked yet", shown as "–"

// useLayoutEffect warns during server rendering; fall back to useEffect there.
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * One iPhone-style scroll wheel. Uses native scrolling (momentum + snap), so it
 * works with fingers, mouse wheel and trackpad. The row that stops in the middle
 * band is the value. Rows tilt and fade as they move away from the middle.
 */
function Wheel({
  label,
  options,
  value,
  onChange,
  allowEmpty = false,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  allowEmpty?: boolean;
}) {
  const items = allowEmpty ? [EMPTY, ...options] : options;
  const index = Math.max(0, items.indexOf(value));
  const ref = useRef<HTMLDivElement>(null);
  const scrolling = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const frame = useRef(0);
  // Row the wheel is animating to (keyboard/tap), so quick key presses add up.
  const target = useRef<number | null>(null);

  // Tilt/fade each row by its distance from the middle (no React re-render).
  const paint = () => {
    const el = ref.current;
    if (!el) return;
    const top = el.scrollTop;
    Array.from(el.children).forEach((child, k) => {
      const node = child as HTMLElement;
      const d = (k * ITEM - top) / ITEM; // 0 = in the middle band
      const a = Math.min(Math.abs(d), 2.6);
      node.style.transform = `perspective(260px) rotateX(${Math.max(-70, Math.min(70, -d * 22))}deg)`;
      node.style.opacity = String(1 - a * 0.32);
      node.dataset.center = Math.abs(d) < 0.5 ? 'true' : 'false';
    });
  };

  // Move the wheel when the value changes from outside (first load, edit
  // screen, "Submit another" reset), but never while the user is scrolling it.
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el || scrolling.current) return;
    if (Math.round(el.scrollTop / ITEM) !== index) el.scrollTop = index * ITEM;
    paint();
  }, [index]);

  useEffect(() => () => {
    clearTimeout(settleTimer.current);
    cancelAnimationFrame(frame.current);
  }, []);

  const onScroll = () => {
    scrolling.current = true;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(paint);
    clearTimeout(settleTimer.current);
    // When scrolling stops, the row in the middle becomes the value.
    settleTimer.current = setTimeout(() => {
      scrolling.current = false;
      target.current = null;
      const el = ref.current;
      if (!el) return;
      const i = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ITEM)));
      if (items[i] !== value) onChange(items[i]);
    }, 110);
  };

  const scrollToIndex = (i: number) => {
    const clamped = Math.max(0, Math.min(items.length - 1, i));
    target.current = clamped;
    ref.current?.scrollTo({ top: clamped * ITEM, behavior: 'smooth' });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const current = target.current ?? (ref.current ? Math.round(ref.current.scrollTop / ITEM) : index);
    const moves: Record<string, number> = {
      ArrowUp: current - 1,
      ArrowDown: current + 1,
      PageUp: current - 5,
      PageDown: current + 5,
      Home: 0,
      End: items.length - 1,
    };
    if (e.key in moves) {
      e.preventDefault();
      scrollToIndex(moves[e.key]);
    }
  };

  return (
    <div
      ref={ref}
      className="wheel"
      style={{ height: ITEM * VISIBLE, paddingBlock: ITEM * ((VISIBLE - 1) / 2) }}
      onScroll={onScroll}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="spinbutton"
      aria-label={label}
      aria-valuetext={value || 'not set'}
    >
      {items.map((opt, k) => (
        <div
          key={opt || 'empty'}
          className="wheel-item"
          style={{ height: ITEM }}
          onClick={() => scrollToIndex(k)}
          aria-hidden="true"
        >
          {opt || '–'}
        </div>
      ))}
    </div>
  );
}

function ClockTimePicker({ label, value, onChange }: { label: string; value: TimeParts; onChange: (v: TimeParts) => void }) {
  const set = (patch: Partial<TimeParts>) => onChange({ ...value, ...patch });

  return (
    <div className="time-picker">
      <span className="time-label">{label}</span>
      {/* Hour : minute AM/PM, always left-to-right, with one shared middle band */}
      <div className="time-wheels" dir="ltr" style={{ height: ITEM * VISIBLE }}>
        <span className="wheel-band" style={{ top: ITEM * ((VISIBLE - 1) / 2), height: ITEM }} aria-hidden="true" />
        <Wheel label={`${label}: hour`} options={HOURS} value={value.hour} onChange={(hour) => set({ hour })} />
        <span className="time-separator" aria-hidden="true">:</span>
        <Wheel label={`${label}: minute`} options={MINUTES} value={value.minute} onChange={(minute) => set({ minute })} />
        <Wheel
          label={`${label}: AM/PM`}
          options={PERIODS}
          value={value.period}
          onChange={(period) => set({ period: period as TimeParts['period'] })}
        />
      </div>
    </div>
  );
}

/** The current time, or `addMinutes` from now, as wheel parts. Never wraps past 11:59 PM. */
function timeFromNow(addMinutes = 0): TimeParts {
  const now = new Date();
  const later = new Date(now.getTime() + addMinutes * 60_000);
  const d = later.getDate() === now.getDate() ? later : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59);
  const h = d.getHours();
  return { hour: String(h % 12 || 12), minute: String(d.getMinutes()).padStart(2, '0'), period: h < 12 ? 'AM' : 'PM' };
}

const isUnset = (t: TimeParts) => !t.hour || !t.minute;

/** Rows of date + from + to, with + to add a row and × to remove one. */
export default function ScheduleInput({
  value,
  onChange,
  minDate,
}: {
  value: FormSlot[];
  onChange: (v: FormSlot[]) => void;
  /** Earliest allowed date for a row (the event's main date, "تاريخ"). */
  minDate?: string;
}) {
  const slots = value.length ? value : [emptyFormSlot()];
  const save = onChange;

  // Start every new row on the current time (from) and one hour later (to), so the
  // wheels never sit on a blank value. Done in the browser to use the user's clock.
  useEffect(() => {
    if (!slots.some((s) => isUnset(s.from) || isUnset(s.to))) return;
    save(
      slots.map((s) => ({
        ...s,
        from: isUnset(s.from) ? timeFromNow() : s.from,
        to: isUnset(s.to) ? timeFromNow(60) : s.to,
      })),
    );
  }, [slots]);
  const update = (i: number, patch: Partial<FormSlot>) => {
    const next = slots.map((s, j) => (j === i ? { ...s, ...patch } : s));
    save(next);
  };

  // Validate the schedule locally so the error can be shown right under the time field.
  const { error: scheduleError } = fromFormSlots(slots, minDate);

  return (
    <div className="schedule">
      {slots.map((slot, i) => (
        <div key={i} className="schedule-row">
          {/* Line 1: date */}
          <div className="schedule-date-row">
            <DatePicker
              label={slots.length > 1 ? `التاريخ (الموعد ${i + 1})` : 'التاريخ'}
              value={slot.date}
              min={minDate || undefined}
              onChange={(date) => update(i, { date })}
            />
          </div>
          {/* Line 2: time wheels (from → to) */}
          <div className="schedule-time-row">
            <ClockTimePicker label="من" value={slot.from} onChange={(from) => update(i, { from })} />
            <ClockTimePicker label="إلى" value={slot.to} onChange={(to) => update(i, { to })} />
          </div>
          <div className="schedule-actions">
            {slots.length > 1 && (
              <button
                type="button"
                className="schedule-btn remove"
                onClick={() => save(slots.filter((_, j) => j !== i))}
                aria-label="Remove this date"
                title="Remove this date"
              >
                ×
              </button>
            )}
            {i === slots.length - 1 && (
              <button
                type="button"
                className="schedule-btn add"
                onClick={() => save([...slots, emptyFormSlot()])}
                aria-label="Add another date"
                title="Add another date"
              >
                +
              </button>
            )}
          </div>
        </div>
      ))}
      {scheduleError && (
        <p className="schedule-error" role="alert">
          {scheduleError}
        </p>
      )}
    </div>
  );
}
