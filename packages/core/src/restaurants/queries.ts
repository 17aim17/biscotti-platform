import { prisma } from "@workspace/db"

import { RESERVED_SLUGS } from "../constants"
import { isOpenAt, openingHoursSchema } from "../locations/hours"

export function isReservedSlug(slug: string): boolean {
  return (RESERVED_SLUGS as readonly string[]).includes(slug)
}

// What pages need about a restaurant and its outlets. Deliberately excludes
// anything not shown on screen (Next.js calls this a DTO: return only safe,
// minimal data from the data layer). Opening hours stay on the server; pages
// get `openNow` instead.
export async function getRestaurantBySlug(slug: string, now = new Date()) {
  if (isReservedSlug(slug)) return null
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      theme: true,
      logoPath: true,
      legal: true,
      gstin: true,
      fssaiLicense: true,
      locations: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          address: true,
          isOpen: true,
          hours: true,
          acceptsPickup: true,
          acceptsCod: true,
        },
      },
    },
  })
  if (!restaurant) return null

  const { locations, ...rest } = restaurant
  return {
    ...rest,
    locations: locations.map(({ hours, isOpen, ...location }) => {
      const parsed = openingHoursSchema.safeParse(hours)
      return {
        ...location,
        openNow: isOpen && parsed.success && isOpenAt(parsed.data, now),
      }
    }),
  }
}

export type RestaurantSummary = NonNullable<
  Awaited<ReturnType<typeof getRestaurantBySlug>>
>

// The menu: categories in their display order, each with its dishes. Archived
// categories and dishes are left out; sold-out dishes stay, marked unavailable.
export async function getMenu(restaurantId: string) {
  return prisma.category.findMany({
    where: { restaurantId, archivedAt: null },
    orderBy: { sort: "asc" },
    select: {
      id: true,
      name: true,
      menuItems: {
        where: { archivedAt: null },
        orderBy: { title: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          pricePaise: true,
          isVeg: true,
          isAvailable: true,
          imagePath: true,
        },
      },
    },
  })
}

export type MenuCategory = Awaited<ReturnType<typeof getMenu>>[number]
export type MenuDish = MenuCategory["menuItems"][number]

// Restaurants a user works at, with their role, for the account page.
export async function getStaffRestaurants(userId: string) {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    orderBy: { restaurant: { name: "asc" } },
    select: { role: true, restaurant: { select: { name: true, slug: true } } },
  })
  return memberships.map((m) => ({ ...m.restaurant, role: m.role }))
}
