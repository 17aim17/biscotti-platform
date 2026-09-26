import { readFileSync } from "node:fs"
import path from "node:path"

import { config } from "dotenv"
import { defineConfig } from "prisma/config"

// One .env for the whole repo, at the root.
config({ path: path.resolve(import.meta.dirname, "../../.env"), quiet: true })

export default defineConfig({
  // Needed for migrations.initShadowDb below.
  experimental: { externalTables: true },
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
    // The shadow database Prisma uses to check migrations is a plain Postgres
    // database without Supabase's auth schema. This stub gives it the few auth
    // objects our migrations reference.
    initShadowDb: readFileSync(
      path.resolve(import.meta.dirname, "prisma/shadow-init.sql"),
      "utf8"
    ),
  },
  datasource: {
    // Migrations use a direct (non-pooled) connection. Optional so that
    // `prisma generate` also works without a database, for example in CI.
    url: process.env.DIRECT_URL,
  },
})
