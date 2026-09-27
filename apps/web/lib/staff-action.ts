import "server-only"

import { DomainError, getRestaurantBySlug } from "@workspace/core"

import { toActionResult, type ActionResult } from "./action-result"
import { requireUserId } from "./auth"

// For dashboard Server Actions: finds the signed-in user and the restaurant
// from its slug, then runs `run`. The core function it calls checks the
// user's permission at that restaurant.
export async function staffAction<T>(
  slug: string,
  run: (ctx: { userId: string; restaurantId: string }) => Promise<T>
): Promise<ActionResult<T>> {
  return toActionResult(async () => {
    const userId = await requireUserId()
    const restaurant =
      typeof slug === "string" ? await getRestaurantBySlug(slug) : null
    if (!restaurant) throw new DomainError("NOT_FOUND", "Restaurant not found.")
    return run({ userId, restaurantId: restaurant.id })
  })
}
