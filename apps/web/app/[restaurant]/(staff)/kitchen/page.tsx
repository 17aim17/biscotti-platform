import { Actor, listKitchenOrders, nextStatuses } from "@workspace/core"
import type { Metadata } from "next"

import { NoAccess } from "@/components/no-access"
import { checkStaffAccess } from "@/lib/access"

import { KitchenBoard } from "./kitchen-board"

export const metadata: Metadata = { title: "Kitchen" }

// Live orders for the kitchen. The board refreshes itself when orders change
// (Supabase Realtime), so this page just loads the current state.
export default async function KitchenPage({
  params,
  searchParams,
}: PageProps<"/[restaurant]/kitchen">) {
  const { restaurant: slug } = await params
  const { outlet } = await searchParams
  const { restaurant, user, allowed } = await checkStaffAccess(
    slug,
    "kitchen:use",
    `/${slug}/kitchen`
  )
  if (!allowed) return <NoAccess restaurantName={restaurant.name} />

  // One outlet (?outlet=<id>, e.g. a tablet at that outlet) or all of them.
  const outletId =
    typeof outlet === "string" &&
    restaurant.locations.some((l) => l.id === outlet)
      ? outlet
      : null
  const orders = (await listKitchenOrders(user.id, restaurant.id))
    .filter((o) => !outletId || o.location.id === outletId)
    .map((o) => ({
      ...o,
      // The buttons come from the same status map the server enforces.
      next: nextStatuses(o.status, o.fulfillment, Actor.staff),
    }))

  return (
    <KitchenBoard
      restaurantId={restaurant.id}
      slug={restaurant.slug}
      outlets={restaurant.locations.map((l) => ({ id: l.id, name: l.name }))}
      outletId={outletId}
      orders={orders}
    />
  )
}
