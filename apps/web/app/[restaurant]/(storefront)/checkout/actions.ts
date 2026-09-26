"use server"

import {
  DomainError,
  placeOrder,
  quoteOrder,
  startOnlinePayment,
} from "@workspace/core"

import { toActionResult } from "@/lib/action-result"
import { getCurrentUser } from "@/lib/auth"

// Server Actions for the checkout page. Each one validates its input in core;
// the browser only ever sends ids, quantities, the pin and what the customer
// typed.

export async function quoteAction(input: unknown) {
  return toActionResult(() => quoteOrder(input))
}

export async function placeOrderAction(input: unknown) {
  return toActionResult(async () => {
    const user = await getCurrentUser()
    if (!user) throw new DomainError("FORBIDDEN", "Please sign in again.")
    const order = await placeOrder(user.id, input)
    if (order.paymentMethod === "cod") {
      return { orderId: order.id, payment: null }
    }
    // The order exists even if Razorpay is unreachable right now: the order
    // page offers "Pay now", which creates a new payment attempt.
    try {
      const payment = await startOnlinePayment(user.id, order.id)
      return { orderId: order.id, payment }
    } catch (error) {
      console.error("[checkout] could not start payment", error)
      return { orderId: order.id, payment: null }
    }
  })
}
