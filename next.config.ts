import type { NextConfig } from "next";
import { getSecurityHeaders } from "./lib/http/security-headers";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [
      { source: "/:path*", headers: getSecurityHeaders(process.env.NEXT_PUBLIC_SUPABASE_URL) },
      // Next's configured headers override route-handler values. Keep this
      // last so callback credentials cannot become a same-origin referrer.
      { source: "/auth/callback", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
    ];
  },
};

export default nextConfig;
