import { notFound } from 'next/navigation';
import EventForm from '@/components/EventForm';
import { FORM1_FIELDS } from '@/components/form1Fields';
import { createClient } from '@/lib/supabase/server';

// Edit an event's Form 1 details. Requires login (see proxy.ts).
export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('events')
    .select(FORM1_FIELDS.map((f) => f.name).join(', '))
    .eq('id', id)
    .maybeSingle();

  if (error) return <p className="error">Could not load event: {error.message}</p>;
  if (!data) notFound();

  const row = data as unknown as Record<string, unknown>;
  const initialValues = Object.fromEntries(
    FORM1_FIELDS.map((f) => {
      const v = row[f.name];
      if (v == null) return [f.name, ''];
      return [f.name, typeof v === 'object' ? JSON.stringify(v) : String(v)];
    }),
  );

  return (
    <EventForm
      title="تعديل الحدث"
      fields={FORM1_FIELDS}
      dir="rtl"
      submitLabel="Save changes"
      eventId={id}
      initialValues={initialValues}
    />
  );
}
