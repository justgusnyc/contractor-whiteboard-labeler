import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co", // Covers any subdomain under supabase.co
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.in", // Covers any subdomain under supabase.in
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "infra.goblinsapp.com", // If you still need this hostname
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
