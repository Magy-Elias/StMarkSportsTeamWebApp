import { supabase } from '@/lib/supabase/client';

export type EmailResult = { ok: true; to: string } | { ok: false; error: string };

/**
 * Emails the event's contact about its new status (approved / declined) using
 * the ONE99 template. Runs in the Supabase Edge Function `notify-event-status`
 * (supabase/functions/notify-event-status). Never throws: approving/declining
 * should still count even if the email can't be sent.
 */
export async function sendStatusEmail(eventId: string): Promise<EmailResult> {
  try {
    const { data, error } = await supabase.functions.invoke<{ sent?: boolean; to?: string }>('notify-event-status', {
      body: { event_id: eventId },
    });
    if (error) {
      let message = error.message;
      const context = (error as { context?: unknown }).context;
      if (context instanceof Response) {
        const body = (await context.json().catch(() => null)) as { code?: string; error?: string; message?: string } | null;
        // Supabase's own reply when the function hasn't been deployed yet.
        if (context.status === 404 && body?.code === 'NOT_FOUND') {
          return { ok: false, error: 'the email function is not set up in Supabase yet (notify-event-status not found)' };
        }
        // Otherwise the function's own explanation (e.g. "This event has no email address").
        if (body?.error || body?.message) message = (body.error ?? body.message) as string;
      } else if (error.name === 'FunctionsFetchError') {
        message = 'could not reach the email function in Supabase (is it deployed?)';
      }
      return { ok: false, error: message };
    }
    return { ok: true, to: data?.to ?? '' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Tells the ONE99 team (one.99.stmark@gmail.com) about a new Event Registration
 * submission. Works without login, but the function only sends for a genuinely
 * new event, once. Never throws: the submission is saved either way.
 */
export async function notifyTeamOfSubmission(eventId: string): Promise<void> {
  try {
    await supabase.functions.invoke('notify-event-status', { body: { event_id: eventId, kind: 'submitted' } });
  } catch {
    // Ignore: the visitor's submission was saved; the team can still see it in Events Pending.
  }
}
