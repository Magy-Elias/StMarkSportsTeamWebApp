'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveErrorMessage } from '@/components/EventForm';
import { FORM1_CONTACTS } from '@/components/form1Fields';
import { CalendarIcon, ClockIcon, PhoneIcon, SparklesIcon, UserIcon, UsersIcon } from '@/components/icons';
import { notifyTeamOfSubmission } from '@/lib/notify';
import { endsTooEarly, type ScheduleSlot } from '@/lib/schedule';
import { supabase } from '@/lib/supabase/client';

// Public Event Registration form (/event-registration): three steps (event
// details, contact person, schedule), a progress bar, and a submit bar that
// stays at the bottom of the screen. Editing an event still uses EventForm.

const MAX_DAYS = 5;
/** Every day must be at least this many days from today. */
const MIN_DAYS_AHEAD = 14;

type Day = { date: string; title: string; from: string; to: string };
const newDay = (): Day => ({ date: '', title: '', from: '15:00', to: '16:00' });

const EMPTY = {
  title: '',
  day_name: '',
  location: '',
  goal: '',
  participants_count: '',
  responsible_person: '',
  phone: '',
  email: '',
  remarks: '',
};
type Values = typeof EMPTY;

const filled = (v: string) => v.trim() !== '';
const isEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v.trim());

/** Browser's own date + n days, as "YYYY-MM-DD". */
const daysFromToday = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** A day's problem (English · Arabic), or null. Empty fields aren't problems, just not done yet. */
function dayError(d: Day, minDate: string): string | null {
  if (d.date && minDate && d.date < minDate) {
    return 'Events must be at least 2 weeks from today. · لا يمكن أن يكون موعد الحدث قبل مرور أسبوعين من اليوم.';
  }
  if (d.from && d.to && endsTooEarly(d.from, d.to)) {
    return 'The end time must be after the start time. · وقت النهاية يجب أن يكون بعد وقت البداية.';
  }
  return null;
}

/** Field label: English (with * or "optional") on the left, Arabic on the right. */
function Field({
  en,
  ar,
  required,
  className,
  children,
}: {
  en: string;
  ar: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`reg-field${className ? ` ${className}` : ''}`}>
      <span className="reg-label">
        <span>
          {en}
          {required ? <span className="reg-req" aria-hidden="true">*</span> : <span className="reg-optional"> (optional)</span>}
        </span>
        <span dir="rtl" lang="ar" className="reg-label-ar">{ar}</span>
      </span>
      {children}
    </label>
  );
}

function Step({
  n,
  icon,
  en,
  ar,
  children,
}: {
  n: number;
  icon: React.ReactNode;
  en: string;
  ar: string;
  children: React.ReactNode;
}) {
  return (
    <section className="reg-card" aria-labelledby={`reg-step-${n}`}>
      <header className="reg-step-header">
        <span className="reg-step-icon">{icon}</span>
        <div className="reg-step-titles">
          <span className="reg-step-number">STEP {n}</span>
          <h2 id={`reg-step-${n}`}>{en}</h2>
        </div>
        <span dir="rtl" lang="ar" className="reg-step-ar">{ar}</span>
      </header>
      {children}
    </section>
  );
}

