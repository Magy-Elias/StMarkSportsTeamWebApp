import type { Field } from '@/components/EventForm';

// Form 1 fields: used to add a new event (/form-1) and to edit one (/events/[id]/edit).
// All are required: the save button stays disabled until every field is filled.
export const FORM1_FIELDS = [
  { name: 'title', label: 'اسم الخدمة او الاجتماع', required: true },
  { name: 'responsible_person', label: 'الشخص المسؤول', required: true },
  { name: 'phone', label: 'رقم التليفون', type: 'tel' as const, required: true },
  { name: 'day_name', label: 'اسم اليوم', required: true },
  { name: 'goal', label: 'الهدف', type: 'textarea' as const, required: true },
  { name: 'event_date', label: 'تاريخ', type: 'date' as const, required: true },
  { name: 'participants_count', label: 'عدد المشاركين', type: 'number' as const, min: 0, required: true },
  { name: 'location', label: 'المكان', required: true },
  { name: 'schedule', label: 'الوقت المحدد للالعاب', type: 'schedule' as const, required: true },
] satisfies Field[];
