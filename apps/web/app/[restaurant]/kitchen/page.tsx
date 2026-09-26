import type { Metadata } from "next"

import { NoAccess } from "@/components/no-access"
import { checkStaffAccess } from "@/lib/access"

export const metadata: Metadata = { title: "Kitchen" }

// Placeholder. The live order queue arrives in Phase 8.
export default async function KitchenPage({
  params,
}: PageProps<"/[restaurant]/kitchen">) {
  const { restaurant: slug } = await params
  const { restaurant, allowed } = await checkStaffAccess(
    slug,
    "kitchen:use",
    `/${slug}/kitchen`
  )
  if (!allowed) return <NoAccess restaurantName={restaurant.name} />

  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Kitchen</h1>
      <p className="text-muted-foreground">
        Live orders for {restaurant.name} will appear here.
      </p>
    </section>
  )
}
