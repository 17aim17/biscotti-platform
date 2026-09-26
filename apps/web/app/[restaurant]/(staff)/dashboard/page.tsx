import type { Metadata } from "next"

import { NoAccess } from "@/components/no-access"
import { eyebrow } from "@/components/styles"
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
    <section className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-24 text-center">
      <p className={`${eyebrow} text-(--sf-accent-ink)`}>Dashboard</p>
      <h1 className="font-display text-5xl leading-none font-medium tracking-tight">
        Coming next
      </h1>
      <p className="text-(--sf-muted)">
        Menu, outlets, staff and settings for {restaurant.name} will be managed
        here.
      </p>
    </section>
  )
}
