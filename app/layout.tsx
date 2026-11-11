import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Sidebar from '@/components/sidebar';
import { createClient } from '@/lib/supabase/server';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'ONE99 Sports Team',
  description: 'Plan and manage your sports team events.',
  icons: {
    icon: [{ url: '/logo.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/logo-192.png' }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = typeof data?.claims?.email === 'string' ? data.claims.email : null;
  const loggedIn = Boolean(data?.claims);

  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full antialiased">
        <div className="flex h-screen">
          {/* Logged-out visitors (login page, public Form 1) don't get the menu. */}
          {loggedIn && <Sidebar email={email} />}
          <main className={`flex-1 overflow-y-auto${loggedIn ? '' : ' no-sidebar'}`}>{children}</main>
        </div>
      </body>
    </html>
  );
}
