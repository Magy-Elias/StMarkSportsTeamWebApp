import EventForm from './EventForm.jsx'

// Each `name` must match a column in the events table.
const FIELDS = [
  { name: 'title', label: 'اسم الخدمة او الاجتماع', required: true },
  { name: 'responsible_person', label: 'الشخص المسؤول' },
  { name: 'phone', label: 'رقم التليفون', type: 'tel' },
  { name: 'day_name', label: 'اسم اليوم' },
  { name: 'goal', label: 'الهدف', type: 'textarea' },
  { name: 'event_date', label: 'تاريخ', type: 'date', required: true },
  { name: 'participants_count', label: 'عدد المشاركين', type: 'number', min: 0 },
  { name: 'location', label: 'المكان' },
  { name: 'games_time', label: 'الوقت المحدد للالعاب', type: 'number', min: 0, suffix: 'ساعة' },
]

export default function Form1() {
  return <EventForm title="Form 1" fields={FIELDS} dir="rtl" submitLabel="حفظ" />
}
