import type { Metadata } from "next"

import { brandStyle, presetStyle, readBrand } from "@/lib/brand"
import { getRestaurantOr404 } from "@/lib/restaurant"

import { SiteFooter } from "./_components/site-footer"
import { SiteHeader } from "./_components/site-header"

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

export default async function RestaurantLayout({
  children,
  params,
}: LayoutProps<"/[restaurant]">) {
  const { restaurant: slug } = await params
  const restaurant = await getRestaurantOr404(slug)
  const brand = readBrand(restaurant.theme)

  return (
    <div
      style={brandStyle(brand)}
      className="relative flex min-h-svh flex-col bg-(--sf-bg) text-(--sf-ink)"
    >
      {presetStyle(brand).glows && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 overflow-hidden"
        >
          <div className="absolute -top-40 -right-32 size-[32rem] rounded-full bg-(--brand-accent)/25 blur-3xl" />
          <div className="absolute top-1/3 -left-40 size-[28rem] rounded-full bg-(--brand)/10 blur-3xl" />
        </div>
      )}
      <SiteHeader
        name={restaurant.name}
        slug={restaurant.slug}
        logoUrl={brand.logoUrl}
      />
      {/* Pages set their own width, so the storefront hero can be full-bleed. */}
      <main className="relative flex-1">{children}</main>
      <SiteFooter restaurant={restaurant} />
    </div>
  )
}
