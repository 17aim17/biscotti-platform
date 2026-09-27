"use server"

import {
  confirmCheckoutPayment,
  parseInput,
  startOnlinePayment,
  updateOrderStatus,
} from "@workspace/core"
import { z } from "zod"

import { toActionResult } from "@/lib/action-result"
import { requireUserId } from "@/lib/auth"

const orderId = z.uuid("Invalid order.")

// A new Razorpay payment attempt for an unpaid order ("Pay now").
export async function startPaymentAction(rawOrderId: unknown) {
  return toActionResult(async () =>
    startOnlinePayment(await requireUserId(), parseInput(orderId, rawOrderId))
  )
}

const checkoutResponse = z.object(
  {
    razorpayOrderId: z.string().min(1).max(64),
    razorpayPaymentId: z.string().min(1).max(64),
    signature: z.string().min(1).max(256),
  },
  "Payment response is incomplete."
)

// Razorpay Checkout's success callback. The signature check in core is what
// makes this safe; the webhook records the same payment if this never runs.
export async function confirmPaymentAction(input: unknown) {
  return toActionResult(async () => {
    await requireUserId()
    return confirmCheckoutPayment(parseInput(checkoutResponse, input))
  })
}

// Customers can cancel until the kitchen accepts (see the status map).
export async function cancelOrderAction(rawOrderId: unknown) {
  return toActionResult(async () => {
    await updateOrderStatus({
      orderId: parseInput(orderId, rawOrderId),
      to: "CANCELLED",
      by: { kind: "customer", userId: await requireUserId() },
      reason: "Cancelled by the customer",
    })
    return null
  })
}
