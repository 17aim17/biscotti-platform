// Manual check of updateOrderStatus against the local database: permissions,
// the status map, and two simultaneous clicks. Cleans up after.
import { config } from "dotenv"
config({ path: "../../.env", quiet: true })
const { prisma } = await import("@workspace/db")
const { placeOrder } = await import("../src/orders/place-order")
const { updateOrderStatus } = await import("../src/orders/update-status")

const casa = await prisma.restaurant.findUniqueOrThrow({
  where: { slug: "casa-spezia" },
  include: { locations: true },
})
const user = (phone: string) =>
  prisma.profile.findFirstOrThrow({ where: { phone } })
const [customer, staff, otherOwner] = await Promise.all(
  ["919999900001", "919999900002", "919999900004"].map(user)
)
const tikka = await prisma.menuItem.findFirstOrThrow({
  where: { restaurantId: casa.id, title: "Achari Paneer Tikka" },
})
const order = await placeOrder(
  customer!.id,
  {
    restaurantId: casa.id,
    locationId: casa.locations[0]!.id,
    fulfillment: "pickup",
    paymentMethod: "cod",
    customerName: "Test Customer",
    items: [{ menuItemId: tikka.id, qty: 1 }],
    idempotencyKey: "check-status-" + Date.now(),
  },
  new Date("2026-09-28T12:00:00+05:30")
)

const step = async (label: string, to: string, by: object) => {
  try {
    const o = await updateOrderStatus({
      orderId: order.id,
      to: to as never,
      by: by as never,
    })
    console.log(
      label.padEnd(40),
      "->",
      o.status,
      o.acceptedAt ? "(acceptedAt set)" : ""
    )
  } catch (e) {
    const err = e as { code?: string; message: string }
    console.log(label.padEnd(40), "->", err.code, "|", err.message)
  }
}
await step("Osteria Sole owner accepts", "ACCEPTED", {
  kind: "staff",
  userId: otherOwner!.id,
})
await step("staff skips to PICKED_UP", "PICKED_UP", {
  kind: "staff",
  userId: staff!.id,
})
await step("Casa staff accepts", "ACCEPTED", {
  kind: "staff",
  userId: staff!.id,
})
await step("customer cancels after accept", "CANCELLED", {
  kind: "customer",
  userId: customer!.id,
})
// Two staff clicks at the same moment: only one can win.
const race = await Promise.allSettled([
  updateOrderStatus({
    orderId: order.id,
    to: "PREPARING",
    by: { kind: "staff", userId: staff!.id },
  }),
  updateOrderStatus({
    orderId: order.id,
    to: "PREPARING",
    by: { kind: "staff", userId: staff!.id },
  }),
])
console.log(
  "two simultaneous PREPARING clicks".padEnd(40),
  "->",
  race
    .map((r) =>
      r.status === "fulfilled" ? "ok" : (r.reason as { code: string }).code
    )
    .join(", ")
)
await step("Casa staff marks READY", "READY", {
  kind: "staff",
  userId: staff!.id,
})
await step("Casa staff marks PICKED_UP", "PICKED_UP", {
  kind: "staff",
  userId: staff!.id,
})
await prisma.order.deleteMany({
  where: { idempotencyKey: { startsWith: "check-" } },
})
await prisma.$disconnect()
