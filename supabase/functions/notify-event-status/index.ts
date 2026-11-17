// Supabase Edge Function: emails the event's contact (the البريد الإلكتروني from
// Form 1) when the event is approved or declined, using the ONE99 template.
//
// Called by the app right after Approve / Decline on Events Pending:
//   supabase.functions.invoke('notify-event-status', { body: { event_id } })
//
// Email is sent over SMTP from a normal email account (e.g. the team's Gmail);
// see mailer.ts for the SMTP_* secrets. Other secrets:
//   SITE_URL        the website address (for the "submit a new request" link),
//                   e.g. https://st-mark-sports-team-web-app.vercel.app
//   EMAIL_REPLY_TO  optional: where replies go (default: the sending account)
// SUPABASE_URL and SUPABASE_ANON_KEY are provided by Supabase automatically.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildStatusEmail, LOGO_CID } from './template.ts';
import { LOGO_PNG_BASE64 } from './logo.ts';
import { sendEmail } from './mailer.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  // Only logged-in team members (not the public anon key) may send emails.
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await supabase.auth.getUser(token);
  if (!userData?.user) return json(401, { error: 'Login required' });

  const body = (await req.json().catch(() => ({}))) as { event_id?: string };
  if (!body.event_id) return json(400, { error: 'event_id is required' });

  // Read the event as the logged-in user (the database's access rules apply).
  const { data: event, error } = await supabase
    .from('events')
    .select('title, email, status, decline_reason, event_date, location, responsible_person, schedule')
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
