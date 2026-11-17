// ONE99 email template for event status updates (approved / declined).
// Plain TypeScript with no imports, so it runs in the Edge Function (Deno) and
// can be previewed with Node.

export type StatusEmailEvent = {
  title: string;
  status: string;
  event_date: string;
  location?: string | null;
  responsible_person?: string | null;
  decline_reason?: string | null;
  schedule?: unknown;
};

export type StatusEmail = { subject: string; html: string; text: string };

/**
 * The logo is sent inside the email as an inline image (see index.ts), and the
 * HTML points to it with this Content-ID: <img src="cid:one99-logo">.
 */
export const LOGO_CID = 'one99-logo';

// Contact people shown at the bottom of every email (same as Form 1).
const CONTACTS = [
  { name: 'Mina Sadek', phone: '+971 58 162 4410' },
  { name: 'Peter Naguib', phone: '+971 55 607 2801' },
];

const NAVY = '#0B225A';
const BLUE = '#1569AD';
const MUTED = '#5A6A8C';
const BORDER = '#DCE6F2';

const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const arDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('ar-EG', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
const enDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
/** "16:30" -> "4:30 PM" */
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

/** Builds the subject, HTML and plain-text versions of the email. */
export function buildStatusEmail(event: StatusEmailEvent, siteUrl: string): StatusEmail {
  const site = siteUrl.replace(/\/+$/, '');
  const approved = event.status === 'approved';
  const title = esc(event.title);
  const greetingName = event.responsible_person ? ` ${esc(event.responsible_person)}` : '';
  const slots = slotsOf(event.schedule);

  const subject = approved
    ? `ONE99 Sports Team | تمت الموافقة على حدثك: ${event.title}`
    : `ONE99 Sports Team | تحديث بخصوص حدثك: ${event.title}`;

  const detailRow = (label: string, value: string) => `
    <tr>
      <td style="padding:8px 0;color:${MUTED};font-size:14px;width:120px;vertical-align:top;">${label}</td>
      <td style="padding:8px 0;color:${NAVY};font-size:15px;font-weight:600;">${value}</td>
    </tr>`;

  const details = [
    detailRow('الحدث', title),
    detailRow('التاريخ', esc(arDate(event.event_date))),
    ...(event.location ? [detailRow('المكان', esc(event.location))] : []),
    ...slots.map((s, i) =>
      detailRow(
        slots.length > 1 ? `الموعد ${i + 1}` : 'الموعد',
        `${esc(arDate(s.date))}<br><span dir="ltr" style="color:${MUTED};font-weight:500;">${time12(s.from)} – ${time12(s.to)}</span>`,
      ),
    ),
  ].join('');

  const statusBadge = approved
    ? `<span style="display:inline-block;padding:6px 14px;border-radius:999px;background:#E6F6EF;color:#0F8A5F;font-weight:700;font-size:14px;">✓ تمت الموافقة</span>`
    : `<span style="display:inline-block;padding:6px 14px;border-radius:999px;background:#FDECEA;color:#B42318;font-weight:700;font-size:14px;">تعذّرت الموافقة</span>`;

  const intro = approved
    ? `يسعدنا إبلاغك بأنه <strong>تمت الموافقة</strong> على حدثك، وسنبدأ في التحضير له. سيتواصل معك أحد أعضاء الفريق قريبًا لترتيب التفاصيل.`
    : `نشكرك على طلبك. نأسف لإبلاغك بأنه <strong>تعذّرت الموافقة</strong> على حدثك هذه المرة.`;

  const reasonBox = !approved && event.decline_reason
    ? `
      <div style="margin:20px 0 0;padding:14px 16px;background:#FDECEA;border-radius:10px;border-right:4px solid #B42318;">
        <div style="color:#B42318;font-weight:700;font-size:14px;margin-bottom:6px;">سبب الرفض</div>
        <div style="color:#7A1A12;font-size:15px;line-height:1.7;white-space:pre-wrap;">${esc(event.decline_reason)}</div>
      </div>`
    : '';

  const resubmit = !approved && site
    ? `
      <p style="margin:20px 0 0;font-size:15px;line-height:1.7;color:${NAVY};">يمكنك تعديل التفاصيل وإرسال طلب جديد من خلال النموذج:</p>
      <p style="margin:12px 0 0;">
        <a href="${site}/form-1" style="display:inline-block;padding:11px 22px;border-radius:10px;background:${BLUE};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;">إرسال طلب جديد</a>
      </p>`
    : '';

  const contacts = CONTACTS.map(
    // English name + number: written left-to-right, kept on the right like the Arabic text.
    (c) => `<div dir="ltr" style="margin:2px 0;text-align:right;"><span style="color:${NAVY};">${c.name}:</span> <a href="tel:${c.phone.replace(/\s/g, '')}" style="color:${BLUE};text-decoration:none;">${c.phone}</a></div>`,
  ).join('');

  const englishLine = approved
    ? `Your event “${title}” on ${esc(enDate(event.event_date))} has been <strong>approved</strong>. We’ll start preparing for it and a team member will contact you soon.`
    : `We’re sorry, your event “${title}” on ${esc(enDate(event.event_date))} could not be approved this time.${event.decline_reason ? ` Reason: ${esc(event.decline_reason)}` : ''}`;

  // ONE99 logo, embedded in the email (not loaded from the website).
  const logo = `<img src="cid:${LOGO_CID}" width="76" height="76" alt="ONE99 Sports Team" style="display:block;margin:0 auto 12px;border:0;border-radius:50%;background:#ffffff;padding:4px;">`;

  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#F3F7FC;font-family:Tahoma,'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F3F7FC;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${BORDER};">
        <tr>
          <td style="background:${NAVY};padding:26px 24px;text-align:center;">
            ${logo}
            <div style="color:#ffffff;font-size:20px;font-weight:700;font-family:Arial,sans-serif;" dir="ltr">ONE99 Sports Team</div>
          </td>
        </tr>
        <tr>
          <td dir="rtl" style="padding:28px 28px 8px;text-align:right;">
            ${statusBadge}
            <p style="margin:18px 0 0;font-size:17px;color:${NAVY};font-weight:700;">مرحبًا${greetingName}،</p>
            <p style="margin:10px 0 0;font-size:15px;line-height:1.8;color:${NAVY};">${intro}</p>
            ${reasonBox}
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0 0;border-top:1px solid ${BORDER};border-bottom:1px solid ${BORDER};">
              ${details}
            </table>
            ${resubmit}
            <div style="margin:24px 0 0;font-size:14px;line-height:1.7;color:${MUTED};">
              <div style="margin-bottom:4px;">للاستفسار، تواصل مع:</div>
              ${contacts}
            </div>
          </td>
        </tr>
        <tr>
          <td dir="ltr" style="padding:18px 28px 26px;text-align:left;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:${MUTED};">
            <div style="border-top:1px dashed ${BORDER};padding-top:14px;">${englishLine}</div>
          </td>
        </tr>
      </table>
      <div style="max-width:560px;margin:14px auto 0;font-size:12px;color:${MUTED};font-family:Arial,sans-serif;text-align:center;" dir="ltr">
        ONE99 Sports Team · St. Mark
      </div>
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
