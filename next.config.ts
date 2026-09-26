import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';
// If deploying to https://<username>.github.io/<repo-name>, NEXT_PUBLIC_BASE_PATH can be passed in CI
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  allowedDevOrigins: [
    '192.168.1.56',
    'lifekina.stagezone.live',
    '*.stagezone.live',
    'localhost:3000',
  ],
  // With a custom domain (lifekina.stagezone.live), the site is served from the root domain "/"
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
};

export default nextConfig;

