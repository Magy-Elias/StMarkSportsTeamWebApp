// Sends email over SMTP from a normal email account (e.g. the team's Gmail),
// so no separate email service is needed.
//
// Secrets (set with `supabase secrets set ...`):
//   SMTP_USER   the email account, e.g. one.99.stmark@gmail.com
//   SMTP_PASS   its password; for Gmail an "App Password" (Google Account →
//               Security → 2-Step Verification → App passwords)
//   SMTP_HOST   optional, default smtp.gmail.com
//   SMTP_PORT   optional, default 465. Supabase Edge Functions block outgoing
//               ports 25 and 587, so use 465 (SSL).
//   EMAIL_FROM  optional, default "ONE99 Sports Team <SMTP_USER>". Gmail only
//               sends from its own address (or an alias set up in Gmail).

import nodemailer from 'npm:nodemailer@6.10.1';

export type Attachment = {
  filename: string;
  /** Base64 file content. */
  content: string;
  /** Content-ID, so the HTML can show it inline with <img src="cid:..."> */
  cid?: string;
};

export type Mail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: Attachment[];
};

export async function sendEmail(mail: Mail): Promise<void> {
  const user = Deno.env.get('SMTP_USER');
  const pass = Deno.env.get('SMTP_PASS');
  if (!user || !pass) throw new Error('Email is not set up yet (SMTP_USER / SMTP_PASS missing)');

  const host = Deno.env.get('SMTP_HOST') || 'smtp.gmail.com';
  const port = Number(Deno.env.get('SMTP_PORT') || '465');
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = SSL from the start
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: Deno.env.get('EMAIL_FROM') || `ONE99 Sports Team <${user}>`,
    to: mail.to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    ...(mail.replyTo ? { replyTo: mail.replyTo } : {}),
    attachments: (mail.attachments ?? []).map((a) => ({
      filename: a.filename,
      content: a.content,
      encoding: 'base64',
      ...(a.cid ? { cid: a.cid } : {}),
    })),
  });
}
