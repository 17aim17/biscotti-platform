import { getMenu } from "@workspace/core"

import { brandStyle, readBrand } from "@/lib/brand"
import { getRestaurantOr404 } from "@/lib/restaurant"

import { CartBar } from "./_components/cart-bar"
import { Facts, Hero } from "./_components/hero"
import { MenuBrowser } from "./_components/menu-browser"

export default async function StorefrontPage({
  params,
}: PageProps<"/[restaurant]">) {
  const { restaurant: slug } = await params
  const restaurant = await getRestaurantOr404(slug)
  const brand = readBrand(restaurant.theme)
  const categories = await getMenu(restaurant.id)
  const dishes = categories.flatMap((c) => c.menuItems)

  return (
    <div className="pb-28">
      <Hero
        restaurant={restaurant}
        brand={brand}
        hasSignatures={dishes.some((d) => d.isFeatured)}
      />
      <Facts
        restaurant={restaurant}
        dishCount={dishes.length}
        vegCount={dishes.filter((d) => d.isVeg).length}
      />
      <MenuBrowser
        slug={restaurant.slug}
        categories={categories}
        themeStyle={brandStyle(brand)}
      />
      <CartBar slug={restaurant.slug} categories={categories} />
    </div>
  )
}
