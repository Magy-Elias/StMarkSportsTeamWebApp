'use client';

import { emptyFormSlot, type FormSlot, type TimeParts } from '@/lib/schedule';

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

function TimePicker({ label, value, onChange }: { label: string; value: TimeParts; onChange: (v: TimeParts) => void }) {
  const parts = value;
  const set = (patch: Partial<TimeParts>) => onChange({ ...parts, ...patch });

  return (
    <div className="time-picker">
      <span className="time-label">{label}</span>
      {/* Hour : minute AM/PM, always left-to-right */}
      <div className="time-selects" dir="ltr">
        <select aria-label={`${label}: hour`} value={parts.hour} onChange={(e) => set({ hour: e.target.value })}>
          <option value="">--</option>
          {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <span>:</span>
        <select aria-label={`${label}: minute`} value={parts.minute} onChange={(e) => set({ minute: e.target.value })}>
          <option value="">--</option>
          {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select
          aria-label={`${label}: AM/PM`}
          value={parts.period}
          onChange={(e) => set({ period: e.target.value as TimeParts['period'] })}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
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
          <TimePicker label="من" value={slot.from} onChange={(from) => update(i, { from })} />
          <TimePicker label="إلى" value={slot.to} onChange={(to) => update(i, { to })} />
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
