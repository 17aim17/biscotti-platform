// The only place where order status changes are defined.
import { Fulfillment, OrderStatus } from "@workspace/db"

const {
  PENDING_PAYMENT,
  PLACED,
  ACCEPTED,
  REJECTED,
  PREPARING,
  READY,
  OUT_FOR_DELIVERY,
  DELIVERED,
  PICKED_UP,
  CANCELLED,
} = OrderStatus

// Who is making the change. "system" is our own code, e.g. after a payment is captured.
export const Actor = {
  customer: "customer",
  staff: "staff",
  system: "system",
} as const
export type Actor = (typeof Actor)[keyof typeof Actor]

type Transition = {
  to: OrderStatus
  by: Actor
  // Some steps only make sense for delivery or for pickup orders.
  only?: Fulfillment
}

export const ORDER_TRANSITIONS: Record<OrderStatus, Transition[]> = {
  [PENDING_PAYMENT]: [
    { to: PLACED, by: Actor.system },
    { to: CANCELLED, by: Actor.customer },
  ],
  [PLACED]: [
    { to: ACCEPTED, by: Actor.staff },
    { to: REJECTED, by: Actor.staff },
    { to: CANCELLED, by: Actor.customer },
  ],
  [ACCEPTED]: [
    { to: PREPARING, by: Actor.staff },
    { to: CANCELLED, by: Actor.staff },
  ],
  [PREPARING]: [{ to: READY, by: Actor.staff }],
  [READY]: [
    { to: OUT_FOR_DELIVERY, by: Actor.staff, only: Fulfillment.delivery },
    { to: PICKED_UP, by: Actor.staff, only: Fulfillment.pickup },
  ],
  [OUT_FOR_DELIVERY]: [{ to: DELIVERED, by: Actor.staff }],
  [DELIVERED]: [],
  [PICKED_UP]: [],
  [REJECTED]: [],
  [CANCELLED]: [],
}

// Orders the kitchen is working on. Unpaid (PENDING_PAYMENT) orders are not shown.
export const ACTIVE_STATUSES: OrderStatus[] = [
  PLACED,
  ACCEPTED,
  PREPARING,
  READY,
  OUT_FOR_DELIVERY,
]

// Final statuses where the order will not be fulfilled.
export const NOT_FULFILLED_STATUSES: OrderStatus[] = [REJECTED, CANCELLED]

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
    case ACCEPTED:
      return "acceptedAt"
    case READY:
      return "readyAt"
    case DELIVERED:
    case PICKED_UP:
      return "completedAt"
    case REJECTED:
    case CANCELLED:
      return "cancelledAt"
    default:
      return null
  }
}
