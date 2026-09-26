import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // All rendering is client-side only — no server components needed
  reactStrictMode: true,
  allowedDevOrigins: ['192.168.1.56'],

};

export default nextConfig;
