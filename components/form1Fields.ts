import type { Field } from '@/components/EventForm';

// Form 1 fields: used to add a new event (/form-1) and to edit one (/events/[id]/edit).
export const FORM1_FIELDS = [
  { name: 'title', label: 'اسم الخدمة او الاجتماع', required: true },
  { name: 'responsible_person', label: 'الشخص المسؤول' },
  { name: 'phone', label: 'رقم التليفون', type: 'tel' as const },
  { name: 'day_name', label: 'اسم اليوم' },
  { name: 'goal', label: 'الهدف', type: 'textarea' as const },
  { name: 'event_date', label: 'تاريخ', type: 'date' as const, required: true },
  { name: 'participants_count', label: 'عدد المشاركين', type: 'number' as const, min: 0 },
  { name: 'location', label: 'المكان' },
  { name: 'schedule', label: 'الوقت المحدد للالعاب', type: 'schedule' as const },
] satisfies Field[];
