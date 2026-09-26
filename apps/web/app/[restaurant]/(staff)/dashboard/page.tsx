import { redirect } from "next/navigation"

import { NoAccess } from "@/components/no-access"
import { checkStaffAccess } from "@/lib/access"

// /dashboard opens the orders section.
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
  redirect(`/${slug}/dashboard/orders`)
}
