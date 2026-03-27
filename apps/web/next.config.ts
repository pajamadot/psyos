import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@psyos/contracts"],
  experimental: {
    devtoolSegmentExplorer: false,
  },
};

export default nextConfig;
