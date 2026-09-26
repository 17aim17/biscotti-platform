// Who may do what at a restaurant. Roles come from the memberships table;
// customers have no membership and therefore no staff permissions.
import { MembershipRole, prisma } from "@workspace/db"

import { DomainError } from "../errors"

export type Permission =
  | "kitchen:use" // see live orders, accept/reject, move orders along
  | "orders:view" // order history in the dashboard
  | "menu:manage"
  | "locations:manage"
  | "staff:manage"
  | "restaurant:manage" // branding, legal pages, GSTIN/FSSAI

const ROLE_PERMISSIONS: Record<MembershipRole, Permission[]> = {
  [MembershipRole.staff]: ["kitchen:use"],
  [MembershipRole.manager]: [
    "kitchen:use",
    "orders:view",
    "menu:manage",
    "locations:manage",
  ],
  [MembershipRole.owner]: [
    "kitchen:use",
    "orders:view",
    "menu:manage",
    "locations:manage",
    "staff:manage",
    "restaurant:manage",
  ],
}

export function roleCan(role: MembershipRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}

export async function getMembership(userId: string, restaurantId: string) {
  return prisma.membership.findUnique({
    where: { userId_restaurantId: { userId, restaurantId } },
  })
}

export async function can(
  userId: string,
  restaurantId: string,
  permission: Permission
) {
  const membership = await getMembership(userId, restaurantId)
  return membership !== null && roleCan(membership.role, permission)
}

// Call at the start of every staff action. Throws instead of returning false so
// a forgotten `if` cannot let the action continue.
export async function requirePermission(
  userId: string,
  restaurantId: string,
  permission: Permission
) {
  const membership = await getMembership(userId, restaurantId)
  if (!membership || !roleCan(membership.role, permission)) {
    throw new DomainError("FORBIDDEN", "You do not have access to do this.")
  }
  return membership
}
