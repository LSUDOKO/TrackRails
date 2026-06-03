import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@piplabs/cdr-sdk"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
