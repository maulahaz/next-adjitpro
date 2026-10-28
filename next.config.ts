import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Paket yang harus tetap di-resolve oleh Node (bukan di-bundle) di server.
  serverExternalPackages: ["postgres", "bcryptjs"],
  experimental: {
    // Lampiran Bantuan (1 MB) dan lampiran Funding (2 MB) — default Server
    // Action (1 MB) terlalu ketat karena multipart menambah overhead.
    serverActions: { bodySizeLimit: "4mb" },
  },
  eslint: {
    // Lint dijalankan terpisah lewat `npm run lint`.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
