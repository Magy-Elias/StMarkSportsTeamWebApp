'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Pop-up box for declining an event: asks for a message (required), which is
 * saved with the event. Uses the browser's <dialog>, so focus stays inside it
 * and Escape closes it.
 */
export default function DeclineDialog({
  eventTitle,
  onCancel,
  onConfirm,
}: {
  eventTitle: string;
  onCancel: () => void;
  /** Resolves to an error message, or null when saved. */
  onConfirm: (message: string) => Promise<string | null>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSaving(true);
    setError(null);
    const err = await onConfirm(message.trim());
    setSaving(false);
    if (err) setError(err);
  };

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="decline-title"
      onCancel={(e) => {
        // Escape key: close via the parent so its state stays in sync.
        e.preventDefault();
        if (!saving) onCancel();
      }}
      onClick={(e) => {
        // Click on the dark backdrop (outside the box) closes it.
        if (e.target === ref.current && !saving) onCancel();
      }}
    >
      <form onSubmit={submit} className="modal-body">
        <h2 id="decline-title">Decline event</h2>
        <p className="muted modal-subtitle" dir="auto">{eventTitle}</p>

        <label>
          <span>Message *</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            dir="auto"
            placeholder="Why is this event declined? This message is saved with the event."
            required
            autoFocus
          />
        </label>

        {error && <p className="error" role="alert">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-danger" disabled={saving || !message.trim()}>
            {saving ? 'Declining…' : 'Decline event'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
