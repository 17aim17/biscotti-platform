import type { z } from "zod"

import { DomainError } from "./errors"

// Validates browser input with a zod schema; a failure becomes a DomainError
// whose message is safe to show next to the form.
export function parseInput<T>(schema: z.ZodType<T>, raw: unknown): T {
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    throw new DomainError(
      "INVALID_INPUT",
      parsed.error.issues[0]?.message ?? "Invalid input."
    )
  }
  return parsed.data
}
