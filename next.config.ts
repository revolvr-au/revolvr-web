import type { NextConfig } from "next";
const nextConfig: NextConfig = {
images: {
  remotePatterns: [
    {
      protocol: "https",
      hostname: "esnyldnbxlwvrczwbkmy.supabase.co",
      pathname: "/**",
    },
  ],
},  
};

export default nextConfig;
/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
