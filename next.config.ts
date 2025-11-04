import type { NextConfig } from "next";

/**
 * Next.js configuration for Camera webapp
 * Version: 1.0.0
 * 
 * Key configurations:
 * - Image domains for imgbb.com CDN
 * - Security headers for production
 * - TypeScript strict mode enforcement
 */
const nextConfig: NextConfig = {
  // Image configuration for imgbb.com CDN
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'imgbb.com',
        pathname: '/**',
      },
    ],
  },

  // TypeScript configuration
  typescript: {
    // Enforce strict type checking during build
    ignoreBuildErrors: false,
  },

  // Security headers for production
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
        ],
      },
    ];
  },
};

export default nextConfig;
