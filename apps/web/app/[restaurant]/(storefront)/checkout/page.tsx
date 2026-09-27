import { getMenu, getProfile } from "@workspace/core"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { readBrand } from "@/lib/brand"
import { requireUser } from "@/lib/auth"
import { getRestaurantOr404 } from "@/lib/restaurant"

import { CheckoutView } from "./checkout-view"

export const metadata: Metadata = { title: "Checkout" }

// Signing in happens here, not earlier: guests browse and fill a cart freely,
// and log in with their phone only when they are ready to order.
export default async function CheckoutPage({
  params,
}: PageProps<"/[restaurant]/checkout">) {
  const { restaurant: slug } = await params
  const user = await requireUser(`/${slug}/checkout`)
  const restaurant = await getRestaurantOr404(slug)
  const [categories, profile] = await Promise.all([
    getMenu(restaurant.id),
    getProfile(user.id),
  ])
  // Signed in, but the account no longer exists (deleted while the browser
  // kept its login). Signing in again replaces the stale session.
  if (!profile) {
    redirect(`/login?next=${encodeURIComponent(`/${slug}/checkout`)}&expired=1`)
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-10">
      <CheckoutView
        slug={restaurant.slug}
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
        brandColor={readBrand(restaurant.theme).primary}
        locations={restaurant.locations}
        categories={categories}
        defaultName={profile.name ?? ""}
        phone={user.phone}
      />
    </div>
  )
}
