import type { Metadata } from "next"

import { brandStyle, readBrand } from "@/lib/brand"
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
      className="flex min-h-svh flex-col bg-[#fffaf4] text-stone-900"
    >
      {/* Soft warm glows behind the page. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-0 overflow-hidden"
      >
        <div className="absolute -top-40 -right-32 size-[32rem] rounded-full bg-amber-200/40 blur-3xl" />
        <div className="absolute top-1/3 -left-40 size-[28rem] rounded-full bg-(--brand)/10 blur-3xl" />
      </div>
      <SiteHeader name={restaurant.name} slug={restaurant.slug} />
      <main className="relative mx-auto w-full max-w-6xl flex-1 px-4 pt-6">
        {children}
      </main>
      <SiteFooter restaurant={restaurant} />
    </div>
  )
}
