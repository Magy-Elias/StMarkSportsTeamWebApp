'use client';

import EventForm from '@/components/EventForm';
import type { Field } from '@/components/EventForm';

const FIELDS = [
  { name: 'title', label: 'اسم الخدمة او الاجتماع', required: true },
  { name: 'responsible_person', label: 'الشخص المسؤول' },
  { name: 'phone', label: 'رقم التليفون', type: 'tel' as const },
  { name: 'day_name', label: 'اسم اليوم' },
  { name: 'goal', label: 'الهدف', type: 'textarea' as const },
  { name: 'event_date', label: 'تاريخ', type: 'date' as const, required: true },
  { name: 'participants_count', label: 'عدد المشاركين', type: 'number' as const, min: 0 },
  { name: 'location', label: 'المكان' },
  { name: 'games_time', label: 'الوقت المحدد للالعاب', type: 'number' as const, min: 0, suffix: 'ساعة' },
] satisfies Field[];

export default function Form1() {
  return (
    <EventForm title="Form 1" fields={FIELDS} dir="rtl" submitLabel="حفظ" defaults={{ status: 'pending' }} />
  );
}