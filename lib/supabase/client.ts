import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env';

// Supabase client for Client Components. Keeps the login session in cookies,
// so the server (proxy.ts and Server Components) sees the same user.
export const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
