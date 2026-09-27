import "server-only"

import { getMembership, roleCan, type Permission } from "@workspace/core"
import { cache } from "react"

import { requireUser } from "./auth"
import { getRestaurantOr404 } from "./restaurant"

// For staff pages. Checked in each page, not in a layout: layouts don't re-run
// on client navigation (Next.js docs, "Layouts and auth checks").
// Not signed in: redirect to /login and back. Signed in: `allowed` says whether
// this user has the permission at this restaurant.
// The signed-in user's role at a restaurant. The staff header, the
// dashboard menu and the page all need it; cache() makes it one query per
// request.
export const getMyMembership = cache((userId: string, restaurantId: string) =>
  getMembership(userId, restaurantId)
)

export async function checkStaffAccess(
  slug: string,
  permission: Permission,
  path: string
) {
  const restaurant = await getRestaurantOr404(slug)
  const user = await requireUser(path)
  const membership = await getMyMembership(user.id, restaurant.id)
  const allowed = membership !== null && roleCan(membership.role, permission)
  return { restaurant, user, allowed }
}
