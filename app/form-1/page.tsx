'use client';

import EventForm from '@/components/EventForm';
import { FORM1_FIELDS } from '@/components/form1Fields';

const FORM1_HINT = `For more details:
Contact with 
Mina Sadek: +971 58 162 4410
Peter Naguib: +971 55 607 2801`;

export default function Form1() {
  return (
    <EventForm title="Form 1" fields={FORM1_FIELDS} dir="rtl" submitLabel="Save" defaults={{ status: 'pending' }} hint={FORM1_HINT} />
  );
}
