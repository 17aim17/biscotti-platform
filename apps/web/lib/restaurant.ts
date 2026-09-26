import "server-only"

import { getRestaurantBySlug } from "@workspace/core"
import { notFound } from "next/navigation"
import { cache } from "react"

// The restaurant for the current URL (/<slug>/...). cache() means the layout,
// page and metadata of one request share a single database query.
export const getRestaurantOr404 = cache(async (slug: string) => {
  const restaurant = await getRestaurantBySlug(slug)
  if (!restaurant) notFound()
  return restaurant
})
