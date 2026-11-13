import type { NextConfig } from 'next';
const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Evita el fallo EPERM observado con exportación paralela en Windows.
  experimental: process.platform === 'win32' || process.env.NEXT_BUILD_CPUS === '1' ? { cpus: 1 } : undefined,
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: `${process.env.BACKEND_API_URL ?? 'http://127.0.0.1:4000'}/api/v1/:path*` }];
  },
};
export default config;
