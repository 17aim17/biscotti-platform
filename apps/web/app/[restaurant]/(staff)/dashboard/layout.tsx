import {
  countOrdersNeedingRefund,
  roleCan,
  type Permission,
} from "@workspace/core"

import { getMyMembership } from "@/lib/access"
import { getCurrentUser } from "@/lib/auth"
import { getRestaurantOr404 } from "@/lib/restaurant"

import { DashboardNav, type Section } from "./_components/nav"

const SECTIONS: { path: string; label: string; permission: Permission }[] = [
  { path: "orders", label: "Orders", permission: "orders:view" },
  { path: "menu", label: "Menu", permission: "menu:manage" },
  { path: "outlets", label: "Outlets", permission: "locations:manage" },
  { path: "staff", label: "Staff", permission: "staff:manage" },
  { path: "settings", label: "Settings", permission: "restaurant:manage" },
]

// The section menu lists only what this person's role allows. It is a
// convenience, not the security check: every page and every action checks
// the permission again.
export default async function DashboardLayout({
  children,
  params,
}: LayoutProps<"/[restaurant]/dashboard">) {
  const { restaurant: slug } = await params
  const restaurant = await getRestaurantOr404(slug)
  const user = await getCurrentUser()
  const membership = user ? await getMyMembership(user.id, restaurant.id) : null
  const allowed = SECTIONS.filter(
    (s) => membership && roleCan(membership.role, s.permission)
  )
  if (!user || allowed.length === 0) return children

  const refunds = allowed.some((s) => s.path === "orders")
    ? await countOrdersNeedingRefund(user.id, restaurant.id)
    : 0
  const sections: Section[] = allowed.map((s) => ({
    href: `/${slug}/dashboard/${s.path}`,
    label: s.label,
    badge: s.path === "orders" ? refunds : undefined,
  }))

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[12rem_1fr] lg:gap-10 lg:py-10">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <DashboardNav sections={sections} />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
