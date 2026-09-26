import { Fulfillment, OrderStatus } from "@workspace/db"

import { sendSms } from "./sms"

type OrderForMessage = {
  number: number
  status: OrderStatus
  fulfillment: Fulfillment
  customerPhone: string
}

export function orderStatusMessage(
  order: OrderForMessage,
  restaurantName: string
): string | null {
  const ref = `${restaurantName} order #${order.number}`
  switch (order.status) {
    case OrderStatus.PLACED:
      return `${ref} received. We'll let you know when it's accepted.`
    case OrderStatus.ACCEPTED:
      return `${ref} accepted and will be prepared shortly.`
    case OrderStatus.READY:
      return order.fulfillment === Fulfillment.pickup
        ? `${ref} is ready for pickup.`
        : null
    case OrderStatus.OUT_FOR_DELIVERY:
      return `${ref} is on the way.`
    case OrderStatus.REJECTED:
      return `Sorry, ${ref} could not be accepted. Any online payment will be refunded.`
    case OrderStatus.CANCELLED:
      return `${ref} was cancelled. Any online payment will be refunded.`
    default:
      return null
  }
}

// Best effort: called after the status change is saved. A failed SMS is logged
// and never undoes or blocks the order.
export async function notifyOrderStatus(
  order: OrderForMessage,
  restaurantName: string
) {
  const text = orderStatusMessage(order, restaurantName)
  if (!text) return
  const to = order.customerPhone.startsWith("+")
    ? order.customerPhone
    : `+${order.customerPhone}`
  try {
    await sendSms(to, text)
  } catch (error) {
    console.error(`[sms] failed for order #${order.number}`, error)
  }
}
