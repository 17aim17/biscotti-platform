import { OrderStatus, prisma } from "@workspace/db"

import { requirePermission } from "../auth/permissions"
import { ACTIVE_STATUSES } from "./status"

// How long finished orders stay on the kitchen screen, so staff can see what
// just went out (and undo nothing: finished orders cannot change).
const RECENT_MS = 60 * 60 * 1000

// Orders for the kitchen screen: everything in progress, plus orders finished
// in the last hour. Unpaid online orders (PENDING_PAYMENT) never show: the
// kitchen only sees orders it should cook. Checks the permission itself, so
// no caller can forget it.
export async function listKitchenOrders(
  userId: string,
  restaurantId: string,
  now = new Date()
) {
  await requirePermission(userId, restaurantId, "kitchen:use")
  return prisma.order.findMany({
    where: {
      restaurantId,
      OR: [
        { status: { in: ACTIVE_STATUSES } },
        {
          status: {
            in: [
              OrderStatus.DELIVERED,
              OrderStatus.PICKED_UP,
              OrderStatus.REJECTED,
              OrderStatus.CANCELLED,
            ],
          },
          updatedAt: { gte: new Date(now.getTime() - RECENT_MS) },
        },
      ],
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      number: true,
      status: true,
      fulfillment: true,
      paymentMethod: true,
      customerName: true,
      customerPhone: true,
      deliveryAddress: true,
      totalPaise: true,
      cancelReason: true,
      createdAt: true,
      updatedAt: true,
      location: { select: { id: true, name: true } },
      items: {
        orderBy: { title: "asc" },
        select: { id: true, title: true, qty: true },
      },
    },
  })
}

export type KitchenOrder = Awaited<ReturnType<typeof listKitchenOrders>>[number]
