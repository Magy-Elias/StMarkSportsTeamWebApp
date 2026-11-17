// notify-event-status: single-file version to paste into the Supabase dashboard
// (Edge Functions → Deploy a new function → Via Editor, name: notify-event-status).
// Same behaviour as supabase/functions/notify-event-status/, but the ONE99 logo is
// fetched from SITE_URL/logo-192.png when sending (still embedded in the email).
//
// Emails the event's contact (Form 1 البريد الإلكتروني) when the event is approved
// or declined. Sent over SMTP from the team's email account (e.g. Gmail).
//
// Secrets (dashboard: Edge Functions → Secrets):
//   SMTP_USER   e.g. one.99.stmark@gmail.com
//   SMTP_PASS   Gmail App Password (Google Account → Security → App passwords)
//   SITE_URL    the website, e.g. https://st-mark-sports-team-web-app.vercel.app
//   optional: SMTP_HOST (default smtp.gmail.com), SMTP_PORT (default 465 — Supabase
//   blocks 25 and 587), EMAIL_FROM, EMAIL_REPLY_TO

import { createClient } from 'npm:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6.10.1';

// ---------------------------------------------------------------- template ---

type EmailEvent = {
  title: string;
  status: string;
  event_date: string;
  location?: string | null;
  responsible_person?: string | null;
  decline_reason?: string | null;
  schedule?: unknown;
};

const CONTACTS = [
  { name: 'Mina Sadek', phone: '+971 58 162 4410' },
  { name: 'Peter Naguib', phone: '+971 55 607 2801' },
];
const LOGO_CID = 'one99-logo';
const NAVY = '#0B225A';
const BLUE = '#1569AD';
const MUTED = '#5A6A8C';
const BORDER = '#DCE6F2';

const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const arDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const enDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const time12 = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};
type Slot = { date: string; from: string; to: string };
const slotsOf = (schedule: unknown): Slot[] =>
  Array.isArray(schedule)
    ? schedule.filter((s): s is Slot => !!s && typeof s === 'object' && 'date' in s && 'from' in s && 'to' in s)
    : [];

