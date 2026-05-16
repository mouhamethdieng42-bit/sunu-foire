/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest\.json$/],
});

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'liglrvygrcpzkjtqivaj.supabase.co' },
    ],
  },
  // Désactive Turbopack pour le build PWA (plus stable)
  webpack: (config) => {
    return config;
  },
};

module.exports = withPWA(nextConfig);