'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { emptyFormSlot, fromFormSlots, type FormSlot, type TimeParts } from '@/lib/schedule';

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const PERIODS: string[] = ['AM', 'PM'];

// All possible times formatted as "H:MM AM/PM" e.g. "7:00 AM", "7:01 AM", ... "12:59 PM"
const ALL_TIMES: string[] = [];
for (const h of HOURS) {
  for (const m of MINUTES) {
    for (const p of PERIODS) {
      ALL_TIMES.push(`${h}:${m} ${p}`);
    }
  }
}

const ITEM_HEIGHT = 44; // px per wheel item
const VISIBLE_ITEMS = 3; // how many items show at once (current + one before + one after)
const DEFAULT_TIME = '9:00 AM';

function formatTimeParts(p: TimeParts): string {
  if (!p.hour || !p.minute) return DEFAULT_TIME;
  return `${p.hour}:${p.minute} ${p.period}`;
}

function parseTime(timeStr: string): TimeParts {
  // Format: "H:MM AM/PM" e.g. "7:00 AM", "12:59 PM"
  const match = timeStr.match(/^(\d+):(\d{2})\s*(AM|PM)$/);
  if (!match) return { hour: '', minute: '', period: 'AM' };
  return { hour: match[1], minute: match[2], period: match[3] as 'AM' | 'PM' };
}

// A scrollable wheel-style picker (iOS clock-app style).
// Scroll / click to pick an option; the center item is highlighted.
function WheelPicker({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scrollYRef = useRef(0);
  const [scrollY, setScrollY] = useState(0);
  const index = options.indexOf(value);
  const isUserScrolling = useRef(false);

  // Scroll into view when the value changes from outside (not from user scrolling).
  useEffect(() => {
    if (isUserScrolling.current || index < 0 || !ref.current) return;
    const target = index * ITEM_HEIGHT - ((VISIBLE_ITEMS - 1) / 2) * ITEM_HEIGHT;
    scrollYRef.current = target;
    setScrollY(target);
  }, [value, index]);

  const commit = useCallback(
    (i: number) => {
      const clamped = Math.max(0, Math.min(i, options.length - 1));
      const target = clamped * ITEM_HEIGHT - ((VISIBLE_ITEMS - 1) / 2) * ITEM_HEIGHT;
      scrollYRef.current = target;
      setScrollY(target);
      isUserScrolling.current = true;
      onChange(options[clamped]);
      // Reset user scrolling flag after the animation frame
      requestAnimationFrame(() => {
        isUserScrolling.current = false;
      });
    },
    [options.length, onChange]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (index < 0) return;
      const step = e.deltaY > 0 ? 1 : -1;
      commit(index + step);
    },
    [index, commit]
  );

  return (
    <div className="wheel-picker" onWheel={handleWheel} onTouchStart={(e) => e.preventDefault()}>
      <div className="wheel-mask" style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}>
        <div
          ref={ref}
          className="wheel-items"
          style={{ transform: `translateY(-${scrollY}px)` }}
        >
          {options.map((opt, i) => (
            <div
              key={opt}
              className={`wheel-item ${i === index ? 'selected' : ''}`}
              style={{ height: ITEM_HEIGHT, lineHeight: `${ITEM_HEIGHT}px` }}
              onClick={() => commit(i)}
            >
              {opt}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SingleTimeWheel({ label, value, onChange }: { label: string; value: TimeParts; onChange: (v: TimeParts) => void }) {
  const current = formatTimeParts(value);

  const set = (timeStr: string) => {
    onChange(parseTime(timeStr));
  };

  return (
    <div className="time-picker">
      <span className="time-label">{label}</span>
      <div className="time-wheel-single" dir="ltr">
        <WheelPicker
          aria-label={`${label}: time`}
          options={ALL_TIMES}
          value={current}
          onChange={set}
        />
      </div>
    </div>
  );
}

/** Rows of date + from + to, with + to add a row and × to remove one. */
export default function ScheduleInput({ value, onChange }: { value: FormSlot[]; onChange: (v: FormSlot[]) => void }) {
  const slots = value.length ? value : [emptyFormSlot()];
  const save = onChange;
  const update = (i: number, patch: Partial<FormSlot>) => {
    const next = slots.map((s, j) => (j === i ? { ...s, ...patch } : s));
    save(next);
  };

  // Validate the schedule locally so the error can be shown right under the time field.
  const { error: scheduleError } = fromFormSlots(slots);

  return (
    <div className="schedule">
      {slots.map((slot, i) => (
        <div key={i} className="schedule-row">
          <input
            type="date"
            aria-label="التاريخ"
            value={slot.date}
            onChange={(e) => update(i, { date: e.target.value })}
          />
          <SingleTimeWheel label="من" value={slot.from} onChange={(from) => update(i, { from })} />
          <SingleTimeWheel label="إلى" value={slot.to} onChange={(to) => update(i, { to })} />
          {scheduleError && (
            <p className="schedule-error" role="alert">
              {scheduleError}
            </p>
          )}
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
    </div>
  );
}
