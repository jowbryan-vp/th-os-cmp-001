import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Brand assets are bundled with the application. Serving them directly keeps
  // local development independent from Cloudflare's optional image binding.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
