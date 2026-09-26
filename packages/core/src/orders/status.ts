// The only place where order status changes are defined.
import type { Fulfillment, OrderStatus } from "@workspace/db"

// Who is making the change. "system" is our own code, e.g. after a payment is captured.
export type Actor = "customer" | "staff" | "system"

type Transition = {
  to: OrderStatus
  by: Actor
  // Some steps only make sense for delivery or for pickup orders.
  only?: Fulfillment
}

export const ORDER_TRANSITIONS: Record<OrderStatus, Transition[]> = {
  PENDING_PAYMENT: [
    { to: "PLACED", by: "system" },
    { to: "CANCELLED", by: "customer" },
  ],
  PLACED: [
    { to: "ACCEPTED", by: "staff" },
    { to: "REJECTED", by: "staff" },
    { to: "CANCELLED", by: "customer" },
  ],
  ACCEPTED: [
    { to: "PREPARING", by: "staff" },
    { to: "CANCELLED", by: "staff" },
  ],
  PREPARING: [{ to: "READY", by: "staff" }],
  READY: [
    { to: "OUT_FOR_DELIVERY", by: "staff", only: "delivery" },
    { to: "PICKED_UP", by: "staff", only: "pickup" },
  ],
  OUT_FOR_DELIVERY: [{ to: "DELIVERED", by: "staff" }],
  DELIVERED: [],
  PICKED_UP: [],
  REJECTED: [],
  CANCELLED: [],
}

// Orders the kitchen is working on. Unpaid (PENDING_PAYMENT) orders are not shown.
export const ACTIVE_STATUSES: OrderStatus[] = [
  "PLACED",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
]

export function nextStatuses(
  from: OrderStatus,
  fulfillment: Fulfillment,
  actor: Actor
): OrderStatus[] {
  return ORDER_TRANSITIONS[from]
    .filter((t) => t.by === actor && (!t.only || t.only === fulfillment))
    .map((t) => t.to)
}

export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  fulfillment: Fulfillment,
  actor: Actor
): boolean {
  return nextStatuses(from, fulfillment, actor).includes(to)
}

// Timestamp column to set when an order enters a status.
export function timestampFor(
  to: OrderStatus
): "acceptedAt" | "readyAt" | "completedAt" | "cancelledAt" | null {
  switch (to) {
    case "ACCEPTED":
      return "acceptedAt"
    case "READY":
      return "readyAt"
    case "DELIVERED":
    case "PICKED_UP":
      return "completedAt"
    case "REJECTED":
    case "CANCELLED":
      return "cancelledAt"
    default:
      return null
  }
}
