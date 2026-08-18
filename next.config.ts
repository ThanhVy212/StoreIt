import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
      remotePatterns: [
          {
              protocol: 'https',
              hostname: 'png.pngtree.com',
          }, {
              protocol: 'https',
              hostname: 'fra.cloud.appwrite.io',
          }, {
              protocol: 'https',
              hostname: 'cloud.appwrite.io',
          }
      ]
  },
  experimental: {
      serverActions: {
        bodySizeLimit: "100MB",
      },
  },
};

export default nextConfig;
