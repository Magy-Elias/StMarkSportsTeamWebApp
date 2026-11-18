import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Old Form 1 address → Event Registration. Runs before proxy.ts, so it also
  // works for visitors who aren't logged in.
  redirects() {
    return Promise.resolve([
      { source: '/form-1', destination: '/event-registration', permanent: true },
    ]);
  },
};

export default nextConfig;
