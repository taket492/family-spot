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
    // Enable image optimization error handling
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
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
