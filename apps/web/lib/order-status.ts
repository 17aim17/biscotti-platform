import type { CustomerOrder } from "@workspace/core"

// How order statuses read to customers.
type Status = CustomerOrder["status"]
type FulfillmentType = CustomerOrder["fulfillment"]

export function statusLabel(status: Status, fulfillment: FulfillmentType) {
  switch (status) {
    case "PENDING_PAYMENT":
      return "Waiting for payment"
    case "PLACED":
      return "Order received"
    case "ACCEPTED":
      return "Accepted"
    case "PREPARING":
      return "Being prepared"
    case "READY":
      return fulfillment === "pickup" ? "Ready for pickup" : "Ready"
    case "OUT_FOR_DELIVERY":
      return "On the way"
    case "DELIVERED":
      return "Delivered"
    case "PICKED_UP":
      return "Picked up"
    case "REJECTED":
      return "Declined by the restaurant"
    case "CANCELLED":
      return "Cancelled"
  }
}

export function statusNote(status: Status, fulfillment: FulfillmentType) {
  switch (status) {
    case "PENDING_PAYMENT":
      return "We'll send your order to the kitchen as soon as the payment goes through."
    case "PLACED":
      return "The kitchen will confirm it shortly."
    case "ACCEPTED":
    case "PREPARING":
      return "The kitchen is on it."
    case "READY":
      return fulfillment === "pickup"
        ? "Come by and collect it."
        : "It will leave the kitchen in a moment."
    case "OUT_FOR_DELIVERY":
      return "Your food is on its way to you."
    case "DELIVERED":
    case "PICKED_UP":
      return "Enjoy your meal."
    case "REJECTED":
    case "CANCELLED":
      return "Any online payment will be refunded."
  }
}

// The happy path, shown as progress steps.
export function statusSteps(fulfillment: FulfillmentType): Status[] {
  return fulfillment === "pickup"
    ? ["PLACED", "ACCEPTED", "PREPARING", "READY", "PICKED_UP"]
    : ["PLACED", "ACCEPTED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"]
}

// Nothing more will happen to these orders.
export const FINAL_STATUSES: Status[] = [
  "DELIVERED",
  "PICKED_UP",
  "REJECTED",
  "CANCELLED",
]

// How statuses read to staff (kitchen screen, dashboard): short, kitchen words.
export const STAFF_STATUS_LABEL: Record<Status, string> = {
  PENDING_PAYMENT: "Awaiting payment",
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

// Payment statuses that mean the money arrived (whatever happened later).
const PAID = ["captured", "needs_refund", "refunded"]

export function isPaid(payments: { status: string }[]) {
  return payments.some((p) => PAID.includes(p.status))
}
