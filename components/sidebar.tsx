'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function Sidebar({ email }: { email: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  // Mobile only: whether the slide-out menu is open.
  const [open, setOpen] = useState(false);

  const nav = [
    { href: '/', label: 'Home' },
    { href: '/calendar', label: 'Calendar' },
    { href: '/pending', label: 'Events Pending' },
    { href: '/form-1', label: 'Form 1' },
    { href: '/form-2', label: 'Form 2' },
  ];

  // While the mobile menu is open: close it with Escape, and stop the page
  // behind it from scrolling.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const signOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    setOpen(false);
    router.replace('/login');
    router.refresh();
  };

  return (
    <>
      {/* Top bar with the burger button, shown on small screens only. */}
      <header className="mobile-topbar">
        <button
          type="button"
          className="burger"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="sidebar"
        >
          <span />
          <span />
          <span />
        </button>
        <Link href="/" className="mobile-brand" aria-label="ONE99 Sports Team">
          <img src="/logo.svg" alt="ONE99 Sports Team" className="sidebar-logo" />
        </Link>
      </header>

      <div
        className={`sidebar-backdrop${open ? ' open' : ''}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <aside id="sidebar" className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-brand">
          <Link href="/" className="brand-link" aria-label="ONE99 Sports Team" onClick={() => setOpen(false)}>
            <img src="/logo.svg" alt="ONE99 Sports Team" className="sidebar-logo" />
          </Link>
          <button
            type="button"
            className="sidebar-close"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            ×
          </button>
        </div>
        <nav className="sidebar-nav">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${active ? 'active' : ''}`}
                onClick={() => setOpen(false)}
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
    </>
  );
}