export default function RegistrationForm() {
  const router = useRouter();
  const [values, setValues] = useState<Values>(EMPTY);
  const [days, setDays] = useState<Day[]>([newDay()]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Earliest allowed date; worked out in the browser so it uses the visitor's "today".
  const [minDate, setMinDate] = useState('');
  useEffect(() => setMinDate(daysFromToday(MIN_DAYS_AHEAD)), []);

  const set = (key: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const setDay = (i: number, key: keyof Day) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDays((all) => all.map((d, j) => (j === i ? { ...d, [key]: e.target.value } : d)));

  const setDayCount = (n: number) =>
    setDays((all) => {
      const next = all.slice(0, n);
      while (next.length < n) next.push(newDay());
      return next;
    });

  // Which steps are done.
  const steps = [
    {
      label: 'event details',
      done:
        filled(values.title) &&
        filled(values.day_name) &&
        filled(values.location) &&
        filled(values.goal) &&
        filled(values.participants_count),
    },
    {
      label: 'contact information',
      done: filled(values.responsible_person) && filled(values.phone) && isEmail(values.email),
    },
    {
      label: 'schedule',
      done: days.every((d) => d.date && filled(d.title) && d.from && d.to && !dayError(d, minDate)),
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const missing = steps.filter((s) => !s.done).map((s) => s.label);
  const ready = missing.length === 0;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || saving) return;
    setSaving(true);
    setSaveError(null);

    const schedule: ScheduleSlot[] = days.map((d) => ({ date: d.date, from: d.from, to: d.to, title: d.title.trim() }));
    const clean = (v: string) => (filled(v) ? v.trim() : null);
    // The ID is generated here rather than read back after the insert, because
    // visitors who aren't logged in are allowed to add events but not read them.
    const id = crypto.randomUUID();
    const { error } = await supabase.from('events').insert({
      id,
      status: 'pending',
      title: values.title.trim(),
      day_name: clean(values.day_name),
      location: clean(values.location),
      goal: clean(values.goal),
      participants_count: Number(values.participants_count),
      responsible_person: clean(values.responsible_person),
      phone: clean(values.phone),
      email: clean(values.email),
      remarks: clean(values.remarks),
      schedule,
      // The event's main date (calendar, sorting, duplicate check) is Day 1's date.
      event_date: schedule[0].date,
    });
    if (error) {
      setSaving(false);
      setSaveError(saveErrorMessage(error));
      return;
    }
    // Tell the team about the new request (doesn't hold up the visitor).
    void notifyTeamOfSubmission(id);
    // replace() so the browser's Back button doesn't return to the submitted form.
    router.replace(`/event-registration/submitted?id=${id}`);
  };

  return (
    <div className="reg" dir="ltr">
      <div className="logos-row reg-logos">
        <img src="/logo.svg" alt="ONE99 Sports Team" className="form-logo" />
        <img src="/st-mark-logo-round.png" alt="St. Mark" className="form-logo" />
      </div>

      <header className="reg-hero">
        <p className="reg-hero-team">ONE99 Sports Team</p>
        <h1>Event Registration</h1>
        <p dir="rtl" lang="ar" className="reg-hero-ar">نموذج تسجيل فعالية</p>
        <div className="reg-progress-text">
          <span>{doneCount} of {steps.length} steps complete</span>
          <span>~3 min</span>
        </div>
        <div
          className="reg-progress"
          role="progressbar"
          aria-label="Steps complete"
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-valuenow={doneCount}
        >
          <span style={{ width: `${(doneCount / steps.length) * 100}%` }} />
        </div>
      </header>

      <form onSubmit={onSubmit} className="reg-form" noValidate>
        <Step n={1} icon={<SparklesIcon size={22} />} en="Event details" ar="تفاصيل الحدث">
          <Field en="Service or meeting name / Grade" ar="اسم الخدمة او الاجتماع / رقم Grade" required>
            <input value={values.title} onChange={set('title')} placeholder="e.g. Youth meeting – Grade 5" required />
          </Field>
          <div className="reg-grid">
            <Field en="Day name" ar="اسم اليوم" required>
              <input value={values.day_name} onChange={set('day_name')} placeholder="e.g. Sports Day" required />
            </Field>
            <Field en="Location" ar="المكان" required>
              <input value={values.location} onChange={set('location')} placeholder="e.g. Church hall" required />
            </Field>
          </div>
          <Field en="Goal" ar="الهدف" required>
            <textarea value={values.goal} onChange={set('goal')} placeholder="What do you hope to achieve?" rows={4} required />
          </Field>
          <Field en="Number of participants" ar="عدد المشاركين" required className="reg-half">
            <span className="reg-input-icon">
              <UsersIcon size={18} />
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={values.participants_count}
                onChange={(e) => setValues((v) => ({ ...v, participants_count: e.target.value.replace(/\D/g, '') }))}
                placeholder="0"
                required
              />
            </span>
          </Field>
        </Step>

        <Step n={2} icon={<UserIcon size={22} />} en="Contact person" ar="الشخص المسؤول">
          <Field en="Responsible person" ar="الشخص المسؤول" required>
            <input value={values.responsible_person} onChange={set('responsible_person')} placeholder="Full name" autoComplete="name" required />
          </Field>
          <div className="reg-grid">
            <Field en="Phone number" ar="رقم التليفون" required>
              <input type="tel" value={values.phone} onChange={set('phone')} placeholder="+971 5X XXX XXXX" autoComplete="tel" required />
            </Field>
            <Field en="Email" ar="البريد الإلكتروني" required>
              <input
                type="email"
                value={values.email}
                onChange={set('email')}
                placeholder="name@example.com"
                autoComplete="email"
                aria-invalid={filled(values.email) && !isEmail(values.email)}
                required
              />
            </Field>
          </div>
        </Step>

        <Step n={3} icon={<CalendarIcon size={22} />} en="Schedule" ar="الوقت المحدد للألعاب">
          <div className="reg-days-count">
            <div>
              <span className="reg-days-count-en">How many days?</span>
              <span dir="rtl" lang="ar" className="reg-days-count-ar">عدد أيام الحدث</span>
            </div>
            <div className="reg-stepper">
              <button type="button" onClick={() => setDayCount(days.length - 1)} disabled={days.length <= 1} aria-label="One day fewer">
                −
              </button>
              <output aria-live="polite" aria-label="Number of days">{days.length}</output>
              <button type="button" onClick={() => setDayCount(days.length + 1)} disabled={days.length >= MAX_DAYS} aria-label="One more day">
                +
              </button>
            </div>
          </div>
          <p className="reg-note">
            <ClockIcon size={18} />
            <span>
              Events must be at least 2 weeks from today.{' '}
              <span dir="rtl" lang="ar">· لا يمكن أن يكون موعد الحدث قبل مرور أسبوعين</span>
            </span>
          </p>
          {days.map((d, i) => {
            const error = dayError(d, minDate);
            return (
              <fieldset key={i} className="reg-day">
                <legend className="sr-only">Day {i + 1}</legend>
                <div className="reg-day-header">
                  <span className="reg-day-pill">Day {i + 1}</span>
                  <span dir="rtl" lang="ar" className="reg-label-ar">اليوم {i + 1}</span>
                </div>
                <div className="reg-grid">
                  <Field en="Date" ar="التاريخ" required>
                    <input
                      type="date"
                      value={d.date}
                      min={minDate || undefined}
                      max="9999-12-31"
                      onChange={setDay(i, 'date')}
                      aria-invalid={Boolean(d.date && minDate && d.date < minDate)}
                      required
                    />
                  </Field>
                  <Field en="Day title" ar={`عنوان اليوم ${i + 1}`} required>
                    <input value={d.title} onChange={setDay(i, 'title')} placeholder="e.g. Football tournament" required />
                  </Field>
                  <Field en="Starts" ar="من" required>
                    <input type="time" value={d.from} onChange={setDay(i, 'from')} required />
                  </Field>
                  <Field en="Ends" ar="إلى" required>
                    <input
                      type="time"
                      value={d.to}
                      onChange={setDay(i, 'to')}
                      aria-invalid={Boolean(d.from && d.to && endsTooEarly(d.from, d.to))}
                      required
                    />
                  </Field>
                </div>
                {error && <p className="reg-day-error" role="alert">{error}</p>}
              </fieldset>
            );
          })}
        </Step>

        <section className="reg-card">
          <Field en="Remarks" ar="ملاحظات">
            <textarea value={values.remarks} onChange={set('remarks')} placeholder="Anything else we should know?" rows={4} />
          </Field>
        </section>

        <section className="reg-contact" aria-labelledby="reg-contact-title">
          <h2 id="reg-contact-title">
            <PhoneIcon size={20} /> Questions? Get in touch
          </h2>
          <div className="reg-contact-grid">
            {FORM1_CONTACTS.map((c) => (
              <a key={c.name} href={`tel:${c.phone.replace(/\s/g, '')}`} className="reg-contact-card">
                <span className="reg-contact-name">{c.name}</span>
                <span className="reg-contact-phone">{c.phone}</span>
              </a>
            ))}
          </div>
        </section>

        <div className="reg-submit-bar">
          {saveError && <p className="error" role="alert" dir="auto">{saveError}</p>}
          <button type="submit" className="reg-submit" disabled={!ready || saving}>
            {saving ? 'Submitting…' : (
              <>Submit registration · <span dir="rtl" lang="ar">تسجيل</span></>
            )}
          </button>
          <p className="reg-submit-hint" role="status">
            {ready ? 'All set — ready to submit.' : `Still needed: ${missing.join(', ')}`}
          </p>
        </div>
      </form>
    </div>
  );
}
