import { getMenu } from "@workspace/core"
import type { Metadata } from "next"

import { getRestaurantOr404 } from "@/lib/restaurant"

import { CartView } from "./cart-view"

export const metadata: Metadata = { title: "Your cart" }

export default async function CartPage({
  params,
}: PageProps<"/[restaurant]/cart">) {
  const { restaurant: slug } = await params
  const restaurant = await getRestaurantOr404(slug)
  const categories = await getMenu(restaurant.id)

  return (
    <CartView
      slug={restaurant.slug}
      categories={categories}
      locations={restaurant.locations}
    />
  )
}
