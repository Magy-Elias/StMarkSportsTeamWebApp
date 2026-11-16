import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckIcon } from '@/components/icons';
import { FORM1_CONTACT } from '@/components/form1Fields';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Event submitted · ONE99 Sports Team' };

// Shown after Form 1 is saved (like Google Forms' "Your response has been
// recorded"). Public, like Form 1 itself: /form-1/* needs no login.
export default async function SubmittedPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const loggedIn = Boolean(data?.claims);

  return (
    <section className="card submitted-card">
      <span className="submitted-icon" aria-hidden="true">
        <CheckIcon size={36} />
      </span>

      <div dir="rtl" className="submitted-text">
        <h1>تم إرسال طلبك بنجاح</h1>
        <p>شكرًا لك! وصلنا طلب الحدث، وسنبدأ في التحضير له.</p>
        <p className="muted">سيتواصل معك أحد أعضاء الفريق قريبًا لتأكيد التفاصيل.</p>
      </div>

      <div className="form-info" dir="ltr">
        {FORM1_CONTACT.split('\n').map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>

      <div className="submitted-actions">
        <Link href="/form-1" className="btn btn-primary">Submit another event</Link>
        {loggedIn && id && (
          <Link href={`/events/${id}`} className="btn btn-ghost">View event</Link>
        )}
        {loggedIn && (
          <Link href="/" className="btn btn-ghost">Back to home</Link>
        )}
      </div>
    </section>
  );
}
