"use server"

import { DomainError, updateOrderStatus } from "@workspace/core"
import { z } from "zod"

import { toActionResult } from "@/lib/action-result"
import { getCurrentUser } from "@/lib/auth"

// Statuses staff can move an order to. Whether this particular move is allowed
// (right role, right current status, delivery or pickup) is checked in core.
const input = z.object({
  orderId: z.uuid(),
  to: z.enum([
    "ACCEPTED",
    "REJECTED",
    "PREPARING",
    "READY",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "PICKED_UP",
    "CANCELLED",
  ]),
  // Core trims it to the length it stores; this only stops huge inputs.
  reason: z.string().trim().max(2000).optional(),
})

export async function moveOrderAction(raw: unknown) {
  return toActionResult(async () => {
    const user = await getCurrentUser()
    if (!user) throw new DomainError("FORBIDDEN", "Please sign in again.")
    const parsed = input.safeParse(raw)
    if (!parsed.success) {
      throw new DomainError("INVALID_INPUT", "Invalid status change.")
    }
    const { orderId, to, reason } = parsed.data
    await updateOrderStatus({
      orderId,
      to,
      by: { kind: "staff", userId: user.id },
      reason,
    })
    return null
  })
}
