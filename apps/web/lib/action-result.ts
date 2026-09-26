import "server-only"

import { DomainError } from "@workspace/core"

// What server actions return to the browser: the data, or a message that is
// safe to show. Expected failures (closed outlet, outside the delivery area)
// keep their message; anything else is logged and hidden behind a generic one.
export type ActionResult<T> =
  { ok: true; data: T } | { ok: false; error: string }

export async function toActionResult<T>(
  run: () => Promise<T>
): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await run() }
  } catch (error) {
    if (error instanceof DomainError) return { ok: false, error: error.message }
    console.error("[action]", error)
    return { ok: false, error: "Something went wrong. Please try again." }
  }
}
