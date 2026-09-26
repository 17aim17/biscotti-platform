import path from "node:path"

import { config } from "dotenv"
import type { NextConfig } from "next"

// One .env file for the whole repo, at the root. Next.js only reads .env files
// from apps/web (and caches them before this file runs), so load the root file
// here. Variables already set in the environment (e.g. on Vercel) win.
config({ path: path.resolve(process.cwd(), "../../.env"), quiet: true })

const supabase = new URL(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321"
)

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui", "@workspace/core", "@workspace/db"],
  experimental: {
    // Server Actions accept 1 MB by default; photo uploads allow 2 MB
    // (dashboard/actions.ts), plus room for the form encoding.
    serverActions: { bodySizeLimit: "3mb" },
  },
  images: {
    remotePatterns: [
      // Demo menu photos are hosted on Unsplash (free Unsplash License photos).
      { protocol: "https", hostname: "images.unsplash.com" },
      // Photos uploaded from the dashboard, in Supabase Storage.
      {
        protocol: supabase.protocol === "https:" ? "https" : "http",
        hostname: supabase.hostname,
        port: supabase.port,
        pathname: "/storage/v1/object/public/**",
      },
    ],
    // Local Supabase runs on 127.0.0.1, which the image optimizer refuses by
    // default (it protects servers from being tricked into fetching internal
    // addresses). Allowed in development only.
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
  },
}

export default nextConfig
