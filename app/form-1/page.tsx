'use client';

import EventForm from '@/components/EventForm';
import { FORM1_CONTACT, FORM1_FIELDS } from '@/components/form1Fields';

export default function Form1() {
  return (
    <EventForm
      title="Form 1"
      fields={FORM1_FIELDS}
      dir="rtl"
      submitLabel="Save"
      defaults={{ status: 'pending' }}
      hint={FORM1_CONTACT}
      logoLeft="/logo.svg"
      logoRight="/logo.svg"
      submittedPath="/form-1/submitted"
    />
  );
}
