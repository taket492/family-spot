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
    // Disabled to avoid requiring 'critters' during prerender on Vercel
    optimizeCss: false,
    optimizeServerReact: true,
  },
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },
  // Production optimization
  compress: true,
  // Bundle optimization
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Optimize bundle splitting
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          // Separate vendor libraries
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          // Map library in separate chunk
          maplibre: {
            test: /[\\/]node_modules[\\/]maplibre-gl[\\/]/,
            name: 'maplibre',
            chunks: 'all',
            priority: 20,
          },
          // React libraries
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react',
            chunks: 'all',
            priority: 30,
          },
        },
      };
    }

    // Tree shaking optimization
    config.optimization.usedExports = true;
    config.optimization.sideEffects = false;

    return config;
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
