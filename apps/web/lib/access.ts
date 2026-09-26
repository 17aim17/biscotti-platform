import "server-only"

import { can, type Permission } from "@workspace/core"

import { requireUser } from "./auth"
import { getRestaurantOr404 } from "./restaurant"

// For staff pages. Checked in each page, not in a layout: layouts don't re-run
// on client navigation (Next.js docs, "Layouts and auth checks").
// Not signed in: redirect to /login and back. Signed in: `allowed` says whether
// this user has the permission at this restaurant.
export async function checkStaffAccess(
  slug: string,
  permission: Permission,
  path: string
) {
  const restaurant = await getRestaurantOr404(slug)
  const user = await requireUser(path)
  const allowed = await can(user.id, restaurant.id, permission)
  return { restaurant, user, allowed }
}
