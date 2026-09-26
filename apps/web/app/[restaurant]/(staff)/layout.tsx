import { getMembership, roleCan } from "@workspace/core"
import { ExternalLink, UserRound } from "lucide-react"
import Link from "next/link"

import { eyebrow } from "@/components/styles"
import { getCurrentUser } from "@/lib/auth"
import { getRestaurantOr404 } from "@/lib/restaurant"

import { StaffNav } from "./_components/staff-nav"

// Staff pages (kitchen, dashboard): a dark working header instead of the
// storefront's. Access is checked in each page, not here.
export default async function StaffLayout({
  children,
  params,
}: LayoutProps<"/[restaurant]">) {
  const { restaurant: slug } = await params
  const restaurant = await getRestaurantOr404(slug)
  // Kitchen staff do not see the Dashboard tab (the page checks it anyway).
  const user = await getCurrentUser()
  const membership = user ? await getMembership(user.id, restaurant.id) : null
  const showDashboard =
    membership !== null && roleCan(membership.role, "orders:view")

  return (
    <>
      <header className="sticky top-0 z-30 bg-(--sf-ink) text-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-2xl font-medium">
              {restaurant.name}
            </span>
            <span
              className={`${eyebrow} hidden text-(--brand-accent) sm:inline`}
            >
              Staff
            </span>
          </div>
          <StaffNav slug={restaurant.slug} showDashboard={showDashboard} />
          <div className="flex items-center gap-1">
            <Link
              href={`/${restaurant.slug}`}
              aria-label="Open the storefront"
              className="inline-flex size-10 items-center justify-center rounded-full text-white/60 transition hover:text-white"
            >
              <ExternalLink className="size-4.5" strokeWidth={1.5} />
            </Link>
            <Link
              href="/account"
              aria-label="Account"
              className="inline-flex size-10 items-center justify-center rounded-full text-white/60 transition hover:text-white"
            >
              <UserRound className="size-5" strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </>
  )
}
