import { prisma } from "@workspace/db"

import { RESERVED_SLUGS } from "../constants"

export function isReservedSlug(slug: string): boolean {
  return (RESERVED_SLUGS as readonly string[]).includes(slug)
}

// What pages need about a restaurant and its outlets. Deliberately excludes
// anything not shown on screen (Next.js calls this a DTO: return only safe,
// minimal data from the data layer).
export async function getRestaurantBySlug(slug: string) {
  if (isReservedSlug(slug)) return null
  return prisma.restaurant.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      theme: true,
      logoPath: true,
      gstin: true,
      fssaiLicense: true,
      locations: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          address: true,
          isOpen: true,
          acceptsPickup: true,
          acceptsCod: true,
        },
      },
    },
  })
}

export type RestaurantSummary = NonNullable<
  Awaited<ReturnType<typeof getRestaurantBySlug>>
>

// Restaurants a user works at, with their role, for the account page.
export async function getStaffRestaurants(userId: string) {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    orderBy: { restaurant: { name: "asc" } },
    select: { role: true, restaurant: { select: { name: true, slug: true } } },
  })
  return memberships.map((m) => ({ ...m.restaurant, role: m.role }))
}
