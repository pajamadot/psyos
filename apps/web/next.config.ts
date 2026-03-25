import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@psyos/contracts"],
};

export default nextConfig;
