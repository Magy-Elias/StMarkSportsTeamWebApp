'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { TrashIcon } from '@/components/icons';

/**
 * "Delete" button for an event, with a confirmation box. Deleting removes the
 * event's row, which holds all of its data (details, dates, games plan, decline
 * message). Needs the "Members can delete events" rule in the database
 * (supabase/migrations/20261119000000_allow_members_to_delete_events.sql).
 */
export default function DeleteEventButton({ eventId, eventTitle }: { eventId: string; eventTitle: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (open) d?.showModal();
    else d?.close();
  }, [open]);

  const close = () => {
    if (deleting) return;
    setOpen(false);
    setError(null);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setError(null);
    // .select() returns the deleted rows, so we can tell if nothing was deleted
    // (e.g. the database's delete rule hasn't been added yet).
    const { data, error } = await supabase.from('events').delete().eq('id', eventId).select('id');
    if (error) {
      setDeleting(false);
      return setError(`Could not delete: ${error.message}`);
    }
    if (!data?.length) {
      setDeleting(false);
      return setError('The event was not deleted. The database may not allow deleting yet (run the delete migration in Supabase).');
    }
    router.replace('/calendar');
    router.refresh();
  };

  return (
    <>
      <button type="button" className="btn btn-danger-ghost" onClick={() => setOpen(true)}>
        <TrashIcon size={17} /> Delete
      </button>

      <dialog
        ref={dialog}
        className="modal"
        aria-labelledby="delete-title"
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        onClick={(e) => {
          if (e.target === dialog.current) close();
        }}
      >
        <div className="modal-body" dir="ltr">
          <h2 id="delete-title">Delete this event?</h2>
          <p className="modal-subtitle" dir="auto"><strong>{eventTitle}</strong></p>
          <p className="muted">
            This permanently deletes the event and all its data: details, dates and times, games plan and any
            decline message. This can&apos;t be undone.
          </p>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={close} disabled={deleting}>
              Cancel
            </button>
            <button type="button" className="btn btn-danger" onClick={confirmDelete} disabled={deleting}>
              <TrashIcon size={17} /> {deleting ? 'Deleting…' : 'Delete event'}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
