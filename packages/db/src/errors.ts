import { Prisma } from "./generated/prisma/client"

// Postgres unique constraint violation, as reported by Prisma (P2002).
export function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  )
}
