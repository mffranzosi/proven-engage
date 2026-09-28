import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Vercel rejects request bodies above ~4.5MB, so 4MB is the practical ceiling for attachments.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
