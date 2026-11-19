// ONE99 email template for event status updates (approved / declined).
// Plain TypeScript with no imports, so it runs in the Edge Function (Deno) and
// can be previewed with Node. The single-file dashboard copy
// (supabase/functions/_dashboard/notify-event-status.ts) is generated from this
// file: run `node scripts/build-dashboard-function.mjs` after editing.

export type StatusEmailEvent = {
  title: string;
  status: string;
  event_date: string;
  day_name?: string | null;
  location?: string | null;
  goal?: string | null;
  participants_count?: number | null;
  responsible_person?: string | null;
  phone?: string | null;
  email?: string | null;
  remarks?: string | null;
  decline_reason?: string | null;
  schedule?: unknown;
};

export type StatusEmail = { subject: string; html: string; text: string };

/**
 * The logo is sent inside the email as an inline image, and the HTML points to
 * it with this Content-ID: <img src="cid:one99-logo">.
 */
export const LOGO_CID = 'one99-logo';

// Contact people shown at the bottom of every email (same as Event Registration).
const CONTACTS = [
  { name: 'Mina Sadek', phone: '+971 58 162 4410' },
  { name: 'Peter Naguib', phone: '+971 55 607 2801' },
];

const NAVY = '#0B225A';
const BLUE = '#1569AD';
const MUTED = '#5A6A8C';
const BORDER = '#DCE6F2';
const STRIPE = '#F6F9FD';

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

const filled = (v: unknown) => v !== null && v !== undefined && String(v).trim() !== '';

/**
 * All the event's details as [label, html value, plain-text value] rows, in the
 * same order as the Event Registration form. Empty fields are left out.
 */
function detailRows(event: StatusEmailEvent): [string, string, string][] {
  const slots = slotsOf(event.schedule);
  const rows: [string, string, string][] = [];
  const add = (label: string, value: unknown) => {
    if (filled(value)) rows.push([label, esc(value), String(value)]);
  };
  add('اسم الخدمة او الاجتماع', event.title);
  add('اسم اليوم', event.day_name);
  add('المكان', event.location);
  add('الهدف', event.goal);
  add('عدد المشاركين', event.participants_count);
  add('الشخص المسؤول', event.responsible_person);
  if (filled(event.phone)) {
    rows.push(['رقم التليفون', `<a href="tel:${esc(String(event.phone).replace(/\s/g, ''))}" dir="ltr" style="color:${BLUE};text-decoration:none;">${esc(event.phone)}</a>`, String(event.phone)]);
  }
  if (filled(event.email)) {
    rows.push(['البريد الإلكتروني', `<span dir="ltr">${esc(event.email)}</span>`, String(event.email)]);
  }
  if (slots.length) {
    slots.forEach((s, i) => {
      const label = slots.length > 1 ? `اليوم ${i + 1}` : 'التاريخ والوقت';
      const times = `${time12(s.from)} – ${time12(s.to)}`;
      rows.push([
        label,
        `${esc(arDate(s.date))}<br><span dir="ltr" style="color:${MUTED};font-weight:500;">${times}</span>`,
        `${arDate(s.date)} ${times}`,
      ]);
    });
  } else {
    add('التاريخ', arDate(event.event_date));
  }
  add('ملاحظات', event.remarks);
  return rows;
}

/**
 * Builds the subject, HTML and plain-text versions of the email.
 * `withLogo` = the ONE99 logo is attached inline (Content-ID LOGO_CID).
 */
export function buildStatusEmail(event: StatusEmailEvent, siteUrl: string, withLogo = true): StatusEmail {
  const site = siteUrl.replace(/\/+$/, '');
  const approved = event.status === 'approved';
  const title = esc(event.title);
  const greetingName = event.responsible_person ? ` ${esc(event.responsible_person)}` : '';
  const rows = detailRows(event);

  const subject = approved
    ? `ONE99 Sports Team | تمت الموافقة على حدثك: ${event.title}`
    : `ONE99 Sports Team | تحديث بخصوص حدثك: ${event.title}`;

  // Event details table: label column + value column, striped rows.
  const table = `
    <div style="margin:24px 0 8px;color:${NAVY};font-weight:700;font-size:15px;">تفاصيل الحدث</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">
      ${rows
        .map(
          ([label, value], i) => `
      <tr style="background:${i % 2 ? STRIPE : '#ffffff'};">
        <td style="padding:10px 14px;color:${MUTED};font-size:14px;width:38%;vertical-align:top;border-bottom:${i < rows.length - 1 ? `1px solid ${BORDER}` : 'none'};border-left:1px solid ${BORDER};">${label}</td>
        <td style="padding:10px 14px;color:${NAVY};font-size:15px;font-weight:600;vertical-align:top;white-space:pre-wrap;border-bottom:${i < rows.length - 1 ? `1px solid ${BORDER}` : 'none'};">${value}</td>
      </tr>`,
        )
        .join('')}
    </table>`;

  const statusBadge = approved
    ? `<span style="display:inline-block;padding:6px 14px;border-radius:999px;background:#E6F6EF;color:#0F8A5F;font-weight:700;font-size:14px;">✓ تمت الموافقة</span>`
    : `<span style="display:inline-block;padding:6px 14px;border-radius:999px;background:#FDECEA;color:#B42318;font-weight:700;font-size:14px;">تعذّرت الموافقة</span>`;

  // Approved: fixed message. Declined: fixed message + the decline message saved
  // with the event (Events Pending → Decline).
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
        <a href="${site}/event-registration" style="display:inline-block;padding:11px 22px;border-radius:10px;background:${BLUE};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;">إرسال طلب جديد</a>
      </p>`
    : '';

  // English name + number: written left-to-right, kept on the right like the Arabic text.
  const contacts = CONTACTS.map(
    (c) => `<div dir="ltr" style="margin:2px 0;text-align:right;"><span style="color:${NAVY};">${c.name}:</span> <a href="tel:${c.phone.replace(/\s/g, '')}" style="color:${BLUE};text-decoration:none;">${c.phone}</a></div>`,
  ).join('');

  const englishLine = approved
    ? `Your event “${title}” on ${esc(enDate(event.event_date))} has been <strong>approved</strong>. We’ll start preparing for it and a team member will contact you soon.`
    : `We’re sorry, your event “${title}” on ${esc(enDate(event.event_date))} could not be approved this time.${event.decline_reason ? ` Reason: ${esc(event.decline_reason)}` : ''}`;

  // ONE99 logo, embedded in the email (not loaded from the website).
  const logo = withLogo
    ? `<img src="cid:${LOGO_CID}" width="76" height="76" alt="ONE99 Sports Team" style="display:block;margin:0 auto 12px;border:0;border-radius:50%;background:#ffffff;padding:4px;">`
    : '';

  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#F3F7FC;font-family:Tahoma,'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F3F7FC;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${BORDER};">
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
            ${table}
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
      <div style="max-width:600px;margin:14px auto 0;font-size:12px;color:${MUTED};font-family:Arial,sans-serif;text-align:center;" dir="ltr">
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
    'تفاصيل الحدث:',
    ...rows.map(([label, , plain]) => `${label}: ${plain}`),
    ...(!approved && site ? ['', `إرسال طلب جديد: ${site}/event-registration`] : []),
    '',
    'للاستفسار:',
    ...CONTACTS.map((c) => `${c.name}: ${c.phone}`),
  ].join('\n');

  return { subject, html, text };
}