function buildStatusEmail(event: EmailEvent, siteUrl: string, withLogo: boolean) {
  const site = siteUrl.replace(/\/+$/, '');
  const approved = event.status === 'approved';
  const title = esc(event.title);
  const greetingName = event.responsible_person ? ` ${esc(event.responsible_person)}` : '';
  const slots = slotsOf(event.schedule);

  const subject = approved
    ? `ONE99 Sports Team | تمت الموافقة على حدثك: ${event.title}`
    : `ONE99 Sports Team | تحديث بخصوص حدثك: ${event.title}`;

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:8px 0;color:${MUTED};font-size:14px;width:120px;vertical-align:top;">${label}</td>
      <td style="padding:8px 0;color:${NAVY};font-size:15px;font-weight:600;">${value}</td>
    </tr>`;
  const details = [
    row('الحدث', title),
    row('التاريخ', esc(arDate(event.event_date))),
    ...(event.location ? [row('المكان', esc(event.location))] : []),
    ...slots.map((s, i) =>
      row(
        slots.length > 1 ? `الموعد ${i + 1}` : 'الموعد',
        `${esc(arDate(s.date))}<br><span dir="ltr" style="color:${MUTED};font-weight:500;">${time12(s.from)} – ${time12(s.to)}</span>`,
      ),
    ),
  ].join('');

  const badge = approved
    ? `<span style="display:inline-block;padding:6px 14px;border-radius:999px;background:#E6F6EF;color:#0F8A5F;font-weight:700;font-size:14px;">✓ تمت الموافقة</span>`
    : `<span style="display:inline-block;padding:6px 14px;border-radius:999px;background:#FDECEA;color:#B42318;font-weight:700;font-size:14px;">تعذّرت الموافقة</span>`;
  const intro = approved
    ? `يسعدنا إبلاغك بأنه <strong>تمت الموافقة</strong> على حدثك، وسنبدأ في التحضير له. سيتواصل معك أحد أعضاء الفريق قريبًا لترتيب التفاصيل.`
    : `نشكرك على طلبك. نأسف لإبلاغك بأنه <strong>تعذّرت الموافقة</strong> على حدثك هذه المرة.`;
  const reasonBox = !approved && event.decline_reason
    ? `<div style="margin:20px 0 0;padding:14px 16px;background:#FDECEA;border-radius:10px;border-right:4px solid #B42318;">
         <div style="color:#B42318;font-weight:700;font-size:14px;margin-bottom:6px;">سبب الرفض</div>
         <div style="color:#7A1A12;font-size:15px;line-height:1.7;white-space:pre-wrap;">${esc(event.decline_reason)}</div>
       </div>`
    : '';
  const resubmit = !approved && site
    ? `<p style="margin:20px 0 0;font-size:15px;line-height:1.7;color:${NAVY};">يمكنك تعديل التفاصيل وإرسال طلب جديد من خلال النموذج:</p>
       <p style="margin:12px 0 0;"><a href="${site}/form-1" style="display:inline-block;padding:11px 22px;border-radius:10px;background:${BLUE};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;">إرسال طلب جديد</a></p>`
    : '';
  const contacts = CONTACTS.map(
    (c) => `<div dir="ltr" style="margin:2px 0;text-align:right;"><span style="color:${NAVY};">${c.name}:</span> <a href="tel:${c.phone.replace(/\s/g, '')}" style="color:${BLUE};text-decoration:none;">${c.phone}</a></div>`,
  ).join('');
  const englishLine = approved
    ? `Your event “${title}” on ${esc(enDate(event.event_date))} has been <strong>approved</strong>. We’ll start preparing for it and a team member will contact you soon.`
    : `We’re sorry, your event “${title}” on ${esc(enDate(event.event_date))} could not be approved this time.${event.decline_reason ? ` Reason: ${esc(event.decline_reason)}` : ''}`;
  const logo = withLogo
    ? `<img src="cid:${LOGO_CID}" width="76" height="76" alt="ONE99 Sports Team" style="display:block;margin:0 auto 12px;border:0;border-radius:50%;background:#ffffff;padding:4px;">`
    : '';

  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#F3F7FC;font-family:Tahoma,'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F3F7FC;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${BORDER};">
        <tr><td style="background:${NAVY};padding:26px 24px;text-align:center;">
          ${logo}
          <div style="color:#ffffff;font-size:20px;font-weight:700;font-family:Arial,sans-serif;" dir="ltr">ONE99 Sports Team</div>
        </td></tr>
        <tr><td dir="rtl" style="padding:28px 28px 8px;text-align:right;">
          ${badge}
          <p style="margin:18px 0 0;font-size:17px;color:${NAVY};font-weight:700;">مرحبًا${greetingName}،</p>
          <p style="margin:10px 0 0;font-size:15px;line-height:1.8;color:${NAVY};">${intro}</p>
          ${reasonBox}
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0 0;border-top:1px solid ${BORDER};border-bottom:1px solid ${BORDER};">${details}</table>
          ${resubmit}
          <div style="margin:24px 0 0;font-size:14px;line-height:1.7;color:${MUTED};">
            <div style="margin-bottom:4px;">للاستفسار، تواصل مع:</div>
            ${contacts}
          </div>
        </td></tr>
        <tr><td dir="ltr" style="padding:18px 28px 26px;text-align:left;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:${MUTED};">
          <div style="border-top:1px dashed ${BORDER};padding-top:14px;">${englishLine}</div>
        </td></tr>
      </table>
      <div style="max-width:560px;margin:14px auto 0;font-size:12px;color:${MUTED};font-family:Arial,sans-serif;text-align:center;" dir="ltr">ONE99 Sports Team · St. Mark</div>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    'ONE99 Sports Team',
    '',
    `مرحبًا${event.responsible_person ? ` ${event.responsible_person}` : ''}،`,
    approved
      ? 'يسعدنا إبلاغك بأنه تمت الموافقة على حدثك، وسنبدأ في التحضير له.'
      : 'نأسف لإبلاغك بأنه تعذّرت الموافقة على حدثك هذه المرة.',
    ...(!approved && event.decline_reason ? ['', `سبب الرفض: ${event.decline_reason}`] : []),
    '',
    `الحدث: ${event.title}`,
    `التاريخ: ${arDate(event.event_date)}`,
    ...(event.location ? [`المكان: ${event.location}`] : []),
    ...slots.map((s) => `الموعد: ${arDate(s.date)} ${time12(s.from)} – ${time12(s.to)}`),
    ...(!approved && site ? ['', `إرسال طلب جديد: ${site}/form-1`] : []),
    '',
    'للاستفسار:',
    ...CONTACTS.map((c) => `${c.name}: ${c.phone}`),
  ].join('\n');

  return { subject, html, text };
}

// ------------------------------------------------------------------ server ---

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

/** The logo as base64 from the website, or null if it can't be loaded (email is sent without it). */
async function loadLogo(site: string): Promise<string | null> {
  if (!site) return null;
  try {
    const res = await fetch(`${site.replace(/\/+$/, '')}/logo-192.png`);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(binary);
  } catch {
    return null;
  }
}

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

  const user = Deno.env.get('SMTP_USER');
  const pass = Deno.env.get('SMTP_PASS');
  if (!user || !pass) return json(500, { error: 'Email is not set up yet (SMTP_USER / SMTP_PASS missing)' });

  const site = Deno.env.get('SITE_URL') ?? '';
  const logo = await loadLogo(site);
  const email = buildStatusEmail(event, site, logo !== null);
  const port = Number(Deno.env.get('SMTP_PORT') || '465');
  const replyTo = Deno.env.get('EMAIL_REPLY_TO');

  try {
    const transporter = nodemailer.createTransport({
      host: Deno.env.get('SMTP_HOST') || 'smtp.gmail.com',
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    await transporter.sendMail({
      from: Deno.env.get('EMAIL_FROM') || `ONE99 Sports Team <${user}>`,
      to: event.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
      ...(replyTo ? { replyTo } : {}),
      attachments: logo ? [{ filename: 'one99-logo.png', content: logo, encoding: 'base64', cid: LOGO_CID }] : [],
    });
  } catch (e) {
    return json(502, { error: `Could not send email: ${e instanceof Error ? e.message : String(e)}` });
  }

  return json(200, { sent: true, to: event.email });
});
