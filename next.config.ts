import type { NextConfig } from 'next';

const cloud = /^[a-z0-9_-]+$/i.test(process.env.CLOUDINARY_CLOUD_NAME ?? '')
  ? process.env.CLOUDINARY_CLOUD_NAME : '__unconfigured__';
const config: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['mongodb', 'cloudinary', 'sharp'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com', pathname: `/${cloud}/image/upload/**` }],
    dangerouslyAllowSVG: false
  },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
    ] }];
  }
};
export default config;

