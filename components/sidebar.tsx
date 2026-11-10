'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const nav = [
    { href: '/', label: 'Home' },
    { href: '/calendar', label: 'Calendar' },
    { href: '/pending', label: 'Events Pending' },
    { href: '/form-1', label: 'Form 1' },
    { href: '/form-2', label: 'Form 2' },
  ];

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
    </aside>
  );
}