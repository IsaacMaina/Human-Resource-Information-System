import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  experimental: {
    serverComponentsExternalPackages: [
      '@prisma/client',
      'bcryptjs',
      'jspdf',
      'jspdf-autotable',
      'xlsx'
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Turbopack configuration
  compiler: {
    // Empty compiler config to make Turbopack work properly
  },
};

export default nextConfig;
