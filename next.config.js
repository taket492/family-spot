const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Optimize production builds
  swcMinify: true,
  // Enable package import optimization
  experimental: {
    optimizePackageImports: ['maplibre-gl'],
  },
  images: {
    remotePatterns: [
      // Supabase public bucket
      { protocol: 'https', hostname: '**.supabase.co', pathname: '/storage/v1/object/public/**' },
      // Vercel Blob public URLs
      { protocol: 'https', hostname: 'public.blob.vercel-storage.com', pathname: '/**' },
      // Allow any HTTPS image (for external sources, with fallback handling)
      { protocol: 'https', hostname: '**' },
      // Allow HTTP for development/local testing
      { protocol: 'http', hostname: 'localhost' },
    ],
    // Image optimization formats - prioritize modern formats
    formats: ['image/avif', 'image/webp'],
    // Enable image optimization error handling
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Image sizes for responsive optimization
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Fallback for failed images
    unoptimized: false,
    // Cache optimized images for 1 year
    minimumCacheTTL: 31536000,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
      // Cache static assets
      {
        source: '/images/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Serve SVG favicon when .ico is requested to avoid 404
      { source: '/favicon.ico', destination: '/favicon.svg', permanent: true },
    ];
  },
};

module.exports = withBundleAnalyzer(nextConfig);
