'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function Sidebar({ email }: { email: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const nav = [
    { href: '/', label: 'Home' },
    { href: '/calendar', label: 'Calendar' },
    { href: '/pending', label: 'Events Pending' },
    { href: '/form-1', label: 'Form 1' },
    { href: '/form-2', label: 'Form 2' },
  ];

  const signOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Link href="/" className="brand-link" aria-label="ONE99 Sports Team">
          <img src="/logo.svg" alt="ONE99 Sports Team" className="sidebar-logo" />
        </Link>
      </div>
      <nav className="sidebar-nav">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${active ? 'active' : ''}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-account">
        {email && <span className="sidebar-email" title={email}>{email}</span>}
        <button type="button" onClick={signOut} disabled={signingOut} className="sidebar-signout">
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </aside>
  );
}
