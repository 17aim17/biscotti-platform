"use server"

import { parseInput, updateOrderStatus } from "@workspace/core"
import { OrderStatus } from "@workspace/db/enums"
import { z } from "zod"

import { toActionResult } from "@/lib/action-result"
import { requireUserId } from "@/lib/auth"

// Whether this move is allowed (the person's role, the order's current
// status, delivery or pickup) is decided by core's status map.
const input = z.object({
  orderId: z.uuid("Invalid order."),
  to: z.enum(OrderStatus, "Invalid status."),
  // Core trims it to the length it stores; this only stops huge inputs.
  reason: z.string().trim().max(2000).optional(),
})

export async function moveOrderAction(raw: unknown) {
  return toActionResult(async () => {
    const userId = await requireUserId()
    const { orderId, to, reason } = parseInput(input, raw)
    await updateOrderStatus({
      orderId,
      to,
      by: { kind: "staff", userId },
      reason,
    })
    return null
  })
}
