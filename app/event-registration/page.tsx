'use client';

import EventForm from '@/components/EventForm';
import { FORM1_CONTACT, FORM1_FIELDS } from '@/components/form1Fields';

export default function EventRegistration() {
  return (
    <EventForm
      title="One 99 Event Registration Form"
      fields={FORM1_FIELDS}
      dir="rtl"
      submitLabel="Save"
      defaults={{ status: 'pending' }}
      hint={FORM1_CONTACT}
      logoLeft="/logo.svg"
      logoRight="/st-mark-logo.png"
      submittedPath="/event-registration/submitted"
      notifyTeam
    />
  );
}