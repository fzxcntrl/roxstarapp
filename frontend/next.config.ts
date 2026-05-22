import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Vercel serverless configuration
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
};

export default nextConfig;
