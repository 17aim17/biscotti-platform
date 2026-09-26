import { OrderStatus, PaymentStatus, prisma } from "@workspace/db"

import { requirePermission } from "../auth/permissions"
import { DomainError } from "../errors"
import { ACTIVE_STATUSES } from "../orders/status"

export type OrderFilter = "needs_refund" | "active" | "all"

// Orders for the dashboard, newest first. "needs_refund": paid orders that
// were rejected or cancelled and still wait for a refund in Razorpay.
export async function listRestaurantOrders(
  userId: string,
  restaurantId: string,
  filter: OrderFilter
) {
  await requirePermission(userId, restaurantId, "orders:view")
  return prisma.order.findMany({
    where: {
      restaurantId,
      // Unpaid online orders are abandoned checkouts, not orders yet.
      status: { not: OrderStatus.PENDING_PAYMENT },
      ...(filter === "active" ? { status: { in: ACTIVE_STATUSES } } : {}),
      ...(filter === "needs_refund"
        ? { payments: { some: { status: PaymentStatus.needs_refund } } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      number: true,
      status: true,
      fulfillment: true,
      paymentMethod: true,
      customerName: true,
      customerPhone: true,
      totalPaise: true,
      cancelReason: true,
      createdAt: true,
      location: { select: { name: true } },
      _count: { select: { items: true } },
      payments: {
        where: {
          status: {
            in: [
              PaymentStatus.captured,
              PaymentStatus.needs_refund,
              PaymentStatus.refunded,
            ],
          },
        },
        select: {
          id: true,
          status: true,
          amountPaise: true,
          razorpayPaymentId: true,
        },
      },
    },
  })
}

export async function countOrdersNeedingRefund(
  userId: string,
  restaurantId: string
) {
  await requirePermission(userId, restaurantId, "orders:view")
  return prisma.payment.count({
    where: {
      status: PaymentStatus.needs_refund,
      order: { restaurantId },
    },
  })
}

// The owner refunded the payment in the Razorpay dashboard and records it
// here. Guarded, so a double click changes one row once. (Automatic refunds
// through the Razorpay API are in the backlog.)
export async function markPaymentRefunded(
  userId: string,
  restaurantId: string,
  paymentId: string
) {
  await requirePermission(userId, restaurantId, "orders:view")
  const updated = await prisma.payment.updateMany({
    where: {
      id: paymentId,
      status: PaymentStatus.needs_refund,
      order: { restaurantId },
    },
    data: { status: PaymentStatus.refunded },
  })
  if (updated.count === 0) {
    throw new DomainError(
      "STATUS_CONFLICT",
      "This payment is not waiting for a refund."
    )
  }
}
