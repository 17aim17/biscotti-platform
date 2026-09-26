import { prisma, type OrderStatus } from "@workspace/db"

import { requirePermission } from "../auth/permissions"
import { DomainError } from "../errors"
import { notifyOrderStatus } from "../notifications/order-status"
import { canTransition, timestampFor } from "./status"

export type StatusChangeBy =
  | { kind: "staff"; userId: string }
  | { kind: "customer"; userId: string }
  | { kind: "system" }

export async function updateOrderStatus(params: {
  orderId: string
  to: OrderStatus
  by: StatusChangeBy
  reason?: string
}) {
  const { orderId, to, by, reason } = params
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { restaurant: { select: { name: true } } },
  })
  if (!order) throw new DomainError("NOT_FOUND", "Order not found.")

  if (by.kind === "staff") {
    await requirePermission(by.userId, order.restaurantId, "kitchen:use")
  } else if (by.kind === "customer" && order.customerId !== by.userId) {
    throw new DomainError("NOT_FOUND", "Order not found.")
  }

  if (!canTransition(order.status, to, order.fulfillment, by.kind)) {
    throw new DomainError(
      "INVALID_STATUS_CHANGE",
      `An order cannot go from ${order.status} to ${to}.`
    )
  }

  const stamp = timestampFor(to)
  const [changed] = await prisma.$transaction([
    // Guarded update: only applies if nobody changed the order since we read it.
    prisma.order.updateMany({
      where: { id: orderId, status: order.status },
      data: {
        status: to,
        ...(stamp ? { [stamp]: new Date() } : {}),
        ...(reason ? { cancelReason: reason } : {}),
      },
    }),
    // A paid order that will not be fulfilled needs a refund (done by the owner
    // in Razorpay for now). No-op for unpaid and cash orders.
    ...(to === "REJECTED" || to === "CANCELLED"
      ? [
          prisma.payment.updateMany({
            where: { orderId, status: "captured" },
            data: { status: "needs_refund" },
          }),
        ]
      : []),
  ])
  if (changed.count === 0) {
    throw new DomainError(
      "STATUS_CONFLICT",
      "This order was just updated by someone else. Refresh and try again."
    )
  }

  const updated = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
  })
  await notifyOrderStatus(updated, order.restaurant.name)
  return updated
}
