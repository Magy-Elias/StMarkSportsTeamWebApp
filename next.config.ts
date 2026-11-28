import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Old Form 1 / Form 2 addresses → Event Registration / Event Management.
  // Runs before proxy.ts, so it also
  // works for visitors who aren't logged in.
  redirects() {
    return Promise.resolve([
      { source: '/form-1', destination: '/event-registration', permanent: true },
      { source: '/form-2', destination: '/event-management', permanent: true },
    ]);
  },
};

export default nextConfig;
