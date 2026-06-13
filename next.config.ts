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
        // no-store applies to HTML/dynamic routes only. Exclude Next's hashed
        // build assets (/_next/static, /_next/image) so they keep their default
        // `immutable` caching instead of being refetched on every load.
        source: "/((?!_next/static|_next/image).*)",
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
