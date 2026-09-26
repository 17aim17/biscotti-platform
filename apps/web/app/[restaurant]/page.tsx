import { getMenu } from "@workspace/core"

import { getRestaurantOr404 } from "@/lib/restaurant"

import { CartBar } from "./_components/cart-bar"
import { MenuBrowser } from "./_components/menu-browser"

export default async function StorefrontPage({
  params,
}: PageProps<"/[restaurant]">) {
  const { restaurant: slug } = await params
  const restaurant = await getRestaurantOr404(slug)
  const categories = await getMenu(restaurant.id)
  const openOutlets = restaurant.locations.filter((l) => l.openNow)

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div>
        <h1 className="text-2xl font-semibold">{restaurant.name}</h1>
        <p className="text-sm text-muted-foreground">
          {openOutlets.length > 0
            ? `Open now at ${openOutlets.map((l) => l.name).join(", ")}`
            : "All outlets are closed right now. You can still browse the menu."}
        </p>
      </div>
      <MenuBrowser slug={restaurant.slug} categories={categories} />
      <CartBar slug={restaurant.slug} categories={categories} />
    </div>
  )
}
