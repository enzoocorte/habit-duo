import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  output: "export",
  basePath: "/habit-duo",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
