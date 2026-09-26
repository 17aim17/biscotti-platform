import { listRestaurantOrders, type OrderFilter } from "@workspace/core"
import { cn } from "@workspace/ui/lib/utils"
import type { Metadata } from "next"
import Link from "next/link"

import { NoAccess } from "@/components/no-access"
import { eyebrow } from "@/components/styles"
import { checkStaffAccess } from "@/lib/access"
import { formatOrderTime } from "@/lib/dates"
import { formatRupees } from "@/lib/money"

import { PageTitle } from "../_ui"
import { RefundButton } from "./refund-button"

export const metadata: Metadata = { title: "Orders" }

const FILTERS: { value: OrderFilter; label: string }[] = [
  { value: "needs_refund", label: "Needs refund" },
  { value: "active", label: "In progress" },
  { value: "all", label: "All" },
]

const STATUS: Record<string, string> = {
  PLACED: "New",
  ACCEPTED: "Accepted",
  PREPARING: "Cooking",
  READY: "Ready",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  PICKED_UP: "Picked up",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
}

export default async function OrdersPage({
  params,
  searchParams,
}: PageProps<"/[restaurant]/dashboard/orders">) {
  const { restaurant: slug } = await params
  const { filter: rawFilter } = await searchParams
  const { restaurant, user, allowed } = await checkStaffAccess(
    slug,
    "orders:view",
    `/${slug}/dashboard/orders`
  )
  if (!allowed) return <NoAccess restaurantName={restaurant.name} />

  const filter =
    FILTERS.find((f) => f.value === rawFilter)?.value ?? ("all" as const)
  const orders = await listRestaurantOrders(user.id, restaurant.id, filter)

  return (
    <>
      <PageTitle title="Orders">
        <nav className="flex gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.value}
              href={`/${slug}/dashboard/orders?filter=${f.value}`}
              className={cn(
                `${eyebrow} rounded-(--sf-radius-control) px-3 py-2 transition`,
                f.value === filter
                  ? "bg-(--sf-ink) text-(--sf-bg)"
                  : "text-(--sf-muted) hover:text-(--sf-ink)"
              )}
            >
              {f.label}
            </Link>
          ))}
        </nav>
      </PageTitle>

      {orders.length === 0 ? (
        <p className="py-16 text-center text-(--sf-muted)">
          {filter === "needs_refund" ? "No refunds waiting." : "No orders yet."}
        </p>
      ) : (
        <ul className="divide-y divide-(--sf-line)">
          {orders.map((o) => {
            const refund = o.payments.find((p) => p.status === "needs_refund")
            const paid = o.payments.some((p) =>
              ["captured", "needs_refund", "refunded"].includes(p.status)
            )
            const refunded = o.payments.some((p) => p.status === "refunded")
            return (
              <li
                key={o.id}
                className="grid gap-3 py-4 sm:grid-cols-[5rem_1fr_auto] sm:items-center"
              >
                <span className="font-display text-2xl lining-nums">
                  #{o.number}
                </span>
                <div className="flex flex-col gap-1 text-sm">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{o.customerName}</span>
                    <span className="text-(--sf-muted)">
                      {formatOrderTime(o.createdAt)}
                    </span>
                  </span>
                  <span className="text-(--sf-muted)">
                    {o._count.items} {o._count.items === 1 ? "dish" : "dishes"}{" "}
                    · {o.fulfillment === "delivery" ? "Delivery" : "Pickup"}{" "}
                    from {o.location.name} ·{" "}
                    {o.paymentMethod === "cod"
                      ? "Cash"
                      : refunded
                        ? "Refunded"
                        : paid
                          ? "Paid online"
                          : "Online"}
                  </span>
                  {o.cancelReason && (
                    <span className="text-(--sf-muted)">
                      Reason: {o.cancelReason}
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <span className="flex items-center gap-3">
                    <span
                      className={cn(
                        `${eyebrow} text-[0.6rem]`,
                        ["REJECTED", "CANCELLED"].includes(o.status)
                          ? "text-(--brand)"
                          : "text-(--sf-muted)"
                      )}
                    >
                      {STATUS[o.status]}
                    </span>
                    <span className="font-display text-xl tabular-nums">
                      {formatRupees(o.totalPaise)}
                    </span>
                  </span>
                  {refund && (
                    <div className="flex flex-col gap-2 rounded-(--sf-radius-card) bg-(--sf-soft) p-3 text-sm sm:items-end">
                      <span>
                        Refund {formatRupees(refund.amountPaise)} in{" "}
                        {refund.razorpayPaymentId ? (
                          <a
                            href={`https://dashboard.razorpay.com/app/payments/${refund.razorpayPaymentId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="underline underline-offset-4"
                          >
                            Razorpay
                          </a>
                        ) : (
                          "Razorpay"
                        )}
                        , then mark it here.
                      </span>
                      <RefundButton slug={slug} paymentId={refund.id} />
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
