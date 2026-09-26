import type { Metadata } from "next"

import { brandStyle, readBrand } from "@/lib/brand"
import { getRestaurantOr404 } from "@/lib/restaurant"

export async function generateMetadata({
  params,
}: LayoutProps<"/[restaurant]">): Promise<Metadata> {
  const { restaurant: slug } = await params
  const restaurant = await getRestaurantOr404(slug)
  const brand = readBrand(restaurant.theme)
  return {
    title: { template: `%s · ${restaurant.name}`, default: restaurant.name },
    description: brand.tagline ?? `Order online from ${restaurant.name}.`,
  }
}

// Everything under /<slug> uses the restaurant's colours and type. The
// storefront and the staff pages add their own header in their route groups.
export default async function RestaurantLayout({
  children,
  params,
}: LayoutProps<"/[restaurant]">) {
  const { restaurant: slug } = await params
  const restaurant = await getRestaurantOr404(slug)

  return (
    <div
      style={brandStyle(readBrand(restaurant.theme))}
      className="relative flex min-h-svh flex-col bg-(--sf-bg) text-(--sf-ink)"
    >
      {children}
    </div>
  )
}
