import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backendBaseUrl = process.env.BACKEND_URL ?? "http://localhost:8080";
    return [
      {
        source: "/api/:path*",
        destination: `${backendBaseUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
