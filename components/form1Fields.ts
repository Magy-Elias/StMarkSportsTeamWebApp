import type { Field } from '@/components/EventForm';

// Form 1 fields, in the order they appear: used to add a new event (/form-1)
// and to edit one (/events/[id]/edit).
// All are required except remarks: the save button stays disabled until every
// required field is filled.
export const FORM1_FIELDS = [
  {
    name: 'event_date',
    label: 'تاريخ',
    type: 'date' as const,
    required: true,
    // Events must be booked at least two weeks ahead.
    minDaysAhead: 14,
    hint: 'لا يمكن أن يكون موعد الحدث قبل مرور أسبوعين من اليوم.',
  },
  { name: 'title', label: 'اسم الخدمة او الاجتماع', required: true },
  { name: 'day_name', label: 'اسم اليوم', required: true },
  { name: 'location', label: 'المكان', required: true },
  { name: 'goal', label: 'الهدف', type: 'textarea' as const, required: true },
  { name: 'participants_count', label: 'عدد المشاركين', type: 'number' as const, min: 0, required: true },
  { name: 'responsible_person', label: 'الشخص المسؤول', required: true },
  { name: 'phone', label: 'رقم التليفون', type: 'tel' as const, required: true },
  { name: 'email', label: 'البريد الإلكتروني', type: 'email' as const, required: true },
  { name: 'schedule', label: 'الوقت المحدد للالعاب', type: 'schedule' as const, required: true, minDateFrom: 'event_date' },
  // Optional free-text notes.
  { name: 'remarks', label: 'ملاحظات', type: 'textarea' as const },
] satisfies Field[];

// Contact details shown at the bottom of Form 1 and on the "submitted" page.
export const FORM1_CONTACT = `For more details:
Contact with 
Mina Sadek: +971 58 162 4410
Peter Naguib: +971 55 607 2801`;
