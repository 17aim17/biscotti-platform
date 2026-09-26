"use server"

import {
  confirmCheckoutPayment,
  DomainError,
  startOnlinePayment,
  updateOrderStatus,
} from "@workspace/core"
import { z } from "zod"

import { toActionResult } from "@/lib/action-result"
import { getCurrentUser } from "@/lib/auth"

async function currentUserId() {
  const user = await getCurrentUser()
  if (!user) throw new DomainError("FORBIDDEN", "Please sign in again.")
  return user.id
}

const orderId = z.uuid()

// A new Razorpay payment attempt for an unpaid order ("Pay now").
export async function startPaymentAction(rawOrderId: unknown) {
  return toActionResult(async () =>
    startOnlinePayment(await currentUserId(), orderId.parse(rawOrderId))
  )
}

const checkoutResponse = z.object({
  razorpayOrderId: z.string().min(1).max(64),
  razorpayPaymentId: z.string().min(1).max(64),
  signature: z.string().min(1).max(256),
})

// Razorpay Checkout's success callback. The signature check in core is what
// makes this safe; the webhook records the same payment if this never runs.
export async function confirmPaymentAction(input: unknown) {
  return toActionResult(async () => {
    await currentUserId()
    const parsed = checkoutResponse.safeParse(input)
    if (!parsed.success) {
      throw new DomainError("INVALID_INPUT", "Payment response is incomplete.")
    }
    return confirmCheckoutPayment(parsed.data)
  })
}

// Customers can cancel until the kitchen accepts (see the status map).
export async function cancelOrderAction(rawOrderId: unknown) {
  return toActionResult(async () => {
    const userId = await currentUserId()
    await updateOrderStatus({
      orderId: orderId.parse(rawOrderId),
      to: "CANCELLED",
      by: { kind: "customer", userId },
      reason: "Cancelled by the customer",
    })
    return null
  })
}
