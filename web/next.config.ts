import type { NextConfig } from "next";

// AD-5: the browser only calls relative /api/* paths; Next.js forwards them to
// the Proxy on the Compose network. No Proxy URL ever reaches browser code.
// PROXY_ORIGIN is a server-side override used only by the `dev` profile.
const PROXY_ORIGIN = process.env.PROXY_ORIGIN ?? "http://proxy:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${PROXY_ORIGIN}/api/:path*` }];
  },
  experimental: {
    proxyTimeout: 100_000,
  },
};

export default nextConfig;
