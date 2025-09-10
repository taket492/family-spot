/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
    formats: ['image/webp', 'image/avif'],
    // Enable image optimization error handling
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Image sizes for responsive optimization
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Fallback for failed images
    unoptimized: false,
  },
  async redirects() {
    return [
      // Serve SVG favicon when .ico is requested to avoid 404
      { source: '/favicon.ico', destination: '/favicon.svg', permanent: true },
    ];
  },
};

module.exports = nextConfig;
