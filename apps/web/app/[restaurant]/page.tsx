import { getMenu } from "@workspace/core"

import { readBrand } from "@/lib/brand"
import { getRestaurantOr404 } from "@/lib/restaurant"

import { CartBar } from "./_components/cart-bar"
import { CategoryTiles } from "./_components/category-tiles"
import { Hero } from "./_components/hero"
import { MenuBrowser } from "./_components/menu-browser"

export default async function StorefrontPage({
  params,
}: PageProps<"/[restaurant]">) {
  const { restaurant: slug } = await params
  const restaurant = await getRestaurantOr404(slug)
  const categories = await getMenu(restaurant.id)
  const vegCount = categories.reduce(
    (n, c) => n + c.menuItems.filter((d) => d.isVeg).length,
    0
  )

  return (
    <div className="flex flex-col gap-12 pb-28">
      <Hero
        restaurant={restaurant}
        brand={readBrand(restaurant.theme)}
        vegCount={vegCount}
      />
      <CategoryTiles categories={categories} />
      <MenuBrowser slug={restaurant.slug} categories={categories} />
      <CartBar slug={restaurant.slug} categories={categories} />
    </div>
  )
}
