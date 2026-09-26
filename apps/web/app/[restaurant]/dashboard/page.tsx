import type { Metadata } from "next"

import { NoAccess } from "@/components/no-access"
import { checkStaffAccess } from "@/lib/access"

export const metadata: Metadata = { title: "Dashboard" }

// Placeholder for managers and owners. Menu, outlets, staff and settings arrive in Phase 9.
export default async function DashboardPage({
  params,
}: PageProps<"/[restaurant]/dashboard">) {
  const { restaurant: slug } = await params
  const { restaurant, allowed } = await checkStaffAccess(
    slug,
    "orders:view",
    `/${slug}/dashboard`
  )
  if (!allowed) return <NoAccess restaurantName={restaurant.name} />

  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-muted-foreground">
        Menu, outlets, staff and settings for {restaurant.name} will be managed
        here.
      </p>
    </section>
  )
}
