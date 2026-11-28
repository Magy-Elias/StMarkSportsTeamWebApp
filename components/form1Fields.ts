import type { Field } from '@/components/EventForm';

// Each field has an Arabic title (label, shown on the right) and an English one
// (labelEn, shown on the left).
// Form 1 fields, in the order they appear: used to add a new event (/event-registration)
// and to edit one (/events/[id]/edit).
// All are required except remarks: the save button stays disabled until every
// required field is filled.
export const FORM1_FIELDS = [
  { name: 'title', label: 'اسم الخدمة او الاجتماع / رقم Grade', labelEn: 'Service or Meeting Name / Grade Number', required: true },
  { name: 'day_name', label: 'اسم اليوم', labelEn: 'Day Name', required: true },
  { name: 'location', label: 'المكان', labelEn: 'Location', required: true },
  { name: 'goal', label: 'الهدف', labelEn: 'Goal', type: 'textarea' as const, required: true },
  // Plain text box that only accepts digits (stored as a whole number).
  { name: 'participants_count', label: 'عدد المشاركين', labelEn: 'Number of Participants', type: 'text' as const, digitsOnly: true, required: true },
  { name: 'responsible_person', label: 'الشخص المسؤول', labelEn: 'Responsible Person', required: true },
  { name: 'phone', label: 'رقم التليفون', labelEn: 'Phone Number', type: 'tel' as const, required: true },
  { name: 'email', label: 'البريد الإلكتروني', labelEn: 'Email', type: 'email' as const, required: true },
  {
    // "Number of event days" (1–5); then one row per day: date + from / to.
    name: 'schedule',
    label: 'عدد أيام الحدث',
    labelEn: 'Number of Event Days',
    type: 'schedule' as const,
    required: true,
    maxDays: 5,
    sectionLabel: 'الوقت المحدد للالعاب',
    sectionLabelEn: 'Games Time',
    // 14-day rule: every day must be at least two weeks from today
    // (earlier dates are greyed out) and the note shows under the dropdown.
    minDaysAhead: 14,
    hint: 'لا يمكن أن يكون موعد الحدث قبل مرور أسبوعين من اليوم.',
    // There's no separate date field: the event's date (calendar, sorting,
    // duplicate check) is Day 1's date.
    dateField: 'event_date',
  },
  // Optional free-text notes.
  { name: 'remarks', label: 'ملاحظات', labelEn: 'Remarks', type: 'textarea' as const },
] satisfies Field[];

// People to contact with questions: shown at the bottom of Event Registration
// and on the "submitted" page.
export const FORM1_CONTACTS = [
  { name: 'Mina Sadek', phone: '+971 58 162 4410' },
  { name: 'Peter Naguib', phone: '+971 55 607 2801' },
];

export const FORM1_CONTACT = ['For more details:', 'Contact with ', ...FORM1_CONTACTS.map((c) => `${c.name}: ${c.phone}`)].join('\n');
