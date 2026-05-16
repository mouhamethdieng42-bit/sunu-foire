/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'liglrvygrcpzkjtqivaj.supabase.co',
      },
    ],
  },
  turbopack: {}, // Ajout nécessaire pour éviter l'erreur
};

module.exports = withPWA(nextConfig);