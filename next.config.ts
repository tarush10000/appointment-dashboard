import type { NextConfig } from "next";

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://appointment-5tt0.onrender.com/api/:path*',
      },
    ];
  },
};

export default nextConfig;
