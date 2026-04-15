import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer", "canvas"],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
