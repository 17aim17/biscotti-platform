// Database access is server only (it needs DATABASE_URL and a Postgres connection).
import "server-only"

export { prisma } from "./client"
export * from "./generated/prisma/client"
