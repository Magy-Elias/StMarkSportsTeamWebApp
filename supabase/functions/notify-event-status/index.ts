// Supabase Edge Function: emails the event's contact (the البريد الإلكتروني from
// Form 1) when the event is approved or declined, using the ONE99 template.
//
// Called by the app right after Approve / Decline on Events Pending:
//   supabase.functions.invoke('notify-event-status', { body: { event_id } })
//
// Also emails the ONE99 team (TEAM_EMAIL, default one.99.stmark@gmail.com) when
// someone submits Event Registration: body { event_id, kind: "submitted" }.
//
// Email is sent over SMTP from a normal email account (e.g. the team's Gmail);
// see mailer.ts for the SMTP_* secrets. Other secrets:
//   SITE_URL        the website address (for the "submit a new request" link),
//                   e.g. https://st-mark-sports-team-web-app.vercel.app
//   EMAIL_REPLY_TO  optional: where replies go (default: the sending account)
// SUPABASE_URL and SUPABASE_ANON_KEY are provided by Supabase automatically.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildNewEventEmail, buildStatusEmail, LOGO_CID } from './template.ts';
import { LOGO_PNG_BASE64 } from './logo.ts';
import { sendEmail } from './mailer.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const EVENT_COLUMNS =
  'title, status, decline_reason, event_date, day_name, location, goal, participants_count, responsible_person, phone, email, remarks, schedule';

/** Who gets the "new request" email (secret TEAM_EMAIL can change it). */
const teamEmail = () => Deno.env.get('TEAM_EMAIL') || 'one.99.stmark@gmail.com';

/**
 * "New request" email to the ONE99 team after someone submits Event
 * Registration. No login needed (visitors submit the form), so it only works
 * for a genuinely new event: still pending, created in the last 15 minutes and
 * not announced yet. Each submission sends exactly one email.
 */
async function notifyTeam(eventId: string): Promise<Response> {
  // Service role: read the new event (visitors can't) and record the email.
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: event, error } = await admin
    .from('events')
    .select(`id, created_at, team_notified_at, ${EVENT_COLUMNS}`)
    .eq('id', eventId)
    .maybeSingle();
  if (error) return json(500, { error: error.message });
  if (!event) return json(404, { error: 'Event not found' });
  if (event.status !== 'pending') return json(400, { error: 'Only new (pending) events are announced' });
  if (event.team_notified_at) return json(200, { sent: false, reason: 'already notified' });
  if (Date.now() - new Date(event.created_at).getTime() > 15 * 60 * 1000) {
    return json(400, { error: 'Only events submitted in the last 15 minutes are announced' });
  }

  // Claim it first, so two calls at once can't both send.
  const { data: claimed, error: claimError } = await admin
    .from('events')
    .update({ team_notified_at: new Date().toISOString() })
    .eq('id', eventId)
    .is('team_notified_at', null)
    .select('id');
  if (claimError) return json(500, { error: claimError.message });
  if (!claimed?.length) return json(200, { sent: false, reason: 'already notified' });

  const email = buildNewEventEmail(event, Deno.env.get('SITE_URL') ?? '');
  try {
    await sendEmail({
      to: teamEmail(),
      subject: email.subject,
      html: email.html,
      text: email.text,
      // "Reply" goes to the person who submitted the request.
      replyTo: event.email || undefined,
      attachments: [{ filename: 'one99-logo.png', content: LOGO_PNG_BASE64, cid: LOGO_CID }],
    });
  } catch (e) {
    // Let a later attempt try again.
    await admin.from('events').update({ team_notified_at: null }).eq('id', eventId);
    return json(502, { error: `Could not send email: ${e instanceof Error ? e.message : String(e)}` });
  }
  return json(200, { sent: true, to: teamEmail() });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const body = (await req.json().catch(() => ({}))) as { event_id?: string; kind?: string };
  if (!body.event_id) return json(400, { error: 'event_id is required' });

  // New Event Registration submission → email the team (no login needed).
  if (body.kind === 'submitted') return notifyTeam(body.event_id);

  // Approved / declined → email the event's contact. Only logged-in team
  // members (not the public anon key) may send these.
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { error: 'Login required' });
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await supabase.auth.getUser(token);
  if (!userData?.user) return json(401, { error: 'Login required' });

  // Read the event as the logged-in user (the database's access rules apply).
  const { data: event, error } = await supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .eq('id', body.event_id)
    .maybeSingle();
  if (error) return json(500, { error: error.message });
  if (!event) return json(404, { error: 'Event not found' });
  if (event.status !== 'approved' && event.status !== 'declined') {
    return json(400, { error: `No email is sent for status "${event.status}"` });
  }
  if (!event.email) return json(422, { error: 'This event has no email address' });

  const email = buildStatusEmail(event, Deno.env.get('SITE_URL') ?? '');
  try {
    await sendEmail({
      to: event.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo: Deno.env.get('EMAIL_REPLY_TO') || undefined,
      // The ONE99 logo as an inline image, shown in the header via cid:one99-logo.
      attachments: [{ filename: 'one99-logo.png', content: LOGO_PNG_BASE64, cid: LOGO_CID }],
    });
  } catch (e) {
    return json(502, { error: `Could not send email: ${e instanceof Error ? e.message : String(e)}` });
  }

  return json(200, { sent: true, to: event.email });
});
