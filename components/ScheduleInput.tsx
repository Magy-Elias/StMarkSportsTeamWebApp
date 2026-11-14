'use client';

import { useEffect, useRef, useState } from 'react';
import { emptyFormSlot, type FormSlot, type TimeParts } from '@/lib/schedule';

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const PERIODS: string[] = ['AM', 'PM'];

const ITEM_HEIGHT = 44; // px per wheel item
const VISIBLE_ITEMS = 3; // how many items show at once (current + one before + one after)

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
  const [scrollY, setScrollY] = useState(0);
  const index = options.indexOf(value);

  // Scroll into view when the value changes from outside.
  useEffect(() => {
    if (ref.current && index >= 0) {
      const target = index * ITEM_HEIGHT - ((VISIBLE_ITEMS - 1) / 2) * ITEM_HEIGHT;
      ref.current.scrollTo({ top: target, behavior: 'smooth' });
    }
  }, [value, index]);

  const commit = (i: number) => {
    const clamped = Math.max(0, Math.min(i, options.length - 1));
    const target = clamped * ITEM_HEIGHT - ((VISIBLE_ITEMS - 1) / 2) * ITEM_HEIGHT;
    setScrollY(target);
    onChange(options[clamped]);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const step = e.deltaY > 0 ? 1 : -1;
    commit(index + step);
  };

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

function ClockTimePicker({ label, value, onChange }: { label: string; value: TimeParts; onChange: (v: TimeParts) => void }) {
  const parts = value;
  const set = (patch: Partial<TimeParts>) => onChange({ ...parts, ...patch });

  return (
    <div className="time-picker">
      <span className="time-label">{label}</span>
      {/* Hour : minute AM/PM, always left-to-right */}
      <div className="time-wheels" dir="ltr">
        <WheelPicker
          aria-label={`${label}: hour`}
          options={HOURS}
          value={parts.hour}
          onChange={(v) => set({ hour: v })}
        />
        <span className="time-separator">:</span>
        <WheelPicker
          aria-label={`${label}: minute`}
          options={MINUTES}
          value={parts.minute}
          onChange={(v) => set({ minute: v })}
        />
        <WheelPicker
          aria-label={`${label}: period`}
          options={PERIODS}
          value={parts.period}
          onChange={(v) => set({ period: v as TimeParts['period'] })}
        />
      </div>
    </div>
  );
}

/** Rows of date + from + to, with + to add a row and × to remove one. */
export default function ScheduleInput({ value, onChange }: { value: FormSlot[]; onChange: (v: FormSlot[]) => void }) {
  const slots = value.length ? value : [emptyFormSlot()];
  const save = onChange;
  const update = (i: number, patch: Partial<FormSlot>) =>
    save(slots.map((s, j) => (j === i ? { ...s, ...patch } : s)));

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
          <ClockTimePicker label="من" value={slot.from} onChange={(from) => update(i, { from })} />
          <ClockTimePicker label="إلى" value={slot.to} onChange={(to) => update(i, { to })} />
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
