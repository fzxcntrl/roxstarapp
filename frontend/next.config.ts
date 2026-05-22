import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Reduce memory usage
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Disable source maps in development to reduce memory usage
  productionBrowserSourceMaps: false,
};

export default nextConfig;
