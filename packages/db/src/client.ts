import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "./generated/prisma/client"

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set")
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
}

// Reuse one client across hot reloads in development, otherwise every reload
// opens a new connection pool.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function getClient(): PrismaClient {
  globalForPrisma.prisma ??= createPrismaClient()
  return globalForPrisma.prisma
}

// Created on first use, not at import. Next.js imports page modules during the
// build (and CI builds have no database), so importing this package must not
// need DATABASE_URL. Use `prisma` exactly like a normal PrismaClient.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getClient()
    const value = Reflect.get(client, property, client)
    return typeof value === "function" ? value.bind(client) : value
  },
})
