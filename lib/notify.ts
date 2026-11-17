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
      // The function's own explanation (e.g. "This event has no email address").
      let message = error.message;
      const context = (error as { context?: unknown }).context;
      if (context instanceof Response) {
        const body = (await context.json().catch(() => null)) as { error?: string } | null;
        if (body?.error) message = body.error;
      }
      return { ok: false, error: message };
    }
    return { ok: true, to: data?.to ?? '' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
