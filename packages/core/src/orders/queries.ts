import { prisma } from "@workspace/db"

// What the customer's order pages show. Always filtered by customer id, so a
// customer can only ever load their own orders.
const customerOrderSelect = {
  id: true,
  number: true,
  status: true,
  fulfillment: true,
  paymentMethod: true,
  customerName: true,
  deliveryAddress: true,
  subtotalPaise: true,
  deliveryFeePaise: true,
  packagingFeePaise: true,
  taxPaise: true,
  totalPaise: true,
  cancelReason: true,
  createdAt: true,
  acceptedAt: true,
  readyAt: true,
  completedAt: true,
  cancelledAt: true,
  location: { select: { name: true, address: true } },
  items: {
    orderBy: { title: "asc" },
    select: { id: true, title: true, qty: true, lineTotalPaise: true },
  },
  // Latest attempt first, to tell "not paid yet" from "payment failed".
  payments: {
    orderBy: { createdAt: "desc" },
    take: 1,
    select: { status: true },
  },
} as const

export async function getCustomerOrder(
  customerId: string,
  restaurantId: string,
  orderId: string
) {
  return prisma.order.findFirst({
    where: { id: orderId, customerId, restaurantId },
    select: customerOrderSelect,
  })
}

export type CustomerOrder = NonNullable<
  Awaited<ReturnType<typeof getCustomerOrder>>
>

export async function listCustomerOrders(
  customerId: string,
  restaurantId: string
) {
  return prisma.order.findMany({
    where: { customerId, restaurantId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      number: true,
      status: true,
      fulfillment: true,
      totalPaise: true,
      createdAt: true,
      location: { select: { name: true } },
      _count: { select: { items: true } },
    },
  })
}

// The signed-in user's profile, or null if the account no longer exists
// (deleted, or a local database reset while the browser kept its login).
export async function getProfile(userId: string) {
  return prisma.profile.findUnique({
    where: { id: userId },
    select: { name: true, phone: true },
  })
}
