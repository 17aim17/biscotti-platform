import { getCustomerOrder } from "@workspace/core"
import { cn } from "@workspace/ui/lib/utils"
import { Check } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { requireUser } from "@/lib/auth"
import { readBrand } from "@/lib/brand"
import { formatOrderTime } from "@/lib/dates"
import { formatRupees } from "@/lib/money"
import {
  FINAL_STATUSES,
  statusLabel,
  statusNote,
  statusSteps,
} from "@/lib/order-status"
import { getRestaurantOr404 } from "@/lib/restaurant"

import { eyebrow } from "@/components/styles"
import { CancelOrderButton, PayNowButton } from "./order-buttons"
import { OrderLive } from "./order-live"

export const metadata: Metadata = { title: "Your order" }

// How far along the happy path each status is, for the progress steps.
const PROGRESS: Record<string, number> = {
  PLACED: 0,
  ACCEPTED: 1,
  PREPARING: 2,
  READY: 3,
  OUT_FOR_DELIVERY: 4,
  DELIVERED: 5,
  PICKED_UP: 5,
}

type Address = { line1?: string; landmark?: string }

export default async function OrderPage({
  params,
}: PageProps<"/[restaurant]/orders/[orderId]">) {
  const { restaurant: slug, orderId } = await params
  const user = await requireUser(`/${slug}/orders/${orderId}`)
  const restaurant = await getRestaurantOr404(slug)
  // Anything that is not a UUID is simply not found.
  const order = /^[0-9a-f-]{36}$/i.test(orderId)
    ? await getCustomerOrder(user.id, restaurant.id, orderId)
    : null
  if (!order) notFound()

  const { status, fulfillment } = order
  const stopped = status === "REJECTED" || status === "CANCELLED"
  const unpaid = status === "PENDING_PAYMENT"
  const paymentFailed = unpaid && order.payments[0]?.status === "failed"
  const address = order.deliveryAddress as Address | null
  const paid = ["captured", "needs_refund", "refunded"].includes(
    order.payments[0]?.status ?? ""
  )

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-12 px-4 pt-12 pb-24">
      {!FINAL_STATUSES.includes(status) && <OrderLive orderId={order.id} />}

      <header className="flex flex-col items-center gap-4 text-center">
        <p className={`${eyebrow} text-(--sf-accent-ink)`}>
          Order #{order.number} · {formatOrderTime(order.createdAt)}
        </p>
        <h1 className="font-display text-5xl leading-none font-medium tracking-tight sm:text-6xl">
          {paymentFailed ? "Payment failed" : statusLabel(status, fulfillment)}
        </h1>
        <p className="max-w-md text-(--sf-muted)">
          {stopped && order.cancelReason
            ? `${order.cancelReason}. ${statusNote(status, fulfillment)}`
            : statusNote(status, fulfillment)}
        </p>
      </header>

      {unpaid && (
        <div className="flex flex-col items-center gap-4">
          <PayNowButton
            orderId={order.id}
            label={`Pay ${formatRupees(order.totalPaise)}`}
            restaurantName={restaurant.name}
            phone={user.phone}
            brandColor={readBrand(restaurant.theme).primary}
          />
          <CancelOrderButton orderId={order.id} />
        </div>
      )}

      {!unpaid && !stopped && (
        <ol className="grid grid-cols-5 border-y border-(--sf-line) py-8">
          {statusSteps(fulfillment).map((step) => {
            const done = PROGRESS[status]! >= PROGRESS[step]!
            const current = status === step
            return (
              <li
                key={step}
                className="flex flex-col items-center gap-3 text-center"
              >
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full ring-1 transition",
                    done
                      ? "bg-(--sf-ink) text-(--sf-bg) ring-(--sf-ink)"
                      : "text-(--sf-muted) ring-(--sf-line)",
                    current && "ring-4 ring-(--brand-accent)/40"
                  )}
                >
                  {done ? (
                    <Check className="size-4" />
                  ) : (
                    <span className="size-1.5 rounded-full bg-current" />
                  )}
                </span>
                <span
                  className={cn(
                    `${eyebrow} text-[0.6rem] leading-relaxed sm:text-[0.68rem]`,
                    done ? "text-(--sf-ink)" : "text-(--sf-muted)"
                  )}
                >
                  {statusLabel(step, fulfillment)}
                </span>
              </li>
            )
          })}
        </ol>
      )}

      {status === "PLACED" && (
        <div className="-mt-6 flex justify-center">
          <CancelOrderButton orderId={order.id} />
        </div>
      )}

      <div className="grid gap-10 sm:grid-cols-[1.4fr_1fr]">
        <section className="flex flex-col gap-4">
          <h2 className="border-b border-(--sf-ink)/80 pb-3 font-display text-3xl font-medium">
            Your order
          </h2>
          <ul className="flex flex-col gap-3 text-sm">
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-3">
                <span className="w-6 text-(--sf-muted) tabular-nums">
                  {item.qty}×
                </span>
                <span className="flex-1">{item.title}</span>
                <span className="tabular-nums">
                  {formatRupees(item.lineTotalPaise)}
                </span>
              </li>
            ))}
          </ul>
          <dl className="flex flex-col gap-2 border-t border-(--sf-line) pt-4 text-sm">
            <Row label="Subtotal" paise={order.subtotalPaise} />
            {fulfillment === "delivery" && (
              <Row label="Delivery" paise={order.deliveryFeePaise} />
            )}
            <Row label="Packaging" paise={order.packagingFeePaise} />
            <Row label="GST" paise={order.taxPaise} />
            <div className="mt-2 flex items-baseline justify-between border-t border-(--sf-ink)/80 pt-4">
              <dt className={`${eyebrow} text-(--sf-ink)`}>Total</dt>
              <dd className="font-display text-3xl font-medium tabular-nums">
                {formatRupees(order.totalPaise)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="flex flex-col gap-6 text-sm">
          <Detail
            label={fulfillment === "delivery" ? "Delivering to" : "Pickup from"}
          >
            {fulfillment === "delivery" && address ? (
              <>
                {address.line1}
                {address.landmark && (
                  <span className="block text-(--sf-muted)">
                    Near {address.landmark}
                  </span>
                )}
              </>
            ) : (
              <>
                {order.location.name}
                <span className="block text-(--sf-muted)">
                  {order.location.address}
                </span>
              </>
            )}
          </Detail>
          {fulfillment === "delivery" && (
            <Detail label="From">{order.location.name}</Detail>
          )}
          <Detail label="Name">{order.customerName}</Detail>
          <Detail label="Payment">
            {order.paymentMethod === "cod"
              ? fulfillment === "pickup"
                ? "Pay at pickup"
                : "Cash on delivery"
              : paid
                ? "Paid online"
                : "Online, not paid"}
          </Detail>
          <Link
            href={`/${slug}/orders`}
            className={`${eyebrow} w-fit text-(--sf-muted) underline-offset-4 hover:text-(--sf-ink) hover:underline`}
          >
            All your orders
          </Link>
        </section>
      </div>
    </div>
  )
}

function Row({ label, paise }: { label: string; paise: number }) {
  return (
    <div className="flex justify-between">
      <dt className="text-(--sf-muted)">{label}</dt>
      <dd className="tabular-nums">{formatRupees(paise)}</dd>
    </div>
  )
}

function Detail({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className={`${eyebrow} text-(--sf-muted)`}>{label}</span>
      <span className="font-display text-xl leading-snug">{children}</span>
    </div>
  )
}
