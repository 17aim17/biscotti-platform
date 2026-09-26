import { getRestaurantOr404 } from "@/lib/restaurant"

// Placeholder storefront. The menu, cart and checkout arrive in Phase 6.
export default async function StorefrontPage({
  params,
}: PageProps<"/[restaurant]">) {
  const { restaurant: slug } = await params
  const restaurant = await getRestaurantOr404(slug)

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Order from {restaurant.name}</h1>
      <p className="text-muted-foreground">The menu is coming soon. Outlets:</p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {restaurant.locations.map((location) => (
          <li key={location.id} className="rounded-lg border p-4">
            <p className="font-medium">{location.name}</p>
            <p className="text-sm text-muted-foreground">{location.address}</p>
            <p className="mt-2 text-sm">
              {location.openNow ? "Open now" : "Closed"}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
