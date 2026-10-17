import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Paket yang harus tetap di-resolve oleh Node (bukan di-bundle) di server.
  serverExternalPackages: ["postgres", "bcryptjs"],
  eslint: {
    // Lint dijalankan terpisah lewat `npm run lint`.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
