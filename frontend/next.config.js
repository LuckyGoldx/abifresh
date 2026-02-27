/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // Disable PWA in development for better performance
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  optimizeFonts: true,
  images: {
    domains: ['localhost:5000', 'localhost', '127.0.0.1', 'abifresh-production.up.railway.app'],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizeCss: true,
  },
  poweredByHeader: false,
};

module.exports = withPWA(nextConfig);
