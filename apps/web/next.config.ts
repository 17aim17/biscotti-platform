import path from "node:path"

import { loadEnvConfig } from "@next/env"
import type { NextConfig } from "next"

// One .env file for the whole repo, at the root. Next.js only looks in
// apps/web by default, so load the root file explicitly.
loadEnvConfig(path.resolve(process.cwd(), "../.."))

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui", "@workspace/core", "@workspace/db"],
}

export default nextConfig
