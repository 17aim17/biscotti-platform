import path from "node:path"

import { config } from "dotenv"
import type { NextConfig } from "next"

// One .env file for the whole repo, at the root. Next.js only reads .env files
// from apps/web (and caches them before this file runs), so load the root file
// here. Variables already set in the environment (e.g. on Vercel) win.
config({ path: path.resolve(process.cwd(), "../../.env"), quiet: true })

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui", "@workspace/core", "@workspace/db"],
  images: {
    // Demo menu photos are hosted on Unsplash (free Unsplash License photos).
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
}

export default nextConfig
