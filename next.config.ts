import type { NextConfig } from 'next';

const nextConfig = {
    async redirects() {
        return [
            { source: '/form-1', destination: '/event-registration', permanent: true },
        ]
    },
}

export default nextConfig;   // or module.exports = nextConfig, matching your file