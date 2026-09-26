import { listCustomerOrders } from "@workspace/core"
import type { Metadata } from "next"
import Link from "next/link"

import { requireUser } from "@/lib/auth"
import { formatOrderTime } from "@/lib/dates"
import { formatRupees } from "@/lib/money"
import { FINAL_STATUSES, statusLabel } from "@/lib/order-status"
import { getRestaurantOr404 } from "@/lib/restaurant"

import { SectionHeading } from "@/components/section-heading"
import { eyebrow, solidButton } from "@/components/styles"

export const metadata: Metadata = { title: "Your orders" }

export default async function OrdersPage({
  params,
}: PageProps<"/[restaurant]/orders">) {
  const { restaurant: slug } = await params
  const user = await requireUser(`/${slug}/orders`)
  const restaurant = await getRestaurantOr404(slug)
  const orders = await listCustomerOrders(user.id, restaurant.id)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-4 pt-14 pb-24">
      <SectionHeading eyebrow={restaurant.name} title="Your orders" />

      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-6 text-center">
          <p className="text-(--sf-muted)">You haven&apos;t ordered yet.</p>
          <Link href={`/${slug}#menu`} className={`${solidButton} px-8 py-3.5`}>
            Browse the menu
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-(--sf-line) border-y border-(--sf-line)">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/${slug}/orders/${o.id}`}
                className="group flex items-center gap-4 py-6"
              >
                <div className="flex flex-1 flex-col gap-1">
                  <span className={`${eyebrow} text-(--sf-muted)`}>
                    #{o.number} · {formatOrderTime(o.createdAt)}
                  </span>
                  <span className="font-display text-2xl decoration-(--brand-accent) decoration-1 underline-offset-4 group-hover:underline">
                    {statusLabel(o.status, o.fulfillment)}
                  </span>
                  <span className="text-sm text-(--sf-muted)">
                    {o._count.items} {o._count.items === 1 ? "dish" : "dishes"}{" "}
                    · {o.fulfillment === "delivery" ? "Delivery" : "Pickup"}{" "}
                    from {o.location.name}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-display text-2xl tabular-nums">
                    {formatRupees(o.totalPaise)}
                  </span>
                  {!FINAL_STATUSES.includes(o.status) && (
                    <span
                      className={`${eyebrow} text-[0.6rem] text-emerald-700`}
                    >
                      In progress
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
