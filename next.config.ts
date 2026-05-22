import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  serverExternalPackages: ['@aws-sdk/client-ivs'],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "esnyldnbxlwvrczwbkmy.supabase.co",
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0",
          },
        ],
      },
    ];
  },
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    }
    return config
  },
};
export default nextConfig;
