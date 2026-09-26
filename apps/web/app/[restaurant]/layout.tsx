import type { Metadata } from "next"
import Link from "next/link"

import { getRestaurantOr404 } from "@/lib/restaurant"

export async function generateMetadata({
  params,
}: LayoutProps<"/[restaurant]">): Promise<Metadata> {
  const { restaurant: slug } = await params
  const restaurant = await getRestaurantOr404(slug)
  return {
    title: { template: `%s · ${restaurant.name}`, default: restaurant.name },
  }
}

export default async function RestaurantLayout({
  children,
  params,
}: LayoutProps<"/[restaurant]">) {
  const { restaurant: slug } = await params
  const restaurant = await getRestaurantOr404(slug)

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href={`/${restaurant.slug}`} className="text-lg font-semibold">
            {restaurant.name}
          </Link>
          <Link
            href="/account"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Account
          </Link>
        </div>
      </header>
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {children}
      </div>
    </div>
  )
}
