'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { EyeIcon, EyeOffIcon } from '@/components/icons';

// Only follow redirects to pages on this site (blocks "//evil.com" etc.).
const safeNext = (next: string | null) =>
  next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setError(error.message === 'Invalid login credentials' ? 'Wrong email or password.' : error.message);
      setLoading(false);
      return;
    }
    router.replace(safeNext(searchParams.get('next')));
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="form">
      <label>
        <span>Email</span>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
      </label>
      <label>
        <span>Password</span>
        <div className="password-field">
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            title={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
          </button>
        </div>
      </label>
      <button type="submit" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
      {error && <p className="error" role="alert">{error}</p>}
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="login-page">
      <section className="card login-card">
        <img src="/logo.svg" alt="ONE99 Sports Team" className="login-logo" />
        <h1>Sign in</h1>
        <p className="muted">Sign in to manage ONE99 Sports Team events.</p>
        <Suspense>
          <LoginForm />
        </Suspense>
        <p className="muted login-footer">
          Want to submit a new event? <Link href="/form-1">Open Form 1</Link>, no login needed.
        </p>
      </section>
    </div>
  );
}
